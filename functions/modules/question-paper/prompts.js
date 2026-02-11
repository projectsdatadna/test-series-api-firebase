function getQuestionPaperPrompt(params) {
  const {
    duration,
    mcqCount,
    mcqMarks = 1,
    shortAnswerCount,
    shortAnswerMarks = 3,
    shortAnswerCompulsory,
    mcqCompulsory,
    difficultyLevel = "medium",
    subject = "",
    topic = "",
    customQuestions = [],
  } = params;

  // Build custom questions section if provided
  let customQuestionsSection = "";
  let customQuestionsCount = 0;
  let customQuestionsMarks = 0;
  
  if (customQuestions && customQuestions.length > 0) {
    customQuestionsSection = "\n\n**Custom Questions:**\n";
    customQuestions.forEach((customQ, index) => {
      const compulsoryNote = customQ.compulsory ? ` - Answer any ${customQ.compulsory} out of ${customQ.count} questions (${customQ.compulsory} questions are compulsory)` : "";
      customQuestionsSection += `${index + 1}. Type: ${customQ.type}, Section: ${customQ.section}, Count: ${customQ.count}, Marks: ${customQ.marks}${compulsoryNote}\n`;
      customQuestionsCount += customQ.count;
      customQuestionsMarks += (customQ.count * customQ.marks);
    });
    customQuestionsSection += "\nGenerate questions and answers based on these custom question specifications along with the standard questions.";
  }

  // Calculate total questions and marks based on mandatory questions
  const mcqMandatory = mcqCompulsory || mcqCount;
  const shortAnswerMandatory = shortAnswerCompulsory || shortAnswerCount;
  const customQuestionsMandatoryMarks = customQuestions.reduce((sum, customQ) => {
    const mandatory = customQ.compulsory || customQ.count;
    return sum + (mandatory * customQ.marks);
  }, 0);
  
  const totalQuestions = mcqCount + shortAnswerCount + customQuestionsCount;
  const totalMarks = (mcqMandatory * mcqMarks) + (shortAnswerMandatory * shortAnswerMarks) + customQuestionsMandatoryMarks;

  // Build sections array
  let sectionsArray = [
    {
      "sectionName": "MCQ",
      "totalQuestions": mcqCount,
      "marksPerQuestion": mcqMarks,
      "totalMarks": mcqMandatory * mcqMarks,
      "note": "Answer all questions"
    },
    {
      "sectionName": "Short Answer",
      "totalQuestions": shortAnswerCount,
      "marksPerQuestion": shortAnswerMarks,
      "totalMarks": (shortAnswerCompulsory || shortAnswerCount) * shortAnswerMarks,
      "note": shortAnswerCompulsory ? `Answer any ${shortAnswerCompulsory} out of ${shortAnswerCount} questions (${shortAnswerCompulsory} questions are compulsory)` : "Answer all questions"
    }
  ];

  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((customQ) => {
      sectionsArray.push({
        "sectionName": customQ.section,
        "type": customQ.type,
        "totalQuestions": customQ.count,
        "marksPerQuestion": customQ.marks,
        "totalMarks": customQ.count * customQ.marks,
        "note": customQ.compulsory ? `Answer any ${customQ.compulsory} out of ${customQ.count} questions (${customQ.compulsory} questions are compulsory)` : "Answer all questions"
      });
    });
  }

  const sectionsJSON = JSON.stringify(sectionsArray, null, 2);

  // Build custom questions array for JSON
  let customQuestionsArray = [];
  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((customQ) => {
      customQuestionsArray.push({
        "section": customQ.section,
        "type": customQ.type,
        "questions": [
          {
            "questionNumber": 1,
            "question": "Question text here?",
            "expectedAnswer": "Expected answer with key points",
            "keyPoints": ["Point 1", "Point 2"],
            "difficulty": "easy/medium/hard",
            "marksAllocated": customQ.marks
          }
        ]
      });
    });
  }

  const customQuestionsJSON = customQuestionsArray.length > 0 ? `,\n  "customQuestions": ${JSON.stringify(customQuestionsArray, null, 2)}` : "";

  // Build custom answers array for JSON
  let customAnswersArray = [];
  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((customQ) => {
      customAnswersArray.push({
        "section": customQ.section,
        "type": customQ.type,
        "answers": [
          {
            "questionNumber": 1,
            "answer": "Expected answer",
            "keyPoints": ["Point 1", "Point 2"]
          }
        ]
      });
    });
  }

  const customAnswersJSON = customAnswersArray.length > 0 ? `,\n    "customAnswers": ${JSON.stringify(customAnswersArray, null, 2)}` : "";

  return `Generate a comprehensive question paper based on the provided document with the following specifications:

**Exam Details:**
- Duration: ${duration} minutes
- Total Questions: ${totalQuestions}
- Total Marks: ${totalMarks}
- Difficulty Level: ${difficultyLevel}
- Subject: ${subject}
- Topic: ${topic}${customQuestionsSection}

**Question Breakdown:**
- MCQ Questions: ${mcqCount} (1 mark each)
- Short Answer Questions: ${shortAnswerCount} (${shortAnswerMarks} marks each)${customQuestions && customQuestions.length > 0 ? `\n- Custom Questions: ${customQuestionsCount} questions across ${customQuestions.length} section(s)` : ""}

**Requirements:**

1. **MCQ Questions (${mcqCount} questions):**
   - Each question must have exactly 4 options (A, B, C, D)
   - Clearly mark the correct answer
   - Options should be plausible but distinct
   - Difficulty should match the specified level

2. **Short Answer Questions (${shortAnswerCount} questions):**
   - Each question should require 2-4 sentences answer
   - Include expected answer key with key points
   - Mark difficulty level for each question
   ${shortAnswerCompulsory ? `- Note: Answer any ${shortAnswerCompulsory} out of ${shortAnswerCount} questions (${shortAnswerCompulsory} questions are compulsory)` : ""}${customQuestions && customQuestions.length > 0 ? `

3. **Custom Questions:**
${customQuestions.map((customQ, idx) => `   - Section ${idx + 1} (${customQ.section}): ${customQ.count} ${customQ.type} questions, ${customQ.marks} marks each${customQ.compulsory ? ` - Answer any ${customQ.compulsory} out of ${customQ.count} questions` : ""}`).join("\n")}` : ""}

3. **Format Requirements:**
   Return ONLY valid JSON with NO additional text, explanation, or markdown formatting.

**JSON Structure:**
{
  "examDetails": {
    "duration": ${duration},
    "totalQuestions": ${totalQuestions},
    "totalMarks": ${totalMarks},
    "subject": "${subject}",
    "topic": "${topic}",
    "difficultyLevel": "${difficultyLevel}"
  },
  "sections": ${sectionsJSON},
  "mcqQuestions": [
    {
      "questionNumber": 1,
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "difficulty": "easy/medium/hard"
    }
  ],
  "shortAnswerQuestions": [
    {
      "questionNumber": 1,
      "question": "Question text here?",
      "expectedAnswer": "Expected answer with key points",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "difficulty": "easy/medium/hard",
      "marksAllocated": ${shortAnswerMarks}
    }
  ]${customQuestionsJSON},
  "answerKey": {
    "mcqAnswers": [
      {
        "questionNumber": 1,
        "answer": "A"
      }
    ],
    "shortAnswerAnswers": [
      {
        "questionNumber": 1,
        "answer": "Expected answer",
        "keyPoints": ["Point 1", "Point 2"]
      }
    ]${customAnswersJSON}
  }
}

CRITICAL: Start your response with { and end with }. No other text.`;
}

module.exports = {
  getQuestionPaperPrompt,
};
