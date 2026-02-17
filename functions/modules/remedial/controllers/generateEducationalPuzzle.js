const logger = require('../utils/logger');

/**
 * Build prompt for Claude to generate educational puzzle
 */
function buildPuzzlePrompt(studentContext, sectionNumber) {
  return `You are an expert educational game designer. Your task is to create an educational crossword puzzle based on a specific section from an educational document.

**CRITICAL INSTRUCTIONS:**
1. Read Section ${sectionNumber} from the attached document CAREFULLY
2. Extract KEY TERMS and CONCEPTS from Section ${sectionNumber} ONLY
3. Create a crossword puzzle with 8-10 words
4. All words must be directly from Section ${sectionNumber}

**Student Context:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade: ${studentContext.standardId || 'Grade 6-8'}

**Puzzle Requirements:**
- Focus on important terms from "${studentContext.conceptGap}" in Section ${sectionNumber}
- Words should intersect to form a crossword grid
- Clues should be educational and help reinforce learning
- Mix of difficulty levels
- Use only terms explicitly mentioned in Section ${sectionNumber}

**Output Format (JSON ONLY):**
\`\`\`json
{
  "title": "Section ${sectionNumber} Crossword Challenge",
  "description": "Test your knowledge of concepts from this section",
  "gridSize": 10,
  "clues": [
    {
      "number": 1,
      "direction": "across",
      "clue": "The top number in a fraction",
      "answer": "NUMERATOR",
      "row": 2,
      "col": 1
    },
    {
      "number": 2,
      "direction": "down",
      "clue": "The bottom number in a fraction",
      "answer": "DENOMINATOR",
      "row": 2,
      "col": 1
    }
  ]
}
\`\`\`

**Important Rules:**
- Output MUST be valid JSON only
- No markdown code blocks
- No extra text
- All answers must be UPPERCASE
- Answers must be single words (use underscores for phrases)
- Grid positions must allow words to intersect properly

Now generate the educational crossword puzzle from Section ${sectionNumber}.`;
}

/**
 * Extract JSON from Claude response
 */
function extractPuzzleJSON(claudeResponse) {
  try {
    // Try to parse directly
    const parsed = JSON.parse(claudeResponse);
    if (parsed.clues && Array.isArray(parsed.clues)) {
      return parsed;
    }
  } catch (e) {
    // Try to extract JSON from code blocks
    const jsonMatch = claudeResponse.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.clues && Array.isArray(parsed.clues)) {
          return parsed;
        }
      } catch (e2) {
        // Continue to fallback
      }
    }

    // Try to extract plain JSON object
    const objectMatch = claudeResponse.match(/\{[\s\S]*"clues"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.clues && Array.isArray(parsed.clues)) {
          return parsed;
        }
      } catch (e3) {
        // Continue to error
      }
    }
  }

  throw new Error('Could not extract valid puzzle JSON from response');
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('🧩 Starting educational puzzle generation');

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

    const prompt = buildPuzzlePrompt(studentContext, sectionNumber);

    logger.info('🤖 Calling Claude API for puzzle generation...');

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

    let puzzleData;
    try {
      puzzleData = extractPuzzleJSON(responseText);
    } catch (extractError) {
      logger.warn('⚠️ Could not extract puzzle JSON');
      logger.warn('Full response:', responseText);

      return res.status(500).json({
        success: false,
        message: 'Failed to extract puzzle data from response',
        rawResponse: responseText,
      });
    }

    if (!puzzleData.clues || puzzleData.clues.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No puzzle clues generated',
      });
    }

    logger.info('✅ Successfully generated puzzle with ' + puzzleData.clues.length + ' clues');

    return res.status(200).json({
      success: true,
      message: 'Puzzle generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        title: puzzleData.title || 'Educational Crossword Puzzle',
        description: puzzleData.description || 'Test your knowledge',
        gridSize: puzzleData.gridSize || 10,
        clues: puzzleData.clues,
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
