/**
 * Build HTML overlay for non-English diagrams
 * @param {string} imageUrl - S3 URL of the base image
 * @param {string} title - Diagram title in target language
 * @param {array} labels - Array of { text, x, y } label objects
 * @param {string} langCode - Language code (e.g., 'ta', 'hi')
 * @returns {string} - HTML string for rendering
 */
function buildDiagramHTML(imageUrl, title, labels, langCode) {
  if (!imageUrl || !title) {
    return null;
  }

  // Ensure labels is an array
  const labelArray = Array.isArray(labels) ? labels : [];

  // Language-specific styling
  const langStyles = {
    ta: {
      fontFamily: "'Noto Sans Tamil', 'Lato', sans-serif",
      direction: 'ltr',
    },
    hi: {
      fontFamily: "'Noto Sans Devanagari', 'Lato', sans-se