const logger = require('../utils/logger');

/**
 * Build prompt for Claude to generate quiz questions
 */
function buildQuizPrompt(studentContext, sectionNumber, numberOfQuestions) {
  return `You are an expert educational assessment creator. Your task is to generate ${numberOfQuestions} targeted quiz questions based on a specific section from an educational document.

**CRITICAL INSTRUCTIONS:**
1. Read Section ${sectionNumber} from the attached document CAREFULLY
2. Generate EXACTLY ${numberOfQuestions} multiple-choice questions (MCQs)
3. Questions must be based ONLY on content from Section ${sectionNumber}
4. Each question must have 4 options (A, B, C, D)
5. Mark the correct answer clearly
6. Include a brief explanation for the correct answer

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Question Requirements:**
- Focus on "${studentContext.conceptGap}" concepts from Section ${sectionNumber}
- Mix difficulty levels (2 easy, 2 medium, 1 hard)
- Test understanding, not just memorization
- Use clear, student-friendly language
- Avoid trick questions

**Output Format (JSON ONLY):**
\`\`\`json
{
  "questions": [
    {
      "id": 1,
      "question": "What is the main concept explained in this section?",
      "options": [
        { "label": "A", "text": "First option" },
        { "label": "B", "text": "Second option" },
        { "label": "C", "text": "Third option" },
        { "label": "D", "text": "Fourth option" }
      ],
      "correctAnswer": "B",
      "explanation": "Brief explanation why B is correct"
    }
  ]
}
\`\`\`

**IMPORTANT:**
- Output MUST be valid JSON only
- No markdown code blocks
- No extra text before or after JSON
- All ${numberOfQuestions} questions must be about Section ${sectionNumber} content

Now generate ${numberOfQuestions} quiz questions from Section ${sectionNumber}.`;
}

/**
 * Extract JSON from Claude response
 */
function extractQuizJSON(claudeResponse) {
  try {
    // Try to parse directly
    const parsed = JSON.parse(claudeResponse);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
  } catch (e) {
    // Try to extract JSON from code blocks
    const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions;
        }
      } catch (e2) {
        // Continue to fallback
      }
    }

    // Try to extract plain JSON object
    const objectMatch = claudeResponse.match(/\{[\s\S]*"questions"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions;
        }
      } catch (e3) {
        // Continue to error
      }
    }
  }

  throw new Error('Could not extract valid quiz JSON from response');
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('🎯 Starting targeted quiz generation');

    const fileId = req.body.fileId;
    const sectionNumber = req.body.sectionNumber;
    const studentContext = req.body.studentContext;
    const numberOfQuestions = req.body.numberOfQuestions || 5;

    // Validation
    if (!fileId || !sectionNumber || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fileId, sectionNumber, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      logger.error('❌ CLAUDE_API_KEY not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    logger.info('✅ Request validated:', {
      fileId: fileId.substring(0, 30) + '...',
      sectionNumber: sectionNumber,
      numberOfQuestions: numberOfQuestions,
      studentName: studentContext.studentName,
      conceptGap: studentContext.conceptGap,
    });

    const prompt = buildQuizPrompt(studentContext, sectionNumber, numberOfQuestions);

    logger.info('🤖 Calling Claude API for quiz generation...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'document',
                source: {
                  type: 'file',
                  file_id: fileId,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(function() { return {}; });
      logger.error('❌ Claude API error:', errorData);

      return res.status(response.status).json({
        success: false,
        message: (errorData.error && errorData.error.message) || ('API error: ' + response.status),
      });
    }

    const claudeResponse = await response.json();

    if (!claudeResponse.content || !claudeResponse.content[0] || !claudeResponse.content[0].text) {
      logger.error('❌ Invalid response structure');
      return res.status(500).json({
        success: false,
        message: 'Invalid response from Claude',
      });
    }

    const responseText = claudeResponse.content[0].text;

    logger.info('✅ Response received:', {
      length: responseText.length,
      preview: responseText.substring(0, 200),
    });

    let questions;
    try {
      questions = extractQuizJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract quiz JSON');
      logger.warn('Full response:', responseText);

      return res.status(500).json({
        success: false,
        message: 'Failed to extract quiz questions from response',
        rawResponse: responseText,
      });
    }

    if (questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No quiz questions generated',
      });
    }

    logger.info('✅ Successfully generated ' + questions.length + ' quiz questions');

    return res.status(200).json({
      success: true,
      message: 'Quiz generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        questions: questions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
