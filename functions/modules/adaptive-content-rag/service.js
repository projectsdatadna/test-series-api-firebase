/**
 * Adaptive Content RAG Service
 * Handles DynamoDB operations for storing and retrieving document chunks with embeddings
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { cosineSimilarity } = require("../rag/embeddings");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DOCUMENT_CHUNKS_TABLE || "DocumentChunks";

/**
 * Store document chunks with embeddings in DynamoDB
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID
 * @param {Array} chunks - Array of chunks with text and embedding
 */
async function storeChunks(documentId, userId, chunks) {
  try {
    console.log(`[Service] Storing ${chunks.length} chunks for document: ${documentId}`);

    const promises = chunks.map((chunk, index) => {
      const chunkId = `${documentId}_chunk_${index}`;

      return docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            documentId,
            chunkId,
            userId,
            text: chunk.text,
            embedding: chunk.embedding,
            embeddingMagnitude: calculateMagnitude(chunk.embedding),
            section: chunk.section || "default",
            chunkIndex: index,
            createdAt: Date.now(),
          },
        })
      );
    });

    await Promise.all(promises);
    console.log(`[Service] ✅ Successfully stored ${chunks.length} chunks`);
    return { success: true, chunksStored: chunks.length };
  } catch (error) {
    console.error("[Service] Error storing chunks:", error.message);
    throw error;
  }
}

/**
 * Retrieve all chunks for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} Array of chunks
 */
async function retrieveChunksByDocument(documentId) {
  try {
    console.log(`[Service] Retrieving chunks for document: ${documentId}`);

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "documentId = :docId",
        ExpressionAttributeValues: {
          ":docId": documentId,
        },
      })
    );

    console.log(`[Service] Retrieved ${result.Items?.length || 0} chunks`);
    return result.Items || [];
  } catch (error) {
    console.error("[Service] Error retrieving chunks:", error.message);
    throw error;
  }
}

/**
 * Query chunks by similarity using cosine similarity
 * @param {string} documentId - Document ID
 * @param {Array} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of top results to return
 * @param {number} threshold - Similarity threshold (optional)
 * @returns {Promise<Array>} Top K similar chunks
 */
async function queryChunksBySimilarity(documentId, queryEmbedding, topK = 5, threshold = 0.5) {
  try {
    console.log(`[Service] Querying similar chunks for document: ${documentId}`);
    console.log(`[Service] Query embedding dimension: ${queryEmbedding.length}`);

    // Step 1: Retrieve all chunks for the document
    const chunks = await retrieveChunksByDocument(documentId);

    if (chunks.length === 0) {
      console.warn(`[Service] No chunks found for document: ${documentId}`);
      return [];
    }

    console.log(`[Service] Comparing ${chunks.length} chunks...`);

    // Step 2: Calculate cosine similarity for each chunk
    const scoredChunks = chunks
      .map((chunk) => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return {
          ...chunk,
          score,
        };
      })
      .filter((chunk) => chunk.score >= threshold) // Filter by threshold
      .sort((a, b) => b.score - a.score); // Sort by score descending

    console.log(`[Service] Found ${scoredChunks.length} chunks above threshold ${threshold}`);

    // Step 3: Return top K results
    const topResults = scoredChunks.slice(0, topK);

    console.log(`[Service] Returning top ${topResults.length} results`);
    console.log(
      "[Service] Top scores:",
      topResults.map((c) => c.score.toFixed(4))
    );

    return topResults;
  } catch (error) {
    console.error("[Service] Error querying similar chunks:", error.message);
    throw error;
  }
}

/**
 * Query chunks by userId (for multi-user scenarios)
 * @param {string} userId - User ID
 * @param {Array} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of top results
 * @returns {Promise<Array>} Top K similar chunks for user
 */
async function queryChunksByUser(userId, queryEmbedding, topK = 5) {
  try {
    console.log(`[Service] Querying chunks for user: ${userId}`);

    // Note: This requires a GSI on userId
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const chunks = result.Items || [];
    console.log(`[Service] Retrieved ${chunks.length} chunks for user`);

    // Calculate similarity and sort
    const scoredChunks = chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scoredChunks;
  } catch (error) {
    console.error("[Service] Error querying chunks by user:", error.message);
    throw error;
  }
}

/**
 * Calculate embedding magnitude for optimization
 * @param {Array} embedding - Embedding vector
 * @returns {number} Magnitude of the vector
 */
function calculateMagnitude(embedding) {
  let sum = 0;
  for (let i = 0; i < embedding.length; i++) {
    sum += embedding[i] * embedding[i];
  }
  return Math.sqrt(sum);
}

/**
 * Pre-filter chunks by magnitude before full cosine similarity
 * Optimization: Chunks with very different magnitudes are unlikely to be similar
 * @param {string} documentId - Document ID
 * @param {Array} queryEmbedding - Query embedding
 * @param {number} magnitudeThreshold - Magnitude difference threshold
 * @returns {Promise<Array>} Pre-filtered chunks
 */
async function preFilterByMagnitude(documentId, queryEmbedding, magnitudeThreshold = 0.3) {
  try {
    console.log(`[Service] Pre-filtering chunks by magnitude...`);

    const chunks = await retrieveChunksByDocument(documentId);
    const queryMagnitude = calculateMagnitude(queryEmbedding);

    const filtered = chunks.filter((chunk) => {
      const magnitudeDiff = Math.abs(chunk.embeddingMagnitude - queryMagnitude);
      const magnitudeRatio = magnitudeDiff / queryMagnitude;
      return magnitudeRatio <= magnitudeThreshold;
    });

    console.log(
      `[Service] Pre-filter reduced ${chunks.length} chunks to ${filtered.length}`
    );
    return filtered;
  } catch (error) {
    console.error("[Service] Error pre-filtering by magnitude:", error.message);
    throw error;
  }
}

/**
 * Optimized query with magnitude pre-filtering
 * @param {string} documentId - Document ID
 * @param {Array} queryEmbedding - Query embedding
 * @param {number} topK - Number of results
 * @returns {Promise<Array>} Top K similar chunks
 */
async function queryChunksOptimized(documentId, queryEmbedding, topK = 5) {
  try {
    console.log(`[Service] Running optimized query...`);

    // Step 1: Pre-filter by magnitude
    const preFiltered = await preFilterByMagnitude(documentId, queryEmbedding);

    // Step 2: Calculate similarity only for pre-filtered chunks
    const scoredChunks = preFiltered
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[Service] Optimized query returned ${scoredChunks.length} results`);
    return scoredChunks;
  } catch (error) {
    console.error("[Service] Error in optimized query:", error.message);
    throw error;
  }
}

module.exports = {
  storeChunks,
  retrieveChunksByDocument,
  queryChunksBySimilarity,
  queryChunksByUser,
  queryChunksOptimized,
  calculateMagnitude,
  preFilterByMagnitude,
};
