// MCQ Questions Prompt
function getMCQPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} MCQ questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","options":["","","",""],"answer":{"option":"","text":""},"marks":${marks}}`).join(',')}]`;
}

// Short Answer Questions Prompt
function getShortAnswerPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `GENERATE EXACTLY ${count} SHORT ANSWER QUESTIONS (${marks} marks each, ${difficultyLevel} difficulty). DO NOT TRUNCATE. GENERATE ALL ${count} QUESTIONS:
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Do not stop early. Fill in all question and answer fields completely.`;
}

// Fill in the Blanks Prompt
function getFillUpsPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Fill in the Blanks questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]`;
}

// Long Answer Prompt
function getLongAnswerPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Long Answer questions (${marks} marks each, ${difficultyLevel} difficulty):
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
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"statement":"","answer":"","marks":${marks}}`).join(',')}]`;
}

// Essay Prompt
function getEssayPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Essay questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]`;
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
};

// Internal Choice Questions Prompt
function getInternalChoicePrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} Internal Choice questions (${marks} marks each, ${difficultyLevel} difficulty). Each question has two long questions labeled (a) and (b). Students answer either (a) or (b):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"questionA":"","questionB":"","answerA":"","answerB":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions with both (a) and (b) options. Do not stop early. Fill in all question and answer fields completely.`;
}
