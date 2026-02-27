require("dotenv").config();
const { getPrompt } = require("./prompts/content-generate-prompts");
const {
  getDocumentStructureExtractionPrompt,
} = require("./prompts/extraction-prompts");
const AWS = require("aws-sdk");

// Initialize DynamoDB lazily
let dynamodb = null;

function initializeDynamoDB() {
  if (dynamodb) return dynamodb;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "ap-south-1";

  if (accessKeyId && secretAccessKey) {
    console.log("Initializing DynamoDB with credentials...");
    AWS.config.update({
      region: region,
      credentials: new AWS.Credentials({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      }),
    });
    dynamodb = new AWS.DynamoDB.DocumentClient({
      region: region,
    });
    return dynamodb;
  } else {
    return null;
  }
}

// Use native fetch (Node.js 18+) or import node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require("node-fetch");
}

// Generate adaptive content from uploaded file and convert to images
async function generateAdaptiveContent(req, res) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 280000); // 280 second timeout for generation

  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Anthropic API key not configured",
      });
    }

    // Extract all parameters from request body
    const {
      fileId,
      sectionNumber,
      topicName,
      contentType,
      contentTypeId,
      contentDepth,
      visualStyle,
      outputLanguage,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "fileId",
      "sectionNumber",
      "topicName",
      "contentType",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        requiredFields,
        missingFields,
      });
    }

    // Set defaults for optional parameters
    const depth = contentDepth || "intermediate";
    const style = visualStyle || "academic";
    const language = outputLanguage || "english";

    // Get dynamic prompt based on content type
    const prompt = getPrompt(contentTypeId, {
      sectionNumber,
      topicName,
      contentDepth: depth,
      visualStyle: style,
      outputLanguage: language,
      contentType: contentType,
    });
    console.log("Calling Anthropic API...");

    // Call Anthropic Messages API with file reference
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "document",
                source: {
                  type: "file",
                  file_id: fileId,
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return res.status(400).json({
        success: false,
        message: "Failed to generate adaptive content",
        error: error.message || "API request failed",
      });
    }

    const data = await response.json();
    console.log("Adaptive content generated successfully");

    // Extract the content from the response
    const content =
      data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("First API response content:", content);

    // Call second API to extract pure HTML from the content
    const htmlResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Extract pure HTML content from the following text and return only the HTML content without any additional text or explanation:\n\n" +
                  content,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!htmlResponse.ok) {
      const error = await htmlResponse.json();
      console.error("Error from second Anthropic API call:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to extract HTML content",
        error: error.message || "API request failed",
      });
    }

    const htmlData = await htmlResponse.json();
    console.log("Second API response:", htmlData);

    // Extract HTML content from second API response
    const htmlContent =
      htmlData.content && htmlData.content.length > 0
        ? htmlData.content[0].text
        : content;

    // Always convert generated HTML to images
    console.log("Converting generated HTML to images...");

    const conversionController = new AbortController();
    const conversionTimeoutId = setTimeout(
      () => conversionController.abort(),
      90000,
    ); // 90 second timeout for conversion

    try {
      const conversionResponse = await fetch(
        "https://api-s7ossubabq-uc.a.run.app/apizip/convert-to-images",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pages: 1,
            htmlText: [htmlContent],
          }),
          signal: conversionController.signal,
        },
      );

      clearTimeout(conversionTimeoutId);

      if (conversionResponse.ok) {
        const respContentType =
          conversionResponse.headers.get("content-type") || "";
        console.log("Conversion response content-type:", respContentType);

        if (respContentType.includes("application/json")) {
          const imageRes = await conversionResponse.json();
          console.log("Conversion API JSON response:", imageRes);

          if (imageRes && Array.isArray(imageRes.images)) {
            return res.status(200).json({
              success: true,
              images: imageRes.images,
            });
          }

          // Some variants might wrap result differently; return as-is for UI handling
          return res.status(200).json({
            success: true,
            conversion: imageRes,
          });
        }
      }
    } catch (conversionError) {
      clearTimeout(conversionTimeoutId);
      console.error("HTML conversion error:", conversionError);

      if (conversionError.name === "AbortError") {
        return res.status(504).json({
          success: false,
          message: "Image conversion timeout",
          error: "The image conversion took too long. Please try again.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to convert adaptive content to images",
        error: conversionError.message,
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("API request timeout (20s exceeded)");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error:
          "The adaptive content generation took too long. Please try again.",
      });
    }

    console.error("Adaptive content generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate adaptive content",
      error: error.message,
    });
  }
}

// Extract document structure (sections, headers, tables, images) from uploaded file
async function extractDocumentStructure(req, res) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 280000); // 280 second timeout

  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Anthropic API key not configured",
      });
    }

    const { fileId } = req.body;

    if (!fileId) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: fileId",
      });
    }

    const extractionPrompt = getDocumentStructureExtractionPrompt();

    console.log("Calling Anthropic API for document structure extraction...");

    // FIRST API CALL: Extract document structure from file
    const firstResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt,
              },
              {
                type: "document",
                source: {
                  type: "file",
                  file_id: fileId,
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!firstResponse.ok) {
      clearTimeout(timeoutId);
      const error = await firstResponse.json();
      return res.status(400).json({
        success: false,
        message: "Failed to extract document structure",
        error: error.message || "API request failed",
      });
    }

    const firstData = await firstResponse.json();
    console.log("First API call completed");

    // Extract the content from the first response
    const firstContent =
      firstData.content && firstData.content.length > 0
        ? firstData.content[0].text
        : "";

    console.log("First API response content:", firstContent.substring(0, 200));

    // SECOND API CALL: Convert the extracted content to proper JSON format
    const jsonFormattingPrompt = `extract only sections data, chapters data, tables data and images data as a json format`;

    console.log("Calling Anthropic API for JSON formatting...");

    // Second API call to format as JSON
    const secondResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    `Extract all sections and subsections from the content and return ONLY valid JSON with no additional text, explanation, or markdown formatting.

Structure requirements:
- Use dot-notation numbering to determine hierarchy (e.g., "7" → "7.1" → "7.3.1")
- Top-level sections contain a "subsections" array for their children
- Each section object must have: "number" (string), "label" (string), and "subsections" (array, can be empty)
- Nest subsections recursively based on their numbering depth

Expected JSON structure:
{
  "sections": [
    {
      "number": "7",
      "label": "Chapter title",
      "subsections": [
        {
          "number": "7.1",
          "label": "Section title",
          "subsections": []
        }
      ]
    }
  ]
}

Content to extract from:

` + firstContent,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!secondResponse.ok) {
      const error = await secondResponse.json();
      return res.status(400).json({
        success: false,
        message: "Failed to format document structure as JSON",
        error: error.message || "API request failed",
      });
    }

    const secondData = await secondResponse.json();
    console.log("Second API call completed");

    // Extract the content from the second response
    const secondContent =
      secondData.content && secondData.content.length > 0
        ? secondData.content[0].text
        : "";

    console.log(
      "Second API response content:",
      secondContent.substring(0, 200),
    );

    // Parse JSON response
    let structuredData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = secondContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      } else {
        structuredData = JSON.parse(secondContent);
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      return res.status(500).json({
        success: false,
        message: "Failed to parse formatted JSON response",
        error: parseError.message,
        rawContent: secondContent.substring(0, 500),
      });
    }

    // Store sections in DynamoDB after successful extraction
    if (structuredData.sections && structuredData.sections.length > 0) {
      if (!req.body.chapterId || !req.body.chapterName) {
        console.warn("chapterId and chapterName are required. Skipping DynamoDB storage.");
      } else {
        try {
          await storeChaptersInDynamoDB(
            structuredData.sections,
            req.body.chapterId,
            req.body.chapterName,
          );
          console.log("Sections stored in DynamoDB successfully");
        } catch (dbError) {
          console.error("Error storing sections in DynamoDB:", dbError);
          return res.status(500).json({
            success: false,
            message: "Failed to store sections in DynamoDB",
            error: dbError.message,
            data: structuredData,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: structuredData,
    });

    
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("API request timeout (280s exceeded)");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The document extraction took too long. Please try again.",
      });
    }

    console.error("Document extraction error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract document structure",
      error: error.message,
    });
  }
}

// Helper function to store chapters in DynamoDB
async function storeChaptersInDynamoDB(sections, chapterId, chapterName) {
  const db = initializeDynamoDB();
  
  if (!db) {
    throw new Error("DynamoDB not configured. AWS credentials are missing.");
  }

  if (!chapterId) {
    throw new Error("chapterId is required to store sections in DynamoDB");
  }

  if (!chapterName) {
    throw new Error("chapterName is required to store sections in DynamoDB");
  }

  const tableName = "ChaptersTable";
  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Key: {
      chapterId: chapterId,
      chapterName: chapterName,
    },
    UpdateExpression: "SET sections = :sections, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":sections": sections,
      ":updatedAt": timestamp,
    },
  };

  try {
    await db.update(params).promise();
    console.log(`Stored ${sections.length} sections for chapter ${chapterId} - ${chapterName}`);
  } catch (error) {
    console.error("Error storing sections in DynamoDB:", error);
    console.error("Error details:", error.message);
    throw new Error(`Failed to store sections in DynamoDB: ${error.message}`);
  }
}

// Helper function to parse text format response
function parseTextFormatResponse(content) {
  const sections = [];
  const headers = { h1: [], h2: [], h3: [] };
  const tables = [];
  const imageReferences = [];

  const lines = content.split("\n");
  let currentSection = null; // Track which section we're parsing
  let foundFirstSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    // Detect section headers (case-insensitive)
    const lowerLine = trimmedLine.toLowerCase();

    if (lowerLine === "sections:") {
      currentSection = "sections";
      foundFirstSection = true;
      continue;
    }
    if (lowerLine === "headers:") {
      currentSection = "headers";
      continue;
    }
    if (lowerLine === "tables:") {
      currentSection = "tables";
      continue;
    }
    if (lowerLine === "image references:") {
      currentSection = "imageReferences";
      continue;
    }

    // Skip lines before first section header
    if (!foundFirstSection) continue;

    // Parse based on current section
    if (currentSection === "sections") {
      // Match: "1. Chapter 4: Exploring Magnets" or "4.1 Magnetic and Non-magnetic Materials"
      const sectionMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);
      if (sectionMatch) {
        sections.push({
          title: sectionMatch[1].trim(),
          pageNumber: null,
          subsections: [],
        });
      }
    }

    if (currentSection === "headers") {
      // Match: "1. Exploring Magnets" or "Activity 4.1: Let us explore"
      const headerMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);
      if (headerMatch) {
        headers.h1.push(headerMatch[1].trim());
      }
    }

    if (currentSection === "tables") {
      // Match: "1. Table 4.1: Identifying..." or "1. Column matching mixtures..."
      const tableMatch = trimmedLine.match(
        /^\d+\.\s*(.+?)(?:\s*\(on page\s+\d+\))?$/i,
      );
      if (tableMatch) {
        const tableTitle = tableMatch[1].trim();
        // Extract table number if it exists
        const tableNumMatch = tableTitle.match(/(Table\s+[\d.]+)/i);
        tables.push({
          title: tableNumMatch ? tableNumMatch[1] : tableTitle,
          columns: [],
          description: tableTitle,
          location: "Document",
        });
      }
    }

    if (currentSection === "imageReferences") {
      // Match: "1. Fig. 4.1: Some common items that have magnets attached to them"
      const figMatch = trimmedLine.match(
        /^\d+\.\s*(Fig\.\s+[\d.]+(?:\([a-z]\))?)\s*:\s*(.+)$/i,
      );
      if (figMatch) {
        imageReferences.push({
          caption: figMatch[1],
          description: figMatch[2],
          location: "Document",
          type: "figure",
        });
      }
    }
  }

  return {
    sections,
    headers,
    tables,
    imageReferences,
    summary: {
      totalSections: sections.length,
      totalHeaders: Object.values(headers).flat().length,
      totalTables: tables.length,
      totalImages: imageReferences.length,
    },
  };
}

// Pricing constants — Claude Haiku 4.5 (claude-haiku-4-5-20251001)
// Source: Anthropic official pricing
const HAIKU_45_PRICING = {
  INPUT_COST_PER_MILLION:  1.00,  // $1.00 per 1M input tokens
  OUTPUT_COST_PER_MILLION: 5.00,  // $5.00 per 1M output tokens
  INR_CONVERSION_RATE:     84.0,  // USD → INR (update as needed)
};

/**
 * Calculate cost breakdown for a Claude API call
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {{ inputCostUSD, outputCostUSD, totalCostUSD, totalCostINR, perTokenBreakdown }}
 */
function calculateClaudeCost(inputTokens, outputTokens) {
  const inputCostUSD  = (inputTokens  / 1_000_000) * HAIKU_45_PRICING.INPUT_COST_PER_MILLION;
  const outputCostUSD = (outputTokens / 1_000_000) * HAIKU_45_PRICING.OUTPUT_COST_PER_MILLION;
  const totalCostUSD  = inputCostUSD + outputCostUSD;
  const totalCostINR  = totalCostUSD * HAIKU_45_PRICING.INR_CONVERSION_RATE;

  return {
    inputTokens,
    outputTokens,
    totalTokens:    inputTokens + outputTokens,
    inputCostUSD:   parseFloat(inputCostUSD.toFixed(6)),
    outputCostUSD:  parseFloat(outputCostUSD.toFixed(6)),
    totalCostUSD:   parseFloat(totalCostUSD.toFixed(6)),
    totalCostINR:   parseFloat(totalCostINR.toFixed(4)),
    model:          'claude-haiku-4-5-20251001',
    pricingUsed: {
      inputPerMillionUSD:  HAIKU_45_PRICING.INPUT_COST_PER_MILLION,
      outputPerMillionUSD: HAIKU_45_PRICING.OUTPUT_COST_PER_MILLION,
    },
  };
}

async function generateAdaptiveContentFromSectionText(req, res) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 280000);

  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({ success: false, message: 'Anthropic API key not configured' });
    }

    const {
      sectionText,
      sectionNumber,
      topicName,
      contentType,
      contentTypeId,
      contentDepth,
      visualStyle,
      outputLanguage,
    } = req.body;

    const requiredFields = ['sectionText', 'sectionNumber', 'topicName', 'contentType'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({ success: false, message: 'Missing required fields', missingFields });
    }

    const depth    = contentDepth   || 'intermediate';
    const style    = visualStyle    || 'academic';
    const language = outputLanguage || 'english';

    const prompt = getPrompt(contentTypeId, {
      sectionNumber,
      topicName,
      contentDepth:   depth,
      visualStyle:    style,
      outputLanguage: language,
      contentType,
    });

    // ── Single Claude API call ──
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${prompt}\n\n---\nHere is the section content to use:\n\n${sectionText}`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return res.status(400).json({
        success: false,
        message: 'Failed to generate content',
        error:   error.message,
      });
    }

    const data = await response.json();

    const inputTokens   = data.usage?.input_tokens  || 0;
    const outputTokens  = data.usage?.output_tokens || 0;
    const costBreakdown = calculateClaudeCost(inputTokens, outputTokens);

    console.log(`[AdaptiveContent] Token usage — Input: ${inputTokens}, Output: ${outputTokens}`);
    console.log(`[AdaptiveContent] Cost — $${costBreakdown.totalCostUSD} USD / ₹${costBreakdown.totalCostINR} INR`);

    const htmlContent = data.content?.[0]?.text || '';

    if (!htmlContent.trim()) {
      return res.status(500).json({
        success: false,
        message: 'Claude returned empty HTML content',
        usage: { inputTokens, outputTokens, totalTokens: costBreakdown.totalTokens },
        cost:  { totalCostUSD: costBreakdown.totalCostUSD, totalCostINR: costBreakdown.totalCostINR },
      });
    }

    console.log(`[AdaptiveContent] HTML length: ${htmlContent.length} characters`);

    // ── Convert HTML → images ──
    const conversionController = new AbortController();
    const conversionTimeoutId  = setTimeout(() => conversionController.abort(), 90000);

    try {
      const conversionResponse = await fetch(
        'https://api-s7ossubabq-uc.a.run.app/apizip/convert-to-images',  // ✅ fixed URL
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ pages: 1, htmlText: [htmlContent] }),  // ✅ array fix
          signal:  conversionController.signal,
        }
      );

      clearTimeout(conversionTimeoutId);

      if (conversionResponse.ok) {
        const imageRes = await conversionResponse.json();

        const usageMeta = {
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: costBreakdown.totalTokens,
          },
          cost: {
            inputCostUSD:  costBreakdown.inputCostUSD,
            outputCostUSD: costBreakdown.outputCostUSD,
            totalCostUSD:  costBreakdown.totalCostUSD,
            totalCostINR:  costBreakdown.totalCostINR,
            model:         costBreakdown.model,
            pricingUsed:   costBreakdown.pricingUsed,
          },
        };

        if (Array.isArray(imageRes.images)) {
          return res.status(200).json({
            success: true,
            images:  imageRes.images,
            ...usageMeta,
          });
        }

        return res.status(200).json({
          success:    true,
          conversion: imageRes,
          ...usageMeta,
        });
      }

      // Non-OK response from conversion API
      const conversionError = await conversionResponse.text();
      console.error(`[AdaptiveContent] Conversion API failed — Status: ${conversionResponse.status}`);
      console.error(`[AdaptiveContent] Conversion API error body: ${conversionError}`);
      console.error(`[AdaptiveContent] HTML length sent: ${htmlContent.length} chars`);

      return res.status(502).json({
        success: false,
        message: `Image conversion service failed (HTTP ${conversionResponse.status})`,
        error:   conversionError,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: costBreakdown.totalTokens,
        },
        cost: {
          totalCostUSD: costBreakdown.totalCostUSD,
          totalCostINR: costBreakdown.totalCostINR,
        },
      });

    } catch (conversionError) {
      clearTimeout(conversionTimeoutId);

      const partialUsage = {
        usage: { inputTokens, outputTokens, totalTokens: costBreakdown.totalTokens },
        cost:  { totalCostUSD: costBreakdown.totalCostUSD, totalCostINR: costBreakdown.totalCostINR },
      };

      if (conversionError.name === 'AbortError') {
        console.error('[AdaptiveContent] Conversion API timed out after 90s');
        return res.status(504).json({
          success: false,
          message: 'Image conversion timeout — the service took too long to respond',
          ...partialUsage,
        });
      }

      console.error('[AdaptiveContent] Conversion fetch error:', conversionError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to convert HTML to images',
        error:   conversionError.message,
        ...partialUsage,
      });
    }

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Request timeout — Claude API took too long' });
    }
    console.error('[AdaptiveContent] Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate adaptive content',
      error:   error.message,
    });
  }
}




module.exports = {
  generateAdaptiveContent,
  extractDocumentStructure,
  generateAdaptiveContentFromSectionText
};
