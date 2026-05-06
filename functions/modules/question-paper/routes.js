const express = require("express");
const { generateQuestionPaper } = require("./controller");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { questionImgGenerate } = require("./questionImgGenerate");

const router = express.Router();

// JWT verification middleware for Express
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
        message: "Please provide a valid Bearer token in Authorization header",
      });
    }

    const token = authHeader.substring(7);

    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: "access",
      clientId: process.env.CLIENT_ID,
    });

    const payload = await verifier.verify(token);

    // Add user info to request
    req.user = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      clientId: payload.client_id,
    };

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        message: "Your access token has expired. Please sign in again.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid token",
      message: "The provided token is invalid or verification failed.",
      details: error.message,
    });
  }
};

// Handle OPTIONS preflight requests
router.options("/generate", (req, res) => {
  res.sendStatus(200);
});

router.post("/generate", verifyJWT, generateQuestionPaper);

router.post('/generateQuestionImg', questionImgGenerate);

module.exports = router;
