const express = require('express');
const router = express.Router();

// Import controllers
const generateRemedialFlowchart = require('./controllers/generateRemedialFlowchart');
const generateTargetedQuiz = require('./controllers/generateTargetedQuiz');
const generateEducationalPuzzle = require('./controllers/generateEducationalPuzzle');
const generateInteractiveWorksheet = require('./controllers/generateInteractiveWorksheet');
const generateStepByStep = require('./controllers/generateStepByStep');
const generateSimplifiedExplanation = require('./controllers/generateSimplifiedExplanation');

const generateSimplifiedExplanationNew = require('./controllers/generateSimplifiedExplanationNew');
const generateStepByStepNew = require("./controllers/generateStepByStepNew");
const generateRemedialFlowchartNew = require("./controllers/generateRemedialFlowchartNew");
const generateTargetedQuizNew = require("./controllers/generateTargetedQuizNew");
const generateInteractiveWorksheetNew = require("./controllers/generateInteractiveWorksheetNew");
const generateEducationalPuzzleNew = require("./controllers/generateEducationalPuzzleNew");

// Define routes
router.post('/generate-remedial-flowchart', generateRemedialFlowchartNew);
router.post('/generate-targeted-quiz', generateTargetedQuizNew);
router.post('/generate-educational-puzzle', generateEducationalPuzzleNew);
router.post('/generate-interactive-worksheet', generateInteractiveWorksheetNew);
router.post('/generate-step-by-step', generateStepByStepNew);
router.post('/generate-simplified-explanation', generateSimplifiedExplanationNew);

module.exports = router;
