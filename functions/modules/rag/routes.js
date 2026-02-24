/**
 * RAG Routes
 * Endpoints for PDF processing and context retrieval
 */

const express = require('express');
const multer = require('multer');
const busboy = require('busboy');
const {
  uploadAndProcessPDF,
  retrieveContextAPI,
  retrieveContextBatchAPI,
  getDocumentVectors,
} = require('./controller');

const router = express.Router();

// Configure multer for file uploads with error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1,
    fields: 10,
  },
  fileFilter: (req, file, cb) => {
    console.log('[Multer] File filter - mimetype:', file.mimetype);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /rag/upload
 * Upload and process PDF to vectors
 * Body: { documentId: string }
 * File: PDF file
 */
router.post('/upload', (req, res, next) => {

  const contentType = req.headers['content-type'];
  
  // Use busboy directly for better multipart handling
  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('[RAG Routes] Using busboy for multipart parsing');
    
    const bb = busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      }
    });
    
    let fileBuffer = null;
    let fileName = null;
    let documentId = null;
    let fileError = null;
    let responseSent = false;

    const sendError = (message) => {
      if (!responseSent) {
        responseSent = true;
        console.error('[RAG Routes] Sending error response:', message);
        res.status(400).json({
          success: false,
          message: message,
        });
      }
    };

    const sendSuccess = () => {
      if (!responseSent) {
        responseSent = true;
        console.log('[RAG Routes] Calling uploadAndProcessPDF controller');
        uploadAndProcessPDF(req, res);
      }
    };

    bb.on('file', (fieldname, file, info) => {
      console.log('[Busboy] File field:', fieldname);
      console.log('[Busboy] File name:', info.filename);
      console.log('[Busboy] File mimetype:', info.mimeType);

      if (info.mimeType !== 'application/pdf') {
        fileError = new Error('Only PDF files are allowed');
        file.resume();
        return;
      }

      fileName = info.filename;
      const chunks = [];

      file.on('data', (data) => {
        console.log('[Busboy] Received chunk:', data.length, 'bytes');
        chunks.push(data);
      });

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        console.log('[Busboy] File complete:', fileBuffer.length, 'bytes');
      });

      file.on('error', (err) => {
        console.error('[Busboy] File stream error:', err.message);
        fileError = err;
      });
    });

    bb.on('field', (fieldname, val) => {
      console.log('[Busboy] Field:', fieldname, '=', val);
      if (fieldname === 'documentId') {
        documentId = val;
      }
    });

    bb.on('close', () => {
      console.log('[Busboy] Parsing complete');
      console.log('[Busboy] File buffer:', fileBuffer ? fileBuffer.length : 'null');
      console.log('[Busboy] Document ID:', documentId);
      console.log('[Busboy] File error:', fileError ? fileError.message : 'null');

      if (fileError) {
        console.error('[Busboy] File error occurred:', fileError.message);
        return sendError(fileError.message);
      }

      if (!fileBuffer) {
        console.error('[Busboy] No file received');
        return sendError('No file uploaded');
      }

      if (!documentId) {
        console.error('[Busboy] No documentId provided');
        return sendError('Missing required field: documentId');
      }

      // Create a fake req.file object for the controller
      req.file = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: fileBuffer.length,
        buffer: fileBuffer,
      };

      req.body = { documentId };

      sendSuccess();
    });

    bb.on('error', (err) => {
      console.error('[Busboy] Parser error:', err.message);
      console.error('[Busboy] Error code:', err.code);
      // Don't send response here, let close event handle it
      fileError = err;
    });

    req.pipe(bb);
  } else {
    // Fallback to multer for non-multipart requests
    console.log('[RAG Routes] Using multer for non-multipart request');
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('[RAG Routes] Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      uploadAndProcessPDF(req, res);
    });
  }
});

/**
 * POST /rag/retrieve
 * Retrieve context for a query
 * Body: { query: string, documentId: string, topK?: number, threshold?: number }
 */
router.post('/retrieve', retrieveContextAPI);

/**
 * POST /rag/retrieve-batch
 * Retrieve context for multiple queries
 * Body: { queries: string[], documentId: string, topK?: number }
 */
router.post('/retrieve-batch', retrieveContextBatchAPI);

/**
 * GET /rag/vectors/:documentId
 * Get vector data for a document
 */
router.get('/vectors/:documentId', getDocumentVectors);

module.exports = router;
