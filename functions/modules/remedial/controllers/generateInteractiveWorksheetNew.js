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
  const totalCost  = inputCost + outputCost;
  return {
    inputCost:  parseFloat(inputCost.toFixed(8)),
    outputCost: parseFloat(outputCost.toFixed(8)),
    totalCost:  parseFloat(totalCost.toFixed(8)),
  };
}

function buildWorksheetPrompt(studentContext, sectionNumber, sectionText) {
  return `You are an expert educational content designer. Create an interactive worksheet based ONLY on the section content below.

**Section ${sectionNumber} Content:**
${sectionText}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Instructions:**
- Create 3-4 DIFFERENT activity types from: matching, fill-blank, true-false
- All content must be from the section above ONLY
- Focus on "${studentContext.conceptGap}" learning gaps
- Age-appropriate for ${studentContext.standardId || 'Grade 6-8'}

**Output Format (JSON ONLY):**
\`\`\`json
{
  "title": "Section ${sectionNumber} Interactive Worksheet",
  "description": "Practice exercises to reinforce your understanding",
  "activities": [
    {
      "type": "matching",
      "title": "Match the Terms",
      "instructions": "Match each term with its correct definition",
      "items": [{ "left": "Term", "right": "Definition", "id": 1 }]
    },
    {
      "type": "fill-blank",
      "title": "Complete the Sentences",
      "instructions": "Fill in the blanks with the correct words",
      "questions": [{ "id": 1, "sentence": "A ____ represents a part of a whole", "answer": "fraction" }],
      "wordBank": ["fraction", "numerator", "denominator"]
    },
    {
      "type": "true-false",
      "title": "True or False",
      "instructions": "Select True or False for each statement",
      "questions": [{ "id": 1, "statement": "The statement here", "answer": true, "explanation": "Why" }]
    }
  ]
}
\`\`\`

Output valid JSON only. No extra text.`;
}

function extractWorksheetJSON(claudeResponse) {
  try {
    const parsed = JSON.parse(claudeResponse);
    if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
  } catch (e) {}
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
    } catch (e) {}
  }
  const objectMatch = claudeResponse.match(/\{[\s\S]*"activities"[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
    } catch (e) {}
  }
  throw new Error('Could not extract valid worksheet JSON from response');
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    logger.info('📝 Starting interactive worksheet generation');

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

    const prompt = buildWorksheetPrompt(studentContext, sectionNumber, trimmedText);

    logger.info('🤖 Calling Claude API for worksheet generation...');

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

    // ✅ Token usage + cost — same pattern
    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;
    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens}`);
    logger.info(`💰 API Cost    | Input: $${cost.inputCost} | Output: $${cost.outputCost} | Total: $${cost.totalCost} USD`);

    let worksheetData;
    try {
      worksheetData = extractWorksheetJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract worksheet JSON');
      return res.status(500).json({
        success: false,
        message: 'Failed to extract worksheet data from response',
        rawResponse: responseText,
      });
    }

    if (!worksheetData.activities || worksheetData.activities.length === 0) {
      return res.status(500).json({ success: false, message: 'No worksheet activities generated' });
    }

    logger.info(`✅ Successfully generated worksheet with ${worksheetData.activities.length} activities`);

    return res.status(200).json({
      success: true,
      message: `Worksheet generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        title: worksheetData.title || 'Interactive Worksheet',
        description: worksheetData.description || 'Practice exercises',
        activities: worksheetData.activities,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
