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
You are a student-friendly educational assistant.

Rules:
- Use ONLY the provided section text as the source.
- Do NOT add outside facts, examples, or knowledge.
- Do NOT create cross-subject analogies.
- Only connect to the learning gap if it is explicitly mentioned in the section text.
- If the learning gap is not present, ignore it.
- Keep language simple and clear suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or worked examples from the section — explain concepts only.
- Do NOT invent practice questions unrelated to the section.
- ⚠️ LANGUAGE RULE: Detect the language of the SECTION text. Write all clues, title, and description in the SAME language as the section text. If the section is in Tamil, write clues in Tamil. If Hindi, write in Hindi. If English, write in English. NEVER switch languages. JSON keys must stay in English, but all values (clues, title, description) must match the section language.
- ⚠️ SPELLING RULE: Every "answer" must be COPIED EXACTLY as it appears in the section text — character by character. Do NOT retype, paraphrase, or reconstruct Tamil words from memory.
- Output valid JSON only. No markdown. No extra text.
`;

// ✅ Same language detection as all other generators
function detectSectionLanguage(text = '') {
  const tamil   = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const english = (text.match(/[A-Za-z]/g)        || []).length;
  if (tamil > 10 && tamil > english * 0.3) return 'TAMIL';
  return 'ENGLISH';
}

function buildStepsPrompt(studentContext, sectionNumber, sectionText) {
  // ✅ Same language directive injection as all other generators
  const detectedLang = detectSectionLanguage(sectionText);
  const langDirective = detectedLang === 'TAMIL'
    ? `⚠️ LANGUAGE DETECTED: TAMIL. All titles, descriptions, steps, examples, tips, questions, and answers MUST be in Tamil script (Unicode). Do NOT use English or Roman letters for content values.`
    : `⚠️ LANGUAGE DETECTED: ENGLISH. All titles, descriptions, steps, examples, tips, questions, and answers MUST be in English. Do NOT use Tamil script anywhere.`;

  return `
${langDirective}

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
- Use clear language suitable for school students (age 10–18).
- Break the section into 4-6 logical learning steps.
- Each step must come directly from the section text.
- Do NOT mention section names, section numbers, or copy worked examples/sample problems from the section — explain the concept only.
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

function extractStepsJSON(responseText) {
  try { return JSON.parse(responseText); } catch (e) {}
  const jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch (e) {} }
  const objectMatch = responseText.match(/\{[\s\S]*\}/);
  if (objectMatch) { try { return JSON.parse(objectMatch[0]); } catch (e) {} }
  throw new Error('Could not extract valid steps JSON from response');
}

module.exports = async (req, res) => {
  try {
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

    const prompt = buildStepsPrompt(studentContext, sectionNumber, trimmedText);

    // ✅ Log detected language
    const detectedLang = detectSectionLanguage(trimmedText);
    logger.info(`🌐 Detected section language: ${detectedLang}`);
    logger.info('🤖 Calling Azure OpenAI API for step-by-step...');

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens:  6000,
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

    const stepsData = extractStepsJSON(responseText);

    return res.status(200).json({
      success: true,
      message: `Step-by-step guide generated successfully for Section ${sectionNumber}`,
      data: {
        studentName:  studentContext.studentName,
        conceptGap:   studentContext.conceptGap,
        sectionNumber,
        title:        stepsData.title,
        description:  stepsData.description,
        steps:        stepsData.steps,
        generatedAt:  new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', error.message);
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
};