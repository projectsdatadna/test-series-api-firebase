// MCQ Questions Prompt
function getMCQPrompt(params) {
  const { count, marks, difficultyLevel, subject } = params;
  
  return `Generate ${count} MCQ questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","options":["","","",""],"answer":"","marks":${marks}}`).join(',')}]`;
}

// Short Answer Questions Prompt
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
  const fieldsPerSet = 5;
  
  return `Generate ${count} Match the Following questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"columnA":[${Array.from({length: fieldsPerSet}, (_, j) => `{"id":"${String.fromCharCode(65+j)}","text":""}`).join(',')}],"columnB":[${Array.from({length: fieldsPerSet}, (_, j) => `{"id":"${j+1}","text":""}`).join(',')}],"answers":{"A":"","B":"","C":"","D":"","E":""},"marks":${marks}}`).join(',')}]`;
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
    matchthefollowing,
    trueorfalse,
    essay,
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
  if (matchthefollowing) {
    const matchMandatory = matchthefollowing.compulsory || matchthefollowing.count;
    totalQuestions += matchthefollowing.count;
    totalMarks += matchMandatory * matchthefollowing.marks;
    sections.push({
      sectionName: "Match the Following",
      totalQuestions: matchthefollowing.count,
      marksPerQuestion: matchthefollowing.marks,
      totalMarks: matchMandatory * matchthefollowing.marks,
      note: matchthefollowing.compulsory ? `Answer any ${matchthefollowing.compulsory}` : "Answer all",
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
  getExamDetailsPrompt,
};
