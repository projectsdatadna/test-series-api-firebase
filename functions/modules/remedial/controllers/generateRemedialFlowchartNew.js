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
You are a student-friendly visual learning assistant.

Rules:
- Use ONLY the provided section text as source.
- Do NOT add outside facts, knowledge, or interpretations.
- Do NOT invent decision points unless they clearly exist in the text.
- Do NOT invent examples not present in the section.
- Use exact or simplified wording directly from the section.
- Keep flowcharts concise with simple, clear labels suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or worked examples from the section in node labels — show concepts only.
- Output ONLY valid Mermaid flowchart code blocks.
- No explanations. No markdown labels. No extra commentary.
`;

function buildRemedialPrompt(studentContext, sectionNumber, sectionText) {
  return `
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

function extractMermaidFlowcharts(claudeResponse) {
  const mermaidRegex = /```(?:mermaid)?\s*\n([\s\S]*?)```/g;
  const flowcharts = [];
  let match;
  let slideNumber = 1;

  while ((match = mermaidRegex.exec(claudeResponse)) !== null) {
    const code = match[1].trim();
    if (code.startsWith('flowchart') || code.startsWith('graph')) {
      flowcharts.push({ slideNumber: slideNumber, mermaidCode: code });
      slideNumber++;
    }
  }
  return flowcharts;
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    logger.info('🚀 Starting remedial flowchart generation');

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

    logger.info('✅ Request validated:', {
      sectionNumber,
      studentName: studentContext.studentName,
      conceptGap: studentContext.conceptGap,
    });

    // Trim text to avoid token overflow
    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildRemedialPrompt(studentContext, sectionNumber, trimmedText);

    logger.info('🤖 Calling Claude API...');

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
        max_tokens: 3000,
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

    const flowcharts = extractMermaidFlowcharts(responseText);

    if (flowcharts.length === 0) {
      logger.warn('⚠️ No Mermaid flowcharts found in response');
      return res.status(500).json({
        success: false,
        message: 'Claude did not generate Mermaid flowcharts',
        rawResponse: responseText,
      });
    }

    logger.info(`✅ Successfully generated ${flowcharts.length} flowcharts for Section ${sectionNumber}`);

    return res.status(200).json({
      success: true,
      message: `Flowcharts generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        flowcharts,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
