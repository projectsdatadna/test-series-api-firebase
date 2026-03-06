let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require('node-fetch');
}

/**
 * Generate PNG image from text instructions
 * 1. Claude generates SVG from instructions
 * 2. Puppeteer converts SVG to PNG
 * 3. Returns base64-encoded PNG
 */
async function generateImageFromInstructions(instructions, width = 280, height = 280, type = 'diagram') {
  let browser = null;
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.warn('[ImageGenerator] Claude API key not configured, returning placeholder');
      return getPlaceholderImage();
    }

    console.log(`[ImageGenerator] Generating ${type} image (${width}x${height})`);

    // Step 1: Generate SVG from instructions using Claude
    console.log(`[ImageGenerator] Step 1: Generating SVG from instructions...`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
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
      }),
    });

    if (!response.ok) {
      console.error('[ImageGenerator] Claude API error:', response.status);
      return getPlaceholderImage();
    }

    const data = await response.json();
    const svgContent = data.content[0].text;

    // Extract SVG from response
    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) {
      console.warn('[ImageGenerator] No SVG found in response');
      return getPlaceholderImage();
    }

    const svg = svgMatch[0];
    console.log(`[ImageGenerator] SVG generated successfully (${svg.length} bytes)`);

    // Step 2: Convert SVG to PNG using Puppeteer
    console.log(`[ImageGenerator] Step 2: Converting SVG to PNG...`);
    const pngBase64 = await svgToPng(svg, width, height);
    
    console.log(`[ImageGenerator] PNG generated successfully`);
    return `data:image/png;base64,${pngBase64}`;
  } catch (error) {
    console.error('[ImageGenerator] Error generating image:', error);
    return getPlaceholderImage();
  }
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
