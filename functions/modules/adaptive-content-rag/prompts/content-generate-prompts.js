function getPrompt(params) {
  const { topic, learningStyle, difficulty, context } = params;

  const styleGuide = {
    visual: "Use diagrams, flowcharts, and visual descriptions. Break down concepts into visual steps.",
    auditory: "Use conversational tone, explain concepts as if teaching verbally. Include analogies and examples.",
    kinesthetic: "Include hands-on examples, step-by-step procedures, and practical applications.",
    reading: "Use structured text with clear headings, bullet points, and detailed explanations.",
  };

  const difficultyGuide = {
    beginner: "Start with basic concepts. Use simple language. Avoid jargon.",
    intermediate: "Assume some background knowledge. Use technical terms with explanations.",
    advanced: "Assume strong background. Use technical language. Focus on nuances and edge cases.",
  };

  return `You are an adaptive learning content generator. Create educational content tailored to the student's learning style and difficulty level.

Topic: ${topic}
Learning Style: ${learningStyle}
Difficulty Level: ${difficulty}

Style Guide: ${styleGuide[learningStyle] || styleGuide.visual}
Difficulty Guide: ${difficultyGuide[difficulty] || difficultyGuide.intermediate}

Context from Document:
${context}

Generate comprehensive educational content about "${topic}" that:
1. Matches the ${learningStyle} learning style
2. Is appropriate for ${difficulty} level learners
3. Uses the provided context from the document
4. Includes examples and explanations
5. Is engaging and easy to understand

Format the response with clear sections and make it easy to follow.`;
}

module.exports = {
  getPrompt,
};


/**
 * Generate prompt for chatbox responses
 * Provides conversational, concise answers to student queries
 */
function getChatboxPrompt(params) {
  const { query, topic, learningStyle, difficulty, context } = params;

  const styleGuide = {
    visual: "Use simple visual descriptions and examples when helpful.",
    auditory: "Use conversational, friendly tone as if explaining to a friend.",
    kinesthetic: "Include practical examples and actionable steps.",
    reading: "Use clear, structured explanations with key points.",
  };

  const difficultyGuide = {
    beginner: "Use simple language and avoid technical jargon.",
    intermediate: "Use technical terms with brief explanations.",
    advanced: "Use technical language and focus on nuances.",
  };

  return `You are a helpful educational chatbot assistant. Answer the student's question concisely and conversationally.

Student's Question: "${query}"
Topic: ${topic}
Learning Style: ${learningStyle}
Difficulty Level: ${difficulty}

Style Guide: ${styleGuide[learningStyle] || styleGuide.visual}
Difficulty Guide: ${difficultyGuide[difficulty] || difficultyGuide.intermediate}

Context from Document:
${context}

Provide a helpful, conversational response that:
1. Directly answers the question
2. Uses the provided context when relevant
3. Matches the ${learningStyle} learning style
4. Is appropriate for ${difficulty} level learners
5. Is concise (2-3 sentences for simple questions, up to 1 paragraph for complex ones)
6. Is friendly and encouraging`;
}

module.exports = {
  getPrompt,
  getChatboxPrompt,
};
