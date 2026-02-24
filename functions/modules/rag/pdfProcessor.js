/**
 * PDF Processor Service
 * Extracts text from PDF and generates vector embeddings
 */

const pdfParse = require('pdf-parse');
const { generateEmbeddings } = require('./embeddings');
const { splitBySections, createChunksWithMetadata } = require('./textSplitter');
const { storeVectorData, updateDocumentVectors } = require('./dynamodbStore');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    console.log(`[RAG] Extracted ${text.length} characters from PDF (${data.numpages} pages)`);

    return text;
  } catch (error) {
    console.error('[RAG] Error extracting text from PDF:', error.message);
    throw error;
  }
}

/**
 * Process PDF and generate vector embeddings
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} documentId - Document ID
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Vector data with embeddings
 */
async function processPDFToVectors(pdfBuffer, documentId, options = {}) {
  try {
    const {
      splitBySectionHeaders = true,
      storeInDB = true,
    } = options;

    console.log(`[RAG] Processing PDF for document: ${documentId}`);

    // Extract text from PDF
    const text = await extractTextFromPDF(pdfBuffer);

    // Split into sections
    let sections = [];
    if (splitBySectionHeaders) {
      sections = splitBySections(text);
    } else {
      sections = [{ title: 'Content', content: text }];
    }

    // Create chunks with metadata
    let allChunks = [];
    sections.forEach(section => {
      const chunks = createChunksWithMetadata(
        section.content,
        documentId,
        section.title
      );
      allChunks = allChunks.concat(chunks);
    });

    console.log(`[RAG] Created ${allChunks.length} chunks from ${sections.length} sections`);

    // Generate embeddings for all chunks
    const texts = allChunks.map(chunk => chunk.text);
    console.log(`[RAG] Generating embeddings for ${texts.length} chunks...`);

    const embeddings = await generateEmbeddings(texts, 'chunk');

    // Combine chunks with embeddings
    const vectorData = allChunks.map((chunk, index) => ({
      text: chunk.text,
      embedding: embeddings[index],
      section: chunk.section,
      chunkIndex: chunk.chunkIndex,
      documentId: chunk.documentId,
    }));

    console.log(`[RAG] Generated ${vectorData.length} vector embeddings`);

    // Store in DynamoDB if requested
    if (storeInDB) {
      await updateDocumentVectors(documentId, vectorData, {
        sections: sections.map(s => s.title),
        totalChunks: vectorData.length,
        processingDate: new Date().toISOString(),
      });
    }

    return vectorData;
  } catch (error) {
    console.error('[RAG] Error processing PDF to vectors:', error.message);
    throw error;
  }
}

/**
 * Process multiple PDFs
 * @param {Array<{buffer: Buffer, documentId: string}>} pdfs - Array of PDF buffers with IDs
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Results for each document
 */
async function processPDFsToVectors(pdfs, options = {}) {
  try {
    const results = {};

    for (const pdf of pdfs) {
      try {
        results[pdf.documentId] = await processPDFToVectors(pdf.buffer, pdf.documentId, options);
      } catch (error) {
        console.error(`[RAG] Error processing PDF ${pdf.documentId}:`, error.message);
        results[pdf.documentId] = { error: error.message };
      }
    }

    return results;
  } catch (error) {
    console.error('[RAG] Error processing multiple PDFs:', error.message);
    throw error;
  }
}

module.exports = {
  extractTextFromPDF,
  processPDFToVectors,
  processPDFsToVectors,
};
