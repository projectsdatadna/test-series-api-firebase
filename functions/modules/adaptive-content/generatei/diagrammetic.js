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


async function buildDiagramImagePrompt(diagramData, topicName) {
  const diagramType = diagramData?.diagram?.type || 'TREE';
  const nodeLabels  = (diagramData?.diagram?.nodes || [])
    .map(n => n.label).slice(0, 8).join(', ');
  const coreIdea    = diagramData?.coreIdea || '';
  const subject     = diagramData?.header?.title || topicName || 'Educational concept';

  const userContent = `You are an expert educational diagram designer.

Write a visual-only image generation prompt for an educational diagram.

Topic: "${subject}"
Core idea: ${coreIdea}
Key concepts: ${nodeLabels}

🚨 GOAL:
Create a diagram that clearly REPRESENTS STRUCTURE so it can be EXPLAINED visually like a textbook (e.g., human body diagram).

STYLE:
- Black and white line art (pen sketch style)
- Thin black strokes on pure white background

VISUAL STRUCTURE:
- Main subject clearly visible (central or top)
- Supporting parts arranged logically around or below
- Each part must be visually distinguishable using shapes/icons

IMPORTANT:
- The diagram must be SELF-EXPLANATORY visually
- Each node must represent a real concept (not decorative)

STRICT RULES:
- NO text, NO labels, NO letters, NO numbers
- NO color, NO shading

OUTPUT:
Write ONLY the image prompt under 100 words.`;

  const azureUrl = `${TEXT_ENDPOINT}/openai/deployments/${TEXT_DEPLOYMENT}/chat/completions?api-version=${TEXT_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 200,
      temperature: 0.2,
    },
    {
      headers: { 'api-key': TEXT_API_KEY, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim()
    || `Black and white line art top-down hierarchy diagram. Outlined rounded rectangle nodes connected by thin straight black lines. Each node contains a simple black ink icon representing: ${nodeLabels}. Pure white background, no color, no arrows, no labels, no text. Textbook sketch style.`;
}


async function generateAndUploadDiagramImage(diagramData, topicName) {
  try {
    const imagePrompt = await buildDiagramImagePrompt(diagramData, topicName);

    const finalPrompt = [
      `STYLE: Black and white line art only. Pure white background. Thin black ink strokes. Educational textbook illustration style (like biology or science diagrams).`,

      imagePrompt,

      `LAYOUT RULES:
    - Create a clear educational diagram (NOT UI boxes or flowchart)
    - One MAIN subject (central or top) representing the core concept
    - Supporting parts arranged logically around or below the main subject
    - Each part must visually represent a real concept (like organs, components, or stages)
    - Use simple shapes and meaningful icons, not abstract symbols
    - Maintain clean spacing and balanced composition`,

      `STRUCTURE:
    - The diagram must be visually understandable without text
    - Each element should clearly represent a part of the concept
    - Relationships between parts should be obvious from placement and structure`,

      `CONNECTION RULES:
    - Use thin straight lines only if needed to show relationships
    - Avoid complex connectors, arrows, or decorative lines`,

      `COLOR RULES:
    - STRICTLY black ink lines only on pure white background
    - No color, no shading, no gradients`,

      `CRITICAL:
    - NO text, NO labels, NO letters, NO numbers anywhere
    - No UI-style boxes or mind map layouts
    - Must look like a real educational diagram from a textbook`,

      `CANVAS:
    - Keep all elements inside boundaries
    - Maintain 5–10% padding on all sides`,
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
    const s3Key   = `diagram-images/${imageId}.png`;

    await s3.putObject({
      Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    return { imageUrl, imageId };

  } catch (err) {
    console.error('[DiagramImage] Generation failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = {
  buildDiagramImagePrompt,
  generateAndUploadDiagramImage,
};