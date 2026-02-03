const cors = require("cors");

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS request from origin:", origin);
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
