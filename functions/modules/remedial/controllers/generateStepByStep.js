const logger = require('../utils/logger');

/**
 * Build prompt for Claude to generate step-by-step walkthrough
 */
function buildStepsPrompt(studentContext, sectionNumber) {
  return `You are an expert educational content creator specializing in breaking down complex concepts into clear, sequential steps. Your task is to create a detailed step-by-step walkthrough based on a specific section from an educational document.

**CRITICAL INSTRUCTIONS:**
1. Read Section ${sectionNumber} from the attached document CAREFULLY
2. Identify the MAIN CONCEPT or PROCEDURE in Section ${sectionNumber}
3. Break it down into 4-6 CLEAR, SEQUENTIAL STEPS
4. Each step should build on the previous one
5. All content must be directly from Section ${sectionNumber}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Step-by-Step Requirements:**
Each step should include:
- **Title**: Short, action-oriented (e.g., "Identify the numerator")
- **Description**: Clear explanation of what to do (2-3 sentences)
- **Example**: Concrete example demonstrating the step
- **Tips**: 2-3 helpful tips for this step
- **Common Mistakes**: 1-2 mistakes students often make
- **Practice Question**: One question to test understanding of this step

**Output Format (JSON ONLY):**
\`\`\`json
{
  "title": "How to Work with Fractions",
  "description": "A step-by-step guide to understanding and working with fractions from Section ${sectionNumber}",
  "steps": [
    {
      "number": 1,
      "title": "Understand the Parts of a Fraction",
      "description": "A fraction has two parts: the numerator (top number) and the denominator (bottom number). The denominator tells you how many equal parts the whole is divided into, and the numerator tells you how many of those parts you have.",
      "example": "In the fraction 3/4, the denominator is 4 (the whole is divided into 4 equal parts) and the numerator is 3 (we have 3 of those parts).",
      "tips": [
        "The denominator is always on the bottom",
        "Think of the denominator as 'down below'",
        "The numerator counts the parts you actually have"
      ],
      "commonMistakes": [
        "Confusing which number is on top and which is on bottom",
        "Thinking the larger number always goes on top"
      ],
      "practiceQuestion": {
        "question": "In the fraction 5/8, what does the 8 represent?",
        "answer": "The 8 represents the denominator - it tells us the whole is divided into 8 equal parts",
        "explanation": "The bottom number (denominator) always tells us how many equal parts make up the whole"
      }
    },
    {
      "number": 2,
      "title": "Visualize the Fraction",
      "description": "Draw or imagine a shape divided into equal parts based on the denominator. Then shade in the number of parts shown by the numerator. This helps you see what the fraction actually represents.",
      "example": "For 3/4, draw a circle divided into 4 equal parts. Shade 3 of those parts. You can see that 3/4 means 3 out of 4 parts are filled.",
      "tips": [
        "Use circles, rectangles, or number lines for visualization",
        "Make sure all parts are equal in size",
        "Color or shade the parts clearly"
      ],
      "commonMistakes": [
        "Making unequal parts when dividing the shape",
        "Shading the wrong number of parts"
      ],
      "practiceQuestion": {
        "question": "Draw a rectangle to represent 2/5. How many parts should you shade?",
        "answer": "Divide the rectangle into 5 equal parts and shade 2 of them",
        "explanation": "The denominator (5) tells us how many parts to divide into, and the numerator (2) tells us how many to shade"
      }
    }
  ]
}
\`\`\`

**Important Rules:**
- Output MUST be valid JSON only
- No markdown code blocks
- No extra text before or after JSON
- Create 4-6 steps (no more, no less)
- All content must be from Section ${sectionNumber}
- Steps should be sequential and build on each other
- Focus on "${studentContext.conceptGap}" concept
- Use age-appropriate language for ${studentContext.standardId}

Now generate the step-by-step walkthrough from Section ${sectionNumber}.`;
}

/**
 * Extract JSON from Claude response
 */
function extractStepsJSON(claudeResponse) {
  try {
    // Try to parse directly
    const parsed = JSON.parse(claudeResponse);
    if (parsed.steps && Array.isArray(parsed.steps)) {
      return parsed;
    }
  } catch (e) {
    // Try to extract JSON from code blocks
    const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          return parsed;
        }
      } catch (e2) {
        // Continue to fallback
      }
    }

    // Try to extract plain JSON object
    const objectMatch = claudeResponse.match(/\{[\s\S]*"steps"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          return parsed;
        }
      } catch (e3) {
        // Continue to error
      }
    }
  }

  throw new Error('Could not extract valid steps JSON from response');
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('📋 Starting step-by-step generation');

    const fileId = req.body.fileId;
    const sectionNumber = req.body.sectionNumber;
    const studentContext = req.body.studentContext;

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
      studentName: studentContext.studentName,
      conceptGap: studentContext.conceptGap,
    });

    const prompt = buildStepsPrompt(studentContext, sectionNumber);

    logger.info('🤖 Calling Claude API for step-by-step generation...');

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

    let stepsData;
    try {
      stepsData = extractStepsJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract steps JSON');
      logger.warn('Full response:', responseText);

      return res.status(500).json({
        success: false,
        message: 'Failed to extract steps data from response',
        rawResponse: responseText,
      });
    }

    if (!stepsData.steps || stepsData.steps.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No steps generated',
      });
    }

    logger.info('✅ Successfully generated ' + stepsData.steps.length + ' steps');

    return res.status(200).json({
      success: true,
      message: 'Steps generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        title: stepsData.title || 'Step-by-Step Walkthrough',
        description: stepsData.description || 'Follow these steps to understand the concept',
        steps: stepsData.steps,
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
