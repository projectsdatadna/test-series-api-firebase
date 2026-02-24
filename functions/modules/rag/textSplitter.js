/**
 * Text Splitter Service
 * Splits PDF text into chunks using character-based splitting
 */

const ragConfig = require('./config');

/**
 * Split text into chunks using character-based splitting
 * @param {string} text - Text to split
 * @param {number} chunkSize - Size of each chunk
 * @param {number} chunkOverlap - Overlap between chunks
 * @returns {string[]} Array of text chunks
 */
function splitText(text, chunkSize = null, chunkOverlap = null) {
  const size = chunkSize || ragConfig.textSplitter.chunkSize;
  const overlap = chunkOverlap || ragConfig.textSplitter.chunkOverlap;

  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  if (overlap >= size) {
    throw new Error('Chunk overlap must be less than chunk size');
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + size;

    // Try to split at a sentence boundary if possible
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const lastSpace = text.lastIndexOf(' ', end);

      const splitPoint = Math.max(lastPeriod, lastNewline, lastSpace);

      if (splitPoint > start + size * 0.5) {
        end = splitPoint + 1;
      }
    }

    const chunk = text.substring(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = end - overlap;
  }

  console.log(`[RAG] Text split into ${chunks.length} chunks (size: ${size}, overlap: ${overlap})`);

  return chunks;
}

/**
 * Split text by sections/chapters
 * Looks for common section markers (##, ###, etc.)
 * @param {string} text - Text to split
 * @returns {Array<{title: string, content: string}>} Array of sections
 */
function splitBySections(text) {
  const sections = [];
  
  // Split by markdown headers (##, ###, etc.)
  const headerRegex = /^#{1,6}\s+(.+)$/gm;
  const parts = text.split(headerRegex);

  // First part is content before any header
  if (parts[0].trim()) {
    sections.push({
      title: 'Introduction',
      content: parts[0].trim(),
    });
  }

  // Process header-content pairs
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      sections.push({
        title: parts[i].trim(),
        content: parts[i + 1].trim(),
      });
    }
  }

  // If no headers found, split by common section patterns
  if (sections.length === 0) {
    const sectionRegex = /^(Chapter|Section|Part|Unit)\s+\d+[:\s-]+(.+)$/gim;
    const matches = [...text.matchAll(sectionRegex)];

    if (matches.length > 0) {
      let lastIndex = 0;

      matches.forEach((match, idx) => {
        const nextIndex = matches[idx + 1]?.index || text.length;
        const sectionContent = text.substring(match.index, nextIndex);

        sections.push({
          title: match[0],
          content: sectionContent.trim(),
        });

        lastIndex = nextIndex;
      });
    } else {
      // Fallback: treat entire text as one section
      sections.push({
        title: 'Content',
        content: text.trim(),
      });
    }
  }

  console.log(`[RAG] Text split into ${sections.length} sections`);

  return sections;
}

/**
 * Create chunks with metadata
 * @param {string} text - Text to chunk
 * @param {string} documentId - Document ID for reference
 * @param {string} sectionTitle - Section title for context
 * @returns {Array<{text: string, documentId: string, section: string, chunkIndex: number}>} Chunks with metadata
 */
function createChunksWithMetadata(text, documentId, sectionTitle = 'Content') {
  const chunks = splitText(text);

  return chunks.map((chunk, index) => ({
    text: chunk,
    documentId,
    section: sectionTitle,
    chunkIndex: index,
  }));
}

module.exports = {
  splitText,
  splitBySections,
  createChunksWithMetadata,
};
