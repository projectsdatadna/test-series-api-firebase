const logger = require('../utils/logger');

/**
 * Build prompt for Claude to generate interactive worksheet
 */
function buildWorksheetPrompt(studentContext, sectionNumber) {
  return `You are an expert educational content designer. Your task is to create an interactive worksheet with multiple activity types based on a specific section from an educational document.

**CRITICAL INSTRUCTIONS:**
1. Read Section ${sectionNumber} from the attached document CAREFULLY
2. Extract KEY CONCEPTS and LEARNING OBJECTIVES from Section ${sectionNumber}
3. Create 3-4 DIFFERENT activity types to reinforce learning
4. All content must be directly from Section ${sectionNumber}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Activity Types to Include:**
1. **Matching Exercise** - Match terms with definitions or examples
2. **Fill in the Blanks** - Complete sentences with missing key terms
3. **True/False** - Test understanding of concepts
4. **Diagram Labeling** - Identify parts or steps in a visual representation

**Output Format (JSON ONLY):**
\`\`\`json
{
  "title": "Section ${sectionNumber} Interactive Worksheet",
  "description": "Practice exercises to reinforce your understanding of key concepts",
  "activities": [
    {
      "type": "matching",
      "title": "Match the Terms",
      "instructions": "Draw lines to match each term with its correct definition",
      "items": [
        {
          "left": "Numerator",
          "right": "Top number in a fraction",
          "id": 1
        },
        {
          "left": "Denominator",
          "right": "Bottom number in a fraction",
          "id": 2
        }
      ]
    },
    {
      "type": "fill-blank",
      "title": "Complete the Sentences",
      "instructions": "Fill in the blanks with the correct words from the word bank",
      "questions": [
        {
          "id": 1,
          "sentence": "A ____ represents a part of a whole",
          "answer": "fraction",
          "blanks": 1
        }
      ],
      "wordBank": ["fraction", "numerator", "denominator", "whole"]
    },
    {
      "type": "true-false",
      "title": "True or False",
      "instructions": "Circle T if the statement is true or F if it is false",
      "questions": [
        {
          "id": 1,
          "statement": "The numerator is always larger than the denominator",
          "answer": false,
          "explanation": "The numerator can be smaller, equal to, or larger than the denominator"
        }
      ]
    }
  ]
}
\`\`\`

**Important Rules:**
- Output MUST be valid JSON only
- No markdown code blocks
- No extra text before or after JSON
- All content must be from Section ${sectionNumber}
- Activities should be age-appropriate for ${studentContext.standardId}
- Focus on "${studentContext.conceptGap}" learning gaps

Now generate the interactive worksheet from Section ${sectionNumber}.`;
}

/**
 * Extract JSON from Claude response
 */
function extractWorksheetJSON(claudeResponse) {
  try {
    // Try to parse directly
    const parsed = JSON.parse(claudeResponse);
    if (parsed.activities && Array.isArray(parsed.activities)) {
      return parsed;
    }
  } catch (e) {
    // Try to extract JSON from code blocks
    const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.activities && Array.isArray(parsed.activities)) {
          return parsed;
        }
      } catch (e2) {
        // Continue to fallback
      }
    }

    // Try to extract plain JSON object
    const objectMatch = claudeResponse.match(/\{[\s\S]*"activities"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.activities && Array.isArray(parsed.activities)) {
          return parsed;
        }
      } catch (e3) {
        // Continue to error
      }
    }
  }

  throw new Error('Could not extract valid worksheet JSON from response');
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('📝 Starting interactive worksheet generation');

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

    const prompt = buildWorksheetPrompt(studentContext, sectionNumber);

    logger.info('🤖 Calling Claude API for worksheet generation...');

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

    let worksheetData;
    try {
      worksheetData = extractWorksheetJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract worksheet JSON');
      logger.warn('Full response:', responseText);

      return res.status(500).json({
        success: false,
        message: 'Failed to extract worksheet data from response',
        rawResponse: responseText,
      });
    }

    if (!worksheetData.activities || worksheetData.activities.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No worksheet activities generated',
      });
    }

    logger.info('✅ Successfully generated worksheet with ' + worksheetData.activities.length + ' activities');

    return res.status(200).json({
      success: true,
      message: 'Worksheet generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        title: worksheetData.title || 'Interactive Worksheet',
        description: worksheetData.description || 'Practice exercises',
        activities: worksheetData.activities,
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
