const functions = require('firebase-functions');
const express = require('express');
const corsMiddleware = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const adaptiveContentRoutes = require('./modules/adaptive-content/routes');
const questionPaperRoutes = require('./modules/question-paper/routes');
const generatePdfRoutes = require('./modules/generate-pdf/routes');
const remedialRoutes = require("./modules/remedial/routes");
const ragRoutes = require('./modules/rag/routes');
const bookUploadRoutes = require('./modules/book-upload/routes');

// Load environment variables from .env.local only in local development
// In Firebase Cloud Functions, environment variables come from firebase.json automatically
const isLocalDev = !process.env.FUNCTION_NAME; // FUNCTION_NAME is set by Firebase
if (isLocalDev) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch (e) {
    console.warn('Warning: Could not load .env.local, using firebase.json environment variables');
  }
}

const app = express();
const path = require('path');

// Set request timeout for large file uploads
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  next();
});

// Middleware
// app.use(corsMiddleware);
app.use(require("cors")());

// Custom middleware to handle both JSON and multipart requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Skip JSON parsing for multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    console.log('[Express] Skipping JSON parsing for multipart request');
    return next();
  }
  
  // Parse JSON for other requests
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

// Initialize Firebase (config is loaded in modules)
require('./config/firebase');

// Serve static files from public directory (if UI is built there)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Express Firebase App is running' });
});

// Debug endpoint to check environment variables
app.get('/debug/env', (req, res) => {
  res.json({
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID_LOADED: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY_LOADED: !!process.env.AWS_SECRET_ACCESS_KEY,
    CLAUDE_API_KEY_LOADED: !!process.env.CLAUDE_API_KEY,
    USER_POOL_ID: process.env.USER_POOL_ID,
    CLIENT_ID: process.env.CLIENT_ID,
  });
});

// Debug endpoint to test Azure OpenAI connection
app.get('/debug/azure-openai', async (req, res) => {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Azure OpenAI endpoint or API key not configured',
      });
    }

    console.log('[Debug] Testing Azure OpenAI connection...');
    console.log('[Debug] Endpoint:', endpoint);
    console.log('[Debug] Deployment:', deploymentName);

    // Try a simple embedding request to verify deployment exists
    const url = `${endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=2024-02-15-preview`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'test',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: 'Azure OpenAI connection successful',
        deployment: deploymentName,
        embeddingDimension: data.data[0].embedding.length,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: 'Azure OpenAI error',
        error: data.error,
        deployment: deploymentName,
        hint: 'Check that the deployment name exists in your Azure OpenAI resource',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing Azure OpenAI',
      error: error.message,
    });
  }
});

// API routes
app.use('/adaptive-content', adaptiveContentRoutes);
app.use('/question-paper', questionPaperRoutes);
app.use('/pdf', generatePdfRoutes);
app.use('/remedial', remedialRoutes);
app.use('/rag', ragRoutes);
app.use('/book-upload', bookUploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler - serve index.html for SPA routing
app.use((req, res) => {
  // If it's an API route, return 404 JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/adaptive-content') || req.path.startsWith('/question-paper') || req.path.startsWith('/pdf') || req.path.startsWith('/rag') || req.path.startsWith('/book-upload') || req.path.startsWith('/remedial')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  // Otherwise serve index.html for SPA
  res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

exports.api = functions
  .runWith({
    timeoutSeconds: 540,      // 9 minutes (max for Gen 1)
    memory: '2GB',            // Increase memory allocation
    maxInstances: 10          // Optional: limit concurrent instances
  })
  .https.onRequest(app);
