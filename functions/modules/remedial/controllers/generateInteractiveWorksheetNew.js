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
You are a student-friendly worksheet generator.

Rules:
- Use ONLY the provided section text.
- Do NOT add outside knowledge or examples.
- ⚠️ SPELLING RULE: Every "answer" must be COPIED EXACTLY as it appears in the section text — character by character. Do NOT retype, paraphrase, or reconstruct Tamil words from memory.
- Only connect to the learning gap if it appears in the section.
- If the learning gap is not present, ignore it.
- Keep language simple and clear suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or examples from the section text in questions — test the concept only.
- Keep answers concise.
- ⚠️ LANGUAGE RULE: Detect the language of the SECTION text. Write all clues, title, and description in the SAME language as the section text. If the section is in Tamil, write clues in Tamil. If Hindi, write in Hindi. If English, write in English. NEVER switch languages. JSON keys must stay in English, but all values (clues, title, description) must match the section language.
- Output valid JSON only. No markdown. No extra commentary.
`;

// ✅ Same language detection fix as puzzle generator
function detectSectionLanguage(text = '') {
  const tamil   = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const english = (text.match(/[A-Za-z]/g)        || []).length;
  if (tamil > 10 && tamil > english * 0.3) return 'TAMIL';
  return 'ENGLISH';
}

function buildWorksheetPrompt(studentContext, sectionNumber, sectionText) {
  // ✅ Same language directive injection as puzzle generator
  const detectedLang = detectSectionLanguage(sectionText);
  const langDirective = detectedLang === 'TAMIL'
    ? `⚠️ LANGUAGE DETECTED: TAMIL. All questions, answers, titles, and descriptions MUST be in Tamil script (Unicode). Do NOT use English or Roman letters for content values.`
    : `⚠️ LANGUAGE DETECTED: ENGLISH. All questions, answers, titles, and descriptions MUST be in English. Do NOT use Tamil script anywhere.`;

  return `
${langDirective}

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

function extractWorksheetJSON(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
  } catch (e) {}

  const jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
    } catch (e) {}
  }

  const objectMatch = responseText.match(/\{[\s\S]*"activities"[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.activities && Array.isArray(parsed.activities)) return parsed;
    } catch (e) {}
  }

  throw new Error('Could not extract valid worksheet JSON from response');
}

module.exports = async (req, res) => {
  try {
    logger.info('📝 Starting interactive worksheet generation');

    const { sectionNumber, sectionText, studentContext } = req.body;

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

    const prompt = buildWorksheetPrompt(studentContext, sectionNumber, trimmedText);

    // ✅ Log detected language
    const detectedLang = detectSectionLanguage(trimmedText);
    logger.info(`🌐 Detected section language: ${detectedLang}`);
    logger.info('🤖 Calling Azure OpenAI API for worksheet generation...');

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens:  5000,
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
        studentName:  studentContext.studentName,
        conceptGap:   studentContext.conceptGap,
        sectionNumber,
        title:        worksheetData.title       || 'Interactive Worksheet',
        description:  worksheetData.description || 'Practice exercises',
        activities:   worksheetData.activities,
        generatedAt:  new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
};