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


const SYSTEM_PROMPT = `
You are a student-friendly educational puzzle generator.

Rules:
- Use ONLY the provided section text.
- Do NOT add outside knowledge.
- Only connect to the learning gap if it appears in the section.
- If the learning gap is not present, ignore it.
- Extract key words directly from the section.
- Keep clues simple and clear.
- Do NOT invent technical crossword grid logic.
- Output valid JSON only. No markdown. No commentary.
`;

function buildPuzzlePrompt(studentContext, sectionNumber, sectionText) {
  return `
Create a crossword-style puzzle using ONLY Section ${sectionNumber}.

SECTION:
${sectionText}

Student:
Name: ${studentContext.studentName}
Grade: ${studentContext.standardId || '6-8'}
Learning Gap: ${studentContext.conceptGap}

Instructions:
- Extract 8 to 10 key terms directly from the section.
- All answers must be UPPERCASE.
- Answers must be single words (use underscore for phrases).
- Create simple clues based only on the section.
- Only focus on the learning gap if it appears in the section.
- Do NOT create complex grid intersection logic.
- Provide simple row and column placeholders.

Return JSON:

{
  "title": "",
  "description": "",
  "gridSize": 12,
  "clues": [
    {
      "number": 1,
      "direction": "across",
      "clue": "",
      "answer": "",
      "row": 1,
      "col": 1
    }
  ]
}
`;
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
        max_tokens: 2000,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
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
