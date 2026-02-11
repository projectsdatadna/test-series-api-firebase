const functions = require('firebase-functions');
const express = require('express');
const corsMiddleware = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const adaptiveContentRoutes = require('./modules/adaptive-content/routes');
const questionPaperRoutes = require('./modules/question-paper/routes');
const generatePdfRoutes = require('./modules/generate-pdf/routes');

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

// Middleware
app.use(corsMiddleware);
app.use(express.json());
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

// API routes
app.use('/adaptive-content', adaptiveContentRoutes);
app.use('/question-paper', questionPaperRoutes);
app.use('/pdf', generatePdfRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler - serve index.html for SPA routing
app.use((req, res) => {
  // If it's an API route, return 404 JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/adaptive-content') || req.path.startsWith('/question-paper') || req.path.startsWith('/pdf')) {
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

