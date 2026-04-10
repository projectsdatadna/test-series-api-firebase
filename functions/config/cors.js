const cors = require("cors");

const allowedOrigins = [
  "http://localhost:3000",
  "http://edufit-ui.s3-website-us-east-1.amazonaws.com/"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

module.exports = cors(corsOptions);
