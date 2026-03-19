require("dotenv").config();
const { getPrompt, getChatboxPrompt } = require("./prompts/content-generate-prompts");
const { getSystemPrompt } = require("./prompts/systemPrompts");
const {
  getDocumentStructureExtractionPrompt,
} = require("./prompts/extraction-prompts");
// COMMENTED OUT: No longer using embeddings and cosine similarity
// const { generateEmbedding, cosineSimilarity } = require("../rag/embeddings");
const AWS = require("aws-sdk");

let dynamodb = null;

function initializeDynamoDB() {
  if (dynamodb) return dynamodb;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "ap-south-1";

  if (accessKeyId && secretAccessKey) {
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

// Generate adaptive content from uploaded file OR chunks (RAG) and convert to images
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
      // RAG-specific parameters
      chunks = [],
      documentId,
      topic,
      sectionTitle,
      sectionTitles = [],
      sectionIds = [],
      sectionNumbers = [],
      learningStyle = "visual",
      difficulty = "intermediate",
      maxTokens = 2000,
    } = req.body;

    const userId = req.user?.userId;    
    const sectionsToProcess = sectionTitles.length > 0 ? sectionTitles : (sectionTitle ? [sectionTitle] : []);

    if (chunks.length == 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Chunks array is required",
      });
    }

      if (!userId || !documentId || sectionsToProcess.length === 0) {
        clearTimeout(timeoutId);
        return res.status(400).json({
          success: false,
          message: "Missing required fields for RAG mode: userId, documentId, sectionTitle(s)",
        });
      }
    
    const depth = contentDepth || difficulty || "intermediate";
    const style = visualStyle || "academic";
    const language = outputLanguage || "english";
    const finalTopicName = topicName || topic || sectionsToProcess[0] || sectionTitle;

    let prompt;
    let context = "";

      // COMMENTED OUT: Embedding generation and cosine similarity logic
      // const currentSectionTitle = sectionsToProcess[0] || sectionTitle;
      // console.log("[Adaptive Content] RAG Mode: Generating embedding for:", currentSectionTitle);
      // const topicEmbedding = await generateEmbedding(currentSectionTitle);
      // console.log("[Adaptive Content] Embedding generated, dimension:", topicEmbedding.length);

      // COMMENTED OUT: Find similar chunks using cosine similarity
      // console.log("[Adaptive Content] Querying similar chunks from provided data...");
      // const similarChunks = chunks
      //   .map((chunk) => {
      //     const chunkEmbedding = chunk.embedding.slice(0, topicEmbedding.length);
      //     return {
      //       ...chunk,
      //       similarity: cosineSimilarity(topicEmbedding, chunkEmbedding),
      //     };
      //   })
      //   .sort((a, b) => b.similarity - a.similarity);

      context = chunks
        .map((chunk, idx) => `[Context ${idx + 1}] ${chunk.text}`)
        .join("\n\n");

    const basePrompt = getPrompt(contentTypeId, {
      sectionNumber: sectionNumber || '',
      topicName: finalTopicName,
      contentDepth: depth,
      visualStyle: style,
      outputLanguage: language,
      contentType: contentType || '',
    });

    const systemPrompt = getSystemPrompt(contentTypeId);
    if (context) {
      prompt = `${basePrompt}\n\nUse the following context from the document to generate the content:\n\n${context}`;
    }

    // Call Anthropic Messages API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
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
    const content =
      data.content && data.content.length > 0 ? data.content[0].text : "";

    if (data.stop_reason === "max_tokens") {
      console.warn("⚠️ WARNING: Claude response was truncated due to max_tokens limit!");
      console.warn("⚠️ The generated HTML may be incomplete. Consider increasing max_tokens.");
    }

    let htmlContent = content;
    htmlContent = htmlContent.replace(/```(?:html)?\s*/g, '');
    htmlContent = htmlContent.replace(/```\s*/g, '');
    htmlContent = htmlContent.replace(/^["'`]+|["'`]+$/g, '');
    htmlContent = htmlContent.replace(/^\s*\{\s*["']?htmlText["']?\s*:\s*["']?/i, '');
    htmlContent = htmlContent.replace(/["']?\s*\}\s*$/, '');

    try {
      const jsonMatch = htmlContent.match(/^\s*\{[\s\S]*\}\s*$/);
      if (jsonMatch) {
        const parsed = JSON.parse(htmlContent);
        if (parsed.htmlText) {
          htmlContent = parsed.htmlText;
          console.log("Extracted HTML from JSON wrapper");
        } else if (typeof parsed === 'object') {
          const htmlProp = Object.values(parsed).find(val => 
            typeof val === 'string' && val.includes('<!DOCTYPE')
          );
          if (htmlProp) {
            htmlContent = htmlProp;
          }
        }
      }
    } catch (e) {
      // Not JSON, continue with normal extraction
    }
    
    const htmlMatch = htmlContent.match(/<!DOCTYPE[^>]*>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      htmlContent = htmlMatch[0];
    }
    htmlContent = htmlContent.replace(/\\n/g, '');
    htmlContent = htmlContent.replace(/\\"/g, '"');
    htmlContent = htmlContent.replace(/\\'/g, "'");
    htmlContent = htmlContent.replace(/^[^<]*(?=<!DOCTYPE)/i, '');
    clearTimeout(timeoutId);    console.log("HTML extracted successfully");

    // Skip image conversion for flash-cards (returns JSON, not HTML)
    if (contentTypeId === 'flash-cards') {
      console.log("Flash cards: skipping image conversion, returning JSON directly");
      
      // Extract JSON from markdown code blocks if present
      let flashCardsJson = content;
      
      // Remove markdown code block wrappers
      flashCardsJson = flashCardsJson.replace(/```(?:json)?\s*/g, '');
      flashCardsJson = flashCardsJson.replace(/```\s*/g, '');
      flashCardsJson = flashCardsJson.trim();
      
      try {
        // Parse the JSON string
        const parsedData = JSON.parse(flashCardsJson);
        
        // Return the parsed JSON directly
        return res.status(200).json(parsedData);
      } catch (parseError) {
        console.error("Failed to parse flash cards JSON:", parseError);
        return res.status(200).json({
          success: true,
          flashCards: {
            flashCards: [],
            uiConfig: { colors: [] }
          },
          rawContent: content,
          parseError: parseError.message
        });
      }
    }

    // Skip image conversion for mind-maps (returns JSON, not HTML)
    if (contentTypeId === 'mind-maps') {
      console.log("Mind maps: skipping image conversion, returning JSON directly");
      
      // Extract JSON from markdown code blocks if present
      let mindMapsJson = content;
      
      // Remove markdown code block wrappers
      mindMapsJson = mindMapsJson.replace(/```(?:json)?\s*/g, '');
      mindMapsJson = mindMapsJson.replace(/```\s*/g, '');
      mindMapsJson = mindMapsJson.trim();
      
      try {
        // Parse the JSON string
        const parsedData = JSON.parse(mindMapsJson);
        
        // Return the parsed JSON directly
        return res.status(200).json(parsedData);
      } catch (parseError) {
        console.error("Failed to parse mind maps JSON:", parseError);
        return res.status(200).json({
          success: true,
          header: { title: "", subtitle: "", emoji: "" },
          mindMap: { mainTopic: "", concepts: [] },
          footer: { copyright: "", author: "" },
          styling: {},
          rawContent: content,
          parseError: parseError.message
        });
      }
    }

    // Skip image conversion for diagrammatic-representation (returns JSON, not HTML)
    if (contentTypeId === 'diagrammatic-representation') {
      console.log("Diagrammatic representation: skipping image conversion, returning JSON directly");

      let diagramJson = content;
      diagramJson = diagramJson.replace(/```(?:json)?\s*/g, '');
      diagramJson = diagramJson.replace(/```\s*/g, '');
      diagramJson = diagramJson.trim();

      try {
        const parsedData = JSON.parse(diagramJson);
        return res.status(200).json(parsedData);
      } catch (parseError) {
        console.error("Failed to parse diagrammatic representation JSON:", parseError);
        return res.status(200).json({
          success: true,
          header: { title: "", subtitle: "", emoji: "" },
          coreIdea: "",
          diagram: { type: "", rootId: "", nodes: [], edges: [] },
          keyNotes: [],
          summary: "",
          footer: { text: "" },
          rawContent: content,
          parseError: parseError.message
        });
      }
    }

    let pageCount = (htmlContent.match(/class=["']page["']/g) || []).length || 1;
    if (contentTypeId === 'sticky-notes') {
      pageCount = 1;
    }

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
            pages: pageCount,
            htmlText: [htmlContent],
          }),
          signal: conversionController.signal,
        },
      );

      clearTimeout(conversionTimeoutId);

      if (conversionResponse.ok) {
        const respContentType =
          conversionResponse.headers.get("content-type") || "";
        if (respContentType.includes("application/json")) {
          const imageRes = await conversionResponse.json();

          if (imageRes && Array.isArray(imageRes.images)) {
            return res.status(200).json({
              success: true,
              images: imageRes.images,
              content: content,
              htmlContent: htmlContent,
            });
          }
          return res.status(200).json({
            success: true,
            conversion: imageRes,
            content: content,
            htmlContent: htmlContent,
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
async function chatboxQuery(req, res) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Anthropic API key not configured",
      });
    }

    const {
      userId,
      documentId,
      topic,
      sectionTitle,
      query,
      learningStyle = "visual",
      difficulty = "intermediate",
      chunks = [],
    } = req.body;

    console.log("[Adaptive Content - Chatbox] Request:", {
      userId,
      documentId,
      topic,
      query,
      learningStyle,
      difficulty,
      chunksProvided: chunks.length,
    });

    if (!userId || !documentId || !query) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, documentId, query",
      });
    }

    if (chunks.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: chunks (array of chunk objects with text and embedding)",
      });
    }

    // Step 1: Use chunks directly without embedding generation
    console.log("[Adaptive Content - Chatbox] Using provided chunks directly");
    console.log("[Adaptive Content - Chatbox] Total chunks available:", chunks.length);

    // COMMENTED OUT: Generate embedding for the query
    // console.log("[Adaptive Content - Chatbox] Generating embedding for query:", query);
    // const queryEmbedding = await generateEmbedding(query);
    // console.log("[Adaptive Content - Chatbox] Embedding generated, dimension:", queryEmbedding.length);

    // COMMENTED OUT: Find similar chunks using cosine similarity
    // console.log("[Adaptive Content - Chatbox] Querying similar chunks...");
    // const similarChunks = chunks
    //   .map((chunk) => {
    //     const chunkEmbedding = chunk.embedding.slice(0, queryEmbedding.length);
    //     return {
    //       ...chunk,
    //       similarity: cosineSimilarity(queryEmbedding, chunkEmbedding),
    //     };
    //   })
    //   .sort((a, b) => b.similarity - a.similarity)
    //   .slice(0, 5); // Top 5 similar chunks

    // console.log("[Adaptive Content - Chatbox] Retrieved", similarChunks.length, "similar chunks");

    // Step 2: Format context from all provided chunks directly
    const similarChunks = chunks; // Use all chunks directly
    const context = similarChunks
      .map((chunk, idx) => `[Source ${idx + 1}] ${chunk.text}`)
      .join("\n\n");

    console.log("[Adaptive Content - Chatbox] Context prepared from all chunks, length:", context.length);

    // Step 4: Generate chatbox response using Claude
    const prompt = getChatboxPrompt({
      query,
      topic: topic || sectionTitle,
      learningStyle,
      difficulty,
      context,
    });

    console.log("[Adaptive Content - Chatbox] Calling Claude API...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        temperature: 0.7,
        system: `You are a helpful educational assistant in a chatbox. Provide concise, conversational responses to student questions. Use the provided context to answer accurately. Keep responses friendly and encouraging.`,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[Adaptive Content - Chatbox] Claude API Error:", error);
      clearTimeout(timeoutId);
      return res.status(response.status).json({
        success: false,
        message: "Failed to generate chatbox response",
        error: error.error?.message || error.message,
      });
    }

    const data = await response.json();
    const message = data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("[Adaptive Content - Chatbox] Response generated successfully");

    clearTimeout(timeoutId);

    return res.status(200).json({
      success: true,
      message,
      context: similarChunks,
      metadata: {
        chunksUsed: similarChunks.length,
        topSimilarities: similarChunks.map(c => parseFloat(c.similarity.toFixed(4))),
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[Adaptive Content - Chatbox] Error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The chatbox query took too long to process.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = {
  generateAdaptiveContent,
  extractDocumentStructure,
  chatboxQuery,
};