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
You are a student-friendly assessment generator.

Rules:
- Use ONLY the provided section text.
- Do NOT add outside knowledge or examples.
- Do NOT create cross-subject questions.
- Only focus on the learning gap if it appears in the section.
- Keep language simple and clear suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or worked examples from the section in questions or options.
- Keep explanations short (1-2 sentences).
- ⚠️ SPELLING RULE: Every answer must be COPIED EXACTLY as it appears in the section text — character by character.
- ⚠️ LANGUAGE RULE: The user prompt will explicitly tell you what language to use. Follow it exactly.
  NEVER decide the output language based on the topic or subject matter.
  If the prompt says "English", write in English even if the topic is about Indian history, Tipu Sultan, Gandhi, etc.
  If the prompt says "Tamil", write in Tamil script.
  The SECTION TEXT language = your OUTPUT language. This is non-negotiable.
- Output valid JSON only. No markdown. No commentary.
`;

function detectLanguage(text = '') {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
  return 'English';
}

function buildQuizPrompt(studentContext, sectionNumber, sectionText, numberOfQuestions) {
  // ── Detect language from the actual section text ──────────────
  const detectedLang = detectLanguage(sectionText);

  return `
Generate EXACTLY ${numberOfQuestions} multiple-choice questions
based ONLY on Section ${sectionNumber}.


SECTION:
${sectionText}


Student:
Name: ${studentContext.studentName}
Grade: ${studentContext.standardId || '6-8'}
Learning Gap: ${studentContext.conceptGap}


⚠️ MANDATORY LANGUAGE RULE — READ THIS FIRST:
The section text above is written in: ${detectedLang}.
You MUST write ALL questions, ALL options (A/B/C/D), and ALL explanations in ${detectedLang} ONLY.
Do NOT translate into any other language.
Do NOT use Hindi if the section is in English.
Do NOT use English if the section is in Tamil/Hindi/Telugu.
The language of your output must EXACTLY match the language of the section text: ${detectedLang}.


Instructions:
- Each question must have 4 options (A, B, C, D).
- Questions must be based directly on events, details, or descriptions in the section.
- Only relate to the learning gap if it appears in the section.
- Keep explanations short (1-2 sentences).
- Do NOT add outside knowledge.
- Do NOT mention "Section", "Section 1", "Section 1.6", or any section reference in question text or options.
- Do NOT copy worked examples or sample problems from the section into questions.
- "correctAnswer" must be the option LABEL only: "A", "B", "C", or "D".


Return JSON:

{
  "questions": [
    {
      "id": 1,
      "question": "",
      "options": [
        { "label": "A", "text": "" },
        { "label": "B", "text": "" },
        { "label": "C", "text": "" },
        { "label": "D", "text": "" }
      ],
      "correctAnswer": "",
      "explanation": ""
    }
  ]
}
`;
}

function extractQuizJSON(claudeResponse) {
  try {
    const parsed = JSON.parse(claudeResponse);
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch (e) {}
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    } catch (e) {}
  }
  const objectMatch = claudeResponse.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    } catch (e) {}
  }
  throw new Error('Could not extract valid quiz JSON from response');
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    logger.info('🎯 Starting targeted quiz generation');

    const { sectionNumber, sectionText, studentContext, numberOfQuestions = 5 } = req.body;

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

    // Trim text to avoid token overflow
    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildQuizPrompt(studentContext, sectionNumber, trimmedText, numberOfQuestions);

    logger.info('🤖 Calling Claude API for quiz generation...');

    const maxTokens = Math.min(4096, Math.max(2000, numberOfQuestions * 300));
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
        max_tokens: maxTokens,
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

    let questions;
    try {
      questions = extractQuizJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract quiz JSON');
      return res.status(500).json({
        success: false,
        message: 'Failed to extract quiz questions from response',
        rawResponse: responseText,
      });
    }

    if (questions.length === 0) {
      return res.status(500).json({ success: false, message: 'No quiz questions generated' });
    }

    logger.info(`✅ Successfully generated ${questions.length} quiz questions`);

    return res.status(200).json({
      success: true,
      message: `Quiz generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        questions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
