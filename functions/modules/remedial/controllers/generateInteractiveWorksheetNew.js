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

const SYSTEM_PROMPT = `
You are a student-friendly worksheet generator.

Rules:
- Use ONLY the provided section text.
- Do NOT add outside knowledge or examples.
- Only connect to the learning gap if it appears in the section.
- If the learning gap is not present, ignore it.
- Keep language simple and clear suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or examples from the section text in questions — test the concept only.
- Keep answers concise.
- Output valid JSON only. No markdown. No extra commentary.
`;

function buildWorksheetPrompt(studentContext, sectionNumber, sectionText) {
  return `
Create an interactive worksheet for Section ${sectionNumber}
using ONLY the section text below.

SECTION:
${sectionText}

Student:
Name: ${studentContext.studentName}
Grade: ${studentContext.standardId || '6-8'}
Learning Gap: ${studentContext.conceptGap}

Instructions:
- Create 3 different activity types from: matching, fill-blank, true-false.
- All questions must come directly from the section content.
- Only focus on the learning gap if it appears in the section.
- Write all questions in simple, clear language suitable for school students (age 10–18).
- Do NOT mention section names, section numbers, or copy example sentences/worked examples from the section into questions.
- Keep wording simple and clear.

Return JSON:

{
  "title": "",
  "description": "",
  "activities": [
    {
      "type": "matching",
      "title": "",
      "instructions": "",
      "items": [
        { "left": "", "right": "", "id": 1 }
      ]
    },
    {
      "type": "fill-blank",
      "title": "",
      "instructions": "",
      "questions": [
        { "id": 1, "sentence": "", "answer": "" }
      ],
      "wordBank": []
    },
    {
      "type": "true-false",
      "title": "",
      "instructions": "",
      "questions": [
        { "id": 1, "statement": "", "answer": true, "explanation": "" }
      ]
    }
  ]
}
`;
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
