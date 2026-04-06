const express      = require('express');
const axios        = require('axios');
const AWS          = require('aws-sdk');
const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Anthropic    = require('@anthropic-ai/sdk');

const router = express.Router();

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const dynamo = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const S3_BUCKET    = process.env.AWS_S3_BUCKET;
const DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE;
const PROJECT_ID   = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION     = 'us-central1';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const anthropic    = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

/* ─────────────────────────────────────────────────────────────────
   Subject detector — reads label + description to identify subject
───────────────────────────────────────────────────────────────── */
function detectSubject(label = '', description = '') {
  const text = `${label} ${description}`.toLowerCase();

  if (/triangle|angle|circle|polygon|quadrilateral|parallel|perpendicular|radius|diameter|bisect|geometry|congruent|hypotenuse|theorem|coordinate|line segment|ray|chord/.test(text))
    return 'geometry';

  if (/cell|organ|heart|lung|kidney|brain|digestion|blood|muscle|bone|nerve|photosynthesis|respiration|ecosystem|plant|animal|human body|reproduction|dna|chromosome|mitosis|meiosis|bacteria|virus|leaf|root|stem/.test(text))
    return 'biology';

  if (/atom|molecule|element|compound|reaction|bond|electron|proton|neutron|periodic|acid|base|salt|oxidation|reduction|valence|formula|h2o|co2|chemical|equation|ion|covalent|ionic/.test(text))
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
   Subject-specific prompt templates — text-free visual style
───────────────────────────────────────────────────────────────── */
function getSubjectPromptStyle(subject, label, description, visualContext) {
  const noText = 'No text, no labels, no numbers, no words, no letters anywhere in the image.';

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

/* ─────────────────────────────────────────────────────────────────
   Helper: Enrich prompt via Claude with subject awareness
───────────────────────────────────────────────────────────────── */
async function enrichPromptWithClaude(rawPrompt, imageType) {
  // ── Skip flowsteps entirely ───────────────────────────────────
  if (imageType === 'SKIP') return null;

  let visualContext = null;
  try { visualContext = JSON.parse(rawPrompt); } catch (_) {}

  const label       = visualContext?.label       || '';
  const description = visualContext?.description || rawPrompt;
  const subject     = detectSubject(label, description);

  console.log(`🔍 Detected subject: ${subject} | type: ${imageType}`);

  const stylePrompt = getSubjectPromptStyle(subject, label, description, visualContext);

  const userContent = `You are an expert educational illustration prompt writer.

Based on the following style guide, write a precise image generation prompt.
The image must be a clear educational visual for school students aged 10–18.
It must contain ZERO text, ZERO labels, ZERO numbers — purely visual.

Style Guide:
${stylePrompt}

Write the final image generation prompt in under 120 words.
Return ONLY the prompt text. No explanation. No markdown.`;

  const msg = await anthropic.messages.create({
    model:       CLAUDE_MODEL,
    max_tokens:  256,
    temperature: 0.2,
    messages: [{ role: 'user', content: userContent }],
  });

  return msg.content?.[0]?.text?.trim() || description;
}

/* ─────────────────────────────────────────────────────────────────
   Helper: Get Vertex AI access token
───────────────────────────────────────────────────────────────── */
async function getGoogleAccessToken() {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes:  ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  return token.token;
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/generate-image
───────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { prompt, imageType, model, contentId, visualIndex } = req.body;
    const rawPrompt = prompt;

    if (!rawPrompt || !imageType || !model) {
      return res.status(400).json({ success: false, message: 'prompt, imageType, and model are required' });
    }

    if (!S3_BUCKET || !DYNAMO_TABLE || !PROJECT_ID) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: missing environment variables' });
    }

    // ── Block flowsteps ───────────────────────────────────────────
    if (imageType === 'SKIP') {
      return res.status(400).json({ success: false, message: 'Flowchart visuals do not need AI image generation.' });
    }

    console.log(`🖼️  Image generation | type: ${imageType} | model: ${model}`);

    // ── Step 1: Enrich prompt via Claude ──────────────────────────
    console.log('🤖 Enriching prompt with Claude...');
    const enrichedPrompt = await enrichPromptWithClaude(rawPrompt, imageType);
    console.log(`✅ Enriched prompt: ${enrichedPrompt?.slice(0, 100)}...`);

    // ── Step 2: Call Vertex AI Imagen ──────────────────────────────
    const accessToken = await getGoogleAccessToken();

    const vertexRes = await axios.post(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predict`,
      {
        instances:  [{ prompt: enrichedPrompt }],
        parameters: {
          sampleCount:       1,
          aspectRatio:       '1:1',
          safetyFilterLevel: 'block_some',
          negativePrompt:    'text, letters, words, numbers, labels, captions, watermark, typography, writing, annotations, titles, headings, speech bubbles',
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const base64 = vertexRes.data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) {
      return res.status(502).json({ success: false, message: 'No image data returned from Vertex AI' });
    }

    const buffer = Buffer.from(base64, 'base64');
    console.log('✅ Image received from Vertex AI');

    // ── Step 3: Upload to S3 ──────────────────────────────────────
    const imageId = uuidv4();
    const s3Key   = `generated-images/${imageId}.png`;

    await s3.putObject({
      Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`✅ Uploaded to S3: ${s3Key}`);

    // ── Step 4: Store metadata in DynamoDB ────────────────────────
    await dynamo.put({
      TableName: DYNAMO_TABLE,
      Item: {
        imageId, prompt: rawPrompt, enrichedPrompt, imageType, model,
        s3Key, imageUrl, subject: (() => { try { const v = JSON.parse(rawPrompt); return detectSubject(v.label || '', v.description || ''); } catch { return 'general'; } })(),
        contentId: contentId || null, visualIndex: visualIndex ?? null,
        createdAt: new Date().toISOString(),
      },
    }).promise();

    console.log(`✅ Saved to DynamoDB: ${imageId}`);

    return res.status(200).json({ success: true, imageId, imageUrl, enrichedPrompt });

  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    const vertexMsg = error?.response?.data?.error?.message;
    return res.status(500).json({ success: false, message: vertexMsg || error.message || 'Internal server error' });
  }
});

module.exports = router;
