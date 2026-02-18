function getDocumentStructureExtractionPrompt() {
  return `Give me all the section, headers,tables,image references present in this file separately. Ensure you give all of these.`;
}

module.exports = {
  getDocumentStructureExtractionPrompt,
};
