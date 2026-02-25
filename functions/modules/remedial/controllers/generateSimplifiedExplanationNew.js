const logger = require('../utils/logger');

const CLAUDE_PRICING = {
  'claude-haiku-4-5-20251001': {
    inputCostPerMillion:  1.00,   // $1.00 per 1M input tokens
    outputCostPerMillion: 5.00,   // $5.00 per 1M output tokens
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

function buildExplanationPrompt(studentContext, sectionNumber, sectionText) {
  return `You are an expert educational content creator. Your task is to generate a simplified explanation of Section ${sectionNumber}.

**Section Content:**
${sectionText}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Output Format (JSON ONLY):**
\`\`\`json
{
  "mainExplanation": "...",
  "analogy": { "title": "Think of it this way...", "description": "..." },
  "keyPoints": ["...", "..."],
  "highlightedTerms": [{ "term": "...", "definition": "..." }],
  "visualSuggestions": [
    { "type": "diagram", "icon": "pie_chart", "label": "Visual 1/3", "description": "..." }
  ],
  "practiceHint": "..."
}
\`\`\`

Output valid JSON only. No markdown, no extra text.`;
}

function extractExplanationJSON(claudeResponse) {
  try { return JSON.parse(claudeResponse); } catch (e) {}
  const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch (e) {} }
  const objectMatch = claudeResponse.match(/\{[\s\S]*\}/);
  if (objectMatch) { try { return JSON.parse(objectMatch[0]); } catch (e) {} }
  throw new Error('Could not extract valid explanation JSON from response');
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
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

    // Trim text to avoid token overflow (~100K char limit safe margin)
    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt = buildExplanationPrompt(studentContext, sectionNumber, trimmedText);

    logger.info('🤖 Calling Claude API...');

    // ✅ Plain messages API — no Files API, no file_id, no beta header
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.7,
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

    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;

    // ✅ Cost calculation
    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    // ✅ Structured log per API hit
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
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
