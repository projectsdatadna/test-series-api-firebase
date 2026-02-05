function getQuestionPaperPrompt(params) {
  const {
    duration = 60,
    mcqCount = 10,
    shortAnswerCount = 5,
    difficultyLevel = "medium",
    subject = "",
    topic = "",
  } = params;

  return `Generate a comprehensive question paper based on the provided document with the following specifications:

**Exam Details:**
- Duration: ${duration} minutes
- Total MCQ Questions: ${mcqCount}
- Total Short Answer Questions: ${shortAnswerCount}
- Difficulty Level: ${difficultyLevel}
- Subject: ${subject}
- Topic: ${topic}

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

3. **Format Requirements:**
   Return ONLY valid JSON with NO additional text, explanation, or markdown formatting.

**JSON Structure:**
{
  "examDetails": {
    "duration": ${duration},
    "totalQuestions": ${mcqCount + shortAnswerCount},
    "subject": "${subject}",
    "topic": "${topic}",
    "difficultyLevel": "${difficultyLevel}"
  },
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
      "explanation": "Brief explanation of why A is correct",
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
      "marksAllocated": 3
    }
  ],
  "answerKey": {
    "mcqAnswers": [
      {
        "questionNumber": 1,
        "answer": "A",
        "explanation": "Explanation"
      }
    ],
    "shortAnswerAnswers": [
      {
        "questionNumber": 1,
        "answer": "Expected answer",
        "keyPoints": ["Point 1", "Point 2"]
      }
    ]
  }
}

CRITICAL: Start your response with { and end with }. No other text.`;
}

module.exports = {
  getQuestionPaperPrompt,
};
