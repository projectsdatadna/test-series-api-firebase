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


// ── Step A (VisualExplainer): Build individual step prompts ──────────────────
/**
 * Generate sequential image prompts for each step of the concept
 * Returns array of prompts: [stepA_prompt, stepB_prompt, stepC_prompt, final_prompt]
 */
async function buildVisualExplainerStepPrompts(topicName) {
  const topic = topicName || 'Educational concept';

  const userContent = `You are an expert educational diagram designer creating a STEP-BY-STEP visual sequence.

Topic: "${topic}"

🎯 YOUR TASK:
Create 4 INDIVIDUAL image prompts (one for each step of a process). Each image should show ONE stage of the concept's evolution.

STEP STRUCTURE (A → B → C → Final):
- STEP A: Starting state or initial concept
- STEP B: First transformation or intermediate stage
- STEP C: Second transformation or further progression  
- STEP FINAL: Completed concept or final result

📋 FOR EACH STEP, PROVIDE:
A clear, standalone image description showing ONLY that step's state.

VISUAL RULES FOR ALL STEPS:
- Black and white line art only
- Thin black strokes on pure white background
- NO colors, NO shading, NO gradients
- NO text, NO labels, NO numbers, NO letters
- Each image must be visually DIFFERENT from the previous step

OUTPUT FORMAT:
Return EXACTLY 4 lines, one prompt per line:
Line 1: [STEP A - starting state]
Line 2: [STEP B - first transformation]
Line 3: [STEP C - further progression]
Line 4: [STEP FINAL - completed concept]

EXAMPLES:
Topic: Plant Growth
A: Single seed in soil, outline view
B: Small seedling sprouting, thin stem with two leaves, outline only
C: Young plant with stem and multiple leaves, roots visible
FINAL: Mature plant with thick stem, many leaves, flowers blooming

Topic: Water Cycle
A: Water in a container, outline of water droplets
B: Droplets rising with arrows showing evaporation, vapor clouds forming
C: Clouds formed, raindrops falling
FINAL: Rain collecting in ground and container, cycle complete

Topic: Photosynthesis
A: Plant leaf outline with sun rays above
B: Leaf with sun rays penetrating, arrow showing energy flow
C: Internal leaf structure showing conversion happening
FINAL: Leaf producing oxygen bubbles, glucose molecules shown

NOW generate 4 sequential prompts for: "${topic}"
Each line must be exactly ONE prompt (under 40 words per line).`;

  const azureUrl = `${TEXT_ENDPOINT}/openai/deployments/${TEXT_DEPLOYMENT}/chat/completions?api-version=${TEXT_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 600,
      temperature: 0.3,
    },
    {
      headers: { 'api-key': TEXT_API_KEY, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  const responseText = response.data?.choices?.[0]?.message?.content?.trim() || '';
  
  // Parse the 4 lines
  const lines = responseText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10) // Skip empty or too-short lines
    .slice(0, 4); // Take first 4 valid prompts

  // Ensure we have exactly 4 prompts, use defaults if needed
  const prompts = [
    lines[0] || `Black and white line art showing the starting state of ${topic}. Simple outlined shapes, pure white background.`,
    lines[1] || `Black and white line art showing the first transformation of ${topic}. Thin black strokes, no text, no color.`,
    lines[2] || `Black and white line art showing progression of ${topic}. Further change from previous step.`,
    lines[3] || `Black and white line art showing final completed state of ${topic}. All elements present, no text.`,
  ];

  console.log('[VisualExplainerPrompts] Generated 4 step prompts');
  prompts.forEach((p, i) => console.log(`  Step ${['A', 'B', 'C', 'FINAL'][i]}: ${p.substring(0, 60)}...`));

  return prompts;
}


// ── Step B (VisualExplainer): Generate 4 images sequentially ─────────────────
/**
 * Generate 4 images (one per step) and upload all to S3
 * Returns array: [{ slideNumber: 1, url, imageId }, ...]
 */
async function generateAndUploadVisualImage(topicName) {
  const results = [];
  try {
    console.log('[VisualExplainer] Generating 4-step visual sequence...');
    
    const stepPrompts = await buildVisualExplainerStepPrompts(topicName);
    const stepNames = ['A', 'B', 'C', 'FINAL'];
    

    // Generate image for each step sequentially
    for (let i = 0; i < stepPrompts.length; i++) {
      const stepName = stepNames[i];
      const basePrompt = stepPrompts[i];

      // Enhance prompt with strict style requirements
      const finalPrompt = [
        `STEP ${stepName}: Educational textbook diagram`,
        basePrompt,
        `CRITICAL VISUAL RULES:`,

        `- MUST represent REAL-WORLD objects related to the topic`,
        `- DO NOT use abstract circles, nodes, or molecule-like structures`,
        `- DO NOT generate chemical structures or random connected dots`,
        `- Use recognizable objects (e.g., wires, batteries, plants, human body parts, machines)`,

        `STRUCTURE:`,
        `- Show ONLY this step's state clearly`,
        `- Each step must look visually different and meaningful`,
        `- Progression must be logical and easy to understand`,

        `STYLE:`,
        `- Black and white line art only`,
        `- Thin black strokes on pure white background`,
        `- Clean textbook-style illustration`,
        `- Use ONLY real-world objects (wire, battery, plant, human body, machine parts)`,
        `- NEVER describe shapes like circle, square, hexagon, pattern`,

        `CONNECTION RULE:`,
        `- Use straight lines ONLY when needed to connect real components`,
        `- Avoid decorative or complex networks`,

        `STRICTLY FORBIDDEN:`,
        `- NO text, NO labels, NO letters, NO numbers`,
        `- NO molecule diagrams`,
        `- NO random node-link graphs`,
        `- NO purely geometric abstract patterns`,

        `QUALITY:`,
        `- Diagram must be understandable visually without text`,
        `- Must look like a school textbook illustration`,
      ].join('\n');

      console.log(`[VisualExplainer] Generating image for STEP ${stepName}...`);

      const url = `${IMAGE_ENDPOINT}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${IMAGE_API_VERSION_IMG}`;

      const imgResponse = await axios.post(
        url,
        { 
          prompt: finalPrompt, 
          n: 1, 
          size: '1024x1024', 
          quality: 'high', 
          output_format: 'png' 
        },
        {
          headers: { 'api-key': IMAGE_API_KEY, 'Content-Type': 'application/json' },
          timeout: 90000,
        }
      );

      const base64 = imgResponse.data?.data?.[0]?.b64_json;
      if (!base64) throw new Error(`No image data for step ${stepName}`);

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
      
      results.push({
        slideNumber: i + 1,
        stepName,
        url: imageUrl,
        imageId,
      });

      console.log(`[VisualExplainer] ✓ STEP ${stepName} uploaded to S3`);

      // Small delay between API calls to avoid rate limiting
      if (i < stepPrompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[VisualExplainer] ✓ All 4 images generated and uploaded`);
    return results;

  } catch (err) {
    console.error('[VisualExplainerImage] Generation failed (non-fatal):', err.message);
    return results;
  }
}


module.exports = {
  buildVisualExplainerStepPrompts,
  generateAndUploadVisualImage,
};