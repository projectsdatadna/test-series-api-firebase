const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate image using Azure OpenAI DALL-E 3
 * @param {string} prompt - The enriched prompt for image generation
 * @param {boolean} isNonEnglish - Whether to generate without text (for non-English)
 * @param {string} imageStyle - 'color' or 'line' style
 * @returns {Promise<Buffer>} - PNG image buffer
 */
async function generateImageWithAzure(prompt, isNonEnglish = false, imageStyle = 'color') {
  const IMAGE_DEPLOYMENT = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-4-vision';
  
  console.log(`Azure gpt-image | deployment: ${IMAGE_DEPLOYMENT} | noText: ${isNonEnglish} | style: ${imageStyle}`);

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT1;
  const apiKey = process.env.AZURE_OPENAI_API_KEY1;
  const apiVersion = '2025-04-01-preview';
  const url = `${endpoint}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${apiVersion}`;

  // Style rules
  const styleRule = imageStyle === 'line'
    ? `STYLE RULE: Black and white LINE ART only. Thin clean black lines on pure white background. NO color fills, NO shading, NO gradients, NO color anywhere. Pure monochrome ink-style illustration like a textbook coloring page or technical drawing.`
    : `STYLE RULE: Full color illustration. Use bright distinct educational colors appropriate for a school textbook diagram.`;

  // Text rules
  const textRule = isNonEnglish
    ? `STRICT RULE: NO text, NO labels, NO numbers, NO words, NO letters anywhere in the image. Purely visual illustration only. Clean white background. All structures unlabeled.`
    : `LAYOUT RULES: - Bold title at the top center - Short text labels (1–3 words) with thin callout lines to each structure - Style like a Cleveland Clinic medical diagram - No paragraph text — only title + part labels`;

  // Universal rules
  const noBoxRule = `UNIVERSAL RULE (apply always, no exceptions): Do NOT draw any empty boxes, blank rectangles, unfilled label frames, empty callout bubbles, or placeholder outline shapes anywhere in the image. Every shape drawn must be a filled part of the actual illustration — NOT an annotation container. No empty outlined rectangles. No blank text boxes. No unfilled callout frames. No empty speech bubbles.`;

  const canvasRule = `CANVAS RULE (critical — no exceptions): The entire illustration MUST be fully contained within the image boundaries. Leave at least 5% padding on ALL sides (left, right, top, bottom). NO element, label, line, or text should be cut off or touch the image edge. If the diagram is wide (e.g. side-by-side comparison), scale it down to fit completely within the canvas with padding on all sides. Every part of the diagram must be 100% visible — nothing cropped, nothing clipped.`;

  const finalPrompt = `${prompt}\n\n${styleRule}\n\n${textRule}\n\n${noBoxRule}\n\n${canvasRule}`;

  console.log(`Final prompt length: ${finalPrompt.length} chars`);

  const body = {
    prompt: finalPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'high',
    output_format: 'png',
  };

  // Retry up to 2 times on failure or incomplete image
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Azure attempt ${attempt}`);
      const response = await axios.post(url, body, {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 90000, // 90s — high quality takes longer
      });

      const base64 = response.data?.data?.[0]?.b64_json;
      if (!base64) throw new Error('No image data returned from Azure gpt-image');

      const buffer = Buffer.from(base64, 'base64');

      // Reject suspiciously small images (corrupt / incomplete render)
      if (buffer.length < 50_000) {
        throw new Error(`Image too small: ${buffer.length} bytes — likely incomplete`);
      }

      console.log(`Image received | ${buffer.length} bytes | attempt ${attempt}`);
      return buffer;
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }

  throw lastError;
}

/**
 * Generate unique image ID
 * @returns {string} - UUID v4
 */
function generateImageId() {
  return uuidv4();
}

module.exports = {
  generateImageWithAzure,
  generateImageId,
};
