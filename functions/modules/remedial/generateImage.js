

// const express      = require('express');
// const axios        = require('axios');
// const AWS          = require('aws-sdk');
// const { DynamoDB } = require('aws-sdk');
// const { v4: uuidv4 } = require('uuid');
// const Anthropic    = require('@anthropic-ai/sdk');

// const router = express.Router();

// const s3 = new AWS.S3({ region: process.env.AWS_REGION });
// const dynamo = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

// const S3_BUCKET    = process.env.AWS_S3_BUCKET;
// const DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE;
// const PROJECT_ID   = process.env.GOOGLE_CLOUD_PROJECT_ID;
// const LOCATION     = 'us-central1';
// const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
// const anthropic    = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// /* ─────────────────────────────────────────────────────────────────
//    Subject detector — reads label + description to identify subject
// ───────────────────────────────────────────────────────────────── */
// function detectSubject(label = '', description = '') {
//   const text = `${label} ${description}`.toLowerCase();

//   if (/triangle|angle|circle|polygon|quadrilateral|parallel|perpendicular|radius|diameter|bisect|geometry|congruent|hypotenuse|theorem|coordinate|line segment|ray|chord/.test(text))
//     return 'geometry';

//   if (/cell|organ|heart|lung|kidney|brain|digestion|blood|muscle|bone|nerve|photosynthesis|respiration|ecosystem|plant|animal|human body|reproduction|dna|chromosome|mitosis|meiosis|bacteria|virus|leaf|root|stem/.test(text))
//     return 'biology';

//   if (/atom|molecule|element|compound|reaction|bond|electron|proton|neutron|periodic|acid|base|salt|oxidation|reduction|valence|formula|h2o|co2|chemical|equation|ion|covalent|ionic/.test(text))
//     return 'chemistry';

//   if (/force|motion|velocity|acceleration|gravity|energy|work|power|wave|sound|light|electricity|magnet|current|voltage|resistance|newton|friction|momentum|lens|mirror|circuit|heat|thermodynamics/.test(text))
//     return 'physics';

//   if (/fraction|decimal|ratio|percentage|algebra|equation|graph|number|addition|subtraction|multiplication|division|prime|factor|area|volume|perimeter|statistics|probability|matrix|function/.test(text))
//     return 'mathematics';

//   if (/map|country|continent|river|mountain|climate|weather|soil|agriculture|latitude|longitude|ocean|desert|forest|population|rainfall|resource|earthquake|volcano/.test(text))
//     return 'geography';

//   if (/history|king|war|empire|civilization|dynasty|revolution|independence|freedom|ancient|medieval|colony|trade|culture|period|era|century/.test(text))
//     return 'history';

//   if (/poem|story|character|literature|language|grammar|sentence|noun|verb|adjective|paragraph|essay|author|narrative/.test(text))
//     return 'language';

//   return 'general';
// }

// /* ─────────────────────────────────────────────────────────────────
//    Subject-specific prompt templates — text-free visual style
// ───────────────────────────────────────────────────────────────── */
// function getSubjectPromptStyle(subject, label, description, visualContext) {
//   const noText = 'No text, no labels, no numbers, no words, no letters anywhere in the image.';

//   const styles = {
//     geometry: `
// A precise clean mathematical geometry diagram on a pure white background.
// Show the exact geometric shape described: ${description}.
// ${visualContext?.shape ? `Shape type: ${visualContext.shape}.` : ''}
// ${visualContext?.points?.length > 0 ? `Points at positions: ${JSON.stringify(visualContext.points)}.` : ''}
// ${visualContext?.angles?.length > 0 ? `Mark angles with small arc marks at vertices.` : ''}
// ${visualContext?.markings?.length > 0 ? `Add tick marks on equal sides.` : ''}
// Thin sharp dark-blue lines, clean vertices with small dots, angle arc markers in orange, equal-side tick marks in green.
// Minimalist textbook diagram style. ${noText}`,

//     biology: `
// A detailed educational biology illustration showing: ${description}.
// Concept: ${label}.
// Draw accurate anatomical or biological structures — cells, organs, plants, or organisms as relevant.
// Use soft natural colors: greens for plants, reds/pinks for organs, blues for water, yellows for energy.
// Flat clean illustration style like a school science textbook diagram.
// Show internal structures with cross-section view if relevant.
// White background, smooth clean lines. ${noText}`,

//     chemistry: `
// A clear educational chemistry illustration showing: ${description}.
// Concept: ${label}.
// Show molecular structures, atomic models, bonding arrangements, or reaction setups using colored 3D spheres and connecting sticks.
// Use standard chemistry color coding: oxygen=red, hydrogen=white, carbon=black/grey, nitrogen=blue.
// If it's a reaction, show reactant molecules on left transforming to product molecules on right with an arrow-like visual flow.
// Clean white background, bright distinct colored spheres, bond lines clearly visible. ${noText}`,

//     physics: `
// A clear educational physics concept illustration showing: ${description}.
// Concept: ${label}.
// Show physical phenomena using bold arrows for forces/motion/direction, wave patterns for sound/light, circuit symbols for electricity, or energy flow visual metaphors.
// Use bright distinct colors: red for force/heat, blue for motion/waves, yellow for energy/light, green for positive, orange for friction.
// Bold clean lines on white background, flat diagram style. ${noText}`,

//     mathematics: `
// A clean educational mathematics concept illustration showing: ${description}.
// Concept: ${label}.
// ${visualContext?.data?.length > 0 ? `Data: ${JSON.stringify(visualContext.data)}.` : ''}
// Show mathematical relationships using colored shapes, relative sizes, visual groupings, or geometric representations.
// Use bright colors to distinguish different quantities or categories. Clean white background, simple flat style. ${noText}`,

//     geography: `
// A clean educational geography illustration showing: ${description}.
// Concept: ${label}.
// Show maps, landforms, climate zones, or geographical features using natural realistic colors.
// Blue for water, green for forests, brown for mountains/desert, yellow for plains, white for snow.
// Flat illustrated map or diagram style, clean white background. ${noText}`,

//     history: `
// A clean educational history concept illustration showing: ${description}.
// Concept: ${label}.
// Show historical scenes, timelines, or cultural elements as simple flat illustrations.
// Use warm earthy colors — browns, golds, reds, dark blues.
// Simple clear illustration style suitable for school students. ${noText}`,

//     general: `
// A clear educational concept illustration showing: ${description}.
// Concept: ${label}.
// Use simple colorful shapes, icons, and visual metaphors to represent the idea.
// Bright distinct colors, clean white background, flat modern illustration style.
// Age-appropriate for school students aged 10–18. ${noText}`,
//   };

//   return styles[subject] || styles.general;
// }

// /* ─────────────────────────────────────────────────────────────────
//    Helper: Enrich prompt via Claude with subject awareness
// ───────────────────────────────────────────────────────────────── */
// async function enrichPromptWithClaude(rawPrompt, imageType) {
//   // ── Skip flowsteps entirely ───────────────────────────────────
//   if (imageType === 'SKIP') return null;

//   let visualContext = null;
//   try { visualContext = JSON.parse(rawPrompt); } catch (_) {}

//   const label       = visualContext?.label       || '';
//   const description = visualContext?.description || rawPrompt;
//   const subject     = detectSubject(label, description);

  
//   console.log('─'.repeat(60));
//   console.log(`🔍 SUBJECT DETECTED   : ${subject}`);
//   console.log(`🏷️  LABEL              : ${label}`);
//   console.log(`📄 DESCRIPTION        : ${description}`);
//   console.log('─'.repeat(60));

//   const stylePrompt = getSubjectPromptStyle(subject, label, description, visualContext);

//   const userContent = `You are an expert educational illustration prompt writer.

// Based on the following style guide, write a precise image generation prompt.
// The image must be a clear educational visual for school students aged 10–18.
// It must contain ZERO text, ZERO labels, ZERO numbers — purely visual.

// Style Guide:
// ${stylePrompt}

// Write the final image generation prompt in under 120 words.
// Return ONLY the prompt text. No explanation. No markdown.`;

//   console.log('📤 PROMPT SENT TO CLAUDE:');
//   console.log(userContent);
//   console.log('─'.repeat(60));

//   const msg = await anthropic.messages.create({
//     model:       CLAUDE_MODEL,
//     max_tokens:  256,
//     temperature: 0.2,
//     messages: [{ role: 'user', content: userContent }],
//   });

//   const result = msg.content?.[0]?.text?.trim() || description;

//   // ✅ Log what Claude returned
//   console.log('📥 CLAUDE RESPONSE (will be passed to Vertex AI):');
//   console.log(result);
//   console.log('─'.repeat(60));

//   return result;
// }

// /* ─────────────────────────────────────────────────────────────────
//    Helper: Get Vertex AI access token
// ───────────────────────────────────────────────────────────────── */
// async function getGoogleAccessToken() {
//   const { GoogleAuth } = require('google-auth-library');
//   const auth = new GoogleAuth({
//     keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
//     scopes:  ['https://www.googleapis.com/auth/cloud-platform'],
//   });
//   const client = await auth.getClient();
//   const token  = await client.getAccessToken();
//   return token.token;
// }

// /* ─────────────────────────────────────────────────────────────────
//    POST /api/generate-image
// ───────────────────────────────────────────────────────────────── */
// router.post('/', async (req, res) => {
//   try {
//     const { prompt, imageType, model, contentId, visualIndex } = req.body;
//     const rawPrompt = prompt;

//     if (!rawPrompt || !imageType || !model) {
//       return res.status(400).json({ success: false, message: 'prompt, imageType, and model are required' });
//     }

//     if (!S3_BUCKET || !DYNAMO_TABLE || !PROJECT_ID) {
//       return res.status(500).json({ success: false, message: 'Server misconfiguration: missing environment variables' });
//     }

//     // ── Block flowsteps ───────────────────────────────────────────
//     if (imageType === 'SKIP') {
//       return res.status(400).json({ success: false, message: 'Flowchart visuals do not need AI image generation.' });
//     }

//     console.log(`🖼️  Image generation | type: ${imageType} | model: ${model}`);

//     // ── Step 1: Enrich prompt via Claude ──────────────────────────
//     console.log('🤖 Enriching prompt with Claude...');
//     const enrichedPrompt = await enrichPromptWithClaude(rawPrompt, imageType);
    
//     console.log('─'.repeat(60));
//     console.log('📝 CLAUDE ENRICHED PROMPT:');
//     console.log(enrichedPrompt);
//     console.log('─'.repeat(60));

//     // ── Step 2: Call Vertex AI Imagen ──────────────────────────────
//     const accessToken = await getGoogleAccessToken();

//     const vertexRes = await axios.post(
//       `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predict`,
//       {
//         instances:  [{ prompt: enrichedPrompt }],
//         parameters: {
//           sampleCount:       1,
//           aspectRatio:       '1:1',
//           safetyFilterLevel: 'block_some',
//           negativePrompt:    'text, letters, words, numbers, labels, captions, watermark, typography, writing, annotations, titles, headings, speech bubbles',
//         },
//       },
//       { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
//     );

//     const base64 = vertexRes.data.predictions?.[0]?.bytesBase64Encoded;
//     if (!base64) {
//       return res.status(502).json({ success: false, message: 'No image data returned from Vertex AI' });
//     }

//     const buffer = Buffer.from(base64, 'base64');
//     console.log('✅ Image received from Vertex AI');

//     // ── Step 3: Upload to S3 ──────────────────────────────────────
//     const imageId = uuidv4();
//     const s3Key   = `generated-images/${imageId}.png`;

//     await s3.putObject({
//       Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'image/png',
//     }).promise();

//     const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
//     console.log(`✅ Uploaded to S3: ${s3Key}`);

//     // ── Step 4: Store metadata in DynamoDB ────────────────────────
//     await dynamo.put({
//       TableName: DYNAMO_TABLE,
//       Item: {
//         imageId, prompt: rawPrompt, enrichedPrompt, imageType, model,
//         s3Key, imageUrl, subject: (() => { try { const v = JSON.parse(rawPrompt); return detectSubject(v.label || '', v.description || ''); } catch { return 'general'; } })(),
//         contentId: contentId || null, visualIndex: visualIndex ?? null,
//         createdAt: new Date().toISOString(),
//       },
//     }).promise();

//     console.log(`✅ Saved to DynamoDB: ${imageId}`);

//     return res.status(200).json({ success: true, imageId, imageUrl, enrichedPrompt });

//   } catch (error) {
//     console.error('❌ Image generation error:', error.message);
//     const vertexMsg = error?.response?.data?.error?.message;
//     return res.status(500).json({ success: false, message: vertexMsg || error.message || 'Internal server error' });
//   }
// });

// module.exports = router;

const express    = require('express');
const AWS        = require('aws-sdk');
const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Anthropic  = require('@anthropic-ai/sdk');
const { AzureOpenAI } = require('openai');
const axios      = require('axios');

const router = express.Router();

// ── AWS setup ─────────────────────────────────────────────────────
const s3     = new AWS.S3({ region: process.env.AWS_REGION });
const dynamo = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const S3_BUCKET    = process.env.AWS_S3_BUCKET;
const DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE;

// ── Claude setup ──────────────────────────────────────────────────
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const anthropic    = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ── Azure OpenAI setup ────────────────────────────────────────────
const azureOpenAI = new AzureOpenAI({
  apiKey:     process.env.AZURE_OPENAI_API_KEY1,
  endpoint:   process.env.AZURE_OPENAI_ENDPOINT1,
  apiVersion: '2025-04-01-preview',
});

// DALL-E 3 deployment name — set in your Azure OpenAI resource
const IMAGE_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5-tskar';

/* ─────────────────────────────────────────────────────────────────
   Subject detector
───────────────────────────────────────────────────────────────── */
function detectSubject(label = '', description = '') {
  const text = `${label} ${description}`.toLowerCase();

  if (/triangle|angle|circle|polygon|quadrilateral|parallel|perpendicular|radius|diameter|bisect|geometry|congruent|hypotenuse|theorem|coordinate|line segment|ray|chord/.test(text))
    return 'geometry';
  if (/cell|organ|heart|lung|kidney|brain|digestion|blood|muscle|bone|nerve|photosynthesis|respiration|ecosystem|plant|animal|human body|reproduction|dna|chromosome|mitosis|meiosis|bacteria|virus|leaf|root|stem/.test(text))
    return 'biology';
  if (/atom|molecule|element|compound|reaction|bond|electron|proton|neutron|periodic|acid|base|salt|oxidation|reduction|valence|formula|h2o|co2|chemical|equation|ion|covalent|ionic|metal|nonmetal|reactivity|reactive|combustion|corrosion|rust|oxygen|hydrogen|nitrogen|carbon|copper|iron|zinc|gold|silver|sodium|potassium|calcium|magnesium|aluminium|displacement|electrolysis|alloy|ore|extraction|furnace|catalyst/.test(text))
    return 'chemistry';
  if (/force|motion|velocity|acceleration|gravity|energy|work|power|wave|sound|light|electricity|magnet|current|voltage|resistance|newton|friction|momentum|lens|mirror|circuit|heat|thermodynamics/.test(text))
    return 'physics';
  if (/fraction|decimal|ratio|percentage|algebra|equation|graph|number|addition|subtraction|multiplication|division|prime|factor|area|volume|perimeter|statistics|probability|matrix|function/.test(text))
    return 'mathematics';
  if (/map|country|continent|river|mountain|climate|weather|soil|agriculture|latitude|longitude|ocean|desert|forest|population|rainfall|resource|earthquake|volcano/.test(text))
    return 'geography';
  if (/history|king|war|empire|civilization|dynasty|revolution|independence|freedom|ancient|medieval|colony|trade|culture|period|era|century/.test(text))
    return 'history';
  if (/poem|story|character|literature|language|grammar|sentence|noun|verb|adjective|paragraph|essay|author|narrative/.test(text))
    return 'language';

  return 'general';
}

/* ─────────────────────────────────────────────────────────────────
   Subject-specific prompt templates
───────────────────────────────────────────────────────────────── */
function getSubjectPromptStyle(subject, label, description, visualContext) {
  const noText = `Include a bold title at the top of the image.
Add labeled callout lines pointing to each key part/structure in the diagram (like a medical or textbook diagram).
Labels should be short (1–3 words each), placed neatly around the illustration with thin lines pointing to the correct part.
Style similar to a Cleveland Clinic medical diagram or school science textbook.`;

  const styles = {
    geometry: `
A precise clean mathematical geometry diagram on a pure white background.
Show the exact geometric shape described: ${description}.
${visualContext?.shape ? `Shape type: ${visualContext.shape}.` : ''}
${visualContext?.points?.length > 0 ? `Points at positions: ${JSON.stringify(visualContext.points)}.` : ''}
${visualContext?.angles?.length > 0 ? `Mark angles with small arc marks at vertices.` : ''}
${visualContext?.markings?.length > 0 ? `Add tick marks on equal sides.` : ''}
Thin sharp dark-blue lines, clean vertices with small dots, angle arc markers in orange, equal-side tick marks in green.
Minimalist textbook diagram style. ${noText}`,

    biology: `
A detailed educational biology illustration showing: ${description}.
Concept: ${label}.
Draw accurate anatomical or biological structures — cells, organs, plants, or organisms as relevant.
Use soft natural colors: greens for plants, reds/pinks for organs, blues for water, yellows for energy.
Flat clean illustration style like a school science textbook diagram.
Show internal structures with cross-section view if relevant.
White background, smooth clean lines. ${noText}`,

    chemistry: `
A clear educational chemistry illustration showing: ${description}.
Concept: ${label}.
Show molecular structures, atomic models, bonding arrangements, or reaction setups using colored 3D spheres and connecting sticks.
Use standard chemistry color coding: oxygen=red, hydrogen=white, carbon=black/grey, nitrogen=blue.
If it's a reaction, show reactant molecules on left transforming to product molecules on right with an arrow-like visual flow.
Clean white background, bright distinct colored spheres, bond lines clearly visible. ${noText}`,

    physics: `
A clear educational physics concept illustration showing: ${description}.
Concept: ${label}.
Show physical phenomena using bold arrows for forces/motion/direction, wave patterns for sound/light, circuit symbols for electricity, or energy flow visual metaphors.
Use bright distinct colors: red for force/heat, blue for motion/waves, yellow for energy/light, green for positive, orange for friction.
Bold clean lines on white background, flat diagram style. ${noText}`,

    mathematics: `
A clean educational mathematics concept illustration showing: ${description}.
Concept: ${label}.
${visualContext?.data?.length > 0 ? `Data: ${JSON.stringify(visualContext.data)}.` : ''}
Show mathematical relationships using colored shapes, relative sizes, visual groupings, or geometric representations.
Use bright colors to distinguish different quantities or categories. Clean white background, simple flat style. ${noText}`,

    geography: `
A clean educational geography illustration showing: ${description}.
Concept: ${label}.
Show maps, landforms, climate zones, or geographical features using natural realistic colors.
Blue for water, green for forests, brown for mountains/desert, yellow for plains, white for snow.
Flat illustrated map or diagram style, clean white background. ${noText}`,

    history: `
A clean educational history concept illustration showing: ${description}.
Concept: ${label}.
Show historical scenes, timelines, or cultural elements as simple flat illustrations.
Use warm earthy colors — browns, golds, reds, dark blues.
Simple clear illustration style suitable for school students. ${noText}`,

    general: `
A clear educational concept illustration showing: ${description}.
Concept: ${label}.
Use simple colorful shapes, icons, and visual metaphors to represent the idea.
Bright distinct colors, clean white background, flat modern illustration style.
Age-appropriate for school students aged 10–18. ${noText}`,
  };

  return styles[subject] || styles.general;
}

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
/* ─────────────────────────────────────────────────────────────────
   Helper: Enrich prompt via Claude
───────────────────────────────────────────────────────────────── */
async function enrichPromptWithClaude(rawPrompt, imageType) {
  if (imageType === 'SKIP') return null;

  let visualContext = null;
  try { visualContext = JSON.parse(rawPrompt); } catch (_) {}

  const label       = visualContext?.label       || '';
  const description = visualContext?.description || rawPrompt;
  const subject     = detectSubject(label, description);
  const lang        = detectLanguage(`${label} ${description}`);
  const imageStyle  = visualContext?.imageStyle  || 'color'; 

  console.log('─'.repeat(60));
  console.log(`🔍 SUBJECT   : ${subject}`);
  console.log(`🌐 LANGUAGE  : ${lang.name} (${lang.code})`);
  console.log(`🏷️  LABEL     : ${label}`);
  console.log(`📄 DESC      : ${description}`);
  console.log('─'.repeat(60));
  console.log(`🎨 IMAGE STYLE: ${imageStyle}`);

  const stylePrompt = getSubjectPromptStyle(subject, label, description, visualContext);
  const isNonEnglish = lang.code !== 'en';

  let userContent;

  if (isNonEnglish) {
    // ── Tamil / Hindi: TWO outputs — no-text image prompt + labels JSON ──
    userContent = `You are an expert educational illustration prompt writer.

Your task has TWO parts. Return ONLY valid JSON — no markdown, no explanation.

PART 1 — imagePrompt:
Write a visual-only image generation prompt based on the style guide below.
The image must have ABSOLUTELY ZERO text, ZERO labels, ZERO numbers, ZERO words.
Purely visual illustration. Text will be overlaid separately via HTML.

PART 2 — labels in ${lang.name}:
List the key parts/structures of this diagram with their labels in ${lang.name} script.
Each label needs an approximate position (x%, y%) within a 1024x1024 image.
(0,0) = top-left, (100,100) = bottom-right.

Style Guide:
${stylePrompt}

Return this exact JSON structure:
{
  "imagePrompt": "purely visual prompt here — NO text in image",
  "title": "diagram title in ${lang.name} script",
  "labels": [
    { "text": "${lang.name} label here", "x": 50, "y": 10 },
    { "text": "${lang.name} label here", "x": 20, "y": 45 }
  ]
}`;

  } else {
    // ── English: normal labeled image prompt ──────────────────────
    userContent = `You are an expert educational illustration prompt writer.

Based on the following style guide, write a precise image generation prompt.
The image must be a clear educational labeled diagram for school students aged 10–18.

Text rules:
- Include a bold title at the very top in English
- Add short labels (1–3 words) with thin callout lines to each key part
- Style like a Cleveland Clinic medical diagram or school science textbook
- No paragraph text — ONLY title + part labels with pointer lines

Style Guide:
${stylePrompt}

Write the final image generation prompt in under 150 words.
Return ONLY the prompt text. No explanation. No markdown.`;
  }

  console.log('📤 PROMPT TO CLAUDE:');
  console.log(userContent);
  console.log('─'.repeat(60));

  const msg = await anthropic.messages.create({
    model:       CLAUDE_MODEL,
    max_tokens:  600,
    temperature: 0.2,
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = msg.content?.[0]?.text?.trim() || '';

  console.log('📥 CLAUDE RESPONSE:');
  console.log(raw);
  console.log('─'.repeat(60));

  if (isNonEnglish) {
    // Parse JSON response for Tamil/Hindi
    let parsed = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      console.warn('⚠️ JSON parse failed, using fallback');
      parsed = { imagePrompt: description, title: label, labels: [] };
    }
    return {
      enrichedPrompt: parsed.imagePrompt || description,
      title:          parsed.title        || label,
      labels:         Array.isArray(parsed.labels) ? parsed.labels : [],
      lang,
      isNonEnglish:   true,
      imageStyle,
    };
  } else {
    // Plain text response for English
    return {
      enrichedPrompt: raw || description,
      title:          label,
      labels:         [],
      lang,
      isNonEnglish:   false,
      imageStyle,
    };
  }
}

/* ─────────────────────────────────────────────────────────────────
   Helper: Generate image via Azure OpenAI DALL-E 3
   Returns: Buffer (PNG image bytes)
───────────────────────────────────────────────────────────────── */
async function generateImageWithAzure(prompt, isNonEnglish = false, imageStyle = 'color') {
  console.log(`🎨 Azure gpt-image | deployment: ${IMAGE_DEPLOYMENT} | noText: ${isNonEnglish} | style: ${imageStyle}`);

  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT1;
  const apiKey     = process.env.AZURE_OPENAI_API_KEY1;
  const apiVersion = '2025-04-01-preview';
  const url = `${endpoint}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${apiVersion}`;

  const styleRule = imageStyle === 'line'
    ? `STYLE RULE: Black and white LINE ART only.
Thin clean black lines on pure white background.
NO color fills, NO shading, NO gradients, NO color anywhere.
Pure monochrome ink-style illustration like a textbook coloring page or technical drawing.`
    : `STYLE RULE: Full color illustration.
Use bright distinct educational colors appropriate for a school textbook diagram.`;

  const textRule = isNonEnglish
    ? `STRICT RULE: NO text, NO labels, NO numbers, NO words, NO letters anywhere in the image.
Purely visual illustration only. Clean white background. All structures unlabeled.`
    : `LAYOUT RULES:
- Bold title at the top center
- Short text labels (1–3 words) with thin callout lines to each structure
- Style like a Cleveland Clinic medical diagram
- No paragraph text — only title + part labels`;

  const noBoxRule = `UNIVERSAL RULE (apply always, no exceptions):
Do NOT draw any empty boxes, blank rectangles, unfilled label frames, empty callout bubbles, or placeholder outline shapes anywhere in the image.
Every shape drawn must be a filled part of the actual illustration — NOT an annotation container.
No empty outlined rectangles. No blank text boxes. No unfilled callout frames. No empty speech bubbles.`;

  // ── NEW: Canvas boundary rule — prevents clipping ─────────────
  const canvasRule = `CANVAS RULE (critical — no exceptions):
The entire illustration MUST be fully contained within the image boundaries.
Leave at least 5% padding on ALL sides (left, right, top, bottom).
NO element, label, line, or text should be cut off or touch the image edge.
If the diagram is wide (e.g. side-by-side comparison), scale it down to fit completely within the canvas with padding on all sides.
Every part of the diagram must be 100% visible — nothing cropped, nothing clipped.`;

  const finalPrompt = `${prompt}\n\n${styleRule}\n\n${textRule}\n\n${noBoxRule}\n\n${canvasRule}`;

  console.log(`📏 Final prompt length: ${finalPrompt.length} chars`);

  const body = {
    prompt:        finalPrompt,
    n:             1,
    size:          '1024x1024',
    quality:       'high',          // ← 'medium' → 'high' (prevents edge clipping)
    output_format: 'png',
  };

  // ── Retry up to 2 times on failure or incomplete image ────────
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🎨 Azure attempt ${attempt}`);

      const response = await axios.post(url, body, {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 90000,   // 90s — high quality takes longer
      });

      const base64 = response.data?.data?.[0]?.b64_json;
      if (!base64) throw new Error('No image data returned from Azure gpt-image');

      const buffer = Buffer.from(base64, 'base64');

      // Reject suspiciously small images (corrupt / incomplete render)
      if (buffer.length < 50_000) {
        throw new Error(`Image too small: ${buffer.length} bytes — likely incomplete`);
      }

      console.log(`✅ Image received | ${buffer.length} bytes | attempt ${attempt}`);
      return buffer;

    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }

  throw lastError;
}

function buildDiagramHTML(imageUrl, title, labels, langCode) {
  // Google font map by language code
  const fontMap = {
    ta: 'Noto Sans Tamil',
    hi: 'Noto Sans Devanagari',
    te: 'Noto Sans Telugu',
    kn: 'Noto Sans Kannada',
    ml: 'Noto Sans Malayalam',
    bn: 'Noto Sans Bengali',
    ar: 'Noto Sans Arabic',
    en: 'Inter',
  };
  const fontName   = fontMap[langCode] || 'Inter';
  const googleFont = fontName !== 'Inter'
    ? `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`
    : null;

  const labelsHTML = labels.map(l => `
    <div style="
      position: absolute;
      left: ${l.x}%;
      top: ${l.y}%;
      transform: translate(-50%, -50%);
      font-family: '${fontName}', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #0d47a1;
      background: rgba(255,255,255,0.92);
      padding: 3px 9px;
      border-radius: 5px;
      border: 1.5px solid #90caf9;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    ">${l.text}</div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${googleFont ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${googleFont}" rel="stylesheet">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; display: flex; justify-content: center; align-items: flex-start; }
    .diagram-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
      max-width: 600px;
    }
    .diagram-wrapper img {
      width: 100%;
      display: block;
      border-radius: 8px;
    }
    .diagram-title {
      position: absolute;
      top: 2%;
      left: 50%;
      transform: translateX(-50%);
      font-family: '${fontName}', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      background: rgba(255,255,255,0.93);
      padding: 5px 14px;
      border-radius: 6px;
      border: 1.5px solid #c5cae9;
      white-space: nowrap;
      box-shadow: 0 1px 6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="diagram-wrapper">
    <img src="${imageUrl}" alt="Educational diagram" />
    <div class="diagram-title">${title}</div>
    ${labelsHTML}
  </div>
</body>
</html>`;
}
/* ─────────────────────────────────────────────────────────────────
   POST /api/generate-image
   Body: { prompt, imageType, contentId?, visualIndex? }
   Note: `model` param is ignored — Azure DALL-E 3 is always used
───────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { prompt, imageType, contentId, visualIndex } = req.body;
    const rawPrompt = prompt;

    if (!rawPrompt || !imageType)
      return res.status(400).json({ success: false, message: 'prompt and imageType are required' });

    if (!S3_BUCKET || !DYNAMO_TABLE)
      return res.status(500).json({ success: false, message: 'Missing env vars' });

    if (!process.env.AZURE_OPENAI_API_KEY1 || !process.env.AZURE_OPENAI_ENDPOINT1)
      return res.status(500).json({ success: false, message: 'Missing Azure credentials' });

    if (imageType === 'SKIP')
      return res.status(400).json({ success: false, message: 'Flowchart visuals do not need AI image generation.' });

    // ── Step 1: Claude → enriched prompt + labels (for Tamil/Hindi) ──
    const { enrichedPrompt, title, labels, lang, isNonEnglish, imageStyle } =
      await enrichPromptWithClaude(rawPrompt, imageType);

    console.log(`📝 TO AZURE | lang: ${lang.name} | noText: ${isNonEnglish}`);
    console.log(enrichedPrompt);
    console.log('─'.repeat(60));

    // ── Step 2: Generate image (no text if Tamil/Hindi) ───────────
    const buffer = await generateImageWithAzure(enrichedPrompt, isNonEnglish, imageStyle);

    // ── Step 3: Upload to S3 ──────────────────────────────────────
    const imageId = uuidv4();
    const s3Key   = `generated-images/${imageId}.png`;

    await s3.putObject({
      Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`✅ S3: ${s3Key}`);

    // ── Step 4: Build HTML overlay (only for Tamil/Hindi) ─────────
    const diagramHTML = isNonEnglish
      ? buildDiagramHTML(imageUrl, title, labels, lang.code)
      : null;

    // ── Step 5: DynamoDB ──────────────────────────────────────────
    const subject = (() => {
      try { const v = JSON.parse(rawPrompt); return detectSubject(v.label||'', v.description||''); }
      catch { return 'general'; }
    })();

    await dynamo.put({
      TableName: DYNAMO_TABLE,
      Item: {
        imageId,
        prompt:        rawPrompt,
        enrichedPrompt,
        imageType,
        model:         `azure-gpt-image-1.5/${IMAGE_DEPLOYMENT}`,
        subject,
        language:      lang.name,
        langCode:      lang.code,          // ← add langCode
        isNonEnglish,                      // ← add isNonEnglish flag
        title,
        labels:        JSON.stringify(labels),
        diagramHTML:   diagramHTML || null, // ← store HTML script
        s3Key,
        imageUrl,
        contentId:     contentId   || null,
        visualIndex:   visualIndex ?? null,
        createdAt:     new Date().toISOString(),
      },
    }).promise();

    console.log(`✅ DynamoDB: ${imageId}`);

    // ── Step 6: Return response ───────────────────────────────────
    return res.status(200).json({
      success:      true,
      imageId,
      imageUrl,
      enrichedPrompt,
      language:     lang.name,
      langCode:     lang.code,
      isNonEnglish,
      title,        // Tamil/Hindi title from Claude
      labels,       // [{ text, x, y }] from Claude
      diagramHTML,  // ready-to-render HTML string (null for English)
    });

  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    const azureMsg = error?.error?.message || error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
});

module.exports = router;