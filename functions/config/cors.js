const cors = require("cors");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from localhost, Postman, and configured origins
    const allowedOrigins = [
      "http://localhost:3000",
      "http://test-series-ui.s3-website-us-east-1.amazonaws.com",
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // For development, allow all origins. Restrict in production.
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = cors(corsOptions);
