const express = require("express");
const { generateAdaptiveContent, extractDocumentStructure, chatboxQuery } = require("./controller");

const router = express.Router();

/**
 * POST /adaptive-content-rag/generate
 * Generate adaptive content based on topic and learning style
 * Uses RAG with DynamoDB-stored embeddings
 */
router.post("/generate", generateAdaptiveContent);

/**
 * POST /adaptive-content-rag/extract-structure
 * Extract document structure from stored chunks
 */
router.post("/extract-structure", extractDocumentStructure);

/**
 * POST /adaptive-content-rag/chatbox
 * Get chatbox responses based on query
 * Uses same payload as generate endpoint
 * Returns conversational responses suitable for chatbox
 */
router.post("/chatbox", chatboxQuery);

module.exports = router;
