require('dotenv').config();
const { CognitoJwtVerifier } = require('aws-jwt-verify');

let verifier = null;

// Create verifier instance lazily
function getVerifier() {
  if (verifier) return verifier;

  const USER_POOL_ID = process.env.USER_POOL_ID;
  const CLIENT_ID = process.env.CLIENT_ID;

  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error('USER_POOL_ID and CLIENT_ID environment variables are required');
  }

  verifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'access',
    clientId: CLIENT_ID,
  });

  return verifier;
}

// Express middleware for JWT verification
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in Authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      const verifierInstance = getVerifier();
      const payload = await verifierInstance.verify(token);

      // Add user info to request
      req.user = {
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        clientId: payload.client_id,
      };

      next();
    } catch (verifyError) {
      console.error('JWT Verification Error:', verifyError.message);

      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your access token has expired. Please sign in again.',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or verification failed.',
        details: verifyError.message,
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

module.exports = verifyJWT;
