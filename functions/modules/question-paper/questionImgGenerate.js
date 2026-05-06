const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// AWS S3 Configuration
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const S3_BUCKET = process.env.AWS_S3_BUCKET;

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT1;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY1;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT2 || 'gpt-image-1-tskar';
const AZURE_API_VERSION = '2025-04-01-preview';

function cleanQuestionText(questionText) {
  let cleaned = questionText
    .replace(/\([A-D]\)\s*/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/Answer:\s*\w+\s*/gi, '')
    .replace(/Correct answer is\s*\w+\s*/gi, '')
    .replace(/\(correct\)/gi, '')
    .replace(/correct option/gi, '')
    .trim();
  return cleaned;
}

// Helper function to detect subject
function detectSubject(text = '') {
  const t = text.toLowerCase();
  
  if (/triangle|angle|circle|polygon|geometry|hypotenuse|radius|diameter|math|algebra|equation/.test(t)) {
    return 'mathematics';
  }
  if (/force|motion|velocity|gravity|energy|wave|sound|light|electricity|magnet|circuit|friction|newton|physics/.test(t)) {
    return 'physics';
  }
  if (/cell|organ|heart|lung|brain|photosynthesis|respiration|dna|mitosis|bacteria|virus|plant|animal|biology/.test(t)) {
    return 'biology';
  }
  if (/atom|molecule|reaction|bond|electron|proton|acid|base|chemical|chemistry/.test(t)) {
    return 'chemistry';
  }
  if (/map|country|river|mountain|climate|ocean|earthquake|volcano|geography/.test(t)) {
    return 'geography';
  }
  if (/husk|grain|winnowing|separation|agriculture|farming/.test(t)) {
    return 'agriculture';
  }
  return 'general';
}

// Helper function to build image prompt
function buildImagePrompt(questionText, subject, imageStyle = 'color') {
  const cleanedQuestion = cleanQuestionText(questionText);
  
  const styleMap = {
    color: 'bright and colorful educational illustration, flat vector style, white background, clear and simple, modern textbook quality',
    line: 'clean black and white line art, educational diagram style, thin black outlines, no color fill, white background, simple and clear lines'
  };
  
  const subjectStyleMap = {
    mathematics: 'geometric shapes, diagrams, graphs, or mathematical concepts',
    physics: 'scientific diagrams showing forces, motion, energy, or physical phenomena',
    biology: 'biological structures, cells, organs, or living organisms',
    chemistry: 'molecular structures, atoms, chemical bonds, or laboratory equipment',
    geography: 'maps, landscapes, earth features, or geographical concepts',
    agriculture: 'farming, agricultural processes, separation techniques, traditional methods like winnowing',
    general: 'clear concept illustration showing the main idea visually'
  };
  
  const styleDesc = styleMap[imageStyle] || styleMap.color;
  const subjectDesc = subjectStyleMap[subject] || subjectStyleMap.general;
  
  const prompt = `Create an educational illustration for this concept: "${cleanedQuestion.substring(0, 150)}"

IMPORTANT RULES:
- Style: ${styleDesc}
- Subject context: ${subjectDesc}
- Do NOT include large sentences, captions, explanations, or answer text
- Small educational labels are allowed when necessary
- Geometry figures may contain labels such as:
  - line names (m, n, l)
  - point labels (A, B, C)
  - angle labels
  - axis labels
- Keep labels minimal and educational only
- NO labels, NO captions, NO titles, NO answers
- Purely visual illustration only
- Clean, simple, easy to understand
- White background
- High quality, professional look

Visual description only, no text.`;

  return prompt;
}

// Helper function to generate image using Azure OpenAI
async function generateImageWithAzure(prompt, imageStyle = 'color') {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/images/generations?api-version=${AZURE_API_VERSION}`;

  const styleRule = imageStyle === 'line'
    ? 'Black and white LINE ART. Thin clean black lines on white background. NO color fills. NO shading.'
    : 'Full COLOR illustration. Bright distinct colors. Flat vector style.';

  const noTextRule = `
    CRITICAL:
    - Do NOT include sentences, captions, explanations, or answer text
    - Minimal educational labels are allowed when required for understanding
    - Allow labels like A, B, C, m, n, l, x, y in geometry/math diagrams
    `;
  
  const finalPrompt = `${styleRule} ${noTextRule}\n\n${prompt}`;

  try {
    console.log('🎨 Generating image with Azure...');
    console.log('📝 Prompt preview:', finalPrompt.substring(0, 200) + '...');
    
    const requestBody = {
      prompt: finalPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',  // Changed from 'standard' to 'high' (valid values: low, medium, high, auto)
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });

    // Check if response has URL or b64_json
    let imageBuffer;
    const imageUrl = response.data?.data?.[0]?.url;
    const base64Image = response.data?.data?.[0]?.b64_json;
    
    if (imageUrl) {
      console.log(`✅ Image generated, downloading from URL...`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      imageBuffer = Buffer.from(imageResponse.data);
    } else if (base64Image) {
      console.log(`✅ Image generated from base64...`);
      imageBuffer = Buffer.from(base64Image, 'base64');
    } else {
      throw new Error('No image data received from Azure');
    }
    
    console.log(`✅ Image size: ${imageBuffer.length} bytes`);
    return imageBuffer;
    
  } catch (error) {
    console.error('Azure image generation error:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to upload to S3
async function uploadToS3(buffer, key) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000',
  };

  await s3.putObject(params).promise();
  const imageUrl = `https://${S3_BUCKET}.s3.${s3.config.region}.amazonaws.com/${key}`;
  
  console.log(`✅ Uploaded to S3: ${key}`);
  return imageUrl;
}

// Main function
const questionImgGenerate = async (req, res) => {
  try {
    const { question, imageStyle = 'color' } = req.body;

    // Validation
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required',
      });
    }

    if (!S3_BUCKET) {
      return res.status(500).json({
        success: false,
        message: 'AWS S3 bucket not configured',
      });
    }

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) {
      return res.status(500).json({
        success: false,
        message: 'Azure OpenAI credentials not configured',
      });
    }

    console.log(`\n📝 Generating image for question: "${question.substring(0, 100)}..."`);
    console.log(`🎨 Image style: ${imageStyle}`);

    // Detect subject for better prompt
    const subject = detectSubject(question);
    console.log(`📚 Detected subject: ${subject}`);

    // Build the image prompt
    const imagePrompt = buildImagePrompt(question, subject, imageStyle);
    console.log(`🖼️ Prompt length: ${imagePrompt.length} chars`);

    // Generate image
    const imageBuffer = await generateImageWithAzure(imagePrompt, imageStyle);

    // Generate unique filename
    const imageId = uuidv4();
    const s3Key = `quiz-images/${imageId}.png`;

    // Upload to S3
    const imageUrl = await uploadToS3(imageBuffer, s3Key);

    // Return response
    return res.status(200).json({
      success: true,
      imageId: imageId,
      imageUrl: imageUrl,
      message: 'Image generated and uploaded successfully',
    });

  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate image',
      error: error.message,
    });
  }
};

module.exports = { questionImgGenerate };