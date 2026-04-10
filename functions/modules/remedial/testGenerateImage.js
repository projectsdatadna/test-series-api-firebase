const AWS        = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios      = require('axios');

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const S3_BUCKET        = process.env.AWS_S3_BUCKET;
const IMAGE_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-1.5-tskar';

/* ─────────────────────────────────────────────────────────────────
   Generate image via Azure OpenAI (same function as your original)
───────────────────────────────────────────────────────────────── */
async function generateImageWithAzure(prompt) {
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT1;
  const apiKey     = process.env.AZURE_OPENAI_API_KEY1;
  const apiVersion = '2025-04-01-preview';
  const url = `${endpoint}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${apiVersion}`;

  const body = {
    prompt,
    n:             1,
    size:          '1024x1024',
    quality:       'high',
    output_format: 'png',
  };

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🎨 Azure attempt ${attempt}`);
      const response = await axios.post(url, body, {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 90000,
      });

      const base64 = response.data?.data?.[0]?.b64_json;
      if (!base64) throw new Error('No image data returned from Azure');

      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length < 50_000)
        throw new Error(`Image too small: ${buffer.length} bytes — likely incomplete`);

      console.log(`✅ Image received | ${buffer.length} bytes`);
      return buffer;

    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastError;
}

/* ─────────────────────────────────────────────────────────────────
   POST /generateimage/test
   Body: { prompt }
   → Generate image → Upload S3 → Return public URL
───────────────────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt)
      return res.status(400).json({ success: false, message: 'prompt is required' });

    if (!S3_BUCKET)
      return res.status(500).json({ success: false, message: 'AWS_S3_BUCKET env var missing' });

    if (!process.env.AZURE_OPENAI_API_KEY1 || !process.env.AZURE_OPENAI_ENDPOINT1)
      return res.status(500).json({ success: false, message: 'Missing Azure credentials' });

    console.log(`🖼️  Test image generation | prompt: "${prompt}"`);

    // ── Step 1: Generate image directly from prompt ───────────────
    const buffer = await generateImageWithAzure(prompt);

    // ── Step 2: Upload to S3 ──────────────────────────────────────
    const imageId = uuidv4();
    const s3Key   = `generated-images/test/${imageId}.png`;

    await s3.putObject({
      Bucket:      S3_BUCKET,
      Key:         s3Key,
      Body:        buffer,
      ContentType: 'image/png',
    }).promise();

    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`✅ Uploaded to S3: ${imageUrl}`);

    // ── Step 3: Return URL ────────────────────────────────────────
    return res.status(200).json({
      success: true,
      imageId,
      imageUrl,
      prompt,
    });

  } catch (error) {
    console.error('❌ Test image generation error:', error.message);
    const azureMsg = error?.response?.data?.error?.message || error?.message;
    return res.status(500).json({ success: false, message: azureMsg || 'Internal server error' });
  }
};