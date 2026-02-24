/**
 * RAG Configuration
 * Azure OpenAI and DynamoDB settings for vector embeddings
 */

try { require('dotenv').config(); } catch (e) { /* .env not found */ }

const ragConfig = {
  // Azure OpenAI Configuration
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-3-small',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  },

  // Separate deployment for chunk generation (optional, defaults to main deployment)
  azureChunk: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_CHUNK_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-3-small',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  },

  // Text Splitter Configuration
  textSplitter: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
  },

  // DynamoDB Configuration
  dynamodb: {
    region: process.env.AWS_REGION || 'ap-south-1',
    tableName: process.env.DYNAMODB_TABLE_NAME || 'documents',
    vectorColumnName: 'vectorData',
    sectionsColumnName: 'sections',
  },

  // Vector Configuration
  vector: {
    dimension: 1536, // For text-embedding-3-small
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
  },
};

module.exports = ragConfig;
