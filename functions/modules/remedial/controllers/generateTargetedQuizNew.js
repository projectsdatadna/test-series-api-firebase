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

function buildQuizPrompt(studentContext, sectionNumber, sectionText, numberOfQuestions) {
  return `You are an expert educational assessment creator. Generate ${numberOfQuestions} targeted quiz questions based ONLY on the section content below.

**Section ${sectionNumber} Content:**
${sectionText}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Requirements:**
- Generate EXACTLY ${numberOfQuestions} multiple-choice questions
- Based ONLY on the section content above
- Each question must have 4 options (A, B, C, D)
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Focus on "${studentContext.conceptGap}" concepts
- Test understanding, not memorization

**Output Format (JSON ONLY):**
\`\`\`json
{
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": [
        { "label": "A", "text": "First option" },
        { "label": "B", "text": "Second option" },
        { "label": "C", "text": "Third option" },
        { "label": "D", "text": "Fourth option" }
      ],
      "correctAnswer": "B",
      "explanation": "Why B is correct"
    }
  ]
}
\`\`\`

Output valid JSON only. No extra text.`;
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
        max_tokens: 4096,
        temperature: 0.3,
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
