
require("dotenv").config();
const { getPrompt, getChatboxPrompt } = require("./prompts/content-generate-prompts");
const { getSystemPrompt } = require("./prompts/systemPrompts");
const {
  getDocumentStructureExtractionPrompt,
} = require("./prompts/extraction-prompts");
const { generateAndUploadDiagramImage } = require("./generatei/diagrammetic");

const { generateAndUploadVisualImage } = require("./generatei/visualexplainerimage");

const { getMindMapSystemPrompt } = require("./prompts/mindMapSystemPrompt");
// COMMENTED OUT: No longer using embeddings and cosine similarity
// const { generateEmbedding, cosineSimilarity } = require("../rag/embeddings");
const AWS = require("aws-sdk");
const axios = require("axios");

const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT4;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

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

/**
 * Sanitizes LLM-generated Mermaid diagrams:
 * - Fixes special characters in node labels that cause syntax errors
 * - Shortens labels that are too long (causes line breaks inside nodes)
 * - Rebuilds the diagram line by line to catch all edge cases
 */
function sanitizeMermaid(html) {
  return html.replace(/(<div[^>]*class="mermaid"[^>]*>)([\s\S]*?)(<\/div>)/gi, (match, open, diagram, close) => {

    // Clean up escaped newlines that minification may have introduced
    let fixed = diagram
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ');

    // Process line by line
    const lines = fixed.split('\n').map(line => {
      const trimmed = line.trim();

      // Keep blank lines, directives, flowchart declaration, classDef, class assignments, arrows
      if (!trimmed) return line;
      if (trimmed.startsWith('%%')) return line;
      if (trimmed.startsWith('flowchart')) return line;
      if (trimmed.startsWith('classDef')) return line;
      if (trimmed.startsWith('class ')) return line;
      if (trimmed.includes('-->')) return sanitizeEdge(trimmed);

      // Node declaration lines — sanitize the label
      return sanitizeNodeLine(trimmed);
    });

    return `${open}\n${lines.join('\n')}\n${close}`;
  });
}

function sanitizeLabel(label) {
  let clean = label
    .replace(/\?/g, '')
    .replace(/:/g, ' -')
    .replace(/[()]/g, '')
    .replace(/>/g, 'gt')
    .replace(/</g, 'lt')
    .replace(/&(?:amp;)?/g, 'and')
    .replace(/\//g, ' or ')
    .replace(/\\/g, '')
    .replace(/"/g, '')          // remove any stray quotes inside
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Hard cap at 4 words to prevent line breaks inside nodes
  const words = clean.split(' ').filter(Boolean);
  if (words.length > 4) clean = words.slice(0, 4).join(' ');

  return clean;
}

function sanitizeNodeLine(line) {
  // Stadium/pill: A(["label"]) or A(["label"])
  line = line.replace(/^(\w+)\(\["?([^"\]]*)"?\]\)/, (m, id, label) => {
    return `${id}(["${sanitizeLabel(label)}"])`;
  });
  // Rectangle: B["label"] or B[label]
  line = line.replace(/^(\w+)\["?([^"\]]*)"?\](?!\()/, (m, id, label) => {
    return `${id}["${sanitizeLabel(label)}"]`;
  });
  // Diamond: C{"label"} or C{label}
  line = line.replace(/^(\w+)\{"?([^"{}]*)"?\}/, (m, id, label) => {
    return `${id}{"${sanitizeLabel(label)}"}`;
  });
  return line;
}

function sanitizeEdge(line) {
  // Edge labels like -->|Yes| and -->|No| are safe — only sanitize node labels on same line
  // e.g. A["bad:label"] --> B["another?"]
  return line
    .replace(/\["?([^"\]]*)"?\]/g, (m, label) => `["${sanitizeLabel(label)}"]`)
    .replace(/\{"?([^"{}]*)"?\}/g, (m, label) => `{"${sanitizeLabel(label)}"}`);
}

async function generateAdaptiveContent(req, res) {
  const timeoutSource = axios.CancelToken.source();
  const timeoutId = setTimeout(() => timeoutSource.cancel("Timeout after 280s"), 280000);

  try {
    console.log("=== [AdaptiveContent] REQUEST RECEIVED ===");
    console.log("[AdaptiveContent] contentTypeId:", req.body?.contentTypeId);
    console.log("[AdaptiveContent] topicName:", req.body?.topicName || req.body?.topic);
    console.log("[AdaptiveContent] sectionTitle:", req.body?.sectionTitle);
    console.log("[AdaptiveContent] chunks count:", req.body?.chunks?.length ?? 0);
    console.log("[AdaptiveContent] maxTokens:", req.body?.maxTokens ?? 6000);

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      console.error("[AdaptiveContent] ERROR: Azure OpenAI env vars not set");
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Azure OpenAI configuration missing (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_CONTENT_DEPLOYMENT3)",
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
      maxTokens = 6000,
    } = req.body;

    const userId = req.user?.userId;
    const sectionsToProcess = sectionTitles.length > 0 ? sectionTitles : (sectionTitle ? [sectionTitle] : []);

    if (chunks.length == 0) {
      console.error("[AdaptiveContent] ERROR: chunks array is empty");
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Chunks array is required",
      });
    }

    if (!userId || !documentId || sectionsToProcess.length === 0) {
      console.error("[AdaptiveContent] ERROR: Missing required fields — userId:", userId, "| documentId:", documentId, "| sections:", sectionsToProcess.length);
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

    console.log("[AdaptiveContent] Resolved — depth:", depth, "| language:", language, "| topic:", finalTopicName);

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

    console.log("[AdaptiveContent] Context built — total chars:", context.length);

    const basePrompt = getPrompt(contentTypeId, {
      sectionNumber: sectionsToProcess[0] || sectionTitle || sectionNumber || '',
      topicName: finalTopicName,
      contentDepth: depth,
      visualStyle: style,
      outputLanguage: language,
      contentType: contentType || '',
    });

    let systemPrompt;

    if (contentTypeId === "mind-maps") {
      systemPrompt = getMindMapSystemPrompt();
    } else {
      systemPrompt = getSystemPrompt(contentTypeId, language); // existing
    }

    if (context) {
      prompt = `${basePrompt}\n\nUse the following context from the document to generate the content:\n\n${context}`;
    }

    console.log("[AdaptiveContent] Prompt built — total chars:", prompt?.length);
    console.log("[AdaptiveContent] Calling Azure OpenAI (deployment:", AZURE_OPENAI_DEPLOYMENT, "| maxTokens:", maxTokens, ")...");

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
    const azureStart = Date.now();

    console.log("\n===== SYSTEM PROMPT =====\n", systemPrompt);
    console.log("\n===== USER PROMPT =====\n", prompt);
    // ✅ Azure OpenAI call — replaces Claude fetch
    const response = await axios.post(
      azureUrl,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: prompt },
        ],
        max_tokens:  maxTokens,
        temperature: 0.7,
      },
      {
        headers: {
          "api-key":      AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        timeout:     280000,
        cancelToken: timeoutSource.token,
      }
    );
    clearTimeout(timeoutId);

    console.log("[AdaptiveContent] Azure OpenAI responded in", Date.now() - azureStart, "ms — status:", response.status);

    // ✅ Azure response shape — choices[0].message.content
    const content = response.data?.choices?.[0]?.message?.content ?? "";
    const finishReason = response.data?.choices?.[0]?.finish_reason;

    console.log("[AdaptiveContent] Azure response — finish_reason:", finishReason, "| content length:", content.length, "chars");

    // ✅ Azure truncation flag is "length" (not "max_tokens")
    if (finishReason === "length") {
      console.warn("⚠️ WARNING: Azure OpenAI response was truncated due to max_tokens limit!");
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

    // ✅ Use finishReason === "length" instead of data.stop_reason === "max_tokens"
    if (finishReason === "length") {
      const partialMatch = htmlContent.match(/<!DOCTYPE[^>]*>[\s\S]*/i);
      if (partialMatch) {
        htmlContent = partialMatch[0];
        if (!htmlContent.includes('</html>')) {
          htmlContent += '</body></html>';
        }
      }
    } else {
      const htmlMatch = htmlContent.match(/<!DOCTYPE[^>]*>[\s\S]*<\/html>/i);
      if (htmlMatch) {
        htmlContent = htmlMatch[0];
      }
    }

    htmlContent = htmlContent.replace(/\\n/g, '');
    htmlContent = htmlContent.replace(/\\"/g, '"');
    htmlContent = htmlContent.replace(/\\'/g, "'");
    htmlContent = htmlContent.replace(/^[^<]*(?=<!DOCTYPE)/i, '');

    // Fix Mermaid diagram syntax — sanitize node labels to remove characters
    // that cause "Syntax error in text" in Mermaid v10
    if (contentTypeId === 'process-flow-charts') {
      const before = htmlContent.match(/(<div[^>]*class="mermaid"[^>]*>)([\s\S]*?)(<\/div>)/i);
      if (before) console.log("[Mermaid] Raw diagram from LLM:\n", before[2]);
      htmlContent = sanitizeMermaid(htmlContent);
      const after = htmlContent.match(/(<div[^>]*class="mermaid"[^>]*>)([\s\S]*?)(<\/div>)/i);
      if (after) console.log("[Mermaid] Sanitized diagram:\n", after[2]);
    }

    clearTimeout(timeoutId);
    console.log("HTML extracted successfully");

    // Skip image conversion for flash-cards (returns JSON, not HTML)
    if (contentTypeId === 'flash-cards') {
      console.log("[AdaptiveContent] flash-cards: returning JSON directly");

      let flashCardsJson = content;
      flashCardsJson = flashCardsJson.replace(/```(?:json)?\s*/g, '');
      flashCardsJson = flashCardsJson.replace(/```\s*/g, '');
      flashCardsJson = flashCardsJson.trim();

      try {
        const parsedData = JSON.parse(flashCardsJson);
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
      console.log('AdaptiveContent: mind-maps returning JSON directly');
      let mindMapsJson = content;
      mindMapsJson = mindMapsJson.replace(/```json?/g, '');
      mindMapsJson = mindMapsJson.replace(/```/g, '');
      mindMapsJson = mindMapsJson.trim();

      try {
        const parsedData = JSON.parse(mindMapsJson);

        const mindMapPayload = parsedData.mindMap
          ? {
              ...parsedData,
              mindMap: {
                ...parsedData.mindMap,
              },
            }
          : {
              ...parsedData,
            };

        return res.status(200).json(mindMapPayload);

      } catch (parseError) {
        console.error('Failed to parse mind maps JSON:', parseError);
        return res.status(200).json({
          success: true,
          header:  { title: '', subtitle: '', emoji: '' },
          mindMap: { mainTopic: '', concepts: [] },
          footer:  { copyright: '', author: '' },
          styling: {},
          rawContent: content,
          parseError: parseError.message,
        });
      }
    }

    
    // Skip image conversion for diagrammatic-representation (returns JSON, not HTML)
    if (contentTypeId === 'diagrammatic-representation') {
      console.log('AdaptiveContent: diagrammatic-representation returning JSON directly');
      let diagramJson = content;
      diagramJson = diagramJson.replace(/```json/g, '');
      diagramJson = diagramJson.replace(/```/g, '');
      diagramJson = diagramJson.trim();

      try {
        const parsedData = JSON.parse(diagramJson);

        let generatedDiagramImage = null;
        let imagePrompt = null;
        let imageDescription = null;
        
        try {
          // Generate both prompt and description, then create image
          generatedDiagramImage = await generateAndUploadDiagramImage(parsedData, finalTopicName);
          console.log('Diagram image generation result:', generatedDiagramImage);
          
          if (generatedDiagramImage) {
            imagePrompt = generatedDiagramImage.imagePrompt;
            imageDescription = generatedDiagramImage.imageDescription;
          }
        } catch (imgErr) {
          console.error('Diagram image generation failed:', imgErr.message);
        }

        return res.status(200).json({
          ...parsedData,
          diagramImage: generatedDiagramImage?.imageUrl || null,
          diagramImageId: generatedDiagramImage?.imageId || null,
          imagePrompt: imagePrompt || null,
          imageDescription: imageDescription || parsedData.imageDescription || null,
        });
      } catch (parseError) {
        console.error('Failed to parse diagrammatic representation JSON:', parseError);

        return res.status(200).json({
          success: true,
          header: { title: '', subtitle: '', emoji: '📘' },
          coreIdea: '',
          diagram: { type: 'TREE', rootId: 'A', nodes: [], edges: [] },
          keyNotes: [],
          summary: '',
          footer: { text: '2025 EduFit Diagrammatic Representation Generated by AI' },
          diagramImage: null,
          diagramImageId: null,
          imagePrompt: null,
          imageDescription: null,
          rawContent: content,
          parseError: parseError.message,
        });
      }
    }

    if (contentTypeId === 'visual-explainers') {
      console.log('[AdaptiveContent] visual-explainers: generating AI concept images...');

      let generatedVisualImages = null;
      try {
        // Pass the actual content context for better prompts
        const contentContext = chunks.map(c => c.text).join(' ').substring(0, 2000);
        generatedVisualImages = await generateAndUploadVisualImage(finalTopicName, contentContext);
        console.log('[VisualExplainerImage] Generation result:', generatedVisualImages);
        console.log(`[VisualExplainerImage] Generated ${generatedVisualImages?.length || 0} images with descriptions`);
      } catch (imgErr) {
        console.error('[VisualExplainerImage] Generation failed (non-fatal):', imgErr.message);
      }

      const images = generatedVisualImages && Array.isArray(generatedVisualImages) 
        ? generatedVisualImages  // Now includes description field
        : [];

      console.log(`[AdaptiveContent] Returning ${images.length} visual explainer images with descriptions`);

      return res.status(200).json({
        success: true,
        images,                    // Contains: slideNumber, stepName, url, imageId, prompt, description
        htmlContent: htmlContent,
        content: content,
        truncated: finishReason === 'length',
      });
    }

    let pageCount = (htmlContent.match(/class=["']page["']/g) || []).length || 1;
    if (contentTypeId === 'sticky-notes') {
      pageCount = 1;
    }

    console.log("[AdaptiveContent] HTML extracted — length:", htmlContent.length, "| pageCount:", pageCount);
    console.log("[AdaptiveContent] Calling image conversion API...");
    const conversionStart = Date.now();

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

      console.log("[AdaptiveContent] Image conversion responded in", Date.now() - conversionStart, "ms — status:", conversionResponse.status);

      if (conversionResponse.ok) {
        const respContentType =
          conversionResponse.headers.get("content-type") || "";
        if (respContentType.includes("application/json")) {
          const imageRes = await conversionResponse.json();

          if (imageRes && Array.isArray(imageRes.images)) {
            console.log("[AdaptiveContent] SUCCESS — returning", imageRes.images.length, "image(s)");
            return res.status(200).json({
              success: true,
              images: imageRes.images,
              content: content,
              htmlContent: htmlContent,
              truncated: finishReason === "length", // ✅ updated flag
            });
          }
          return res.status(200).json({
            success: true,
            conversion: imageRes,
            content: content,
            htmlContent: htmlContent,
            truncated: finishReason === "length", // ✅ updated flag
          });
        }
      } else {
        let conversionErrorBody = "";
        try {
          conversionErrorBody = await conversionResponse.text();
        } catch (_) {}
        console.error("[AdaptiveContent] Image conversion API error — status:", conversionResponse.status, "| body:", conversionErrorBody);
        return res.status(200).json({
          success: true,
          images: [],
          content: content,
          htmlContent: htmlContent,
          truncated: finishReason === "length", // ✅ updated flag
          conversionError: `Conversion service returned ${conversionResponse.status}: ${conversionErrorBody}`,
        });
      }
    } catch (conversionError) {
      clearTimeout(conversionTimeoutId);
      console.error("[AdaptiveContent] Image conversion error:", conversionError.name, conversionError.message);

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

    // ✅ axios cancel token replaces AbortError
    if (axios.isCancel(error)) {
      console.error("[AdaptiveContent] TIMEOUT: Azure OpenAI exceeded 280s");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The adaptive content generation took too long. Please try again.",
      });
    }

    // ✅ Azure-specific error extraction
    const azureMsg = error?.response?.data?.error?.message;
    const azureCode = error?.response?.data?.error?.code;
    console.error("[AdaptiveContent] Unhandled error:", error?.response?.status || error.name, azureMsg || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate adaptive content",
      error: azureMsg || error.message,
      ...(azureCode && { code: azureCode }),
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
  const timeoutSource = axios.CancelToken.source();
  const timeoutId = setTimeout(() => timeoutSource.cancel("Timeout after 300s"), 300000);

  try {
    // ✅ Azure env check — replaces CLAUDE_API_KEY check
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Azure OpenAI configuration missing",
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

    // Step 4: Generate chatbox response using Azure OpenAI
    const prompt = getChatboxPrompt({
      query,
      topic: topic || sectionTitle,
      learningStyle,
      difficulty,
      context,
    });

    console.log("[Adaptive Content - Chatbox] Calling Azure OpenAI...");

    // ✅ Azure OpenAI call — replaces Claude fetch
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      {
        messages: [
          {
            role: "system",
            content: `You are a helpful educational assistant in a chatbox. Provide concise, conversational responses to student questions. Use the provided context to answer accurately. Keep responses friendly and encouraging.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens:  1024,
        temperature: 0.7,
      },
      {
        headers: {
          "api-key":      AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        timeout:     300000,
        cancelToken: timeoutSource.token,
      }
    );

    clearTimeout(timeoutId);

    // ✅ Azure response shape — choices[0].message.content
    const message = response.data?.choices?.[0]?.message?.content ?? "";

    console.log("[Adaptive Content - Chatbox] Response generated successfully");

    return res.status(200).json({
      success: true,
      message,
      context: similarChunks,
      metadata: {
        chunksUsed: similarChunks.length,
        topSimilarities: similarChunks.map(c => parseFloat((c.similarity ?? 0).toFixed(4))),
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[Adaptive Content - Chatbox] Error:", error);

    // ✅ axios cancel replaces AbortError
    if (axios.isCancel(error)) {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The chatbox query took too long to process.",
      });
    }

    // ✅ Azure-specific error extraction
    const azureMsg = error?.response?.data?.error?.message;
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: azureMsg || error.message,
    });
  }
}

async function generateAdaptiveContentPDF(req, res) {
  try {
    const { images, imageDescriptions = [], filename = 'adaptive-content', htmlContent } = req.body;

    if ((!images || !Array.isArray(images) || images.length === 0) && !htmlContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either images array or htmlContent is required' 
      });
    }

    console.log(`[AdaptiveContentPDF] Generating PDF with:`, {
      hasHtml: !!htmlContent,
      imageCount: images?.length || 0,
      hasDescriptions: imageDescriptions.length > 0,
      descriptionCount: imageDescriptions.length
    });

    // Always use puppeteer for better rendering with descriptions
    return await generateHtmlPdfWithDescriptions(req, res);

  } catch (error) {
    console.error('[AdaptiveContentPDF] Error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF', 
      error: error.message 
    });
  }
}


async function generateHtmlPdfWithDescriptions(req, res) {
  const puppeteer = require('puppeteer');
  const { htmlContent, images = [], imageDescriptions = [], imageTitles = [], filename = 'adaptive-content' } = req.body;
 
  let browser = null;
  
  try {
    console.log('[PDF] Launching puppeteer with extended timeout...');
    
    // ✅ Launch with increased protocol timeout
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      protocolTimeout: 120000, // 120 seconds for protocol operations
    });
    
    const page = await browser.newPage();
    
    // ✅ Set default navigation timeout
    page.setDefaultNavigationTimeout(90000);
    page.setDefaultTimeout(90000);
    
    // Filter valid images (remove nulls and invalid URLs)
    const validImages = images.filter(img => img && typeof img === 'string' && img.startsWith('http'));
    
    // If no valid images, return error
    if (validImages.length === 0 && !htmlContent) {
      throw new Error('No valid images or HTML content to generate PDF');
    }
    
    const stepLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // Build modern styled HTML with beautiful card layout
    let styledHtml = '';
    
    // If there's existing HTML content, preserve it
    if (htmlContent && htmlContent.trim()) {
      styledHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Explainer - ${filename}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
      
      /* Ensure all content has proper spacing */
      .content-wrapper, .visual-explainer-section {
        padding: 0;
      }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
</html>`;
    } else {
      styledHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Explainer - ${filename}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
    </style>
  </head>
  <body>
    <div class="content-wrapper"></div>
  </body>
</html>`;
    }
    
    // Create the modern image gallery HTML (only if we have images)
    let modernGalleryHtml = '';
    
    if (validImages.length > 0) {
      modernGalleryHtml = `
      <style>
        /* Modern Visual Explainer Styles */
        .visual-explainer-section {
          margin-top: 20px;
          padding-top: 0;
        }
        
        .section-header {
          text-align: center;
          margin: 0 0 20px 0;
          padding: 10px 0 5px;
        }
        
        .section-header h2 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e293b, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 8px;
        }
 
        .section-header h2 {
          margin: 0;
        }
 
        .section-header p {
          margin: 4px 0 0 0;
        }
        
        .section-header p {
          color: #64748b;
          font-size: 14px;
        }
        
        /* Step Card Container */
        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 900px;
          margin: 0 auto;
          padding: 0 10px;
        }
        
        /* Individual Step Card */
        .step-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          page-break-inside: avoid;
          border: 1px solid #e2e8f0;
          margin-bottom: 10px;
          break-inside: avoid;
        }
        
        /* Card Header with Gradient */
        .step-card-header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .step-badge {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .step-letter-circle {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: white;
        }
        
        .step-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
        }
        
        .step-counter {
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
          color: white;
        }
        
        /* Image Container */
        .step-image-container {
          padding: 12px 12px;
          background: #fafbfc;
          display: flex;
          justify-content: center;
          align-items: center;
          border-bottom: 1px solid #f0f2f5;
          margin: 0;
        }
        
        .step-image {
          max-width: 60%;
          height: auto;
          max-height: 260px;
          width: auto;
          border-radius: 12px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          background: white;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }
        
        /* Description Box */
        .step-description {
          padding: 12px 16px;
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
        }
        
        .description-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .description-icon {
          font-size: 18px;
        }
        
        .description-label {
          font-size: 11px;
          font-weight: 700;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        
        .description-text {
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          margin: 0;
        }
        
        /* Print Styles */
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .step-card {
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none;
          }
          
          .step-card-header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .step-description {
            background: #f0f9ff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
      
      <div class="visual-explainer-section">
        <div class="section-header">
          <h2>📸 Visual Learning Sequence</h2>
          <p>Step-by-step visual guide with explanations</p>
        </div>
        
        <div class="steps-container">
          ${validImages.map((img, idx) => {
            const stepLetter = stepLabels[idx] || String.fromCharCode(65 + idx);
            const stepTitle = imageTitles[idx] || `Step ${stepLetter}`;
            const description = imageDescriptions[idx] || `Step ${stepLetter}: ${stepTitle} demonstrates the key concept in this learning process.`;
            
            return `
              <div class="step-card">
                <div class="step-card-header">
                  <div class="step-badge">
                    <div class="step-letter-circle">${stepLetter}</div>
                    <div class="step-title">${escapeHtml(stepTitle)}</div>
                  </div>
                  <div class="step-counter">${idx + 1}/${validImages.length}</div>
                </div>
                <div class="step-image-container">
                  <img src="${img}" alt="Step ${stepLetter}: ${stepTitle}" class="step-image" />
                </div>
                <div class="step-description">
                  <div class="description-header">
                    <span class="description-icon">📝</span>
                    <span class="description-label">Step ${stepLetter} • Detailed Explanation</span>
                  </div>
                  <p class="description-text">${escapeHtml(description)}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    }
    
    // Combine existing HTML content with the modern gallery
    let finalHtml = styledHtml;
    
    if (modernGalleryHtml) {
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${modernGalleryHtml}</body>`);
      } else {
        finalHtml = finalHtml + modernGalleryHtml;
      }
    }
    
    console.log('[PDF] Setting page content...');
    
    // ✅ Use a simpler approach to set content
    await page.setContent(finalHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // ✅ Wait for images with a more efficient approach
    console.log('[PDF] Waiting for images to load...');
    await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000);
        });
      });
      return Promise.all(promises);
    });
    
    // ✅ Additional small delay for layout
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    
    console.log('[PDF] Generating PDF buffer...');
    
    // ✅ FIXED: Removed header/footer, consistent margins all around
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      },
      displayHeaderFooter: false,   // ✅ REMOVED - No header/footer
      preferCSSPageSize: true,
      timeout: 90000
    });
    
    await browser.close();
    
    console.log(`[PDF] Generated styled PDF — ${pdfBuffer.length} bytes with ${validImages.length} images`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.pdf$/i, '')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('[PDF] Error:', error);
    if (browser) {
      await browser.close();
    }
    
    if (error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'PDF generation timed out. The content may be too large. Please try again with fewer images or smaller HTML content.',
        error: error.message
      });
    }
    
    throw error;
  }
}
 
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

/**
 * Generate PDF from images with descriptions (original logic with descriptions added)
 */
async function generateImageOnlyPdfWithDescriptions(req, res) {
  const { images, imageDescriptions = [], filename = 'adaptive-content' } = req.body;
  
  const sharp = require('sharp');
  const { PDFDocument } = require('pdf-lib');

  // A4 in points at 72dpi
  const A4_WIDTH_PT = 595;
  const A4_HEIGHT_PT = 842;

  const pdfDoc = await PDFDocument.create();
  
  // Add a font for text
  const font = await pdfDoc.embedFont('Helvetica');
  const boldFont = await pdfDoc.embedFont('Helvetica-Bold');

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i];
    const description = imageDescriptions[i] || `Step ${i + 1} visual explanation.`;

    // Resolve image to PNG Buffer
    let imgBuffer;
    if (imgData.startsWith('http://') || imgData.startsWith('https://')) {
      const imgResponse = await fetch(imgData);
      if (!imgResponse.ok) throw new Error(`Failed to fetch image ${i + 1}`);
      const arrayBuffer = await imgResponse.arrayBuffer();
      imgBuffer = Buffer.from(arrayBuffer);
    } else {
      const base64 = imgData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,\s*/, '').trim();
      imgBuffer = Buffer.from(base64, 'base64');
    }

    const pngBuffer = await sharp(imgBuffer).png().toBuffer();
    const embeddedImage = await pdfDoc.embedPng(pngBuffer);
    
    // Calculate image dimensions (keep aspect ratio, max width 500pt)
    const maxWidth = 500;
    const maxHeight = 400;
    let imgWidth = embeddedImage.width;
    let imgHeight = embeddedImage.height;
    
    if (imgWidth > maxWidth) {
      imgHeight = (imgHeight * maxWidth) / imgWidth;
      imgWidth = maxWidth;
    }
    if (imgHeight > maxHeight) {
      imgWidth = (imgWidth * maxHeight) / imgHeight;
      imgHeight = maxHeight;
    }
    
    // Calculate position (centered)
    const imgX = (A4_WIDTH_PT - imgWidth) / 2;
    let imgY = 50;
    
    // Add page for this image
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    
    // Draw image
    page.drawImage(embeddedImage, {
      x: imgX,
      y: A4_HEIGHT_PT - imgY - imgHeight,
      width: imgWidth,
      height: imgHeight,
    });
    
    // Draw description text below image
    const textY = A4_HEIGHT_PT - imgY - imgHeight - 40;
    
    // Draw header
    page.drawText(`📝 Step ${i + 1} Explanation`, {
      x: 50,
      y: textY,
      size: 12,
      font: boldFont,
      color: { r: 0.15, g: 0.4, b: 0.92 }, // #2563eb
    });
    
    // Wrap and draw description text
    const fontSize = 10;
    const maxCharsPerLine = 90;
    const words = description.split(' ');
    let lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    let yOffset = 0;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y: textY - 20 - yOffset,
        size: fontSize,
        font: font,
        color: { r: 0.12, g: 0.16, b: 0.23 }, // #1e293b
      });
      yOffset += fontSize + 4;
    }
  }

  const pdfBytes = await pdfDoc.save();
  console.log(`[Image PDF] Generated with descriptions — ${pdfBytes.length} bytes`);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  res.setHeader('Content-Length', pdfBytes.length);
  return res.send(Buffer.from(pdfBytes));
}

/**
 * Generate PDF from HTML content using puppeteer
 */
async function generateHtmlPdf(req, res) {
  const puppeteer = require('puppeteer');
  const { htmlContent, images, filename = 'adaptive-content' } = req.body;

  let browser = null;
  
  try {
    // Launch puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create full HTML document with proper styling
    let fullHtml = htmlContent;
    
    // If htmlContent is a fragment (not full document), wrap it
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      fullHtml = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #1f2937;
              background: white;
              margin: 0;
              padding: 0;
              margin-top: 40px;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .page-break {
                page-break-before: always;
              }
            }
            @page {
              margin-top: 80mm;
              margin: 20mm 15mm; /* control exact PDF spacing */
            }
            .pdf-page-wrapper {
              padding: 10mm 0;   /* internal breathing space */
            }
            .visual-explainer-section {
              margin-top: 20px;
              padding-top: 5px;
            
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js"></script>
        </head>
        <body>
          <div class="pdf-page-wrapper">
            ${htmlContent}
            ${modernGalleryHtml}
          </div>
        </body>
      </html>`;
    }
    
    // Append images after HTML content if they exist
    if (images && images.length > 0) {
      const imagesHtml = `
        <div style="margin-top: 40px; page-break-before: avoid;">
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #e5e7eb;" />
          <h2 style="text-align: center; margin: 30px 0 20px; color: #374151;">
            🖼️ Visual Concepts
          </h2>
          <div style="display: flex; flex-direction: column; gap: 30px;">
            ${images.map((img, idx) => `
              <div style="page-break-inside: avoid;">
                <img src="${img}" alt="Concept illustration ${idx + 1}" 
                     style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      // Insert images before closing body tag
      fullHtml = fullHtml.replace('</body>', `${imagesHtml}</body>`);
    }
    
    // Set page content
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for any dynamic content (KaTeX, Twemoji)
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.renderMathInElement) {
          window.renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
            ]
          });
        }
        if (window.twemoji) {
          window.twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
        }
        setTimeout(resolve, 1000);
      });
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    
    await browser.close();
    
    console.log(`[HTML PDF] Generated PDF — ${pdfBuffer.length} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('[HTML PDF] Error:', error);
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Generate PDF from images only (original logic)
 */
async function generateImageOnlyPdf(req, res) {
  const { images, filename = 'adaptive-content' } = req.body;
  
  const sharp = require('sharp');
  const { PDFDocument } = require('pdf-lib');

  // A4 in points at 72dpi
  const A4_WIDTH_PT  = 595;
  const A4_HEIGHT_PT = 842;

  // 2rem padding — 1rem ≈ 12pt at standard PDF resolution
  const PADDING_PT = 2 * 12; // 24pt per side
  const DRAW_WIDTH  = A4_WIDTH_PT  - PADDING_PT * 2;
  const DRAW_HEIGHT = A4_HEIGHT_PT - PADDING_PT * 2;

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i];

    // Resolve image to a Buffer — supports S3/HTTP URLs and base64 data URIs
    let imgBuffer;
    if (imgData.startsWith('http://') || imgData.startsWith('https://')) {
      console.log(`[Image PDF] Image ${i + 1}: fetching from URL`);
      const imgResponse = await fetch(imgData);
      if (!imgResponse.ok) {
        throw new Error(`Image ${i + 1}: failed to fetch URL (${imgResponse.status})`);
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      imgBuffer = Buffer.from(arrayBuffer);
    } else {
      // Strip data URI prefix if present
      const base64 = imgData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,\s*/, '').trim();
      if (!base64) {
        console.warn(`[Image PDF] Image ${i + 1}: empty base64, skipping`);
        continue;
      }
      imgBuffer = Buffer.from(base64, 'base64');
    }

    // Normalise to PNG via sharp
    let pngBuffer;
    try {
      pngBuffer = await sharp(imgBuffer).png().toBuffer();
    } catch (sharpErr) {
      console.error(`[Image PDF] Image ${i + 1} could not be decoded: ${sharpErr.message}`);
      throw new Error(`Image ${i + 1} has an unsupported or corrupt format: ${sharpErr.message}`);
    }

    const image = sharp(pngBuffer);
    const meta  = await image.metadata();

    // Get raw RGBA pixel data for blank row detection
    const rawPixels = await sharp(pngBuffer).raw().toBuffer();

    const stripHeightPx = Math.round(meta.width * (DRAW_HEIGHT / DRAW_WIDTH));
    const SEARCH_WINDOW_PX = Math.round(stripHeightPx * 0.05);

    async function isBlankRow(rowY) {
      const offset = rowY * meta.width * 4;
      for (let x = 0; x < meta.width; x++) {
        const base = offset + x * 4;
        if (rawPixels[base] < 240 || rawPixels[base + 1] < 240 || rawPixels[base + 2] < 240) {
          return false;
        }
      }
      return true;
    }

    let y = 0;

    while (y < meta.height) {
      let cutY = y + stripHeightPx;

      if (cutY >= meta.height) {
        cutY = meta.height;
      } else {
        const searchStart = Math.max(y + 1, cutY - SEARCH_WINDOW_PX);
        const searchEnd   = Math.min(meta.height - 1, cutY + SEARCH_WINDOW_PX);

        let bestRow = cutY;
        let found = false;

        for (let delta = 0; delta <= SEARCH_WINDOW_PX && !found; delta++) {
          for (const candidate of [cutY - delta, cutY + delta]) {
            if (candidate < searchStart || candidate > searchEnd) continue;
            if (await isBlankRow(candidate)) {
              bestRow = candidate;
              found = true;
              break;
            }
          }
        }

        cutY = bestRow;
        if (found) {
          console.log(`[Image PDF] Image ${i + 1}: snapped cut from ${y + stripHeightPx} → ${cutY}`);
        }
      }

      const sliceH = cutY - y;

      const sliceBuffer = await sharp(pngBuffer)
        .extract({ left: 0, top: y, width: meta.width, height: sliceH })
        .png()
        .toBuffer();

      const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      const embedded = await pdfDoc.embedPng(sliceBuffer);

      const drawHeight = DRAW_WIDTH * (sliceH / meta.width);

      page.drawImage(embedded, {
        x: PADDING_PT,
        y: A4_HEIGHT_PT - PADDING_PT - drawHeight,
        width: DRAW_WIDTH,
        height: drawHeight,
      });

      y = cutY;
    }
  }

  const pdfBytes = await pdfDoc.save();
  console.log(`[Image PDF] Generated — ${pdfBytes.length} bytes`);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  res.setHeader('Content-Length', pdfBytes.length);
  return res.send(Buffer.from(pdfBytes));
}

module.exports = {
  generateAdaptiveContent,
  extractDocumentStructure,
  chatboxQuery,
  generateAdaptiveContentPDF,
};
