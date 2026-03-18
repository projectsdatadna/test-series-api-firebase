// MCQ Questions Prompt
function getMCQPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} MCQ questions (${marks} marks each, ${difficultyLevel} difficulty):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","options":["","","",""],"answer":"","option":"","marks":${marks}}`).join(',')}]

CRITICAL: For each question, provide:
1. question: The MCQ question text
2. options: Array of exactly 4 options (A, B, C, D)
3. answer: The full text of the correct answer option
4. option: The correct option letter (A, B, C, or D)
5. marks: ${marks}

Example:
{"questionNumber":1,"question":"What is the capital of India?","options":["New Delhi","Mumbai","Bangalore","Chennai"],"answer":"New Delhi","option":"A","marks":${marks}}

You MUST generate all ${count} questions. Do not stop early. Fill in all fields completely.`;
}

// Short Answer Questions Prompt
function getShortAnswerPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} SHORT ANSWER QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty). DO NOT TRUNCATE. GENERATE ALL ${count} QUESTIONS:
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Do not stop early. Fill in all question and answer fields completely.`;
}

// Fill in the Blanks Prompt
function getFillUpsPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Fill in the Blanks questions (${marks} marks each, ${difficultyLevel} difficulty):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]`;
}

// Long Answer Prompt
function getLongAnswerPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Long Answer questions (${marks} marks each, ${difficultyLevel} difficulty):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]`;
}

// Match the Following Prompt
function getMatchPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  // Generate columnA items dynamically
  const columnAItems = Array.from({length: count}, (_, i) => `{"id":"${i+1}","text":""}`).join(',');
  // Generate columnB items dynamically
  const columnBItems = Array.from({length: count}, (_, i) => `{"id":"${String.fromCharCode(97+i)}","text":""}`).join(',');
  // Generate answers array dynamically
  const answersItems = Array.from({length: count}, (_, i) => `{"columnAId":"${i+1}","columnBId":""}`).join(',');
  
  return `GENERATE EXACTLY 1 MATCH THE FOLLOWING QUESTION with ${count} field sets (${marks} marks, ${difficultyLevel} difficulty).
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.

RETURN ONLY THIS JSON STRUCTURE (no other text, no markdown):
[{
  "questionNumber": 1,
  "columnA": [${columnAItems}],
  "columnB": [${columnBItems}],
  "answers": [${answersItems}]
}]

CRITICAL REQUIREMENTS:
- Return ONLY a JSON array with exactly 1 question object
- The question MUST have: questionNumber (value: 1), columnA, columnB, answers
- columnA: Array of ${count} objects with id (numeric string: "1", "2", "3"...) and text
- columnB: Array of ${count} objects with id (alphabetic string: "a", "b", "c"...) and text
- answers: Array of ${count} objects with columnAId and columnBId pairs
- DO NOT include "question" or "answer" fields
- DO NOT generate multiple questions
- Fill text fields with relevant content from the document`;
}

// True or False Prompt
function getTrueOrFalsePrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} True or False questions (${marks} marks each, ${difficultyLevel} difficulty):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"statement":"","answer":"","marks":${marks}}`).join(',')}]`;
}

// Essay Prompt
function getEssayPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Essay questions (${marks} marks each, ${difficultyLevel} difficulty):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]`;
}



// Internal Choice Questions Prompt
function getInternalChoicePrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Internal Choice questions (${marks} marks each, ${difficultyLevel} difficulty). Each question has two long questions labeled (a) and (b). Students answer either (a) or (b):
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"questionA":"","questionB":"","answerA":"","answerB":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions with both (a) and (b) options. Do not stop early. Fill in all question and answer fields completely.`;
}

// Main prompt for exam details and sections
function getExamDetailsPrompt(params) {
  const {
    duration,
    difficultyLevel = "medium",
    subject = "",
    mcq,
    shortAnswer,
    fillups,
    longans,
    match,
    trueorfalse,
    essay,
    internalChoice,
    veryShortAnswer,
    assertionReason,
    caseStudy,
    diagramBased,
    mapBased,
    dataInterpretation,
    differentiate,
    sequencing,
    geometry,
  } = params;

  let totalQuestions = 0;
  let totalMarks = 0;
  const sections = [];

  // MCQ Section
  if (mcq) {
    const mcqMandatory = mcq.compulsory || mcq.count;
    totalQuestions += mcq.count;
    totalMarks += mcqMandatory * mcq.marks;
    sections.push({
      sectionName: "MCQ",
      totalQuestions: mcq.count,
      marksPerQuestion: mcq.marks,
      totalMarks: mcqMandatory * mcq.marks,
      note: mcq.compulsory ? `Answer any ${mcq.compulsory}` : "Answer all",
    });
  }

  // Short Answer Section
  if (shortAnswer) {
    const shortMandatory = shortAnswer.compulsory || shortAnswer.count;
    totalQuestions += shortAnswer.count;
    totalMarks += shortMandatory * shortAnswer.marks;
    sections.push({
      sectionName: "Short Answer",
      totalQuestions: shortAnswer.count,
      marksPerQuestion: shortAnswer.marks,
      totalMarks: shortMandatory * shortAnswer.marks,
      note: shortAnswer.compulsory ? `Answer any ${shortAnswer.compulsory}` : "Answer all",
    });
  }

  // Fill ups Section
  if (fillups) {
    const fillupsMandatory = fillups.compulsory || fillups.count;
    totalQuestions += fillups.count;
    totalMarks += fillupsMandatory * fillups.marks;
    sections.push({
      sectionName: "Fill ups",
      totalQuestions: fillups.count,
      marksPerQuestion: fillups.marks,
      totalMarks: fillupsMandatory * fillups.marks,
      note: fillups.compulsory ? `Answer any ${fillups.compulsory}` : "Answer all",
    });
  }

  // Long Answer Section
  if (longans) {
    const longMandatory = longans.compulsory || longans.count;
    totalQuestions += longans.count;
    totalMarks += longMandatory * longans.marks;
    sections.push({
      sectionName: "Long Answer",
      totalQuestions: longans.count,
      marksPerQuestion: longans.marks,
      totalMarks: longMandatory * longans.marks,
      note: longans.compulsory ? `Answer any ${longans.compulsory}` : "Answer all",
    });
  }

  // Match the Following Section
  if (match) {
    const matchMandatory = match.compulsory || match.count;
    totalQuestions += 1;
    totalMarks += matchMandatory * match.marks;
    sections.push({
      sectionName: "Match the Following",
      totalQuestions: 1,
      fieldSets: match.count,
      marksPerQuestion: match.marks,
      totalMarks: matchMandatory * match.marks,
      note: match.compulsory ? `Answer any ${match.compulsory}` : "Answer all",
    });
  }

  // True or False Section
  if (trueorfalse) {
    const trueMandatory = trueorfalse.compulsory || trueorfalse.count;
    totalQuestions += trueorfalse.count;
    totalMarks += trueMandatory * trueorfalse.marks;
    sections.push({
      sectionName: "True or False",
      totalQuestions: trueorfalse.count,
      marksPerQuestion: trueorfalse.marks,
      totalMarks: trueMandatory * trueorfalse.marks,
      note: trueorfalse.compulsory ? `Answer any ${trueorfalse.compulsory}` : "Answer all",
    });
  }

  // Essay Section
  if (essay) {
    const essayMandatory = essay.compulsory || essay.count;
    totalQuestions += essay.count;
    totalMarks += essayMandatory * essay.marks;
    sections.push({
      sectionName: "Essay",
      totalQuestions: essay.count,
      marksPerQuestion: essay.marks,
      totalMarks: essayMandatory * essay.marks,
      note: essay.compulsory ? `Answer any ${essay.compulsory}` : "Answer all",
    });
  }

  // Internal Choice Section
  if (internalChoice) {
    const internalChoiceMandatory = internalChoice.compulsory || internalChoice.count;
    totalQuestions += internalChoice.count;
    totalMarks += internalChoiceMandatory * internalChoice.marks;
    sections.push({
      sectionName: "Internal Choice",
      totalQuestions: internalChoice.count,
      marksPerQuestion: internalChoice.marks,
      totalMarks: internalChoiceMandatory * internalChoice.marks,
      note: `Answer either (a) or (b)${internalChoice.compulsory ? ` - Answer any ${internalChoice.compulsory}` : ""}`,
    });
  }

  // Very Short Answer Section
  if (veryShortAnswer) {
    const veryShortMandatory = veryShortAnswer.compulsory || veryShortAnswer.count;
    totalQuestions += veryShortAnswer.count;
    totalMarks += veryShortMandatory * veryShortAnswer.marks;
    sections.push({
      sectionName: "Very Short Answer",
      totalQuestions: veryShortAnswer.count,
      marksPerQuestion: veryShortAnswer.marks,
      totalMarks: veryShortMandatory * veryShortAnswer.marks,
      note: veryShortAnswer.compulsory ? `Answer any ${veryShortAnswer.compulsory}` : "Answer all",
    });
  }

  // Assertion & Reason Section
  if (assertionReason) {
    const assertionMandatory = assertionReason.compulsory || assertionReason.count;
    totalQuestions += assertionReason.count;
    totalMarks += assertionMandatory * assertionReason.marks;
    sections.push({
      sectionName: "Assertion & Reason",
      totalQuestions: assertionReason.count,
      marksPerQuestion: assertionReason.marks,
      totalMarks: assertionMandatory * assertionReason.marks,
      note: assertionReason.compulsory ? `Answer any ${assertionReason.compulsory}` : "Answer all",
    });
  }

  // Case Study Section
  if (caseStudy) {
    const caseStudyMandatory = caseStudy.compulsory || 1;
    totalQuestions += 1;
    totalMarks += caseStudyMandatory * caseStudy.marks;
    sections.push({
      sectionName: "Case Study",
      totalQuestions: 1,
      subQuestions: 4,
      marksPerQuestion: caseStudy.marks,
      totalMarks: caseStudyMandatory * caseStudy.marks,
      note: caseStudy.compulsory ? `Answer any ${caseStudy.compulsory}` : "Answer all",
    });
  }

  // Diagram Based Section
  if (diagramBased) {
    const diagramMandatory = diagramBased.compulsory || diagramBased.count;
    totalQuestions += diagramBased.count;
    totalMarks += diagramMandatory * diagramBased.marks;
    sections.push({
      sectionName: "Answer the following questions from the diagram",
      totalQuestions: diagramBased.count,
      marksPerQuestion: diagramBased.marks,
      totalMarks: diagramMandatory * diagramBased.marks,
      note: diagramBased.compulsory ? `Answer any ${diagramBased.compulsory}` : "Answer all",
    });
  }

  // Map Based Section
  if (mapBased) {
    const mapMandatory = mapBased.compulsory || mapBased.count;
    totalQuestions += mapBased.count;
    totalMarks += mapMandatory * mapBased.marks;
    sections.push({
      sectionName: "Answer the following questions from the map",
      totalQuestions: mapBased.count,
      marksPerQuestion: mapBased.marks,
      totalMarks: mapMandatory * mapBased.marks,
      note: mapBased.compulsory ? `Answer any ${mapBased.compulsory}` : "Answer all",
    });
  }

  // Data Interpretation Section
  if (dataInterpretation) {
    const dataMandatory = dataInterpretation.compulsory || 1;
    totalQuestions += 1;
    totalMarks += dataMandatory * dataInterpretation.marks;
    sections.push({
      sectionName: "Answer the following questions from the data",
      totalQuestions: 1,
      subQuestions: 4,
      marksPerQuestion: dataInterpretation.marks,
      totalMarks: dataMandatory * dataInterpretation.marks,
      note: dataInterpretation.compulsory ? `Answer any ${dataInterpretation.compulsory}` : "Answer all",
    });
  }

  // Differentiate Between Section
  if (differentiate) {
    const differentiateMandatory = differentiate.compulsory || differentiate.count;
    totalQuestions += differentiate.count;
    totalMarks += differentiateMandatory * differentiate.marks;
    sections.push({
      sectionName: "Differentiate Between",
      totalQuestions: differentiate.count,
      marksPerQuestion: differentiate.marks,
      totalMarks: differentiateMandatory * differentiate.marks,
      note: differentiate.compulsory ? `Answer any ${differentiate.compulsory}` : "Answer all",
    });
  }

  // Sequencing Section
  if (sequencing) {
    const sequencingMandatory = sequencing.compulsory || sequencing.count;
    totalQuestions += sequencing.count;
    totalMarks += sequencingMandatory * sequencing.marks;
    sections.push({
      sectionName: "Arrange in Correct Order",
      totalQuestions: sequencing.count,
      marksPerQuestion: sequencing.marks,
      totalMarks: sequencingMandatory * sequencing.marks,
      note: sequencing.compulsory ? `Answer any ${sequencing.compulsory}` : "Answer all",
    });
  }

  // Geometry Section
  if (geometry) {
    const geometryMandatory = geometry.compulsory || geometry.count;
    totalQuestions += geometry.count;
    totalMarks += geometryMandatory * geometry.marks;
    sections.push({
      sectionName: "Geometry",
      totalQuestions: geometry.count,
      marksPerQuestion: geometry.marks,
      totalMarks: geometryMandatory * geometry.marks,
      note: geometry.compulsory ? `Answer any ${geometry.compulsory}` : "Answer all",
    });
  }

  return {
    examDetails: {
      duration,
      totalQuestions,
      totalMarks,
      subject,
      difficultyLevel,
    },
    sections,
  };
}

module.exports = {
  getMCQPrompt,
  getShortAnswerPrompt,
  getFillUpsPrompt,
  getLongAnswerPrompt,
  getMatchPrompt,
  getTrueOrFalsePrompt,
  getEssayPrompt,
  getInternalChoicePrompt,
  getExamDetailsPrompt,
  getVeryShortAnswerPrompt,
  getAssertionReasonPrompt,
  getCaseStudyPrompt,
  getDiagramBasedPrompt,
  getMapBasedPrompt,
  getDataInterpretationPrompt,
  getDifferentiatePrompt,
  getSequencingPrompt,
  getGeometryPrompt,
};

// Very Short Answer (1 Mark) - NCERT Pattern
function getVeryShortAnswerPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} VERY SHORT ANSWER QUESTIONS (${marks} mark each, ${difficultyLevel} difficulty) for ${subject}. Each answer must be 1 or 2 lines only. No long explanations.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Answers must be concise and not exceed 2 lines per answer. Do not stop early. Fill in all question and answer fields completely.`;
}

// Assertion & Reason (New Pattern) - NCERT Pattern
function getAssertionReasonPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} ASSERTION AND REASON QUESTIONS (${marks} mark each, ${difficultyLevel} difficulty) for ${subject}. Each question must contain Assertion (A) and Reason (R) with four options.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"assertion":"","reason":"","options":["Both A and R are true and R explains A","Both A and R are true but R does not explain A","A is true but R is false","A is false but R is true"],"answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Follow NCERT logical reasoning style. Do not stop early. Fill in all assertion, reason and answer fields completely.`;
}

// Case Study Based Questions
function getCaseStudyPrompt(params) {
  const { marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY 1 CASE STUDY BASED QUESTION SET for ${subject} (${difficultyLevel} difficulty). Structure: One detailed passage (8-12 lines) with 4 sub-questions mixing 1 and 2 mark questions.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[{
  "questionNumber":1,
  "passage":"",
  "questions":[
    {"questionNumber":1,"question":"","answer":"","marks":1},
    {"questionNumber":2,"question":"","answer":"","marks":1},
    {"questionNumber":3,"question":"","answer":"","marks":2},
    {"questionNumber":4,"question":"","answer":"","marks":2}
  ]
}]
CRITICAL: Passage must relate to real-life scenario. Questions must be based ONLY on passage. Do NOT generate more than one case study. Fill in all fields completely.`;
}

// Diagram Based Questions (Science / Maths)
function getDiagramBasedPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} DIAGRAM-BASED QUESTIONS for ${subject} (${marks} marks each, ${difficultyLevel} difficulty). Each question must describe a diagram scenario and ask to label/draw/identify parts.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","diagramDescription":"","diagramImageUrl":"","diagramInstructions":"","expectedAnswer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. For each question, provide:
1. question: The question asking student to identify/label parts from the diagram
2. diagramDescription: Detailed text description of what the diagram shows
3. diagramImageUrl: If you know a real, high-quality image URL from Wikimedia Commons, Wikipedia, or educational resources that matches this diagram, provide it. Otherwise leave empty "". Format: "https://..." or ""
4. diagramInstructions: Step-by-step instructions to draw/create this diagram (used only if diagramImageUrl is empty)
5. expectedAnswer: What student should identify/label
Do not stop early. Fill in all fields completely.`;
}

// Map Based Questions (Social Science)
function getMapBasedPrompt(params) {
  const { count, marks, difficultyLevel } = params;
  
  return `GENERATE EXACTLY ${count} MAP-BASED QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty). Each question must ask students to locate and label places based on Indian geography or history.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","locations":[],"mapImageUrl":"","mapInstructions":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. For each question, provide:
1. question: The question asking student to locate and label places on the map
2. locations: Array of location names to mark on map (e.g., ["Delhi", "Mumbai", "Bangalore"])
3. mapImageUrl: If you know a real, high-quality map image URL from Wikimedia Commons or educational resources showing India with regions/states, provide it. Otherwise leave empty "". Format: "https://..." or ""
4. mapInstructions: Detailed instructions to draw the map (used only if mapImageUrl is empty, e.g., "Draw outline of India, mark Delhi in north, Mumbai on west coast")
5. answer: Correct placement/identification of locations
Do not stop early. Fill in all fields completely.`;
}

// Data Interpretation (Graph/Table Based)
function getDataInterpretationPrompt(params) {
  const { marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY 1 DATA INTERPRETATION QUESTION SET for ${subject} (${difficultyLevel} difficulty). Structure: Provide a data table or graph description with 4 sub-questions.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[{
  "questionNumber":1,
  "dataDescription":"",
  "dataImageUrl":"",
  "dataInstructions":"",
  "questions":[
    {"questionNumber":1,"question":"","answer":"","marks":1},
    {"questionNumber":2,"question":"","answer":"","marks":1},
    {"questionNumber":3,"question":"","answer":"","marks":2},
    {"questionNumber":4,"question":"","answer":"","marks":2}
  ]
}]
CRITICAL: Data must be realistic. Questions must require analysis, not direct copying. For each question, provide:
1. dataDescription: Detailed text description of the data (values, labels, what it represents)
2. dataImageUrl: If you know a real, high-quality chart/graph/table image URL from Wikimedia Commons or educational resources that matches this data, provide it. Otherwise leave empty "". Format: "https://..." or ""
3. dataInstructions: Step-by-step instructions to create the visualization (used only if dataImageUrl is empty, e.g., "Create a bar chart with X-axis showing months (Jan-Dec), Y-axis showing sales (0-1000)...")

IMPORTANT: ALWAYS include questionNumber field (1, 2, 3, 4) for each sub-question. Do NOT skip or omit question numbers.

Do NOT generate more than one data interpretation set. Fill in all fields completely.`;
}

// Differentiate Between
function getDifferentiatePrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} DIFFERENTIATE BETWEEN QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty) for ${subject}. Each question must ask difference between two concepts with minimum 3 comparison points.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"Differentiate between","conceptA":"","conceptB":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. For each question, provide:
1. question: "Differentiate between [conceptA] and [conceptB]"
2. conceptA: First concept name
3. conceptB: Second concept name
4. answer: Structured comparison with minimum 3 comparison points
Do not stop early. Fill in all fields completely.`;
}

// Sequencing / Arrange in Order
function getSequencingPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} ARRANGE IN CORRECT ORDER QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty) for ${subject}.
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"Arrange the following in correct order:","items":[],"correctOrder":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. For each question, provide:
1. question: "Arrange the following in correct order:"
2. items: Array of items to arrange (e.g., ["Mitosis", "Prophase", "Metaphase", "Anaphase"])
3. correctOrder: The correct sequence/order of items
Do not stop early. Fill in all fields completely.`;
}

// Geometry Based Questions
function getGeometryPrompt(params) {
  const { count, marks, difficultyLevel } = params;
  
  return `GENERATE EXACTLY ${count} GEOMETRY QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty). Each question MUST:
- Involve geometric figures (angles, triangles, lines, polygons, circles, etc.)
- Require a diagram
- Include a clear figure description
Apply Bloom's Taxonomy: align cognitive level to student standard — standards 6–8: Remember/Understand, 9–10: Apply/Analyse, 11–12: Evaluate/Create.
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","figureDescription":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Diagram must be necessary to solve. Clearly describe figure in text. Do not stop early. Fill in all fields completely.`;
}
