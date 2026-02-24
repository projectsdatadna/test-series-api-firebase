/**
 * DynamoDB Vector Store
 * Stores and retrieves vector embeddings from DynamoDB
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const ragConfig = require('./config');

const client = new DynamoDBClient({
  region: ragConfig.dynamodb.region,
});

const dynamodb = DynamoDBDocumentClient.from(client);

/**
 * Store vector data for a document
 * @param {string} documentId - Document ID
 * @param {Array<{text: string, embedding: number[], section: string, chunkIndex: number}>} vectorData - Vector data to store
 * @returns {Promise<void>}
 */
async function storeVectorData(documentId, vectorData) {
  try {
    if (!documentId || !vectorData || vectorData.length === 0) {
      throw new Error('Document ID and vector data are required');
    }

    const params = {
      TableName: ragConfig.dynamodb.tableName,
      Key: { id: documentId },
      UpdateExpression: `SET ${ragConfig.dynamodb.vectorColumnName} = :vectorData, updatedAt = :timestamp`,
      ExpressionAttributeValues: {
        ':vectorData': vectorData,
        ':timestamp': new Date().toISOString(),
      },
    };

    await dynamodb.send(new UpdateCommand(params));

    console.log(`[RAG] Stored ${vectorData.length} vector chunks for document: ${documentId}`);
  } catch (error) {
    console.error('[RAG] Error storing vector data:', error.message);
    throw error;
  }
}

/**
 * Retrieve vector data for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} Vector data
 */
async function getVectorData(documentId) {
  try {
    const params = {
      TableName: ragConfig.dynamodb.tableName,
      Key: { id: documentId },
    };

    const result = await dynamodb.send(new GetCommand(params));

    if (!result.Item) {
      console.warn(`[RAG] No vector data found for document: ${documentId}`);
      return [];
    }

    return result.Item[ragConfig.dynamodb.vectorColumnName] || [];
  } catch (error) {
    console.error('[RAG] Error retrieving vector data:', error.message);
    throw error;
  }
}

/**
 * Search for similar vectors
 * @param {number[]} queryVector - Query vector
 * @param {Array<{text: string, embedding: number[]}>} vectorData - Vector data to search
 * @param {number} topK - Number of top results to return
 * @param {number} threshold - Similarity threshold
 * @returns {Array<{text: string, similarity: number, section: string}>} Similar results
 */
function searchSimilarVectors(queryVector, vectorData, topK = 5, threshold = null) {
  const { cosineSimilarity } = require('./embeddings');
  const similarityThreshold = threshold || ragConfig.vector.similarityThreshold;

  const results = vectorData
    .map(item => ({
      text: item.text,
      section: item.section,
      chunkIndex: item.chunkIndex,
      similarity: cosineSimilarity(queryVector, item.embedding),
    }))
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  console.log(`[RAG] Found ${results.length} similar vectors (threshold: ${similarityThreshold})`);

  return results;
}

/**
 * Update document with new vector data
 * @param {string} documentId - Document ID
 * @param {Array<{text: string, embedding: number[], section: string, chunkIndex: number}>} vectorData - New vector data
 * @param {Object} metadata - Additional metadata to store
 * @returns {Promise<void>}
 */
async function updateDocumentVectors(documentId, vectorData, metadata = {}) {
  try {
    const params = {
      TableName: ragConfig.dynamodb.tableName,
      Key: { id: documentId },
      UpdateExpression: `SET ${ragConfig.dynamodb.vectorColumnName} = :vectorData, #meta = :metadata, updatedAt = :timestamp`,
      ExpressionAttributeNames: {
        '#meta': 'metadata',
      },
      ExpressionAttributeValues: {
        ':vectorData': vectorData,
        ':metadata': {
          ...metadata,
          vectorCount: vectorData.length,
          lastUpdated: new Date().toISOString(),
        },
        ':timestamp': new Date().toISOString(),
      },
    };

    await dynamodb.send(new UpdateCommand(params));

    console.log(`[RAG] Updated ${vectorData.length} vectors for document: ${documentId}`);
  } catch (error) {
    console.error('[RAG] Error updating document vectors:', error.message);
    throw error;
  }
}

/**
 * Delete vector data for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
async function deleteVectorData(documentId) {
  try {
    const params = {
      TableName: ragConfig.dynamodb.tableName,
      Key: { id: documentId },
      UpdateExpression: `REMOVE ${ragConfig.dynamodb.vectorColumnName}`,
    };

    await dynamodb.send(new UpdateCommand(params));

    console.log(`[RAG] Deleted vector data for document: ${documentId}`);
  } catch (error) {
    console.error('[RAG] Error deleting vector data:', error.message);
    throw error;
  }
}

module.exports = {
  storeVectorData,
  getVectorData,
  searchSimilarVectors,
  updateDocumentVectors,
  deleteVectorData,
};
