const logger = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';

const CLAUDE_PRICING = {
  [MODEL]: {
    inputCostPerMillion: 1.00,
    outputCostPerMillion: 5.00,
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
const SYSTEM_PROMPT = `
You are a student-friendly educational assistant.

Rules:
- Use ONLY the provided section text as the source.
- Do NOT add outside facts or knowledge.
- Do NOT classify the chapter (e.g., "this is literature").
- Do NOT mention textbooks or external advice.
- Always explain the section in a direct student-facing way using "you" and "your".
- Keep language simple and clear suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or worked examples from the section — explain concepts only.
- ⚠️ SPELLING RULE: Every "answer" must be COPIED EXACTLY as it appears in the section text — character by character. Do NOT retype, paraphrase, or reconstruct Tamil words from memory.
- ⚠️ LANGUAGE RULE: Detect the language of the SECTION text. Write all clues, title, and description in the SAME language as the section text. If the section is in Tamil, write clues in Tamil. If Hindi, write in Hindi. If English, write in English. NEVER switch languages. JSON keys must stay in English, but all values (clues, title, description) must match the section language.
- If the learning gap is not directly present in the section, explain the section clearly without forcing that concept.
- Never return empty fields unless the section truly lacks content.
- For visualSuggestions, always set "type" to one of: pie, bar, timeline, cycle, compare, geometry.
  ❌ NEVER use "flowsteps" type — it is handled by a separate tab and must NOT appear here.
  Each type will render as a visual diagram for the student.
  - pie: percentage/part data → "data": [{ "label": "", "value": 40 }]
  - bar: comparison values → "data": [{ "label": "", "value": 80 }]
  - timeline: sequence of events → "data": [{ "label": "", "value": "" }]
  - cycle: repeating process → "data": [{ "label": "" }]
  - compare: two groups side by side → "data": [{ "label": "", "group": "Group A" }]
  - geometry: geometric shape with labeled points, lines, angles → use "points", "lines", "angles", "markings", "shape"
- Output valid JSON only. No markdown. No extra commentary.
`;


function buildExplanationPrompt(studentContext, sectionNumber, sectionText) {
  return `
Explain Section ${sectionNumber} using ONLY the text below.

SECTION:
${sectionText}

STUDENT:
Name: ${studentContext.studentName}
Learning Gap: ${studentContext.conceptGap}
Grade: ${studentContext.standardId || '6-8'}

Instructions:
- Speak directly to the student using "you".
- Use simple language suitable for school students (age 10–18).
- Explain what happens in the section clearly.
- Only connect to the learning gap if the concept is explicitly mentioned in the section text.
- If it is not mentioned, ignore the learning gap and focus only on explaining the section.
- Do NOT mention section names, section numbers, or copy worked examples/sample problems from the section — explain the concept only.
- Do not mention missing concepts.
- For visualSuggestions, choose the most suitable "type" from: pie, bar, timeline, cycle, compare, geometry.
  ❌ DO NOT use "flowsteps" — it belongs to another tab and is FORBIDDEN here.
  - For math/geometry content: prefer "geometry" type.
  - For repeating or cyclical processes: prefer "cycle".
  - For sequential events with dates/periods: prefer "timeline".
  - For proportions or parts of a whole: prefer "pie".
  - For comparing two things: prefer "bar" or "compare".
  - For geometry type, use x/y as percentages (0–100) within a 200×200 canvas.
  - If a process is step-by-step, use "timeline" instead of "flowsteps".

Return JSON in this exact format (choose the correct structure based on type):

{
  "mainExplanation": "",
  "analogy": {
    "title": "Think of it this way...",
    "description": ""
  },
  "keyPoints": [
    "Key point 1 from the content, explained in student-friendly language."
  ],
  "highlightedTerms": [
    { "term": "Term from the content", "definition": "Simple definition from the content." }
  ],
  "visualSuggestions": [
    {
      "type": "pie | bar | timeline | cycle | compare | geometry",
      "icon": "pie_chart | bar_chart | timeline | autorenew | compare | pentagon",
      "label": "Visual title",
      "description": "What this diagram shows",

      "data": [{ "label": "Part A", "value": 40 }],

      "shape": "triangle | quadrilateral | circle | parallel | angles",
      "points": [
        { "id": "A", "x": 20, "y": 15 },
        { "id": "B", "x": 10, "y": 85 },
        { "id": "C", "x": 80, "y": 85 }
      ],
      "lines": [
        { "from": "A", "to": "B" },
        { "from": "B", "to": "C" },
        { "from": "A", "to": "C" }
      ],
      "angles": [
        { "at": "B", "label": "90°" }
      ],
      "markings": [
        { "from": "A", "to": "B", "ticks": 1 }
      ]
    }
  ],
  "practiceHint": "A practice tip or reflection question based only on what was covered in the section."
}

IMPORTANT:
- "flowsteps" is STRICTLY FORBIDDEN in visualSuggestions. Never output it.
- For geometry content, omit "data" and use points/lines/angles/markings instead.
- For non-geometry content, use "data" array and omit points/lines/angles/markings.
`;
}
/* ================================
   🔍 Safe JSON Extraction
================================ */
function extractExplanationJSON(responseText) {
  try {
    return JSON.parse(responseText);
  } catch {}

  const objectMatch = responseText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  throw new Error('Could not extract valid JSON from Claude response');
}

/* ================================
   🚀 MAIN CONTROLLER
================================ */
module.exports = async (req, res) => {
  try {
    const { sectionNumber, sectionText, studentContext } = req.body;

    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    // 🔹 Trim long text to prevent token explosion
    const trimmedText =
      sectionText.length > 60000
        ? sectionText.substring(0, 60000) + '\n...[content truncated]'
        : sectionText;

    const prompt = buildExplanationPrompt(
      studentContext,
      sectionNumber,
      trimmedText
    );

    logger.info('🤖 Calling Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,          // Reduced from 4096 (cost control)
        temperature: 0.3,          // Lower hallucination risk
        system: SYSTEM_PROMPT,     // 🔒 Guardrails here
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
      return res.status(500).json({
        success: false,
        message: 'Invalid response from Claude',
      });
    }

    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const totalTokens  = inputTokens + outputTokens;

    const cost = calculateCost(MODEL, inputTokens, outputTokens);

    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens}`);
    logger.info(`💰 API Cost    | Input: $${cost.inputCost} | Output: $${cost.outputCost} | Total: $${cost.totalCost} USD`);

    const explanationData = extractExplanationJSON(responseText);

    if (Array.isArray(explanationData.visualSuggestions)) {
      explanationData.visualSuggestions = explanationData.visualSuggestions.filter(
        v => v.type !== 'flowsteps'
      );
    }
    
    return res.status(200).json({
      success: true,
      message: `Simplified explanation generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        explanation: explanationData,
        generatedAt: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          costUSD: cost.totalCost,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};