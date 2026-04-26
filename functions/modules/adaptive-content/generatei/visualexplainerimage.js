const AWS   = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({ region: process.env.AWS_REGION });

const TEXT_API_KEY     = process.env.AZURE_OPENAI_API_KEY;
const TEXT_ENDPOINT    = process.env.AZURE_OPENAI_ENDPOINT;
const TEXT_DEPLOYMENT  = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const TEXT_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

const IMAGE_API_KEY         = process.env.AZURE_OPENAI_API_KEY1;
const IMAGE_ENDPOINT        = process.env.AZURE_OPENAI_ENDPOINT1;
const IMAGE_DEPLOYMENT      = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5-tskar';
const IMAGE_API_VERSION_IMG = '2025-04-01-preview';

const S3_BUCKET = process.env.AWS_S3_BUCKET;


// ── Step A (VisualExplainer): Build image prompt from topic name ──────────────
async function buildVisualExplainerImagePrompt(topicName) {
  const topic = topicName || 'Educational concept';

  const userContent = `You are an expert educational illustration prompt writer.
Write a visual-only image generation prompt for an educational VISUAL EXPLAINER illustration.

Topic: "${topic}"

The image must be a BLACK AND WHITE LINE ART visual explainer — like a hand-drawn textbook diagram.

STRICT STYLE RULES:
- Style: Black ink line art on a pure white background. Like a pen sketch in an academic textbook.
- All lines, outlines, and icons drawn in thin black strokes only. NO color fills whatsoever.
- Layout: Clear focal point at the centre representing the main concept, supporting visual icons arranged around it
- Icons and shapes: Simple outlined symbols and icons (black stroke, white fill) representing the concept visually
- Connections: Thin straight black lines or simple arrows connecting related icons if needed
- NO color, NO gradients, NO shading, NO fill colors — pure black lines on white only
- NO text, NO letters, NO numbers, NO labels anywhere in the image

Write ONLY the image prompt in under 100 words. Nothing else.`;

  const azureUrl = `${TEXT_ENDPOINT}/openai/deployments/${TEXT_DEPLOYMENT}/chat/completions?api-version=${TEXT_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [{ role: 'user', content: userContent }],
      max_tokens:  200,
      temperature: 0.2,
    },
    {
      headers: { 'api-key': TEXT_API_KEY, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim()
    || `Black and white line art visual explainer illustrating ${topic}. Central outlined icon representing the main concept, surrounding outlined supporting icons connected by thin black lines. Pure white background, no color, no labels, no text. Textbook pen-and-ink sketch style.`;
}


// ── Step B (VisualExplainer): Generate image via Azure + upload to S3 ─────────
async function generateAndUploadVisualImage(topicName) {
  try {
    const imagePrompt = await buildVisualExplainerImagePrompt(topicName);

    const finalPrompt = [
      `STYLE: Black and white line art only. Pure white background. Thin black ink strokes. Textbook pen-and-ink sketch / technical diagram style. NO color, NO gradients, NO shading, NO fills of any color — only black outlines on white.`,
      imagePrompt,
      `LAYOUT RULES: Visual explainer composition. One prominent central icon or symbol (outlined, black stroke, white fill) representing the core concept. Supporting concept icons arranged spatially around it. Simple thin black connector lines between related elements where needed. Clean, uncluttered layout with generous spacing between icons.`,
      `COLOR RULES: This must be strictly MONOCHROME. Black ink lines and outlines only on a pure white canvas. Any color in the output is a failure. Treat this exactly like a pen-and-ink technical illustration from an academic textbook.`,
      `CRITICAL: NO text, NO letters, NO numbers, NO words, NO labels anywhere. Zero readable characters.`,
      `CANVAS: All content inside boundaries. 5% padding on all sides.`,
    ].join('\n\n');

    const url = `${IMAGE_ENDPOINT}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${IMAGE_API_VERSION_IMG}`;

    const imgResponse = await axios.post(
      url,
      { prompt: finalPrompt, n: 1, size: '1024x1024', quality: 'high', output_format: 'png' },
      {
        headers: { 'api-key': IMAGE_API_KEY, 'Content-Type': 'application/json' },
        timeout: 90000,
      }
    );

    const base64 = imgResponse.data?.data?.[0]?.b64_json;
    if (!base64) throw new Error('No image data returned from Azure');

    const buffer  = Buffer.from(base64, 'base64');
    const imageId = uuidv4();
    const s3Key   = `visual-explainer-images/${imageId}.png`;

    await s3.putObject({
      Bucket:      S3_BUCKET,
      Key:         s3Key,
      Body:        buffer,
      ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    return { imageUrl, imageId };

  } catch (err) {
    console.error('[VisualExplainerImage] Generation failed (non-fatal):', err.message);
    return null;
  }
}


module.exports = {
  buildVisualExplainerImagePrompt,
  generateAndUploadVisualImage,
};