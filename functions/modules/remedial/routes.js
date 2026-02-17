const express = require('express');
const router = express.Router();

// Import controllers
const generateRemedialFlowchart = require('./controllers/generateRemedialFlowchart');
const generateTargetedQuiz = require('./controllers/generateTargetedQuiz');
const generateEducationalPuzzle = require('./controllers/generateEducationalPuzzle');
const generateInteractiveWorksheet = require('./controllers/generateInteractiveWorksheet');
const generateStepByStep = require('./controllers/generateStepByStep');
const generateSimplifiedExplanation = require('./controllers/generateSimplifiedExplanation');

// Define routes
router.post('/generate-remedial-flowchart', generateRemedialFlowchart);
router.post('/generate-targeted-quiz', generateTargetedQuiz);
router.post('/generate-educational-puzzle', generateEducationalPuzzle);
router.post('/generate-interactive-worksheet', generateInteractiveWorksheet);
router.post('/generate-step-by-step', generateStepByStep);
router.post('/generate-simplified-explanation', generateSimplifiedExplanation);

module.exports = router;
