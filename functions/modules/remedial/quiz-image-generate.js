const express  = require('express');
const AWS      = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios    = require('axios');
const logger   = require('./utils/logger');

const router = express.Router();

const s3     = new AWS.S3({ region: process.env.AWS_REGION });
const dynamo = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const S3_BUCKET        = process.env.AWS_S3_BUCKET;
const QUIZ_IMAGE_TABLE = process.env.AWS_DYNAMO_TABLE_QUIZ_IMAGES || process.env.AWS_DYNAMO_TABLE;
const IMAGE_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5-tskar';

// ── Azure OpenAI — Text (prompt enrichment) ───────────────────────
const TEXT_DEPLOYMENT  = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const TEXT_API_KEY     = process.env.AZURE_OPENAI_API_KEY;
const TEXT_ENDPOINT    = process.env.AZURE_OPENAI_ENDPOINT;
const TEXT_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

// ── Azure OpenAI — Image (gpt-image) ─────────────────────────────
const IMAGE_API_KEY     = process.env.AZURE_OPENAI_API_KEY1;
const IMAGE_ENDPOINT    = process.env.AZURE_OPENAI_ENDPOINT1;
const IMAGE_API_VERSION = '2025-04-01-preview';

// ── Language detector ─────────────────────────────────────────────
function detectLanguage(text = '') {
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', name: 'Tamil' };
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', name: 'Hindi' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', name: 'Telugu' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', name: 'Kannada' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', name: 'Malayalam' };
  if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', name: 'Bengali' };
  if (/[\u0600-\u06FF]/.test(text)) return { code: 'ar', name: 'Arabic' };
  return { code: 'en', name: 'English' };
}

// ── Subject detector ──────────────────────────────────────────────
function detectSubject(text = '') {
  const t = text.toLowerCase();
  if (/triangle|angle|circle|polygon|geometry|hypotenuse|radius|diameter|bisect|congruent|coordinate/.test(t)) return 'geometry';
  if (/cell|organ|heart|lung|brain|photosynthesis|respiration|dna|mitosis|bacteria|virus|plant|animal/.test(t)) return 'biology';
  if (/atom|molecule|reaction|bond|electron|proton|acid|base|oxidation|chemical|ion|covalent|ionic/.test(t)) return 'chemistry';
  if (/force|motion|velocity|gravity|energy|wave|sound|light|electricity|magnet|circuit|friction/.test(t)) return 'physics';
  if (/fraction|decimal|ratio|algebra|equation|graph|prime|factor|area|volume|perimeter|probability/.test(t)) return 'mathematics';
  if (/map|country|river|mountain|climate|ocean|earthquake|volcano|latitude|longitude/.test(t)) return 'geography';
  if (/history|king|war|empire|civilization|revolution|independence|ancient|medieval/.test(t)) return 'history';
  return 'general';
}

// ── Build image prompt via Azure OpenAI (replaces Claude) ─────────
async function buildImagePrompt(question, subject, lang, imageStyle = 'color') {
  const isNonEnglish = lang.code !== 'en';

  const lineOverride = imageStyle === 'line'
    ? 'clean black-and-white line art, thin outlines only, no color fill, no shading, educational diagram style, white background'
    : null;

  const subjectStyles = {
    geometry:    'precise clean mathematical geometry diagram, thin dark-blue lines, angle markers, white background',
    biology:     'detailed educational biology illustration, soft natural colors, cross-section view, textbook style',
    chemistry:   'educational chemistry illustration, colored 3D molecular spheres, standard color coding, white background',
    physics:     'educational physics diagram, bold arrows for forces/motion, bright colors, flat diagram style',
    mathematics: 'clean educational mathematics illustration, colored shapes, visual groupings, white background',
    geography:   'clean educational geography illustration, natural realistic colors, flat illustrated map style',
    history:     'clean educational history illustration, warm earthy colors, simple flat illustration style',
    general:     'clear educational concept illustration, bright colors, clean white background, flat modern style',
  };

  const styleGuide = lineOverride || subjectStyles[subject] || subjectStyles.general;

  // ── Shared strict no-text rule for BOTH English and non-English ──
  const NO_TEXT_RULE = `
ABSOLUTE RULES — MUST FOLLOW:
- NO text of any kind in the image. NO letters. NO numbers. NO words. NO labels. NO dimensions. NO measurements.
- NO answers, NO question content, NO values shown visually.
- Purely visual illustration only. The image must contain ZERO readable characters.`;

  let userContent;

  if (isNonEnglish) {
    userContent = `You are an expert educational illustration prompt writer.
Task: Generate a visual-only image prompt for this quiz question concept, and provide ${lang.name} overlay labels (returned as JSON, NOT drawn in image).
Return ONLY valid JSON.

Question concept: "${question}"
Subject: ${subject}
Style: ${styleGuide}

${NO_TEXT_RULE}

Return:
{
  "imagePrompt": "purely visual scene/diagram description — NO text in image at all",
  "title": "concept title in ${lang.name} script",
  "labels": [
    { "text": "${lang.name} label", "x": 50, "y": 20 }
  ]
}`;
  } else {
    // ── English: describe ONLY the visual concept, never include numbers or question text ──
    userContent = `You are an expert educational illustration prompt writer.
Write a visual-only image generation prompt based on the CONCEPT of this question.

Question concept: "${question}"
Subject: ${subject}
Style: ${styleGuide}

${NO_TEXT_RULE}

Instructions:
- Identify the core visual concept (e.g. "a 3D shed shape as cuboid + triangular prism roof").
- Describe ONLY what should be drawn visually — shapes, structure, perspective, colors.
- Do NOT include any numbers, dimensions, measurements, or answer values.
- Do NOT include any labels or callout text in the image.
- Write the visual scene description in under 100 words.
- Return ONLY the prompt text, nothing else.`;
  }

  // ✅ Same axios pattern as all other generators
  const azureUrl = `${TEXT_ENDPOINT}/openai/deployments/${TEXT_DEPLOYMENT}/chat/completions?api-version=${TEXT_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [
        { role: 'user', content: userContent },
      ],
      max_tokens:  400,
      temperature: 0.1,
    },
    {
      headers: {
        'api-key':      TEXT_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.content?.trim() || '';

  if (isNonEnglish) {
    let parsed = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = { imagePrompt: '', title: '', labels: [] };
    }
    return {
      enrichedPrompt: parsed.imagePrompt || `Visual concept illustration for: ${subject}`,
      title:          parsed.title        || '',
      labels:         Array.isArray(parsed.labels) ? parsed.labels : [],
      isNonEnglish:   true,
    };
  }

  return {
    enrichedPrompt: raw || `Visual concept illustration for: ${subject}`,
    title:          '',
    labels:         [],
    isNonEnglish:   false,
  };
}

// ── Generate image via Azure ──────────────────────────────────────
async function generateImageWithAzure(prompt, isNonEnglish = false, imageStyle = 'color') {
  const url = `${IMAGE_ENDPOINT}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${IMAGE_API_VERSION}`;

  // ── Style rule based on imageStyle ────────────────────────────
  const styleRule = imageStyle === 'line'
    ? `STYLE RULE: Black and white LINE ART only. Thin clean black lines on pure white background. NO color fills, NO shading, NO gradients. Pure monochrome ink-style like a textbook coloring page.`
    : `STYLE RULE: Full color illustration. Use bright distinct educational colors appropriate for a school textbook diagram.`;

  // ── Single unified no-text rule for ALL images ────────────────
  const noTextRule = `CRITICAL: NO text, NO letters, NO numbers, NO words, NO labels, NO dimensions, NO measurements anywhere in the image. Zero readable characters. Purely visual illustration only.`;

  const canvasRule = `CANVAS: All content fully inside boundaries. Minimum 5% padding on all sides. Nothing cropped.`;

  const noBoxRule  = `NO empty boxes, blank rectangles, unfilled frames, or placeholder outlines.`;

  // ── Include styleRule in budget calculation and final prompt ──
  const PROMPT_BUDGET = 3800 - styleRule.length - noTextRule.length - canvasRule.length - noBoxRule.length - 20;
  const trimmedPrompt = prompt.length > PROMPT_BUDGET ? prompt.substring(0, PROMPT_BUDGET) : prompt;
  const finalPrompt   = `${styleRule}\n\n${trimmedPrompt}\n\n${noTextRule}\n\n${canvasRule}\n\n${noBoxRule}`;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      logger.info(`🎨 Azure quiz-image attempt ${attempt}`);
      const response = await axios.post(url, {
        prompt:        finalPrompt,
        n:             1,
        size:          '1024x1024',
        quality:       'high',
        output_format: 'png',
      }, {
        headers: { 'api-key': IMAGE_API_KEY, 'Content-Type': 'application/json' },
        timeout: 90000,
      });

      const base64 = response.data?.data?.[0]?.b64_json;
      if (!base64) throw new Error('No image data from Azure');

      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length < 50_000) throw new Error(`Image too small (${buffer.length} bytes)`);

      logger.info(`✅ Quiz image received | ${buffer.length} bytes | style: ${imageStyle}`);
      return buffer;
    } catch (err) {
      lastError = err;
      logger.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastError;
}

// ── Build HTML overlay for non-English labels ─────────────────────
function buildDiagramHTML(imageUrl, title, labels, langCode) {
  const fontMap = {
    ta: 'Noto Sans Tamil', hi: 'Noto Sans Devanagari', te: 'Noto Sans Telugu',
    kn: 'Noto Sans Kannada', ml: 'Noto Sans Malayalam', bn: 'Noto Sans Bengali',
    ar: 'Noto Sans Arabic', en: 'Inter',
  };
  const fontName   = fontMap[langCode] || 'Inter';
  const googleFont = fontName !== 'Inter'
    ? `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`
    : null;

  const labelsHTML = labels.map(l => `
    <div style="position:absolute;left:${l.x}%;top:${l.y}%;
      transform:translate(-50%,-50%);
      font-family:'${fontName}',sans-serif;
      font-size:clamp(9px,1.4vw,13px);
      font-weight:600;color:#0d47a1;
      background:rgba(255,255,255,0.92);
      padding:2px 7px;border-radius:4px;
      border:1px solid #90caf9;white-space:nowrap;pointer-events:none;
      box-shadow:0 1px 3px rgba(0,0,0,0.1);">${l.text}</div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="${langCode}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${googleFont ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="${googleFont}" rel="stylesheet">` : ''}
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#fff}
  .wrap{position:relative;width:100%;height:100%}
  .wrap img{width:100%;height:100%;display:block;object-fit:contain}
  .title{
    position:absolute;top:2%;left:50%;transform:translateX(-50%);
    font-family:'${fontName}',sans-serif;
    font-size:clamp(10px,1.6vw,15px);
    font-weight:700;color:#1a1a2e;
    background:rgba(255,255,255,0.93);
    padding:3px 10px;border-radius:5px;
    border:1px solid #c5cae9;white-space:nowrap;
    box-shadow:0 1px 4px rgba(0,0,0,0.08);
  }
</style></head><body>
<div class="wrap">
  <img src="${imageUrl}" alt="diagram"/>
  ${title ? `<div class="title">${title}</div>` : ''}
  ${labelsHTML}
</div>
</body></html>`;
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/quiz-image-generate
   Body: { question, questionId, quizContentId }
───────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { question, questionId, quizContentId, imageStyle = 'color' } = req.body;

    if (!question || !questionId) {
      return res.status(400).json({ success: false, message: 'question and questionId are required' });
    }
    if (!S3_BUCKET) {
      return res.status(500).json({ success: false, message: 'S3_BUCKET env var missing' });
    }

    // ✅ Check both text and image Azure credentials
    if (!TEXT_API_KEY || !TEXT_ENDPOINT || !TEXT_DEPLOYMENT) {
      return res.status(500).json({ success: false, message: 'Missing Azure text (prompt enrichment) credentials' });
    }
    if (!IMAGE_API_KEY || !IMAGE_ENDPOINT) {
      return res.status(500).json({ success: false, message: 'Missing Azure image generation credentials' });
    }

    const lang    = detectLanguage(question);
    const subject = detectSubject(question);

    logger.info(`🎯 Quiz image | Q: "${question.substring(0, 60)}..." | subject: ${subject} | lang: ${lang.name}`);

    // ── Step 1: Azure OpenAI → enriched prompt ────────────────────
    const { enrichedPrompt, title, labels, isNonEnglish } =
      await buildImagePrompt(question, subject, lang, imageStyle);

    // ── Step 2: Azure → image buffer ─────────────────────────────
    const buffer = await generateImageWithAzure(enrichedPrompt, isNonEnglish, imageStyle);

    // ── Step 3: Upload to S3 ──────────────────────────────────────
    const imageId = uuidv4();
    const s3Key   = `quiz-images/${imageId}.png`;

    await s3.putObject({
      Bucket:      S3_BUCKET,
      Key:         s3Key,
      Body:        buffer,
      ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    logger.info(`✅ S3 upload: ${s3Key}`);

    // ── Step 4: Build HTML overlay for non-English ────────────────
    const diagramHTML = isNonEnglish
      ? buildDiagramHTML(imageUrl, title, labels, lang.code)
      : null;

    // ── Step 5: Store in DynamoDB quiz-images table ───────────────
    await dynamo.put({
      TableName: QUIZ_IMAGE_TABLE,
      Item: {
        imageId,
        questionId:    String(questionId),
        quizContentId: quizContentId || null,
        question:      question.substring(0, 500),
        enrichedPrompt,
        subject,
        language:      lang.name,
        langCode:      lang.code,
        isNonEnglish,
        title,
        labels:        labels,
        diagramHTML:   diagramHTML || null,
        s3Key,
        imageUrl,
        createdAt:     new Date().toISOString(),
      },
    }).promise();

    logger.info(`✅ DynamoDB stored: imageId=${imageId} | questionId=${questionId}`);

    // ── Step 6: Response ──────────────────────────────────────────
    return res.status(200).json({
      success: true,
      imageId,
      imageUrl,
      diagramHTML,
      isNonEnglish,
      title,
      labels,
      langCode:  lang.code,
      language:  lang.name,
    });

  } catch (error) {
    logger.error('❌ Quiz image generation error:', error.message, error?.response?.data);
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
});

module.exports = router;