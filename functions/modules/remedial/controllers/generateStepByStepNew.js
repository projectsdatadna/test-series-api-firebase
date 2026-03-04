const logger = require('../utils/logger');

const CLAUDE_PRICING = {
  'claude-haiku-4-5-20251001': {
    inputCostPerMillion:  1.00,
    outputCostPerMillion: 5.00,
  },
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = CLAUDE_PRICING[model] ?? {
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
  };

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
You are a student-friendly educational assistant.

Rules:
- Use ONLY the provided section text as the source.
- Do NOT add outside facts, examples, or knowledge.
- Do NOT create cross-subject analogies.
- Only connect to the learning gap if it is explicitly mentioned in the section text.
- If the learning gap is not present, ignore it.
- Keep language simple for Grade 6-8.
- Do NOT invent practice questions unrelated to the section.
- Output valid JSON only. No markdown. No extra text.
`;

function buildStepsPrompt(studentContext, sectionNumber, sectionText) {
  return `
Create a clear step-by-step walkthrough for Section ${sectionNumber}
using ONLY the section text below.

SECTION:
${sectionText}

STUDENT:
Name: ${studentContext.studentName}
Learning Gap: ${studentContext.conceptGap}
Grade: ${studentContext.standardId || '6-8'}

Instructions:
- Explain in simple language using "you".
- Break the section into 4-6 logical learning steps.
- Each step must come directly from the section text.
- Do NOT add outside examples.
- Do NOT invent extra information.
- Only relate to the learning gap if it appears in the section.
- Practice questions must be based directly on events or facts in the section.

Return JSON in this format:

{
  "title": "",
  "description": "",
  "steps": [
    {
      "number": 1,
      "title": "",
      "description": "",
      "example": "",
      "tips": [],
      "commonMistakes": [],
      "practiceQuestion": {
        "question": "",
        "options": [],
        "answer": "",
        "explanation": ""
      }
    }
  ]
}
`;
}

function extractStepsJSON(claudeResponse) {
  try { return JSON.parse(claudeResponse); } catch (e) {}
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch (e) {} }
  const objectMatch = claudeResponse.match(/\{[\s\S]*\}/);
  if (objectMatch) { try { return JSON.parse(objectMatch[0]); } catch (e) {} }
  throw new Error('Could not extract valid steps JSON from response');
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    const { sectionNumber, sectionText, studentContext } = req.body;

    // Validate — no fileId needed
    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Trim text to avoid token overflow
    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildStepsPrompt(studentContext, sectionNumber, trimmedText);

    logger.info('🤖 Calling Claude API for step-by-step...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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

    // ✅ Token usage — same as explanation controller
    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;

    // ✅ Cost calculation
    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    // ✅ Structured log per API hit
    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens}`);
    logger.info(`💰 API Cost    | Input: $${cost.inputCost} | Output: $${cost.outputCost} | Total: $${cost.totalCost} USD`);

    const stepsData = extractStepsJSON(responseText);

    return res.status(200).json({
      success: true,
      message: `Step-by-step guide generated successfully for Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        title: stepsData.title,
        description: stepsData.description,
        steps: stepsData.steps,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
