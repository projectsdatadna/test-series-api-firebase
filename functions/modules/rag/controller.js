/**
 * RAG Controller
 * Handles PDF upload, processing, and context retrieval
 */

const { processPDFToVectors } = require('./pdfProcessor');
const { retrieveContext, retrieveContextBatch } = require('./retriever');
const { getVectorData } = require('./dynamodbStore');

/**
 * Upload and process PDF to vectors
 * POST /rag/upload
 */
async function uploadAndProcessPDF(req, res) {
  try {
    console.log('[RAG Upload] ========== START ==========');
    console.log('[RAG Upload] Request received');
    console.log('[RAG Upload] Method:', req.method);
    console.log('[RAG Upload] URL:', req.url);
    console.log('[RAG Upload] Headers:', JSON.stringify(req.headers, null, 2));
    
    if (!req.file) {
      console.error('[RAG Upload] ❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    console.log('[RAG Upload] ✅ File received');
    console.log('[RAG Upload] File details:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer_length: req.file.buffer.length,
    });

    const { documentId } = req.body;
    console.log('[RAG Upload] Body:', JSON.stringify(req.body, null, 2));
    console.log('[RAG Upload] documentId:', documentId);

    if (!documentId) {
      console.error('[RAG Upload] ❌ Missing documentId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: documentId',
      });
    }

    console.log(`[RAG Upload] ✅ documentId validated: ${documentId}`);
    console.log(`[RAG Upload] Processing PDF: ${documentId}`);

    // Process PDF to vectors
    console.log('[RAG Upload] Starting PDF processing...');
    const vectorData = await processPDFToVectors(req.file.buffer, documentId, {
      splitBySectionHeaders: true,
      storeInDB: true,
    });

    console.log(`[RAG Upload] ✅ PDF processing complete`);
    console.log(`[RAG Upload] Successfully processed ${vectorData.length} chunks`);
    console.log('[RAG Upload] Vector data summary:', {
      totalChunks: vectorData.length,
      sections: [...new Set(vectorData.map(v => v.section))],
      firstChunk: vectorData[0] ? {
        section: vectorData[0].section,
        textLength: vectorData[0].text.length,
        embeddingDimension: vectorData[0].embedding.length,
      } : null,
    });

    console.log('[RAG Upload] ✅ Sending success response');
    return res.status(200).json({
      success: true,
      message: 'PDF processed and stored successfully',
      data: {
        documentId,
        totalChunks: vectorData.length,
        sections: [...new Set(vectorData.map(v => v.section))],
      },
    });
  } catch (error) {
    console.error('[RAG Upload] ❌ Error uploading PDF:', error);
    console.error('[RAG Upload] Error stack:', error.stack);
    console.error('[RAG Upload] Error message:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process PDF',
      error: error.message,
    });
  } finally {
    console.log('[RAG Upload] ========== END ==========');
  }
}

/**
 * Retrieve context for a query
 * POST /rag/retrieve
 */
async function retrieveContextAPI(req, res) {
  try {
    console.log('[RAG Retrieve] ========== START ==========');
    console.log('[RAG Retrieve] Request body:', JSON.stringify(req.body, null, 2));
    
    const { query, documentId, topK = 5, threshold } = req.body;

    console.log('[RAG Retrieve] Parameters:', { query: query?.substring(0, 50), documentId, topK, threshold });

    if (!query || !documentId) {
      console.error('[RAG Retrieve] ❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: query, documentId',
      });
    }

    console.log(`[RAG Retrieve] ✅ Retrieving context for: ${query.substring(0, 50)}...`);

    const contexts = await retrieveContext(query, documentId, topK, threshold);

    console.log(`[RAG Retrieve] ✅ Retrieved ${contexts.length} contexts`);
    console.log('[RAG Retrieve] Context summary:', contexts.map(c => ({
      section: c.section,
      similarity: c.similarity,
      textLength: c.text.length,
    })));

    return res.status(200).json({
      success: true,
      data: {
        query,
        documentId,
        contextCount: contexts.length,
        contexts,
      },
    });
  } catch (error) {
    console.error('[RAG Retrieve] ❌ Error retrieving context:', error);
    console.error('[RAG Retrieve] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve context',
      error: error.message,
    });
  } finally {
    console.log('[RAG Retrieve] ========== END ==========');
  }
}

/**
 * Retrieve context for multiple queries
 * POST /rag/retrieve-batch
 */
async function retrieveContextBatchAPI(req, res) {
  try {
    console.log('[RAG Batch] ========== START ==========');
    console.log('[RAG Batch] Request body:', JSON.stringify(req.body, null, 2));
    
    const { queries, documentId, topK = 5 } = req.body;

    console.log('[RAG Batch] Parameters:', { queryCount: queries?.length, documentId, topK });

    if (!queries || !Array.isArray(queries) || queries.length === 0 || !documentId) {
      console.error('[RAG Batch] ❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: queries (array), documentId',
      });
    }

    console.log(`[RAG Batch] ✅ Retrieving context for ${queries.length} queries`);

    const results = await retrieveContextBatch(queries, documentId, topK);

    console.log('[RAG Batch] ✅ Batch retrieval complete');
    console.log('[RAG Batch] Results summary:', Object.entries(results).map(([q, contexts]) => ({
      query: q.substring(0, 30),
      contextCount: Array.isArray(contexts) ? contexts.length : 0,
    })));

    return res.status(200).json({
      success: true,
      data: {
        documentId,
        queryCount: queries.length,
        results,
      },
    });
  } catch (error) {
    console.error('[RAG Batch] ❌ Error retrieving batch context:', error);
    console.error('[RAG Batch] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch context',
      error: error.message,
    });
  } finally {
    console.log('[RAG Batch] ========== END ==========');
  }
}

/**
 * Get vector data for a document
 * GET /rag/vectors/:documentId
 */
async function getDocumentVectors(req, res) {
  try {
    console.log('[RAG Vectors] ========== START ==========');
    console.log('[RAG Vectors] Request params:', JSON.stringify(req.params, null, 2));
    
    const { documentId } = req.params;

    console.log('[RAG Vectors] documentId:', documentId);

    if (!documentId) {
      console.error('[RAG Vectors] ❌ Missing documentId parameter');
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: documentId',
      });
    }

    console.log(`[RAG Vectors] ✅ Fetching vectors for: ${documentId}`);

    const vectorData = await getVectorData(documentId);

    console.log(`[RAG Vectors] ✅ Retrieved ${vectorData.length} vector chunks`);

    if (vectorData.length === 0) {
      console.warn('[RAG Vectors] ⚠️ No vector data found for document');
      return res.status(404).json({
        success: false,
        message: 'No vector data found for document',
      });
    }

    const sections = [...new Set(vectorData.map(v => v.section))];
    console.log('[RAG Vectors] Sections:', sections);
    console.log('[RAG Vectors] Vector summary:', {
      totalChunks: vectorData.length,
      sections: sections,
      embeddingDimension: vectorData[0]?.embedding?.length,
    });

    return res.status(200).json({
      success: true,
      data: {
        documentId,
        totalChunks: vectorData.length,
        sections: sections,
        chunks: vectorData.map(v => ({
          section: v.section,
          chunkIndex: v.chunkIndex,
          textPreview: v.text.substring(0, 100) + '...',
          embeddingDimension: v.embedding.length,
        })),
      },
    });
  } catch (error) {
    console.error('[RAG Vectors] ❌ Error fetching vectors:', error);
    console.error('[RAG Vectors] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vectors',
      error: error.message,
    });
  } finally {
    console.log('[RAG Vectors] ========== END ==========');
  }
}

module.exports = {
  uploadAndProcessPDF,
  retrieveContextAPI,
  retrieveContextBatchAPI,
  getDocumentVectors,
};
