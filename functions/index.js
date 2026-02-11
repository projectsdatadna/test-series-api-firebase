const functions = require('firebase-functions');
const express = require('express');
const corsMiddleware = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const adaptiveContentRoutes = require('./modules/adaptive-content/routes');

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

// API routes
app.use('/adaptive-content', adaptiveContentRoutes);

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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

exports.api = functions
  .runWith({
    timeoutSeconds: 540,      // 9 minutes (max for Gen 1)
    memory: '2GB',            // Increase memory allocation
    maxInstances: 10          // Optional: limit concurrent instances
  })
  .https.onRequest(app);
