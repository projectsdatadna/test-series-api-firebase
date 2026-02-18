const cors = require("cors");

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS request from origin:", origin);
    // Allow all origins including undefined (for same-origin requests)
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "anthropic-version", "anthropic-beta"],
  exposedHeaders: ["Content-Type", "Content-Disposition", "Content-Length"],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
