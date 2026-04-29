const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({ region: process.env.AWS_REGION });

const TEXT_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const TEXT_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const TEXT_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const TEXT_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

const IMAGE_API_KEY = process.env.AZURE_OPENAI_API_KEY1;
const IMAGE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT1;
const IMAGE_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5-tskar';
const IMAGE_API_VERSION_IMG = '2025-04-01-preview';

const S3_BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Generate sequential image prompts AND descriptions for each step
 * Returns array: [{ stepName, prompt, description }, ...]
 */
async function buildVisualExplainerStepPromptsAndDescriptions(topicName, contentContext = '') {
  const topic = topicName || 'Educational concept';

  const userContent = `You are an expert educational visual designer.

  Topic: "${topic}"
  ${contentContext ? `Content: ${contentContext}` : ''}

  🎯 TASK:
  Analyze the given content deeply and convert it into a STEP-BY-STEP visual explanation.

  🚨 STEP GENERATION RULES:

  * Identify the natural progression of the concept from start to end
  * Break the concept into 3–5 logical steps based on how it actually works
  * DO NOT force artificial steps
  * Each step must represent a REAL transformation or progression

  STEP STRUCTURE:

  * STEP A: Initial state / starting condition
  * STEP B: First transformation / process begins
  * STEP C: Intermediate development
  * STEP D (optional): Further progression if needed
  * FINAL STEP: Completed result / final outcome

  🚨 VERY IMPORTANT:

  * Each step MUST be visually different
  * Each step MUST logically follow the previous one
  * The FINAL step MUST clearly show the completed concept

  ---

  🎨 IMAGE PROMPT RULES (CRITICAL):
  For EACH step generate:

  1. IMAGE PROMPT (2–3 lines):

  * Black and white line art
  * Real-world objects only
  * Clear visual difference from previous step
  * Show ONLY that step's state

  2. DESCRIPTION (2–3 lines):

  * Explain what happens in this step
  * Explain how it leads to the next step
  * Keep it simple and educational

  ---

  🚨 STRICT VISUAL RULES:

  * Black and white line art only
  * Thin black strokes on white background
  * NO text, NO labels, NO numbers
  * NO abstract shapes, NO molecules
  * Use real objects related to topic

  ---

  🚨 OUTPUT FORMAT (STRICT JSON):
  {
  "steps": [
  {
  "stepName": "A",
  "prompt": "...",
  "description": "..."
  },
  {
  "stepName": "B",
  "prompt": "...",
  "description": "..."
  },
  {
  "stepName": "C",
  "prompt": "...",
  "description": "..."
  },
  {
  "stepName": "FINAL",
  "prompt": "...",
  "description": "..."
  }
  ]
  }

  🚨 QUALITY RULES:

  * Steps must come from CONTENT, not imagination
  * Each step must show progression
  * FINAL step must clearly complete the concept
  * Avoid repeating same visuals

  Return ONLY JSON.`;


  const azureUrl = `${TEXT_ENDPOINT}/openai/deployments/${TEXT_DEPLOYMENT}/chat/completions?api-version=${TEXT_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 2000,
      temperature: 0.3,
    },
    {
      headers: { 'api-key': TEXT_API_KEY, 'Content-Type': 'application/json' },
      timeout: 45000,
    }
  );

  const responseText = response.data?.choices?.[0]?.message?.content?.trim() || '';
  
  // Parse JSON response
  let stepsData;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      stepsData = JSON.parse(jsonMatch[0]);
    } else {
      stepsData = JSON.parse(responseText);
    }
  } catch (e) {
    console.error('[VisualExplainer] Failed to parse JSON:', e.message);
    // Fallback defaults
    stepsData = {
      steps: [
        { stepName: 'A', prompt: `Black and white line art of ${topic} - starting state. Simple outline shapes.`, description: `This image shows the initial concept of ${topic}. It establishes the foundation for understanding.` },
        { stepName: 'B', prompt: `Black and white line art of ${topic} - first transformation. Progression from starting state.`, description: `This image shows the first development stage of ${topic}. New elements are introduced.` },
        { stepName: 'C', prompt: `Black and white line art of ${topic} - second transformation. Further development.`, description: `This image shows continued evolution of ${topic}. The concept becomes more complete.` },
        { stepName: 'FINAL', prompt: `Black and white line art of ${topic} - completed concept. All elements present.`, description: `This image shows the final, complete ${topic} concept. All components are fully realized.` }
      ]
    };
  }

  console.log('[VisualExplainer] Generated prompts and descriptions:');
  stepsData.steps.forEach((step, i) => {
    console.log(`  Step ${step.stepName}:`);
    console.log(`    Prompt: ${step.prompt.substring(0, 80)}...`);
    console.log(`    Desc: ${step.description.substring(0, 80)}...`);
  });

  return stepsData.steps;
}

/**
 * Generate 4 images with their descriptions
 * Returns array: [{ slideNumber, stepName, url, imageId, prompt, description }, ...]
 */
async function generateAndUploadVisualImage(topicName, contentContext = '') {
  const results = [];
  try {
    console.log('[VisualExplainer] Generating 4-step visual sequence...');
    
    const steps = await buildVisualExplainerStepPromptsAndDescriptions(topicName, contentContext);

    // Generate image for each step sequentially
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepName = step.stepName;
      const basePrompt = step.prompt;
      const description = step.description;

      // Enhance prompt with strict style requirements
      const finalPrompt = [
        `STEP ${stepName}: Educational textbook diagram for "${topicName}"`,
        basePrompt,
        `CRITICAL VISUAL RULES:`,

        `- MUST represent REAL-WORLD objects related to the topic`,
        `- DO NOT use abstract circles, nodes, or molecule-like structures`,
        `- DO NOT generate chemical structures or random connected dots`,
        `- Use recognizable objects`,

        `STRUCTURE:`,
        `- Show ONLY this step's state clearly`,
        `- Step must look visually different and meaningful`,

        `STYLE:`,
        `- Black and white line art only`,
        `- Thin black strokes on pure white background`,
        `- Clean textbook-style illustration`,

        `STRICTLY FORBIDDEN:`,
        `- NO text, NO labels, NO letters, NO numbers`,
        `- NO molecule diagrams`,
        `- NO random node-link graphs`,
        `- NO purely geometric abstract patterns`,
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

      const buffer = Buffer.from(base64, 'base64');
      const imageId = uuidv4();
      const s3Key = `visual-explainer-images/${imageId}.png`;

      await s3.putObject({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png',
      }).promise();

      const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      
      results.push({
        slideNumber: i + 1,
        stepName: stepName,
        url: imageUrl,
        imageId: imageId,
        prompt: basePrompt,
        description: description,
      });

      console.log(`[VisualExplainer] ✓ STEP ${stepName} uploaded with description`);

      // Small delay between API calls
      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[VisualExplainer] ✓ All ${results.length} images generated with descriptions`);
    return results;

  } catch (err) {
    console.error('[VisualExplainerImage] Generation failed:', err.message);
    return results;
  }
}

module.exports = {
  buildVisualExplainerStepPromptsAndDescriptions,
  generateAndUploadVisualImage,
};