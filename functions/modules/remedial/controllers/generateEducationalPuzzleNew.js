const logger = require('../utils/logger');

const CLAUDE_PRICING = {
  'claude-haiku-4-5-20251001': {
    inputCostPerMillion: 1.00,
    outputCostPerMillion: 5.00,
  },
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = CLAUDE_PRICING[model] ?? { inputCostPerMillion: 0, outputCostPerMillion: 0 };
  const inputCost  = (inputTokens  / 1_000_000) * pricing.inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMillion;
  return {
    inputCost:  parseFloat(inputCost.toFixed(8)),
    outputCost: parseFloat(outputCost.toFixed(8)),
    totalCost:  parseFloat((inputCost + outputCost).toFixed(8)),
  };
}

const SYSTEM_PROMPT = `
You are a student-friendly educational puzzle generator.
Rules:
- Use ONLY the provided section text.
- Do NOT add outside knowledge.
- ⚠️ SPELLING RULE: Every "answer" must be COPIED EXACTLY as it appears in the section text — character by character. Do NOT retype, paraphrase, or reconstruct Tamil words from memory.
- Extract key terms directly from the section text.
- Keep clues simple and clear (under 12 words) suitable for school students aged 10 to 18.
- Do NOT reference any section name, section number, or examples from the section text in the clues.
- ⚠️ LANGUAGE RULE: Detect the language of the SECTION text. Write all clues, title, description, AND answers in the SAME language as the section text.
  - If Tamil: answers AND clues must be Tamil script (e.g., "ஆய்வுகள்"). Do NOT transliterate to Roman letters.
  - If English: answers must be single UPPERCASE English words.
  - NEVER write Tamil words in Roman letters (do NOT write "AAYVUGAL" — write "ஆய்வுகள்").
- JSON keys must stay in English. Only values must match section language.
- Output valid JSON only. No markdown fences. No commentary before or after JSON.
`;

function buildPuzzlePrompt(studentContext, sectionNumber, sectionText, numberOfClues) {
  return `
Extract exactly ${numberOfClues} key single-word terms from Section ${sectionNumber} and write a short clue for each.

SECTION:
${sectionText}

Student:
Name: ${studentContext.studentName}
Grade: ${studentContext.standardId || '6-8'}
Learning Gap: ${studentContext.conceptGap}

Instructions:
- Detect the language of the section text above.
- If the section is in Tamil:
  - "answer" must be a single Tamil word in Tamil script (e.g., "ஆய்வுகள்"). Do NOT use Roman/English letters.
  - "clue" must be in Tamil script.
  - Do NOT transliterate. Write actual Tamil Unicode characters.
- If the section is in English:
  - "answer" must be a single UPPERCASE English word (letters only).
  - "clue" must be in English.
- Clues must be based only on the section text (under 12 words).
- Do NOT mention section names, section numbers, or copy example sentences into clues.
- Do NOT include row, col, direction, or grid data.

Return ONLY this JSON (no other text):
{
  "title": "puzzle title here",
  "description": "short description here",
  "words": [
    { "answer": "ஆய்வுகள்", "clue": "மண்ணில், விண்ணில் நடக்கும் செயல்." }
  ]
}
`;
}

function extractWordsJSON(claudeResponse) {
  let text = claudeResponse.replace(/^\uFEFF/, '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(text);
    if (parsed.words && Array.isArray(parsed.words) && parsed.words.length > 0) return parsed;
  } catch (e) {}

  const objectMatch = text.match(/\{[\s\S]*"words"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.words && Array.isArray(parsed.words) && parsed.words.length > 0) return parsed;
    } catch (e) {}
  }

  if (!text.includes('"words"')) {
    throw new Error('Claude did not return the expected words JSON structure');
  }
  throw new Error('Could not extract valid puzzle JSON from response');
}

// ── Split word into grapheme clusters (Tamil-safe) ──
function toChars(word) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter().segment(word)].map(s => s.segment);
  }
  return [...word]; // fallback spread for older Node
}

// ── Auto grid placement — Tamil + English safe ──
function buildCrosswordGrid(words, gridSize = 15) {

  // ✅ Detect Tamil answers
  const isTamil = words.some(w => /[\u0B80-\u0BFF]/.test(w.answer || ''));
  logger.info(`🔤 Language mode: ${isTamil ? 'Tamil' : 'English'}`);

  const cleanWords = words
    .map(w => {
      let answer = (w.answer || '').trim();
      if (isTamil) {
        answer = answer.replace(/[\s\-_\.,"']/g, ''); // ✅ keep Tamil chars, strip symbols
      } else {
        answer = answer.replace(/[^A-Z]/g, '').toUpperCase(); // English: A-Z only
      }
      return { ...w, answer };
    })
    .filter(w => {
      const len = toChars(w.answer).length;
      return len >= 2 && len <= gridSize - 2;
    });

  logger.info(`🔢 Clean words count: ${cleanWords.length}`);
  if (cleanWords.length === 0) return [];

  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const placed = [];

  // Place first word horizontally in center
  const firstWord  = cleanWords[0].answer;
  const firstChars = toChars(firstWord);
  const startCol   = Math.floor((gridSize - firstChars.length) / 2);
  const startRow   = Math.floor(gridSize / 2);

  firstChars.forEach((ch, i) => { grid[startRow][startCol + i] = ch; });
  placed.push({
    number:    1,
    direction: 'across',
    clue:      cleanWords[0].clue,
    answer:    firstWord,
    row:       startRow + 1,
    col:       startCol + 1,
  });

  let clueNumber = 2;

  for (let w = 1; w < cleanWords.length; w++) {
    const word      = cleanWords[w].answer;
    const wordChars = toChars(word);
    let wordPlaced  = false;

    outer:
    for (const p of placed) {
      const pChars = toChars(p.answer);

      for (let pi = 0; pi < pChars.length; pi++) {
        for (let wi = 0; wi < wordChars.length; wi++) {
          if (pChars[pi] !== wordChars[wi]) continue;

          let row, col, direction;
          if (p.direction === 'across') {
            direction = 'down';
            col = (p.col - 1) + pi;
            row = (p.row - 1) - wi;
          } else {
            direction = 'across';
            row = (p.row - 1) + pi;
            col = (p.col - 1) - wi;
          }

          // Bounds check
          if (direction === 'across') {
            if (col < 0 || col + wordChars.length > gridSize || row < 0 || row >= gridSize) continue;
          } else {
            if (row < 0 || row + wordChars.length > gridSize || col < 0 || col >= gridSize) continue;
          }

          // Bleeding check
          const beforeR = direction === 'across' ? row     : row - 1;
          const beforeC = direction === 'across' ? col - 1 : col;
          const afterR  = direction === 'across' ? row     : row + wordChars.length;
          const afterC  = direction === 'across' ? col + wordChars.length : col;
          if (beforeR >= 0 && beforeC >= 0 && grid[beforeR]?.[beforeC] !== null) continue;
          if (afterR < gridSize && afterC < gridSize && grid[afterR]?.[afterC] !== null) continue;

          // Collision check
          let canPlace = true;
          for (let i = 0; i < wordChars.length; i++) {
            const r = direction === 'across' ? row     : row + i;
            const c = direction === 'across' ? col + i : col;
            const existing = grid[r][c];
            if (existing !== null && existing !== wordChars[i]) { canPlace = false; break; }
          }
          if (!canPlace) continue;

          // Place it
          for (let i = 0; i < wordChars.length; i++) {
            const r = direction === 'across' ? row     : row + i;
            const c = direction === 'across' ? col + i : col;
            grid[r][c] = wordChars[i];
          }
          placed.push({
            number: clueNumber++,
            direction,
            clue:   cleanWords[w].clue,
            answer: word,
            row:    row + 1,
            col:    col + 1,
          });
          wordPlaced = true;
          break outer;
        }
      }
    }

    // Fallback: standalone down column
    if (!wordPlaced) {
      for (let tryCol = 1; tryCol < gridSize - 1 && !wordPlaced; tryCol++) {
        const tryRow = 1;
        if (tryRow + wordChars.length > gridSize) continue;
        let canPlace = true;
        for (let i = 0; i < wordChars.length; i++) {
          if (grid[tryRow + i][tryCol] !== null) { canPlace = false; break; }
        }
        if (canPlace) {
          wordChars.forEach((ch, i) => { grid[tryRow + i][tryCol] = ch; });
          placed.push({
            number:    clueNumber++,
            direction: 'down',
            clue:      cleanWords[w].clue,
            answer:    word,
            row:       tryRow + 1,
            col:       tryCol + 1,
          });
          wordPlaced = true;
        }
      }
    }
  }

  return placed;
}

const MODEL = 'claude-haiku-4-5-20251001';

module.exports = async (req, res) => {
  try {
    logger.info('🧩 Starting educational puzzle generation');

    const { sectionNumber, sectionText, studentContext, numberOfClues = 10 } = req.body;

    if (!sectionNumber || !sectionText || !studentContext) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sectionNumber, sectionText, studentContext',
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const trimmedText = sectionText.length > 80000
      ? sectionText.substring(0, 80000) + '\n...[content truncated]'
      : sectionText;

    const prompt    = buildPuzzlePrompt(studentContext, sectionNumber, trimmedText, numberOfClues);
    const maxTokens = Math.min(4096, Math.max(1500, numberOfClues * 200));

    logger.info('🤖 Calling Claude API for puzzle generation...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          process.env.CLAUDE_API_KEY,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  maxTokens,
        temperature: 0.3,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: 'user', content: prompt }],
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
    const responseText   = claudeResponse.content?.[0]?.text;

    if (!responseText) {
      return res.status(500).json({ success: false, message: 'Invalid response from Claude' });
    }

    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const cost = calculateCost(MODEL, inputTokens, outputTokens);
    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);
    logger.info(`💰 API Cost    | $${cost.totalCost} USD`);
    logger.info(`🔍 Raw Claude response: ${responseText.substring(0, 300)}`);

    let rawData;
    try {
      rawData = extractWordsJSON(responseText);
    } catch (e) {
      logger.error('❌ JSON extract failed:', e.message);
      logger.error('❌ Full response:', responseText);
      return res.status(500).json({
        success: false,
        message: `Failed to parse puzzle data: ${e.message}`,
      });
    }

    if (!rawData.words || rawData.words.length === 0) {
      return res.status(500).json({ success: false, message: 'Claude returned no words' });
    }

    logger.info(`📝 Claude returned ${rawData.words.length} words before grid placement`);

    const clues = buildCrosswordGrid(rawData.words, 15);

    if (!clues.length) {
      return res.status(500).json({ success: false, message: 'No puzzle clues could be placed in the grid' });
    }

    logger.info(`✅ Placed ${clues.length} clues (across + down)`);

    // ✅ Detect Tamil to inform frontend
    const isTamil = rawData.words.some(w => /[\u0B80-\u0BFF]/.test(w.answer || ''));

    return res.status(200).json({
      success: true,
      message: `Puzzle generated successfully from Section ${sectionNumber}`,
      data: {
        studentName:      studentContext.studentName,
        conceptGap:       studentContext.conceptGap,
        sectionNumber,
        title:            rawData.title       || 'Educational Crossword Puzzle',
        description:      rawData.description || 'Test your knowledge',
        gridSize:         15,
        isTamil,          // ✅ frontend uses this for cell sizing
        clues,
        generatedAt:      new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
