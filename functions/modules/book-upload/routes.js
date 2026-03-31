/**
 * Book Upload Routes
 * Endpoints for book file management and chapter creation
 */

const express = require('express');
const controller = require('./controller');
const tnStateBoardController = require('./tn-state-board-controller');

const router = express.Router();

/**
 * POST /book-upload/upload
 * Upload book file and create chapter with vector data
 * Body: {
 *   fileId: string (from Anthropic Files API),
 *   fileName: string,
 *   syllabusId: string,
 *   standardId: string,
 *   subjectId: string,
 *   chapterName: string,
 *   fileSize?: number
 * }
 */
router.post('/upload', controller.uploadBookFile);

/**
 * GET /book-upload/books
 * Get all books
 */
router.get('/books', controller.getAllBooks);

/**
 * GET /book-upload/books/:bookId/:fileId
 * Get book details
 */
router.get('/books/:bookId/:fileId', controller.getBookDetails);

/**
 * GET /book-upload/chapters/:subjectId
 * Get chapters for a subject
 */
router.get('/chapters/:subjectId', controller.getChaptersForSubject);

/**
 * GET /book-upload/files/:chapterId
 * Get book files for a chapter
 */
router.get('/files/:chapterId', controller.getBookFilesForChapter);

/**
 * DELETE /book-upload/books/:bookId/:fileId
 * Delete book file
 */
router.delete('/books/:bookId/:fileId', controller.deleteBook);

/**
 * POST /book-upload/split-sections
 * Split book chapter text into sections using Claude
 * Body: { text, chapterName, metadata: { subjectId, standardId, syllabusId, bookType } }
 */
router.post('/split-sections', controller.splitBookSections);

/**
 * POST /book-upload/split-tn-sections
 * Split TN State Board book chapter text into units and sections
 * Body: { text, chapterName, metadata: { subjectId, standardId, syllabusId, bookType } }
 */
router.post('/split-tn-sections', controller.splitTNSections);

/**
 * POST /book-upload/tn-state-board/extract-chapters
 * Extract chapter and section names from TN State Board textbooks
 * Division is passed from UI (optional, attached to all chapters if provided)
 * Extracts ONLY chapter names and section names (no content)
 * 
 * Body: { 
 *   text: string (textbook content),
 *   bookTitle: string,
 *   syllabusId: string,
 *   standardId: string,
 *   subjectId: string,
 *   division?: string (optional: HISTORY, GEOGRAPHY, CIVICS, ECONOMICS)
 * }
 * 
 * Response: {
 *   success: true,
 *   bookTitle: string,
 *   division: string | null,
 *   totalChapters: number,
 *   totalSections: number,
 *   chapters: [
 *     {
 *       chapterNumber: string,
 *       chapterTitle: string,
 *       division?: string (if provided in request),
 *       sections: [
 *         { sectionNumber: string, sectionTitle: string }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/tn-state-board/extract-chapters', tnStateBoardController.extractTNStateBoardChapters);

module.exports = router;
