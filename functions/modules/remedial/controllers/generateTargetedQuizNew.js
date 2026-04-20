const logger = require('../utils/logger');
const axios  = require('axios');

const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

const GPT_PRICING = {
  'gpt-4o-mini': {
    inputCostPerMillion:  0.15,
    outputCostPerMillion: 0.60,
  },
};

function calculateCost(inputTokens, outputTokens) {
  const pricing = GPT_PRICING['gpt-4o-mini'];
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

⚠️ CRITICAL — CORRECT ANSWER DISTRIBUTION RULE:
You MUST spread correct answers across ALL four options. Do NOT make option "A" the correct answer for more than 1 question in a row.
For ${numberOfQuestions} questions, the correct answers must be distributed roughly evenly:
- Approximately 25% should be A, 25% B, 25% C, 25% D.
- No single option label should appear as the correct answer more than ${Math.ceil(numberOfQuestions / 2)} times total.
- The sequence of correct answers (e.g., B, D, A, C, B, A, D, C...) must appear randomized and unpredictable.
- Deliberately place the correct answer at different positions (A, B, C, D) for each question.

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

function extractQuizJSON(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch (e) {}

  const jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    } catch (e) {}
  }

  const objectMatch = responseText.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    } catch (e) {}
  }

  throw new Error('Could not extract valid quiz JSON from response');
}

module.exports = async (req, res) => {
  try {
    logger.info('🎯 Starting targeted quiz generation');

    const { sectionNumber, sectionText, studentContext, numberOfQuestions = 5 } = req.body;

    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    // ✅ Azure env check
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      return res.status(500).json({ success: false, message: 'Server configuration error: Azure OpenAI env vars missing' });
    }

    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildQuizPrompt(studentContext, sectionNumber, trimmedText, numberOfQuestions);

    // ✅ Log detected language
    const detectedLang = detectLanguage(trimmedText);
    logger.info(`🌐 Detected section language: ${detectedLang}`);
    logger.info('🤖 Calling Azure OpenAI API for quiz generation...');

    const maxTokens = Math.min(4096, Math.max(2000, numberOfQuestions * 300));

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens:  maxTokens,
        temperature: 0.3,
      },
      {
        headers: {
          'api-key':      AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    // ✅ Azure response shape
    const responseText = response.data?.choices?.[0]?.message?.content;

    if (!responseText) {
      return res.status(500).json({ success: false, message: 'Invalid response from Azure OpenAI' });
    }

    // ✅ Azure token fields
    const inputTokens  = response.data?.usage?.prompt_tokens     ?? 0;
    const outputTokens = response.data?.usage?.completion_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;
    const cost = calculateCost(inputTokens, outputTokens);

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
        studentName:  studentContext.studentName,
        conceptGap:   studentContext.conceptGap,
        sectionNumber,
        questions,
        generatedAt:  new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
};