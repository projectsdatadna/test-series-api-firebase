/**
 * File Hierarchy Service
 * Manages book files, chapters, and their relationships in DynamoDB
 */

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const BOOK_FILES_TABLE = process.env.BOOK_FILES_TABLE || 'BookFilesTable';
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || 'ChaptersTable';

/**
 * Create a chapter with hierarchy information
 * @param {string} subjectId - Subject ID
 * @param {string} chapterName - Chapter name
 * @param {string} fileId - File ID from Anthropic
 * @param {string} syllabusId - Syllabus ID
 * @param {string} standardId - Standard ID
 * @returns {Promise<Object>} Created chapter
 */
async function createChapter(subjectId, chapterName, fileId, syllabusId, standardId) {
  try {
    const chapterId = `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chapter = {
      chapterId,
      subjectId,
      chapterName,
      fileId,
      syllabusId,
      standardId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vectorData: [], // Will be populated when PDF is processed
    };

    await dynamoDB
      .put({
        TableName: CHAPTERS_TABLE,
        Item: chapter,
      })
      .promise();

    console.log(`[File Hierarchy] Chapter created: ${chapterId}`);
    return chapter;
  } catch (error) {
    console.error('[File Hierarchy] Error creating chapter:', error.message);
    throw error;
  }
}

/**
 * Create a book file record
 * @param {string} fileId - File ID from Anthropic
 * @param {string} fileName - File name
 * @param {string} chapterId - Chapter ID
 * @param {number} fileSize - File size in bytes
 * @param {string} uploadedAt - Upload timestamp
 * @returns {Promise<Object>} Created book file
 */
async function createBookFile(fileId, fileName, chapterId, fileSize, uploadedAt) {
  try {
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const bookFile = {
      bookId,
      fileId,
      fileName,
      chapterId,
      fileSize,
      uploadedAt,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await dynamoDB
      .put({
        TableName: BOOK_FILES_TABLE,
        Item: bookFile,
      })
      .promise();

    console.log(`[File Hierarchy] Book file created: ${bookId}`);
    return bookFile;
  } catch (error) {
    console.error('[File Hierarchy] Error creating book file:', error.message);
    throw error;
  }
}

/**
 * Update chapter with vector data
 * @param {string} chapterId - Chapter ID
 * @param {Array} vectorData - Vector data from RAG processing
 * @returns {Promise<Object>} Updated chapter
 */
async function updateChapterVectorData(chapterId, vectorData) {
  try {
    const params = {
      TableName: CHAPTERS_TABLE,
      Key: { chapterId },
      UpdateExpression: `SET vectorData = :vectorData, updatedAt = :timestamp`,
      ExpressionAttributeValues: {
        ':vectorData': vectorData,
        ':timestamp': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDB.update(params).promise();

    console.log(`[File Hierarchy] Chapter ${chapterId} updated with ${vectorData.length} vector chunks`);
    return result.Attributes;
  } catch (error) {
    console.error('[File Hierarchy] Error updating chapter vector data:', error.message);
    throw error;
  }
}

/**
 * Get chapters by subject
 * @param {string} subjectId - Subject ID
 * @returns {Promise<Array>} Chapters for subject
 */
async function getChaptersBySubject(subjectId) {
  try {
    const result = await dynamoDB
      .query({
        TableName: CHAPTERS_TABLE,
        IndexName: 'subjectId-index', // Requires GSI on subjectId
        KeyConditionExpression: 'subjectId = :subjectId',
        ExpressionAttributeValues: {
          ':subjectId': subjectId,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error('[File Hierarchy] Error fetching chapters:', error.message);
    throw error;
  }
}

/**
 * Get book files by chapter
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<Array>} Book files for chapter
 */
async function getBookFilesByChapter(chapterId) {
  try {
    const result = await dynamoDB
      .query({
        TableName: BOOK_FILES_TABLE,
        IndexName: 'chapterId-index', // Requires GSI on chapterId
        KeyConditionExpression: 'chapterId = :chapterId',
        ExpressionAttributeValues: {
          ':chapterId': chapterId,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error('[File Hierarchy] Error fetching book files:', error.message);
    throw error;
  }
}

/**
 * Get all books
 * @returns {Promise<Array>} All books
 */
async function getAllBooks() {
  try {
    const result = await dynamoDB
      .scan({
        TableName: BOOK_FILES_TABLE,
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error('[File Hierarchy] Error fetching all books:', error.message);
    throw error;
  }
}

/**
 * Get book file by ID
 * @param {string} bookId - Book ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Book file
 */
async function getBookFileById(bookId, fileId) {
  try {
    const result = await dynamoDB
      .get({
        TableName: BOOK_FILES_TABLE,
        Key: { bookId, fileId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    console.error('[File Hierarchy] Error fetching book file:', error.message);
    throw error;
  }
}

/**
 * Get chapter by ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<Object>} Chapter
 */
async function getChapterById(chapterId) {
  try {
    const result = await dynamoDB
      .get({
        TableName: CHAPTERS_TABLE,
        Key: { chapterId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    console.error('[File Hierarchy] Error fetching chapter:', error.message);
    throw error;
  }
}

module.exports = {
  createChapter,
  createBookFile,
  updateChapterVectorData,
  getChaptersBySubject,
  getBookFilesByChapter,
  getAllBooks,
  getBookFileById,
  getChapterById,
};
