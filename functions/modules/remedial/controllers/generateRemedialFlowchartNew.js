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
You are a student-friendly visual learning assistant.

Rules:
- Use ONLY the provided section text as source.
- Do NOT add outside facts, knowledge, or interpretations.
- ⚠️ SPELLING RULE: Every "answer" must be COPIED EXACTLY as it appears in the section text — character by character. Do NOT retype, paraphrase, or reconstruct Tamil words from memory.
- Do NOT invent decision points unless they clearly exist in the text.
- Do NOT invent examples not present in the section.
- Use exact or simplified wording directly from the section.
- Keep flowcharts concise with simple, clear labels suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or worked examples from the section in node labels — show concepts only.
- ⚠️ LANGUAGE RULE: Detect the language of the SECTION text. Write all clues, title, and description in the SAME language as the section text. If the section is in Tamil, write clues in Tamil. If Hindi, write in Hindi. If English, write in English. NEVER switch languages. JSON keys must stay in English, but all values (clues, title, description) must match the section language.
- Output ONLY valid Mermaid flowchart code blocks.
- No explanations. No markdown labels. No extra commentary.
`;

// ✅ Same language detection as puzzle + worksheet generators
function detectSectionLanguage(text = '') {
  const tamil   = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const english = (text.match(/[A-Za-z]/g)        || []).length;
  if (tamil > 10 && tamil > english * 0.3) return 'TAMIL';
  return 'ENGLISH';
}

function buildRemedialPrompt(studentContext, sectionNumber, sectionText) {
  // ✅ Same language directive injection as puzzle + worksheet generators
  const detectedLang = detectSectionLanguage(sectionText);
  const langDirective = detectedLang === 'TAMIL'
    ? `⚠️ LANGUAGE DETECTED: TAMIL. All node labels, titles, and descriptions MUST be in Tamil script (Unicode). Do NOT use English or Roman letters for content values.`
    : `⚠️ LANGUAGE DETECTED: ENGLISH. All node labels, titles, and descriptions MUST be in English. Do NOT use Tamil script anywhere.`;

  return `
${langDirective}

Create 2 or 3 Mermaid flowcharts based ONLY on Section ${sectionNumber}.

SECTION:
${sectionText}

Student:
Name: ${studentContext.studentName}
Grade: ${studentContext.standardId || '6-8'}

Instructions:
- Each flowchart must start with: flowchart TD
- Show the sequence of events or main ideas from the section.
- Only include events, characters, or details directly mentioned.
- Keep each flowchart under 12 nodes.
- Use short, simple node labels written in clear language suitable for school students (age 10–18).
- Do NOT mention section names, section numbers, or copy worked examples from the section into node labels.
- Do NOT add extra explanation.
- Do NOT invent decision branches unless clearly shown in the section.

Return ONLY Mermaid code blocks.
Each must begin with:
flowchart TD
`;
}

function extractMermaidFlowcharts(responseText) {
  const mermaidRegex = /```(?:mermaid)?\s*\n([\s\S]*?)```/g;
  const flowcharts = [];
  let match;
  let slideNumber = 1;

  while ((match = mermaidRegex.exec(responseText)) !== null) {
    const code = match[1].trim();
    if (code.startsWith('flowchart') || code.startsWith('graph')) {
      flowcharts.push({ slideNumber: slideNumber, mermaidCode: code });
      slideNumber++;
    }
  }
  return flowcharts;
}

module.exports = async (req, res) => {
  try {
    logger.info('🚀 Starting remedial flowchart generation');

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

    logger.info('✅ Request validated:', {
      sectionNumber,
      studentName: studentContext.studentName,
      conceptGap:  studentContext.conceptGap,
    });

    const trimmedText = sectionText.length > 25000
      ? sectionText.substring(0, 25000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildRemedialPrompt(studentContext, sectionNumber, trimmedText);

    // ✅ Log detected language
    const detectedLang = detectSectionLanguage(trimmedText);
    logger.info(`🌐 Detected section language: ${detectedLang}`);
    logger.info('🤖 Calling Azure OpenAI API for flowchart generation...');

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens:  6000,
        temperature: 0.5,
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

    const flowcharts = extractMermaidFlowcharts(responseText);

    if (flowcharts.length === 0) {
      logger.warn('⚠️ No Mermaid flowcharts found in response');
      return res.status(500).json({
        success: false,
        message: 'Azure OpenAI did not generate Mermaid flowcharts',
        rawResponse: responseText,
      });
    }

    logger.info(`✅ Successfully generated ${flowcharts.length} flowcharts for Section ${sectionNumber}`);

    return res.status(200).json({
      success: true,
      message: `Flowcharts generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap:  studentContext.conceptGap,
        sectionNumber,
        flowcharts,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
};