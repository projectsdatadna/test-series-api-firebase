const logger = require('../utils/logger');

/**
 * ✅ MUCH MORE SPECIFIC: Forces Claude to read the actual section
 */
function buildRemedialPrompt(studentContext, sectionNumber) {
  return `You are an expert educational content creator. I have attached a textbook chapter document.

**CRITICAL TASK:**
1. First, CAREFULLY READ Section ${sectionNumber} from the attached document
2. Extract the KEY CONCEPTS from Section ${sectionNumber} ONLY
3. Create 2-3 Mermaid flowcharts based EXCLUSIVELY on what you read in Section ${sectionNumber}

**Student Information:**
- Name: ${studentContext.studentName}
- Learning Gap: ${studentContext.conceptGap}
- Grade Level: ${studentContext.standardId || 'Grade 6-8'}

**IMPORTANT REQUIREMENTS:**
- DO NOT create generic flowcharts about "${studentContext.conceptGap}"
- DO NOT use your general knowledge
- ONLY use content from Section ${sectionNumber} of the attached document
- If Section ${sectionNumber} doesn't exist, say so explicitly
- If Section ${sectionNumber} is not about "${studentContext.conceptGap}", use what's actually in the section

**Step-by-Step Process:**
1. Search for "Section ${sectionNumber}" or "${sectionNumber}" in the document
2. Read that specific section completely
3. Identify 2-3 main concepts from that section
4. Create one Mermaid flowchart per concept
5. Use the EXACT terminology from the document

**Output Format:**
Output ONLY Mermaid code blocks. Each flowchart must:
- Start with \`flowchart TD\`
- Use student-friendly language from the section
- Include decision points and examples from the section
- Add colors with style commands

**Example Structure:**

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

**Now do this:**
1. Open the attached document
2. Find Section ${sectionNumber}
3. Read it carefully
4. Create 2-3 Mermaid flowcharts using ONLY information from Section ${sectionNumber}
5. Output ONLY the Mermaid code blocks, nothing else

Begin now.`;
}

/**
 * Extract Mermaid flowcharts from Claude response
 */
function extractMermaidFlowcharts(claudeResponse) {
  const mermaidRegex = /```(?:mermaid)?\s*\n([\s\S]*?)```/g;
  const flowcharts = [];
  let match;
  let slideNumber = 1;
  
  while ((match = mermaidRegex.exec(claudeResponse)) !== null) {
    const code = match[1].trim();
    
    // Only include if it starts with "flowchart" or "graph"
    if (code.startsWith('flowchart') || code.startsWith('graph')) {
      flowcharts.push({
        slideNumber: slideNumber,
        mermaidCode: code,
      });
      slideNumber++;
    }
  }
  
  return flowcharts;
}

/**
 * Controller function
 */
module.exports = async (req, res) => {
  try {
    logger.info('🚀 Starting remedial flowchart generation');
    
    const fileId = req.body.fileId;
    const sectionNumber = req.body.sectionNumber;
    const studentContext = req.body.studentContext;
    
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
      chapterId: studentContext.chapterId || 'not provided',
      subjectId: studentContext.subjectId || 'not provided',
    });
    
    const prompt = buildRemedialPrompt(studentContext, sectionNumber);
    
    logger.info('🤖 Calling Claude API with specific section focus...');
    
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
        max_tokens: 8000,
        temperature: 0.2,
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
      preview: responseText.substring(0, 300),
      inputTokens: claudeResponse.usage.input_tokens,
      outputTokens: claudeResponse.usage.output_tokens,
    });
    
    // ✅ Log if Claude mentions the section wasn't found
    if (responseText.includes('not found') || 
        responseText.includes('does not exist') || 
        responseText.includes('cannot find')) {
      logger.warn('⚠️ Claude could not find section:', sectionNumber);
      logger.warn('Response:', responseText.substring(0, 500));
    }
    
    const flowcharts = extractMermaidFlowcharts(responseText);
    
    if (flowcharts.length === 0) {
      logger.warn('⚠️ No Mermaid flowcharts found');
      logger.warn('Full response:', responseText);
      
      return res.status(500).json({
        success: false,
        message: 'Claude did not generate Mermaid flowcharts',
        rawResponse: responseText,
        hint: 'Section ' + sectionNumber + ' may not exist in the document or may not contain relevant content',
      });
    }
    
    logger.info('✅ Successfully generated ' + flowcharts.length + ' flowcharts for Section ' + sectionNumber);
    
    return res.status(200).json({
      success: true,
      message: 'Flowcharts generated successfully from Section ' + sectionNumber,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber: sectionNumber,
        flowcharts: flowcharts,
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
