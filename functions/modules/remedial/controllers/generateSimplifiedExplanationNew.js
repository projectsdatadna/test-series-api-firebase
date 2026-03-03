const logger = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';

const CLAUDE_PRICING = {
  [MODEL]: {
    inputCostPerMillion: 1.00,
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

/* ================================
   🔒 SYSTEM PROMPT (Guardrails)
================================ */
const SYSTEM_PROMPT = `
You are a student-friendly educational assistant.

Rules:
- Use ONLY the provided section text as the source.
- Do NOT add outside facts or knowledge.
- Do NOT classify the chapter (e.g., "this is literature").
- Do NOT mention textbooks or external advice.
- Always explain the section in a direct student-facing way using "you" and "your".
- If the learning gap is not directly present in the section,
  explain the section clearly without forcing that concept.
- Never return empty fields unless the section truly lacks content.
- Output valid JSON only. No markdown. No extra commentary.
`;

/* ================================
   🧠 USER PROMPT (Optimized)
================================ */
function buildExplanationPrompt(studentContext, sectionNumber, sectionText) {
  return `
Explain Section ${sectionNumber} using ONLY the text below.

SECTION:
${sectionText}

STUDENT:
Name: ${studentContext.studentName}
Learning Gap: ${studentContext.conceptGap}
Grade: ${studentContext.standardId || '6-8'}

Instructions:
- Speak directly to the student using "you".
- Use simple language for Grade ${studentContext.standardId || '6-8'}.
- Explain what happens in the section clearly.
- Only connect to the learning gap if the concept is explicitly mentioned in the section text.
- If it is not mentioned, ignore the learning gap and focus only on explaining the section.
- Do not mention missing concepts.

Return JSON:

{
  "mainExplanation": "",
  "analogy": {
    "title": "Think of it this way...",
    "description": ""
  },
  "keyPoints": [ "Key point 1 from the content, explained in student-friendly language.", "Key point 2 from the content..." ],
  "highlightedTerms": [ { "term": "Term from the content", "definition": "Definition as explained in the content, in simple words." } ],
  "visualSuggestions": [ { "type": "diagram", "icon": "pie_chart", "label": "Visual 1/3", "description": "A visual idea based on the content to help you understand." } ],
  "practiceHint": "A practice tip or reflection question based only on what was covered in the section."
}
`;
}

/* ================================
   🔍 Safe JSON Extraction
================================ */
function extractExplanationJSON(responseText) {
  try {
    return JSON.parse(responseText);
  } catch {}

  const objectMatch = responseText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  throw new Error('Could not extract valid JSON from Claude response');
}

/* ================================
   🚀 MAIN CONTROLLER
================================ */
module.exports = async (req, res) => {
  try {
    const { sectionNumber, sectionText, studentContext } = req.body;

    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    // 🔹 Trim long text to prevent token explosion
    const trimmedText =
      sectionText.length > 60000
        ? sectionText.substring(0, 60000) + '\n...[content truncated]'
        : sectionText;

    const prompt = buildExplanationPrompt(
      studentContext,
      sectionNumber,
      trimmedText
    );

    logger.info('🤖 Calling Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,          // Reduced from 4096 (cost control)
        temperature: 0.3,          // Lower hallucination risk
        system: SYSTEM_PROMPT,     // 🔒 Guardrails here
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
      return res.status(500).json({
        success: false,
        message: 'Invalid response from Claude',
      });
    }

    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;

    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens}`);
    logger.info(`💰 API Cost    | Input: $${cost.inputCost} | Output: $${cost.outputCost} | Total: $${cost.totalCost} USD`);

    const explanationData = extractExplanationJSON(responseText);

    return res.status(200).json({
      success: true,
      message: `Simplified explanation generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        explanation: explanationData,
        generatedAt: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          costUSD: cost.totalCost,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};