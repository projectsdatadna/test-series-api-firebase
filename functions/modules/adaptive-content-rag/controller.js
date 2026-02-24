try { require("dotenv").config(); } catch (e) { /* .env not found */ }
const { getPrompt, getChatboxPrompt } = require("./prompts/content-generate-prompts");
const {
  getDocumentStructureExtractionPrompt,
} = require("./prompts/extraction-prompts");
const { generateEmbedding } = require("../rag/embeddings");

let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require("node-fetch");
}

const generateAdaptiveContent = async (req, res) => {
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
      fileIds = [],
      userId,
      documentId,
      topic,
      sectionTitle,
      learningStyle = "visual",
      difficulty = "intermediate",
      chunks = [],
    } = req.body;

    if (!userId || !documentId || !sectionTitle) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, documentId, sectionTitle",
      });
    }

    if (chunks.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: chunks (array of chunk objects with text and embedding)",
      });
    }

    // Step 1: Generate embedding for the topic query
    console.log("[Adaptive Content RAG] Generating embedding for topic:", topic);
    const topicEmbedding = await generateEmbedding(sectionTitle);
    console.log("[Adaptive Content RAG] Embedding generated, dimension:", topicEmbedding.length);

    // Step 2: Use chunks from request and find similar ones using cosine similarity
    console.log("[Adaptive Content RAG] Querying similar chunks from provided data...");
    const { cosineSimilarity } = require("../rag/embeddings");
    
    // Validate chunk embeddings match query embedding dimension
    if (chunks.length > 0 && chunks[0].embedding) {
      const chunkEmbeddingDim = chunks[0].embedding.length;
      console.log(`[Adaptive Content RAG] Query embedding dimension: ${topicEmbedding.length}`);
      console.log(`[Adaptive Content RAG] Chunk embedding dimension: ${chunkEmbeddingDim}`);
      
      if (chunkEmbeddingDim !== topicEmbedding.length) {
        console.warn("[Adaptive Content RAG] Embedding dimension mismatch - using first 1536 dimensions of chunks");
        // Truncate chunk embeddings to match query embedding dimension
        // This is acceptable for similarity search as the first dimensions contain most information
      }
    }
    
    const similarChunks = chunks
      .map((chunk) => {
        // Truncate chunk embedding to match query embedding dimension if needed
        const chunkEmbedding = chunk.embedding.slice(0, topicEmbedding.length);
        return {
          ...chunk,
          similarity: cosineSimilarity(topicEmbedding, chunkEmbedding),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      // .slice(0, 5); // Top 5 similar chunks

    console.log("[Adaptive Content RAG] Retrieved", similarChunks.length, "similar chunks");
    console.log("[Adaptive Content RAG] Top similarities:", similarChunks.map(c => c.similarity.toFixed(4)));

    // Step 3: Format context from retrieved chunks
    const context = similarChunks
      .map((chunk, idx) => `[Context ${idx + 1}] ${chunk.text}`)
      .join("\n\n");

    console.log("[Adaptive Content RAG] Context prepared, length:", context);

    // Step 4: Generate adaptive content using Claude
    const prompt = getPrompt({
      sectionTitle,
      learningStyle,
      difficulty,
      context,
    });

    console.log("[Adaptive Content RAG] Calling Claude API...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        temperature: 0.7,
        system: `You are an adaptive learning content generator. Create engaging educational content tailored to the student's learning style and difficulty level.`,
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
      console.error("[Adaptive Content RAG] Claude API Error:", error);
      clearTimeout(timeoutId);
      return res.status(response.status).json({
        success: false,
        message: "Failed to generate adaptive content",
        error: error.error?.message || error.message,
      });
    }

    const data = await response.json();
    const content = data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("[Adaptive Content RAG] Content generated successfully");

    clearTimeout(timeoutId);

    return res.status(200).json({
      success: true,
      data: {
        content,
        topic,
        learningStyle,
        difficulty,
        chunksUsed: similarChunks.length,
        topChunks: similarChunks.map(c => ({
          text: c.text.substring(0, 100) + "...",
          similarity: parseFloat(c.similarity.toFixed(4)),
        })),
        tokenUsage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      },
      message: "Adaptive content generated successfully",
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("[Adaptive Content RAG] Request timeout");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The content generation took too long",
      });
    }

    console.error("[Adaptive Content RAG] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate adaptive content",
      error: error.message,
    });
  }
};

const extractDocumentStructure = async (req, res) => {
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

    const { fileIds = [], userId, documentId, chunks = [] } = req.body;

    console.log("[Adaptive Content RAG] Extract structure request:", {
      fileIds,
      userId,
      documentId,
      chunksProvided: chunks.length,
    });

    if (!userId || !documentId) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, documentId",
      });
    }

    if (chunks.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: chunks (array of chunk objects)",
      });
    }

    // Extract structure from provided chunks
    console.log("[Adaptive Content RAG] Processing", chunks.length, "chunks for structure extraction");
    const structureText = chunks
      .map((chunk, idx) => `Section ${idx + 1}: ${chunk.text.substring(0, 200)}...`)
      .join("\n\n");

    const prompt = getDocumentStructureExtractionPrompt({
      documentStructure: structureText,
    });

    console.log("[Adaptive Content RAG] Calling Claude API for structure extraction...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        temperature: 0.3,
        system: `You are a document structure analyzer. Extract and organize the main topics, subtopics, and key concepts from the provided document structure.`,
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
      console.error("[Adaptive Content RAG] Claude API Error:", error);
      clearTimeout(timeoutId);
      return res.status(response.status).json({
        success: false,
        message: "Failed to extract document structure",
        error: error.error?.message || error.message,
      });
    }

    const data = await response.json();
    const structure = data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("[Adaptive Content RAG] Structure extracted successfully");

    clearTimeout(timeoutId);

    return res.status(200).json({
      success: true,
      data: {
        structure,
        totalChunks: chunks.length,
        tokenUsage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      },
      message: "Document structure extracted successfully",
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("[Adaptive Content RAG] Request timeout");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The extraction took too long",
      });
    }

    console.error("[Adaptive Content RAG] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract document structure",
      error: error.message,
    });
  }
};

/**
 * Chatbox API - Get responses based on query using RAG
 * Accepts same payload as generateAdaptiveContent
 * Returns conversational responses suitable for chatbox
 */
chatboxQuery = async (req, res) => {
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
      fileIds = [],
      userId,
      documentId,
      topic,
      sectionTitle,
      query,
      learningStyle = "visual",
      difficulty = "intermediate",
      chunks = [],
    } = req.body;

    console.log("[Adaptive Content RAG - Chatbox] Request:", {
      fileIds,
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

    // Step 1: Generate embedding for the query
    console.log("[Adaptive Content RAG - Chatbox] Generating embedding for query:", query);
    const queryEmbedding = await generateEmbedding(query);
    console.log("[Adaptive Content RAG - Chatbox] Embedding generated, dimension:", queryEmbedding.length);

    // Step 2: Find similar chunks using cosine similarity
    console.log("[Adaptive Content RAG - Chatbox] Querying similar chunks...");
    const { cosineSimilarity } = require("../rag/embeddings");

    const similarChunks = chunks
      .map((chunk) => {
        const chunkEmbedding = chunk.embedding.slice(0, queryEmbedding.length);
        return {
          ...chunk,
          similarity: cosineSimilarity(queryEmbedding, chunkEmbedding),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 similar chunks

    console.log("[Adaptive Content RAG - Chatbox] Retrieved", similarChunks.length, "similar chunks");

    // Step 3: Format context from retrieved chunks
    const context = similarChunks
      .map((chunk, idx) => `[Source ${idx + 1}] ${chunk.text}`)
      .join("\n\n");

      console.log(similarChunks,'similarChunks')

    // Step 4: Generate chatbox response using Claude
    const prompt = getChatboxPrompt({
      query,
      topic: topic || sectionTitle,
      learningStyle,
      difficulty,
      context,
    });

    console.log("[Adaptive Content RAG - Chatbox] Calling Claude API...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
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
      console.error("[Adaptive Content RAG - Chatbox] Claude API Error:", error);
      clearTimeout(timeoutId);
      return res.status(response.status).json({
        success: false,
        message: "Failed to generate chatbox response",
        error: error.error?.message || error.message,
      });
    }

    const data = await response.json();
    const message = data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("[Adaptive Content RAG - Chatbox] Response generated successfully");

    clearTimeout(timeoutId);

    return res.status(200).json({
      success: true,
      data: {
        message,
        query,
        topic: topic || sectionTitle,
        learningStyle,
        difficulty,
        sourcesUsed: similarChunks.length,
        sources: similarChunks.map(c => ({
          text: c.text.substring(0, 150) + "...",
          similarity: parseFloat(c.similarity.toFixed(4)),
        })),
        tokenUsage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      },
      message: "Chatbox response generated successfully",
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("[Adaptive Content RAG - Chatbox] Request timeout");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The response generation took too long",
      });
    }

    console.error("[Adaptive Content RAG - Chatbox] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate chatbox response",
      error: error.message,
    });
  }
}


module.exports = {
  generateAdaptiveContent,
  extractDocumentStructure,
  chatboxQuery,
};
