/**
 * Book Upload Controller
 * Handles file upload, chapter creation, and RAG vector processing
 */

const AWS = require('aws-sdk');
const hierarchyService = require('./service');
const { processPDFToVectors } = require('../rag/pdfProcessor');
const { updateDocumentVectors } = require('../rag/dynamodbStore');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'ap-south-1' });
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'test-series-books';

/**
 * Upload book file and create chapter with vector data
 * POST /book-upload/upload
 */
const uploadBookFile = async (req, res) => {
  try {
    const { fileId, fileName, syllabusId, standardId, subjectId, chapterName, fileSize } = req.body;

    console.log('📚 Book Upload Request:', {
      fileId,
      fileName,
      syllabusId,
      standardId,
      subjectId,
      chapterName,
      fileSize,
    });

    // Validate all required fields
    if (!fileId || !fileName || !syllabusId || !standardId || !subjectId || !chapterName) {
      console.error('❌ Validation failed - Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'fileId, fileName, syllabusId, standardId, subjectId, and chapterName are all required',
      });
    }

    console.log('✅ All fields validated');

    // Create chapter with all hierarchy information
    console.log('📝 Creating chapter...');
    const chapter = await hierarchyService.createChapter(
      subjectId,
      chapterName,
      fileId,
      syllabusId,
      standardId
    );
    console.log('✅ Chapter created:', chapter.chapterId);

    // Create book file record with complete hierarchy
    console.log('📄 Creating book file record...');
    const bookFile = await hierarchyService.createBookFile(
      fileId,
      fileName,
      chapter.chapterId,
      fileSize || 0,
      new Date().toISOString()
    );
    console.log('✅ Book file created:', bookFile.bookId);

    // Process PDF to vectors asynchronously (don't wait for completion)
    console.log('🔄 Starting RAG vector processing (async)...');
    processAndStoreVectors(fileId, chapter.chapterId, fileName).catch(error => {
      console.error('❌ Error in async vector processing:', error.message);
    });

    // Return response immediately
    res.status(201).json({
      success: true,
      data: {
        hierarchy: {
          syllabusId,
          standardId,
          subjectId,
        },
        chapter,
        bookFile,
      },
      message: 'Book file uploaded and chapter created. Vector processing started in background.',
    });
  } catch (error) {
    console.error('❌ Error in uploadBookFile:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Process PDF and store vectors in chapter (async function)
 * @param {string} fileId - File ID from Anthropic
 * @param {string} chapterId - Chapter ID
 * @param {string} fileName - File name
 */
async function processAndStoreVectors(fileId, chapterId, fileName) {
  try {
    console.log(`[RAG Processing] Starting for chapter: ${chapterId}`);

    // Get PDF from Anthropic Files API
    console.log(`[RAG Processing] Fetching PDF from Anthropic: ${fileId}`);
    const pdfBuffer = await fetchPDFFromAnthropic(fileId);

    if (!pdfBuffer) {
      throw new Error('Failed to fetch PDF from Anthropic');
    }

    console.log(`[RAG Processing] PDF fetched, size: ${pdfBuffer.length} bytes`);

    // Process PDF to vectors using RAG module
    console.log(`[RAG Processing] Processing PDF to vectors...`);
    const vectorData = await processPDFToVectors(pdfBuffer, fileId, {
      splitBySectionHeaders: true,
      storeInDB: false, // We'll store in chapters table instead
    });

    console.log(`[RAG Processing] Generated ${vectorData.length} vector chunks`);

    // Update chapter with vector data
    console.log(`[RAG Processing] Updating chapter with vector data...`);
    await hierarchyService.updateChapterVectorData(chapterId, vectorData);

    console.log(`✅ [RAG Processing] Successfully stored ${vectorData.length} vectors in chapter ${chapterId}`);

    // Also store in DynamoDB RAG table for retrieval
    console.log(`[RAG Processing] Storing in RAG DynamoDB table...`);
    await updateDocumentVectors(fileId, vectorData, {
      chapterId,
      fileName,
      sections: [...new Set(vectorData.map(v => v.section))],
      totalChunks: vectorData.length,
    });

    console.log(`✅ [RAG Processing] Complete for chapter ${chapterId}`);
  } catch (error) {
    console.error(`❌ [RAG Processing] Error processing vectors for chapter ${chapterId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch PDF from Anthropic Files API
 * @param {string} fileId - File ID from Anthropic
 * @returns {Promise<Buffer>} PDF buffer
 */
async function fetchPDFFromAnthropic(fileId) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    console.log(`[Anthropic] Fetching file: ${fileId}`);

    const response = await fetch(`https://api.anthropic.com/v1/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    console.log(`[Anthropic] File fetched successfully, size: ${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    console.error('[Anthropic] Error fetching file:', error.message);
    throw error;
  }
}

/**
 * Get chapters for a subject
 * GET /book-upload/chapters/:subjectId
 */
const getChaptersForSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'subjectId is required',
      });
    }

    const chapters = await hierarchyService.getChaptersBySubject(subjectId);

    res.status(200).json({
      success: true,
      data: chapters,
      count: chapters.length,
      message: 'Chapters fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get book files for a chapter
 * GET /book-upload/files/:chapterId
 */
const getBookFilesForChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        message: 'chapterId is required',
      });
    }

    const bookFiles = await hierarchyService.getBookFilesByChapter(chapterId);

    res.status(200).json({
      success: true,
      data: bookFiles,
      count: bookFiles.length,
      message: 'Book files fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all books from database
 * GET /book-upload/books
 */
const getAllBooks = async (req, res) => {
  try {
    const books = await hierarchyService.getAllBooks();

    res.status(200).json({
      success: true,
      data: books,
      count: books.length,
      message: 'All books fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get book file details
 * GET /book-upload/books/:bookId/:fileId
 */
const getBookDetails = async (req, res) => {
  try {
    const { bookId, fileId } = req.params;

    if (!bookId || !fileId) {
      return res.status(400).json({
        success: false,
        message: 'bookId and fileId are required',
      });
    }

    const bookFile = await hierarchyService.getBookFileById(bookId, fileId);

    if (!bookFile) {
      return res.status(404).json({
        success: false,
        message: 'Book file not found',
      });
    }

    // Get chapter details to include hierarchy info
    let chapterDetails = null;
    try {
      chapterDetails = await hierarchyService.getChapterById(bookFile.chapterId);
    } catch (error) {
      console.error('Error fetching chapter details:', error);
    }

    res.status(200).json({
      success: true,
      data: {
        ...bookFile,
        chapter: chapterDetails,
      },
      message: 'Book details fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete book file
 * DELETE /book-upload/books/:bookId/:fileId
 */
const deleteBook = async (req, res) => {
  try {
    const { bookId, fileId } = req.params;

    if (!bookId || !fileId) {
      return res.status(400).json({
        success: false,
        message: 'bookId and fileId are required',
      });
    }

    const bookFile = await hierarchyService.getBookFileById(bookId, fileId);

    if (!bookFile) {
      return res.status(404).json({
        success: false,
        message: 'Book file not found',
      });
    }

    // Delete from DynamoDB
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'ap-south-1',
    });

    await dynamoDB
      .delete({
        TableName: process.env.BOOK_FILES_TABLE || 'BookFilesTable',
        Key: {
          bookId: bookId,
          fileId: fileId,
        },
      })
      .promise();

    console.log(`✅ Deleted book record from DynamoDB: bookId=${bookId}, fileId=${fileId}`);

    res.status(200).json({
      success: true,
      message: 'Book file deleted successfully',
      data: {
        bookId,
        fileId,
        fileName: bookFile.fileName,
      },
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadBookFile,
  getChaptersForSubject,
  getBookFilesForChapter,
  getAllBooks,
  getBookDetails,
  deleteBook,
};
