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
- Extract key terms directly from the section text.
- All answers must be single UPPERCASE words only (no spaces, no underscores, no hyphens).
- Keep clues simple and clear (under 12 words).
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
- Each answer must be ONE single UPPERCASE word (letters only, no symbols).
- Clues must be based only on the section text (under 12 words).
- Do NOT include row, col, direction, or grid data.

Return ONLY this JSON (no other text):
{
  "title": "puzzle title here",
  "description": "short description here",
  "words": [
    { "answer": "WORD", "clue": "Short clue here." }
  ]
}
`;
}

// ── Safe JSON extractor — handles whitespace, BOM, markdown fences ──
function extractWordsJSON(claudeResponse) {
  // Strip BOM and trim
  let text = claudeResponse.replace(/^\uFEFF/, '').trim();

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed.words && Array.isArray(parsed.words) && parsed.words.length > 0) return parsed;
  } catch (e) {}

  // Try extracting the JSON object with regex
  const objectMatch = text.match(/\{[\s\S]*"words"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.words && Array.isArray(parsed.words) && parsed.words.length > 0) return parsed;
    } catch (e) {}
  }

  // Last resort: check if truncated
  if (!text.includes('"words"')) {
    throw new Error('Claude did not return the expected words JSON structure');
  }

  throw new Error('Could not extract valid puzzle JSON from response');
}

// ── Auto grid placement ──
function buildCrosswordGrid(words, gridSize = 15) {
  // Sanitize: only keep words that are purely alphabetic and at least 2 chars
  const cleanWords = words
    .map(w => ({ ...w, answer: (w.answer || '').replace(/[^A-Z]/g, '') }))
    .filter(w => w.answer.length >= 2 && w.answer.length <= gridSize - 2);

  if (cleanWords.length === 0) return [];

  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const placed = [];

  // Place first word horizontally in the middle
  const firstWord = cleanWords[0].answer;
  const startCol = Math.floor((gridSize - firstWord.length) / 2);
  const startRow = Math.floor(gridSize / 2);

  for (let i = 0; i < firstWord.length; i++) {
    grid[startRow][startCol + i] = firstWord[i];
  }
  placed.push({
    number: 1,
    direction: 'across',
    clue: cleanWords[0].clue,
    answer: firstWord,
    row: startRow + 1,
    col: startCol + 1,
  });

  let clueNumber = 2;

  for (let w = 1; w < cleanWords.length; w++) {
    const word = cleanWords[w].answer;
    let wordPlaced = false;

    // Try intersecting with already-placed words
    outer:
    for (const p of placed) {
      const pWord = p.answer;
      const pDir  = p.direction;

      for (let pi = 0; pi < pWord.length; pi++) {
        for (let wi = 0; wi < word.length; wi++) {
          if (pWord[pi] !== word[wi]) continue;

          let row, col, direction;

          if (pDir === 'across') {
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
            if (col < 0 || col + word.length > gridSize || row < 0 || row >= gridSize) continue;
          } else {
            if (row < 0 || row + word.length > gridSize || col < 0 || col >= gridSize) continue;
          }

          // Check cells before and after word don't bleed into adjacent words
          const beforeR = direction === 'across' ? row : row - 1;
          const beforeC = direction === 'across' ? col - 1 : col;
          const afterR  = direction === 'across' ? row : row + word.length;
          const afterC  = direction === 'across' ? col + word.length : col;
          if (beforeR >= 0 && beforeC >= 0 && grid[beforeR]?.[beforeC] !== null) continue;
          if (afterR < gridSize && afterC < gridSize && grid[afterR]?.[afterC] !== null) continue;

          // Collision check
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            const existing = grid[r][c];
            if (existing !== null && existing !== word[i]) { canPlace = false; break; }
          }
          if (!canPlace) continue;

          // Place it
          for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            grid[r][c] = word[i];
          }

          placed.push({
            number: clueNumber++,
            direction,
            clue: cleanWords[w].clue,
            answer: word,
            row: row + 1,
            col: col + 1,
          });
          wordPlaced = true;
          break outer;
        }
      }
    }

    // Fallback: place standalone down word in a free column
    if (!wordPlaced) {
      for (let tryCol = 1; tryCol < gridSize - 1 && !wordPlaced; tryCol++) {
        const tryRow = 1;
        if (tryRow + word.length > gridSize) continue;
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          if (grid[tryRow + i][tryCol] !== null) { canPlace = false; break; }
        }
        if (canPlace) {
          for (let i = 0; i < word.length; i++) grid[tryRow + i][tryCol] = word[i];
          placed.push({
            number: clueNumber++,
            direction: 'down',
            clue: cleanWords[w].clue,
            answer: word,
            row: tryRow + 1,
            col: tryCol + 1,
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

    const prompt = buildPuzzlePrompt(studentContext, sectionNumber, trimmedText, numberOfClues);
    const maxTokens = Math.min(4096, Math.max(1500, numberOfClues * 200));

    logger.info('🤖 Calling Claude API for puzzle generation...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
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

    const inputTokens  = claudeResponse.usage?.input_tokens  ?? 0;
    const outputTokens = claudeResponse.usage?.output_tokens ?? 0;
    const cost = calculateCost(MODEL, inputTokens, outputTokens);
    logger.info(`📊 Token Usage | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${inputTokens + outputTokens}`);
    logger.info(`💰 API Cost    | $${cost.totalCost} USD`);
    logger.info(`🔍 Raw Claude response: ${responseText.substring(0, 300)}`);  // ← helps debug future issues

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

    // Validate words array
    if (!rawData.words || rawData.words.length === 0) {
      return res.status(500).json({ success: false, message: 'Claude returned no words' });
    }

    logger.info(`📝 Claude returned ${rawData.words.length} words before grid placement`);

    const clues = buildCrosswordGrid(rawData.words, 15);

    if (!clues.length) {
      return res.status(500).json({ success: false, message: 'No puzzle clues could be placed in the grid' });
    }

    logger.info(`✅ Placed ${clues.length} clues (across + down)`);

    return res.status(200).json({
      success: true,
      message: `Puzzle generated successfully from Section ${sectionNumber}`,
      data: {
        studentName: studentContext.studentName,
        conceptGap: studentContext.conceptGap,
        sectionNumber,
        title: rawData.title || 'Educational Crossword Puzzle',
        description: rawData.description || 'Test your knowledge',
        gridSize: 15,
        clues,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Unexpected error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
