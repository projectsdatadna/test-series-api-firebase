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

function buildRemedialPrompt(studentContext, sectionNumber, sectionText) {
  return `You are an expert educational content creator. Create 2-3 Mermaid flowcharts based EXCLUSIVELY on the section content below.

**Section ${sectionNumber} Content:**
${sectionText}

**Student Information:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade Level: ${studentContext.standardId || 'Grade 6-8'}

**IMPORTANT REQUIREMENTS:**
- ONLY use content from the section text above
- DO NOT use general knowledge
- Use the EXACT terminology from the section
- Create 2-3 flowcharts covering the main concepts

**Output Format:**
Output ONLY Mermaid code blocks. Each flowchart must:
- Start with \`flowchart TD\`
- Use student-friendly language from the section
- Include decision points and examples from the section
- Add colors with style commands

\`\`\`mermaid
flowchart TD
    Start([Title from Section ${sectionNumber}]) --> Concept[Main concept from section]
    Concept --> Detail1[Detail 1 from section]
    Concept --> Detail2[Detail 2 from section]
    Detail1 --> Example[Example from section]
    Detail2 --> Example
    Example --> Practice([Practice what you learned])
    style Start fill:#667eea,color:#fff
    style Practice fill:#16a34a,color:#fff
\`\`\`

Output ONLY the Mermaid code blocks, nothing else.`;
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
        max_tokens: 8000,
        temperature: 0.2,
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
