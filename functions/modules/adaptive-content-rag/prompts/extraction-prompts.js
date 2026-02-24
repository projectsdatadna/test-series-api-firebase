function getDocumentStructureExtractionPrompt(params) {
  const { documentStructure } = params;

  return `You are a document structure analyzer. Analyze the provided document structure and extract the main topics, subtopics, and key concepts.

Document Structure:
${documentStructure}

Please provide:
1. Main Topics: List the primary topics covered in the document
2. Subtopics: For each main topic, list the subtopics
3. Key Concepts: Identify the most important concepts and terms
4. Learning Path: Suggest a logical order to learn these topics
5. Difficulty Progression: Indicate which topics are foundational and which are advanced

Format your response as a structured JSON object with these sections.`;
}

module.exports = {
  getDocumentStructureExtractionPrompt,
};
