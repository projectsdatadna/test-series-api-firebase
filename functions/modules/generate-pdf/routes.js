const express = require('express');
const { generatePDF } = require('./controller');
const { verifyJWT } = require('../../middleware/jwtMiddleware');

const router = express.Router();

router.post('/generate-pdf', verifyJWT, generatePDF);

router.post('/generate-pdf/public', generatePDF);

module.exports = router;
