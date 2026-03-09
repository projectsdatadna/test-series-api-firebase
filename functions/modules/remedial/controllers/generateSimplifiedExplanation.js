const logger = require('../utils/logger');

/**
 * Build prompt for Claude to generate simplified explanation
 */
function buildExplanationPrompt(studentContext, sectionNumber) {
  return `You are an expert educational content creator. Your task is to generate a simplified, easy-to-understand explanation of Section ${sectionNumber} from the attached document.

**CRITICAL INSTRUCTIONS:**
1. Read Section ${sectionNumber} from the attached document CAREFULLY
2. Create a clear, engaging explanation suitable for the student's level
3. Use relatable real-world analogies and examples
4. Include visual element suggestions that would aid understanding
5. Break down complex concepts into simple terms

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Content Requirements:**
- Main explanation paragraph (3-5 sentences) using simple, friendly language
- Real-world analogy that makes the concept relatable
- 3-5 key points to remember
- 3 visual element suggestions (with descriptions)
- Highlight important terms that students should focus on

**Output Format (JSON ONLY):**
\`\`\`json
{
  "mainExplanation": "A clear, engaging paragraph that explains the concept using simple language and relates it to everyday life. Include specific examples.",
  "analogy": {
    "title": "Think of it this way...",
    "description": "Detailed analogy comparing the concept to something familiar like pizza, shopping, sports, etc."
  },
  "keyPoints": [
    "First important point explained simply",
    "Second key takeaway",
    "Third essential concept",
    "Fourth point (if needed)",
    "Fifth point (if needed)"
  ],
  "highlightedTerms": [
    {
      "term": "Important Term 1",
      "definition": "Simple explanation of this term"
    },
    {
      "term": "Important Term 2",
      "definition": "Simple explanation"
    }
  ],
  "visualSuggestions": [
    {
      "type": "diagram",
      "icon": "pie_chart",
      "label": "Visual 1/4",
      "description": "Description of what should be shown - e.g., a circle divided into 4 parts with 1 shaded"
    },
    {
      "type": "chart",
      "icon": "bar_chart",
      "label": "Visual 2/4",
      "description": "Bar representation showing the concept"
    },
    {
      "type": "model",
      "icon": "donut_large",
      "label": "Visual 3/4",
      "description": "Interactive model demonstration"
    }
  ],
  "practiceHint": "Quick tip for students to practice this concept in daily life"
}
\`\`\`

**IMPORTANT:**
- Output MUST be valid JSON only
- No markdown code blocks
- No extra text before or after JSON
- Focus ONLY on Section ${sectionNumber} content
- Make it fun, relatable, and easy to understand for ${studentContext.studentName}

Now generate a simplified explanation from Section ${sectionNumber}.`;
}

/**
 * Extract JSON from Claude response
 */
function extractExplanationJSON(claudeResponse) {
  try {
    // Try to parse directly
    return JSON.parse(claudeResponse);
  } catch (e) {
    // Try to extract JSON from code blocks
    const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        // Continue to fallback
      }
    }

    // Try to extract plain JSON object
    const objectMatch = claudeResponse.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e3) {
        // Continue to error
      }
    }
  }

  throw new Error('Could not extract valid explanation JSON from response');
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('📚 Starting simplified explanation generation');

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

    const prompt = buildExplanationPrompt(studentContext, sectionNumber);

    logger.info('🤖 Calling Claude API for explanation generation...');

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
        temperature: 0.7,
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

    if (claudeResponse.usage) {
      logger.info('📊 Token Usage:', {
        inputTokens: claudeResponse.usage.input_tokens,
        outputTokens: claudeResponse.usage.output_tokens,
        totalTokens: claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens,
      });
    }
    
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

    let explanationData;
    try {
      explanationData = extractExplanationJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract explanation JSON');
      logger.warn('Full response:', responseText);

      return res.status(500).json({
        success: false,
        message: 'Failed to extract explanation from response',
        rawResponse: responseText,
      });
    }

    logger.info('✅ Successfully generated simplified explanation');

    return res.status(200).json({
      success: true,
      message: 'Simplified explanation generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        explanation: explanationData,
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
