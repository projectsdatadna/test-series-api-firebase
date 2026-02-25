const logger = require('../utils/logger');

const CLAUDE_PRICING = {
  'claude-haiku-4-5-20251001': {
    inputCostPerMillion:  1.00,
    outputCostPerMillion: 5.00,
  },
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = CLAUDE_PRICING[model] ?? { inputCostPerMillion: 0, outputCostPerMillion: 0 };
  const inputCost  = (inputTokens  / 1_000_000) * pricing.inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMillion;
  return {
    inputCost:  parseFloat(inputCost.toFixed(8)),
    outputCost: parseFloat(outputCost.toFixed(8)),
    totalCost:  parseFloat((inputCost + outputCost).toFixed(8)),
  };
}

function buildPuzzlePrompt(studentContext, sectionNumber, sectionText) {
  return `You are an expert educational game designer. Create a crossword puzzle based ONLY on the section content below.

**Section ${sectionNumber} Content:**
${sectionText}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Requirements:**
- Extract 8-10 KEY TERMS from the section above ONLY
- All words must come from Section ${sectionNumber}
- Words must intersect to form a valid crossword
- Clues reinforce "${studentContext.conceptGap}" concepts
- All answers UPPERCASE, single words (underscore for phrases)
- Grid positions must allow words to intersect properly

**Output Format (JSON ONLY):**
\`\`\`json
{
  "title": "Section ${sectionNumber} Crossword Challenge",
  "description": "Test your knowledge of key concepts",
  "gridSize": 15,
  "clues": [
    {
      "number": 1,
      "direction": "across",
      "clue": "The top number in a fraction",
      "answer": "NUMERATOR",
      "row": 2,
      "col": 1
    },
    {
      "number": 2,
      "direction": "down",
      "clue": "The bottom number in a fraction",
      "answer": "DENOMINATOR",
      "row": 2,
      "col": 1
    }
  ]
}
\`\`\`

Output valid JSON only. No extra text.`;
}

function extractPuzzleJSON(claudeResponse) {
  try {
    const parsed = JSON.parse(claudeResponse);
    if (parsed.clues && Array.isArray(parsed.clues)) return parsed;
  } catch (e) {}
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.clues && Array.isArray(parsed.clues)) return parsed;
    } catch (e) {}
  }
  const objectMatch = claudeResponse.match(/\{[\s\S]*"clues"[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.clues && Array.isArray(parsed.clues)) return parsed;
    } catch (e) {}
  }
  throw new Error('Could not extract valid puzzle JSON from response');
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    logger.info('🧩 Starting educational puzzle generation');

    const { sectionNumber, sectionText, studentContext } = req.body;

    // ✅ Validate — no fileId needed
    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildPuzzlePrompt(studentContext, sectionNumber, trimmedText);

    logger.info('🤖 Calling Claude API for puzzle generation...');

    // ✅ Plain messages API — no Files API, no beta header
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('❌ Claude API error:', errorData);
      return res.status(response.status).json({
        success: false,
        message: errorData.error?.message || `API error: ${response.status}`,
      });
    }

    const claudeResponse = await response.json();
    const responseText = claudeResponse.content?.[0]?.text;

    if (!responseText) {
      return res.status(500).json({ success: false, message: 'Invalid response from Claude' });
    }

    // ✅ Token usage + cost
    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);
    logger.info(`💰 API Cost    | Input: $${cost.inputCost} | Output: $${cost.outputCost} | Total: $${cost.totalCost} USD`);

    let puzzleData;
    try {
      puzzleData = extractPuzzleJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract puzzle JSON');
      return res.status(500).json({
        success: false,
        message: 'Failed to extract puzzle data from response',
        rawResponse: responseText,
      });
    }

    if (!puzzleData.clues || puzzleData.clues.length === 0) {
      return res.status(500).json({ success: false, message: 'No puzzle clues generated' });
    }

    logger.info(`✅ Successfully generated puzzle with ${puzzleData.clues.length} clues`);

    return res.status(200).json({
      success: true,
      message: `Puzzle generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        title: puzzleData.title || 'Educational Crossword Puzzle',
        description: puzzleData.description || 'Test your knowledge',
        gridSize: puzzleData.gridSize || 15,
        clues: puzzleData.clues,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
