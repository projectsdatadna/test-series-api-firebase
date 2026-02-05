const functions = require('firebase-functions');
const express = require('express');
const corsMiddleware = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const adaptiveContentRoutes = require('./modules/adaptive-content/routes');
const questionPaperRoutes = require('./modules/question-paper/routes');

// Load environment variables from .env.local only in local development
// In Firebase Cloud Functions, environment variables come from firebase.json automatically
const isLocalDev = !process.env.FUNCTION_NAME; // FUNCTION_NAME is set by Firebase
if (isLocalDev) {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
}

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase (config is loaded in modules)
require('./config/firebase');

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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

exports.api = functions
  .runWith({
    timeoutSeconds: 540,      // 9 minutes (max for Gen 1)
    memory: '2GB',            // Increase memory allocation
    maxInstances: 10          // Optional: limit concurrent instances
  })
  .https.onRequest(app);

