/**
 * Azure OpenAI Embeddings Service
 * Generates vector embeddings for text chunks using Azure OpenAI
 * Uses REST API directly instead of SDK
 */

const ragConfig = require('./config');

let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require("node-fetch");
}

/**
 * Generate embeddings for a single text using Azure OpenAI REST API
 * @param {string} text - Text to embed
 * @param {string} deploymentType - 'query' (default) or 'chunk' for different deployments
 * @returns {Promise<number[]>} Vector embedding
 */
async function generateEmbedding(text, deploymentType = 'query') {
  try {
    const config = deploymentType === 'chunk' ? ragConfig.azureChunk : ragConfig.azure;
    const { apiKey, endpoint, deploymentName, apiVersion } = config;

    if (!apiKey || !endpoint) {
      throw new Error('Azure OpenAI API key and endpoint are required');
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`;
    console.log('[RAG] Request URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[RAG] Azure API error:', response.status, error);
      console.error('[RAG] Check that deployment name exists in Azure OpenAI: https://portal.azure.com');
      throw new Error(`Azure OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embeddings returned from Azure OpenAI');
    }

    console.log('[RAG] Embedding generated, dimension:', data.data[0].embedding.length);
    return data.data[0].embedding;
  } catch (error) {
    console.error('[RAG] Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts
 * @param {string[]} texts - Array of texts to embed
 * @param {string} deploymentType - 'query' (default) or 'chunk' for different deployments
 * @returns {Promise<number[][]>} Array of vector embeddings
 */
async function generateEmbeddings(texts, deploymentType = 'query') {
  try {
    const config = deploymentType === 'chunk' ? ragConfig.azureChunk : ragConfig.azure;
    const { apiKey, endpoint, deploymentName, apiVersion } = config;

    if (!apiKey || !endpoint) {
      throw new Error('Azure OpenAI API key and endpoint are required');
    }

    console.log('[RAG] Generating embeddings for', texts.length, 'texts');
    console.log('[RAG] Using deployment type:', deploymentType);
    console.log('[RAG] Using deployment:', deploymentName);
    console.log('[RAG] Using endpoint:', endpoint);

    const url = `${endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`;
    console.log('[RAG] Request URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[RAG] Azure API error:', response.status, error);
      console.error('[RAG] Check that deployment name exists in Azure OpenAI: https://portal.azure.com');
      throw new Error(`Azure OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embeddings returned from Azure OpenAI');
    }

    console.log('[RAG] Generated', data.data.length, 'embeddings');
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error('[RAG] Error generating embeddings:', error.message);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
};
