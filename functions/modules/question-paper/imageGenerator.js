// let fetch;
// try {
//   fetch = globalThis.fetch;
// } catch (e) {
//   fetch = require('node-fetch');
// }

// /**
//  * Generate or fetch PNG image
//  * 1. If imageUrl is provided, fetch and convert to base64
//  * 2. If imageUrl is empty, generate from instructions using Claude + Puppeteer
//  */
// async function generateImageFromInstructions(instructions, width = 280, height = 280, type = 'diagram', imageUrl = '') {
//   try {
//     // Step 1: Try to fetch image from URL if provided
//     if (imageUrl && imageUrl.trim()) {
//       console.log(`[ImageGenerator] Fetching image from URL: ${imageUrl}`);
//       try {
//         const pngBase64 = await fetchAndConvertImageToBase64(imageUrl);
//         if (pngBase64) {
//           console.log(`[ImageGenerator] Image fetched successfully from URL`);
//           return `data:image/png;base64,${pngBase64}`;
//         }
//       } catch (err) {
//         console.warn(`[ImageGenerator] Failed to fetch image from URL, will generate instead:`, err.message);
//       }
//     }

//     // Step 2: Generate image from instructions if URL not available
//     console.log(`[ImageGenerator] Generating ${type} image (${width}x${height})`);
//     const pngBase64 = await generateImageFromSVG(instructions, width, height, type);
//     return `data:image/png;base64,${pngBase64}`;
//   } catch (error) {
//     console.error('[ImageGenerator] Error generating image:', error);
//     return getPlaceholderImage();
//   }
// }

// /**
//  * Fetch image from URL and convert to base64 PNG
//  */
// async function fetchAndConvertImageToBase64(imageUrl) {
//   let browser = null;
//   try {
//     const puppeteer = require('puppeteer');
    
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });

//     const page = await browser.newPage();
    
//     // Set viewport to capture image
//     await page.setViewport({ width: 800, height: 600 });

//     // Navigate to image URL
//     await page.goto(imageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

//     // Take screenshot
//     const screenshot = await page.screenshot({ 
//       type: 'png',
//       omitBackground: false,
//     });

//     await page.close();
//     await browser.close();
//     browser = null;

//     return screenshot.toString('base64');
//   } catch (error) {
//     console.error('[ImageGenerator] Error fetching image from URL:', error.message);
//     if (browser) {
//       try {
//         await browser.close();
//       } catch (e) {
//         console.error('[ImageGenerator] Error closing browser:', e);
//       }
//     }
//     return null;
//   }
// }

// /**
//  * Generate PNG image from SVG instructions
//  */
// async function generateImageFromSVG(instructions, width, height, type) {
//   const apiKey = process.env.CLAUDE_API_KEY;
//   if (!apiKey) {
//     console.warn('[ImageGenerator] Claude API key not configured');
//     throw new Error('Claude API key not configured');
//   }

//   // Step 1: Generate SVG from instructions using Claude
//   console.log(`[ImageGenerator] Step 1: Generating SVG from instructions...`);
//   const response = await fetch('https://api.anthropic.com/v1/messages', {
//     method: 'POST',
//     headers: {
//       'x-api-key': apiKey,
//       'anthropic-version': '2023-06-01',
//       'content-type': 'application/json',
//     },
//     body: JSON.stringify({
//       model: 'claude-haiku-4-5',
//       max_tokens: 2048,
//       messages: [
//         {
//           role: 'user',
//           content: `Convert these drawing instructions into SVG code. The SVG should be ${width}x${height} pixels.
          
// Instructions: ${instructions}

// Requirements:
// - Return ONLY valid SVG code starting with <svg> and ending with </svg>
// - Use black lines/shapes on white background
// - No fill colors, only strokes
// - Keep it simple and minimal
// - Make sure all elements fit within ${width}x${height} pixels`,
//         },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     console.error('[ImageGenerator] Claude API error:', response.status);
//     throw new Error(`Claude API error: ${response.status}`);
//   }

//   const data = await response.json();
//   const svgContent = data.content[0].text;

//   // Extract SVG from response
//   const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/);
//   if (!svgMatch) {
//     console.warn('[ImageGenerator] No SVG found in response');
//     throw new Error('No SVG found in Claude response');
//   }

//   const svg = svgMatch[0];
//   console.log(`[ImageGenerator] SVG generated successfully (${svg.length} bytes)`);

//   // Step 2: Convert SVG to PNG using Puppeteer
//   console.log(`[ImageGenerator] Step 2: Converting SVG to PNG...`);
//   return await svgToPng(svg, width, height);
// }

// /**
//  * Convert SVG to PNG using Puppeteer
//  */
// async function svgToPng(svgContent, width, height) {
//   let browser = null;
//   try {
//     const puppeteer = require('puppeteer');
    
//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });

//     const page = await browser.newPage();
    
//     // Set viewport
//     await page.setViewport({ width, height });

//     // Create HTML with SVG
//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { margin: 0; padding: 0; background: white; }
//           svg { display: block; }
//         </style>
//       </head>
//       <body>
//         ${svgContent}
//       </body>
//       </html>
//     `;

//     // Set content
//     await page.setContent(html, { waitUntil: 'domcontentloaded' });

//     // Take screenshot as PNG
//     const screenshot = await page.screenshot({ 
//       type: 'png',
//       omitBackground: false,
//     });

//     await page.close();
//     await browser.close();
//     browser = null;

//     // Convert to base64
//     return screenshot.toString('base64');
//   } catch (error) {
//     console.error('[ImageGenerator] Error converting SVG to PNG:', error);
//     if (browser) {
//       try {
//         await browser.close();
//       } catch (e) {
//         console.error('[ImageGenerator] Error closing browser:', e);
//       }
//     }
//     throw error;
//   }
// }

// /**
//  * Get a placeholder image when generation fails
//  */
// function getPlaceholderImage() {
//   // 1x1 white PNG
//   return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
// }

// module.exports = {
//   generateImageFromInstructions,
//   getPlaceholderImage,
// };

const axios = require('axios');

// ✅ Azure OpenAI env vars — replaces CLAUDE_API_KEY
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

/**
 * Generate or fetch PNG image
 * 1. If imageUrl is provided, fetch and convert to base64
 * 2. If imageUrl is empty, generate from instructions using Azure OpenAI + Puppeteer
 */
async function generateImageFromInstructions(instructions, width = 280, height = 280, type = 'diagram', imageUrl = '') {
  try {
    // Step 1: Try to fetch image from URL if provided
    if (imageUrl && imageUrl.trim()) {
      console.log(`[ImageGenerator] Fetching image from URL: ${imageUrl}`);
      try {
        const pngBase64 = await fetchAndConvertImageToBase64(imageUrl);
        if (pngBase64) {
          console.log(`[ImageGenerator] Image fetched successfully from URL`);
          return `data:image/png;base64,${pngBase64}`;
        }
      } catch (err) {
        console.warn(`[ImageGenerator] Failed to fetch image from URL, will generate instead:`, err.message);
      }
    }

    // Step 2: Generate image from instructions if URL not available
    console.log(`[ImageGenerator] Generating ${type} image (${width}x${height})`);
    const pngBase64 = await generateImageFromSVG(instructions, width, height, type);
    return `data:image/png;base64,${pngBase64}`;
  } catch (error) {
    console.error('[ImageGenerator] Error generating image:', error);
    return getPlaceholderImage();
  }
}

/**
 * Fetch image from URL and convert to base64 PNG
 */
async function fetchAndConvertImageToBase64(imageUrl) {
  let browser = null;
  try {
    const puppeteer = require('puppeteer');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport to capture image
    await page.setViewport({ width: 800, height: 600 });

    // Navigate to image URL
    await page.goto(imageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false,
    });

    await page.close();
    await browser.close();
    browser = null;

    return screenshot.toString('base64');
  } catch (error) {
    console.error('[ImageGenerator] Error fetching image from URL:', error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[ImageGenerator] Error closing browser:', e);
      }
    }
    return null;
  }
}

/**
 * Generate PNG image from SVG instructions
 */
async function generateImageFromSVG(instructions, width, height, type) {
  // ✅ Azure env check — replaces CLAUDE_API_KEY check
  if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
    console.warn('[ImageGenerator] Azure OpenAI configuration missing');
    throw new Error('Azure OpenAI configuration missing');
  }

  // Step 1: Generate SVG from instructions using Azure OpenAI
  console.log(`[ImageGenerator] Step 1: Generating SVG from instructions...`);

  const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

  // ✅ Azure OpenAI call — replaces Claude fetch
  const response = await axios.post(
    azureUrl,
    {
      messages: [
        {
          role: 'user',
          content: `Convert these drawing instructions into SVG code. The SVG should be ${width}x${height} pixels.
          
Instructions: ${instructions}

Requirements:
- Return ONLY valid SVG code starting with <svg> and ending with </svg>
- Use black lines/shapes on white background
- No fill colors, only strokes
- Keep it simple and minimal
- Make sure all elements fit within ${width}x${height} pixels`,
        },
      ],
      max_tokens:  2048,
      temperature: 0.2,
    },
    {
      headers: {
        'api-key':      AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  // ✅ Azure response shape
  const svgContent = response.data?.choices?.[0]?.message?.content ?? '';

  if (!svgContent) {
    console.error('[ImageGenerator] Azure OpenAI returned empty response');
    throw new Error('Azure OpenAI returned empty response');
  }

  // Extract SVG from response
  const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) {
    console.warn('[ImageGenerator] No SVG found in response');
    throw new Error('No SVG found in Azure OpenAI response');
  }

  const svg = svgMatch[0];
  console.log(`[ImageGenerator] SVG generated successfully (${svg.length} bytes)`);

  // Step 2: Convert SVG to PNG using Puppeteer
  console.log(`[ImageGenerator] Step 2: Converting SVG to PNG...`);
  return await svgToPng(svg, width, height);
}

/**
 * Convert SVG to PNG using Puppeteer
 */
async function svgToPng(svgContent, width, height) {
  let browser = null;
  try {
    const puppeteer = require('puppeteer');

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width, height });

    // Create HTML with SVG
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: white; }
          svg { display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;

    // Set content
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Take screenshot as PNG
    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false,
    });

    await page.close();
    await browser.close();
    browser = null;

    // Convert to base64
    return screenshot.toString('base64');
  } catch (error) {
    console.error('[ImageGenerator] Error converting SVG to PNG:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[ImageGenerator] Error closing browser:', e);
      }
    }
    throw error;
  }
}

/**
 * Get a placeholder image when generation fails
 */
function getPlaceholderImage() {
  // 1x1 white PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
}

module.exports = {
  generateImageFromInstructions,
  getPlaceholderImage,
};