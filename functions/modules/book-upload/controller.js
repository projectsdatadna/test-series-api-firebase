/**
 * Book Upload Controller
 * Handles file upload, chapter creation, and RAG vector processing
 */

const AWS = require('aws-sdk');
const hierarchyService = require('./service');
const { processPDFToVectors } = require('../rag/pdfProcessor');
const { updateDocumentVectors } = require('../rag/dynamodbStore');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'ap-south-1' });
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'edufit-books';

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
    console.log('[getChaptersForSubject] ===== START REQUEST =====');
    console.log('[getChaptersForSubject] Request received at:', new Date().toISOString());
    
    const { subjectId } = req.params;
    console.log('[getChaptersForSubject] subjectId:', subjectId);

    if (!subjectId) {
      console.error('[getChaptersForSubject] ❌ Validation failed - subjectId is required');
      return res.status(400).json({
        success: false,
        message: 'subjectId is required',
      });
    }

    console.log('[getChaptersForSubject] ✅ Validation passed');
    console.log('[getChaptersForSubject] Fetching chapters from database...');
    
    const chapters = await hierarchyService.getChaptersBySubject(subjectId);
    
    console.log('[getChaptersForSubject] ✅ Chapters fetched:', chapters.length);
    console.log('[getChaptersForSubject] Chapters:', JSON.stringify(chapters, null, 2));

    console.log('[getChaptersForSubject] Sending response...');
    res.status(200).json({
      success: true,
      data: chapters,
      count: chapters.length,
      message: 'Chapters fetched successfully',
    });
    
    console.log('[getChaptersForSubject] ===== END REQUEST (SUCCESS) =====');
  } catch (error) {
    console.error('[getChaptersForSubject] ❌ Error:', error.message);
    console.error('[getChaptersForSubject] Error stack:', error.stack);
    console.log('[getChaptersForSubject] ===== END REQUEST (ERROR) =====');
    
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
    console.log('[getBookFilesForChapter] ===== START REQUEST =====');
    console.log('[getBookFilesForChapter] Request received at:', new Date().toISOString());
    
    const { chapterId } = req.params;
    console.log('[getBookFilesForChapter] chapterId:', chapterId);

    if (!chapterId) {
      console.error('[getBookFilesForChapter] ❌ Validation failed - chapterId is required');
      return res.status(400).json({
        success: false,
        message: 'chapterId is required',
      });
    }

    console.log('[getBookFilesForChapter] ✅ Validation passed');
    console.log('[getBookFilesForChapter] Fetching book files from database...');
    
    const bookFiles = await hierarchyService.getBookFilesByChapter(chapterId);
    
    console.log('[getBookFilesForChapter] ✅ Book files fetched:', bookFiles.length);
    console.log('[getBookFilesForChapter] Book files:', JSON.stringify(bookFiles, null, 2));

    console.log('[getBookFilesForChapter] Sending response...');
    res.status(200).json({
      success: true,
      data: bookFiles,
      count: bookFiles.length,
      message: 'Book files fetched successfully',
    });
    
    console.log('[getBookFilesForChapter] ===== END REQUEST (SUCCESS) =====');
  } catch (error) {
    console.error('[getBookFilesForChapter] ❌ Error:', error.message);
    console.error('[getBookFilesForChapter] Error stack:', error.stack);
    console.log('[getBookFilesForChapter] ===== END REQUEST (ERROR) =====');
    
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
    console.log('[getAllBooks] ===== START REQUEST =====');
    console.log('[getAllBooks] Request received at:', new Date().toISOString());
    
    console.log('[getAllBooks] Fetching all books from database...');
    const books = await hierarchyService.getAllBooks();
    
    console.log('[getAllBooks] ✅ Books fetched:', books.length);
    console.log('[getAllBooks] Books:', JSON.stringify(books, null, 2));

    console.log('[getAllBooks] Sending response...');
    res.status(200).json({
      success: true,
      data: books,
      count: books.length,
      message: 'All books fetched successfully',
    });
    
    console.log('[getAllBooks] ===== END REQUEST (SUCCESS) =====');
  } catch (error) {
    console.error('[getAllBooks] ❌ Error:', error.message);
    console.error('[getAllBooks] Error stack:', error.stack);
    console.log('[getAllBooks] ===== END REQUEST (ERROR) =====');
    
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
    console.log('[getBookDetails] ===== START REQUEST =====');
    console.log('[getBookDetails] Request received at:', new Date().toISOString());
    
    const { bookId, fileId } = req.params;
    console.log('[getBookDetails] bookId:', bookId);
    console.log('[getBookDetails] fileId:', fileId);

    if (!bookId || !fileId) {
      console.error('[getBookDetails] ❌ Validation failed - bookId and fileId are required');
      return res.status(400).json({
        success: false,
        message: 'bookId and fileId are required',
      });
    }

    console.log('[getBookDetails] ✅ Validation passed');
    console.log('[getBookDetails] Fetching book file from database...');
    
    const bookFile = await hierarchyService.getBookFileById(bookId, fileId);
    
    console.log('[getBookDetails] Book file result:', bookFile ? 'Found' : 'Not found');

    if (!bookFile) {
      console.error('[getBookDetails] ❌ Book file not found');
      return res.status(404).json({
        success: false,
        message: 'Book file not found',
      });
    }

    console.log('[getBookDetails] ✅ Book file fetched:', JSON.stringify(bookFile, null, 2));
    console.log('[getBookDetails] Fetching chapter details...');
    
    // Get chapter details to include hierarchy info
    let chapterDetails = null;
    try {
      chapterDetails = await hierarchyService.getChapterById(bookFile.chapterId);
      console.log('[getBookDetails] ✅ Chapter details fetched:', JSON.stringify(chapterDetails, null, 2));
    } catch (error) {
      console.error('[getBookDetails] ⚠️  Error fetching chapter details:', error.message);
    }

    console.log('[getBookDetails] Sending response...');
    res.status(200).json({
      success: true,
      data: {
        ...bookFile,
        chapter: chapterDetails,
      },
      message: 'Book details fetched successfully',
    });
    
    console.log('[getBookDetails] ===== END REQUEST (SUCCESS) =====');
  } catch (error) {
    console.error('[getBookDetails] ❌ Error:', error.message);
    console.error('[getBookDetails] Error stack:', error.stack);
    console.log('[getBookDetails] ===== END REQUEST (ERROR) =====');
    
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
    console.log('[deleteBook] ===== START REQUEST =====');
    console.log('[deleteBook] Request received at:', new Date().toISOString());
    
    const { bookId, fileId } = req.params;
    console.log('[deleteBook] bookId:', bookId);
    console.log('[deleteBook] fileId:', fileId);

    if (!bookId || !fileId) {
      console.error('[deleteBook] ❌ Validation failed - bookId and fileId are required');
      return res.status(400).json({
        success: false,
        message: 'bookId and fileId are required',
      });
    }

    console.log('[deleteBook] ✅ Validation passed');
    console.log('[deleteBook] Fetching book file from database...');
    
    const bookFile = await hierarchyService.getBookFileById(bookId, fileId);
    
    console.log('[deleteBook] Book file result:', bookFile ? 'Found' : 'Not found');

    if (!bookFile) {
      console.error('[deleteBook] ❌ Book file not found');
      return res.status(404).json({
        success: false,
        message: 'Book file not found',
      });
    }

    console.log('[deleteBook] ✅ Book file found:', JSON.stringify(bookFile, null, 2));
    console.log('[deleteBook] Deleting from DynamoDB...');

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

    console.log('[deleteBook] ✅ Deleted book record from DynamoDB: bookId=' + bookId + ', fileId=' + fileId);
    console.log('[deleteBook] Sending response...');

    res.status(200).json({
      success: true,
      message: 'Book file deleted successfully',
      data: {
        bookId,
        fileId,
        fileName: bookFile.fileName,
      },
    });
    
    console.log('[deleteBook] ===== END REQUEST (SUCCESS) =====');
  } catch (error) {
    console.error('[deleteBook] ❌ Error:', error.message);
    console.error('[deleteBook] Error stack:', error.stack);
    console.log('[deleteBook] ===== END REQUEST (ERROR) =====');
    
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to extract section numbers from text
const extractSectionNumbers = (text) => {
  const sectionRegex = /\n\s*(\d+\.\d+)\s+([^\n]+)/g;
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ 
      number: match[1], 
      position: match.index,
      title: match[2].trim()
    });
  }
  return sections;
};

// Helper function to get actual section title from text
const getActualSectionTitle = (text, sectionNumber) => {
  const regex = new RegExp(`\\n\\s*${sectionNumber.replace(/\./g, '\\.')}\\s+([^\\n]+)`, 'i');
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
};

// Helper function to split text by main sections
const splitTextBySections = (text) => {
  const sections = extractSectionNumbers(text);
  const chunks = [];
  
  for (let i = 0; i < sections.length; i++) {
    const startPos = sections[i].position;
    const endPos = i < sections.length - 1 ? sections[i + 1].position : text.length;
    const sectionNumber = sections[i].number;
    const sectionTitle = sections[i].title;
    const sectionText = text.substring(startPos, endPos);
    
    chunks.push({
      sectionNumber,
      sectionTitle,
      text: sectionText,
      length: sectionText.length
    });
  }
  
  return chunks;
};

// Helper function to call Azure API for a single section
const callAzureAPIForSection = async (sectionText, sectionNumber, chapterName, azureEndpoint, azureApiKey, deploymentName) => {
  const { getSplitSectionsPrompt } = require('./split-sections-prompt');
  const prompt = getSplitSectionsPrompt(sectionText, `${chapterName} - Section ${sectionNumber}`);
  
  const url = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-08-01-preview`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': azureApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting educational content from textbooks. Extract all sections and merge subsections into their parent sections. Include EVERY WORD of content. Return ONLY valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 16384,
      temperature: 0,
    }),
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Azure API error: ${response.status} - ${JSON.stringify(err)}`);
  }
  
  const data = await response.json();
  const rawContent = data.choices[0].message?.content;
  
  if (!rawContent) {
    return null;
  }
  
  const cleaned = rawContent
    .replace(/```json\n?|\n?```/g, '')
    .replace(/```\n?|\n?```/g, '')
    .trim();
  
  return JSON.parse(cleaned);
};

splitBookSections = async (req, res) => {
  try {
    console.log('[splitBookSections] ===== START REQUEST =====');
    console.log('[splitBookSections] Request received at:', new Date().toISOString());
    
    const { text, chapterName } = req.body;
    console.log('[splitBookSections] Chapter name:', chapterName);
    console.log('[splitBookSections] Text length:', text ? text.length : 0, 'chars');

    if (!text) {
      console.error('[splitBookSections] ❌ Validation failed - text is required');
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    console.log('[splitBookSections] ✅ Validation passed');

    const azureEndpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = 'gpt-4o-mini-testseries-pv';

    if (!azureApiKey || !azureEndpoint) {
      console.error('[splitBookSections] ❌ Azure credentials not configured');
      return res.status(500).json({ success: false, error: 'Azure OpenAI credentials not configured' });
    }

    console.log('[splitBookSections] ===== SPLITTING TEXT BY SECTIONS =====');
    
    // Split text into chunks by main section numbers
    const textChunks = splitTextBySections(text);
    console.log('[splitBookSections] Text split into', textChunks.length, 'chunks');
    textChunks.forEach((chunk, idx) => {
      console.log(`[splitBookSections] Chunk ${idx + 1}: Section ${chunk.sectionNumber} (${chunk.length} chars)`);
    });

    console.log('[splitBookSections] ===== PROCESSING CHUNKS WITH MULTIPLE API CALLS =====');
    
    const allSections = [];
    const inputContentLength = text.length;
    
    // Process each chunk with a separate API call
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`[splitBookSections] Processing chunk ${i + 1}/${textChunks.length}: Section ${chunk.sectionNumber}`);
      
      try {
        const result = await callAzureAPIForSection(
          chunk.text,
          chunk.sectionNumber,
          chapterName,
          azureEndpoint,
          azureApiKey,
          deploymentName
        );
        
        if (result && result.sections && Array.isArray(result.sections)) {
          console.log(`[splitBookSections] ✓ Chunk ${i + 1} returned ${result.sections.length} section(s)`);
          allSections.push(...result.sections);
        } else {
          console.log(`[splitBookSections] ⚠️  Chunk ${i + 1} returned no valid sections`);
        }
      } catch (error) {
        console.error(`[splitBookSections] ❌ Error processing chunk ${i + 1}:`, error.message);
        throw error;
      }
    }

    console.log('[splitBookSections] ===== VALIDATING ALL SECTIONS =====');
    
    // Create a map of section numbers to actual titles from the original text
    const actualTitles = {};
    const textChunksMap = {};
    textChunks.forEach(chunk => {
      actualTitles[chunk.sectionNumber] = chunk.sectionTitle;
      textChunksMap[chunk.sectionNumber] = chunk.text;
    });
    
    const sections = allSections.filter((s, idx) => {
      const hasNumber = s.sectionNumber && s.sectionNumber.trim();
      const hasTitle = s.sectionTitle && s.sectionTitle.trim();
      const hasContent = s.content && s.content.trim();
      
      if (!hasNumber || !hasTitle || !hasContent) {
        console.log(`[splitBookSections] ⚠️  Skipping invalid section at index ${idx}`);
        return false;
      }
      
      // Fix truncated or incorrect titles by using the actual title from the text
      if (actualTitles[s.sectionNumber]) {
        const originalTitle = s.sectionTitle;
        s.sectionTitle = actualTitles[s.sectionNumber];
        if (originalTitle !== s.sectionTitle) {
          console.log(`[splitBookSections] ✓ Fixed title for ${s.sectionNumber}: "${originalTitle}" → "${s.sectionTitle}"`);
        }
      }
      
      console.log(`[splitBookSections] ✓ Valid section: ${s.sectionNumber} - "${s.sectionTitle}" (${s.content.length} chars)`);
      return true;
    });

    console.log('[splitBookSections] ===== PROCESSING COMPLETE =====');
    console.log('[splitBookSections] Total valid sections:', sections.length);

    // Calculate total output content
    const totalOutputContent = sections.reduce((sum, s) => sum + (s.content ? s.content.length : 0), 0);
    console.log('[splitBookSections] Input text total length:', inputContentLength, 'chars');
    console.log('[splitBookSections] Total output content length:', totalOutputContent, 'chars');
    
    // Content loss detection
    const contentLossPercentage = ((inputContentLength - totalOutputContent) / inputContentLength * 100).toFixed(2);
    console.log('[splitBookSections] Content loss:', contentLossPercentage, '%');
    
    if (contentLossPercentage > 30) {
      console.warn('[splitBookSections] ⚠️  WARNING: Content loss detected (' + contentLossPercentage + '%)');
    }

    // Detailed logging of structure
    console.log('[splitBookSections] ===== FINAL STRUCTURE =====');
    sections.forEach((s, idx) => {
      console.log(`[splitBookSections] [${idx + 1}] ${s.sectionNumber}: "${s.sectionTitle}" (${s.content.length} chars)`);
    });
    
    const responseData = { success: true, chapterName, sections };
    console.log('[splitBookSections] Response object created with', responseData.sections.length, 'sections');
    console.log('[splitBookSections] Sending response...');

    res.json(responseData);
    
    console.log('[splitBookSections] ===== END REQUEST (SUCCESS) =====');

  } catch (error) {
    console.error('[splitBookSections] ❌ Error:', error.message);
    console.error('[splitBookSections] Error stack:', error.stack);
    console.log('[splitBookSections] ===== END REQUEST (ERROR) =====');
    
    return res.status(500).json({ success: false, error: error.message });
  }
};

const splitTNSections = async (req, res) => {
  try {
    const { text, chapterName, metadata } = req.body;

    console.log('[splitTNSections] ===== START REQUEST =====');
    console.log('[splitTNSections] Request received at:', new Date().toISOString());
    console.log('[splitTNSections] Chapter name:', chapterName);
    console.log('[splitTNSections] Metadata:', JSON.stringify(metadata));

    if (!text) {
      console.error('[splitTNSections] Missing text in request body');
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    console.log(`[splitTNSections] Input text length: ${text.length} chars`);
    console.log(`[splitTNSections] First 200 chars of text:`, text.substring(0, 200));

    const azureEndpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = 'gpt-4o-mini-testseries-pv';

    console.log('[splitTNSections] Azure endpoint:', azureEndpoint);
    console.log('[splitTNSections] Deployment name:', deploymentName);
    console.log('[splitTNSections] API key configured:', !!azureApiKey);

    if (!azureApiKey || !azureEndpoint) {
      console.error('[splitTNSections] Azure credentials not configured');
      return res.status(500).json({ success: false, error: 'Azure OpenAI credentials not configured' });
    }

    // CHUNKING LOGIC: Split text into manageable chunks with overlap
    const CHUNK_SIZE = 30000; // Reduced from 50000 to 30000 chars (~7,500 tokens per chunk)
    const OVERLAP_SIZE = 6000; // Increased from 3000 to 6000 chars to capture sections spanning boundaries
    const chunks = [];
    
    console.log('[splitTNSections] ===== TEXT CHUNKING =====');
    console.log('[splitTNSections] Total text length:', text.length, 'chars');
    console.log('[splitTNSections] Chunk size:', CHUNK_SIZE, 'chars');
    console.log('[splitTNSections] Overlap size:', OVERLAP_SIZE, 'chars');
    
    // Create chunks with overlap - ensure NO content is lost
    let currentPos = 0;
    while (currentPos < text.length) {
      const chunkStart = Math.max(0, currentPos - (currentPos > 0 ? OVERLAP_SIZE : 0));
      const chunkEnd = Math.min(text.length, currentPos + CHUNK_SIZE);
      
      chunks.push({
        text: text.substring(chunkStart, chunkEnd),
        startIdx: chunkStart,
        endIdx: chunkEnd,
        isOverlap: currentPos > 0,
        chunkNumber: chunks.length + 1
      });
      
      // Move to next chunk position (no gap)
      currentPos = chunkEnd;
    }
    
    console.log('[splitTNSections] Total chunks created:', chunks.length);
    chunks.forEach((chunk, idx) => {
      console.log(`[splitTNSections] Chunk ${idx + 1}: ${chunk.text.length} chars (start: ${chunk.startIdx}, end: ${chunk.endIdx}, overlap: ${chunk.isOverlap})`);
    });
    
    // Validate coverage
    console.log('[splitTNSections] ===== COVERAGE VALIDATION =====');
    let totalCoverage = 0;
    let gapFound = false;
    
    for (let i = 0; i < chunks.length - 1; i++) {
      const currentEnd = chunks[i].endIdx;
      const nextStart = chunks[i + 1].startIdx;
      
      if (currentEnd < nextStart) {
        console.error(`[splitTNSections] GAP FOUND: Between chunk ${i + 1} and ${i + 2}`);
        console.error(`[splitTNSections] Gap range: ${currentEnd} to ${nextStart} (${nextStart - currentEnd} chars)`);
        gapFound = true;
      }
    }
    
    if (!gapFound) {
      console.log('[splitTNSections] ✓ No gaps found - full text coverage confirmed');
    }
    
    // Check if last chunk covers to end
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk.endIdx === text.length) {
      console.log('[splitTNSections] ✓ Last chunk covers to end of text');
    } else {
      console.error(`[splitTNSections] ERROR: Last chunk does not cover to end`);
      console.error(`[splitTNSections] Last chunk ends at: ${lastChunk.endIdx}, Text length: ${text.length}`);
      console.error(`[splitTNSections] Missing: ${text.length - lastChunk.endIdx} chars`);
    }
    
    // Check if first chunk starts from beginning
    if (chunks[0].startIdx === 0) {
      console.log('[splitTNSections] ✓ First chunk starts from beginning');
    } else {
      console.error(`[splitTNSections] ERROR: First chunk does not start from beginning`);
      console.error(`[splitTNSections] First chunk starts at: ${chunks[0].startIdx}`);
    }

    // Process all chunks and collect sections
    const allSections = [];
    const processedUnits = new Map(); // Track units with full details to prevent data loss
    const sectionContentMap = new Map(); // Track section content to detect true duplicates

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunkData = chunks[chunkIdx];
      const chunkText = chunkData.text;
      console.log(`[splitTNSections] ===== PROCESSING CHUNK ${chunkIdx + 1}/${chunks.length} =====`);
      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Text range: ${chunkData.startIdx} to ${chunkData.endIdx}`);

      const url = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-08-01-preview`;

      const systemPrompt = `You are an expert at extracting structured information from TN State Board textbooks.
Your task is to extract all UNITS (chapters) and SECTIONS from the provided textbook.

IMPORTANT RULES FOR TN STATE BOARD BOOKS:
1. TN books are organized as: UNIT → SECTIONS
2. For SOCIAL SCIENCE books: Identify the DIVISION (HISTORY, GEOGRAPHY, CIVICS, or ECONOMICS) for each unit
3. For SCIENCE books: No division needed
4. Extract EVERY unit and section from the book - DO NOT SKIP ANY
5. Preserve exact unit and section numbering from the original text
6. Handle two-column layouts by combining content logically
7. Maintain hierarchical structure (Unit > Sections)
8. Skip table of contents, preface, front matter, and appendices
9. Include only actual content units

Return ONLY valid JSON with no additional text.`;

      const userPrompt = `Extract all units and sections from this TN State Board textbook chunk.

TEXTBOOK CONTENT:
${chunkText}

Return JSON in this exact format:
{
  "success": true,
  "sections": [
    {
      "sectionNumber": "1.0",
      "sectionTitle": "1 - Advent of the Europeans",
      "division": null,
      "content": "Complete unit introduction/overview content here...",
      "sectionType": "chapter"
    },
    {
      "sectionNumber": "1.1",
      "sectionTitle": "Sources of Modern India",
      "division": null,
      "content": "Complete section content here...",
      "sectionType": "section"
    }
  ]
}

CRITICAL EXTRACTION GUIDELINES:
- For CHAPTER sections (X.0): Include chapter number with title in format "X - Title" (e.g., "1 - Advent of the Europeans" NOT "Unit 1: Advent of the Europeans")
- For SUBSECTIONS (X.1, X.2, etc.): Extract exact names WITHOUT section numbers (e.g., "Sources of Modern India" NOT "1.1 Sources of Modern India")
- Extract EVERY unit and section - do not skip any
- Unit numbers: Use actual unit numbers from book (1, 2, 3, etc.)
- Section numbers: Use decimal format (1.1, 1.2, 1.3, etc.)
- Content: Include main content of each section
- Two-column handling: Combine logically
- Skip: Exercises, activities, practice problems, lab procedures
- Include: Learning objectives, key concepts, definitions, explanations
- For Social Science: division MUST be one of: HISTORY, GEOGRAPHY, CIVICS, ECONOMICS (or null if not applicable)
- For Science: division should be null`;

      const requestBody = {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 6144,
        temperature: 0,
      };

      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Request body size:`, JSON.stringify(requestBody).length, 'bytes');
      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - User prompt length:`, userPrompt.length, 'chars');

      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - ===== CALLING AZURE API =====`);
      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Fetch URL:`, url);

      let response;
      const fetchStartTime = Date.now();

      try {
        console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Starting fetch call...`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'api-key': azureApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Fetch completed in`, fetchDuration, 'ms');
      } catch (err) {
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Fetch call failed with exception`);
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Fetch error:`, err.message);
        throw err;
      }

      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Response status:`, response.status);

      if (!response.ok) {
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - ===== AZURE API ERROR =====`);
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Status code:`, response.status);
        
        let errorData;
        try {
          errorData = await response.json();
          console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Error response:`, JSON.stringify(errorData, null, 2));
        } catch (parseErr) {
          const errorText = await response.text();
          console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Error response (text):`, errorText);
          throw new Error(`Azure API error: ${response.status} - ${errorText}`);
        }
        
        throw new Error(`Azure API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const rawContent = data.choices[0].message?.content;

      if (!rawContent) {
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - No content in response`);
        continue;
      }

      console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Response length:`, rawContent.length, 'chars');

      let parsed;
      try {
        const cleaned = rawContent
          .replace(/```json\n?|\n?```/g, '')
          .replace(/```\n?|\n?```/g, '')
          .trim();
        
        parsed = JSON.parse(cleaned);
        console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Successfully parsed JSON`);
        console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Sections in chunk:`, parsed.sections?.length || 0);
      } catch (e) {
        console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Parse error:`, e.message);
        
        // Try to fix incomplete JSON by finding the last complete section
        try {
          console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Attempting to fix incomplete JSON...`);
          const lastBracketIdx = rawContent.lastIndexOf('}');
          if (lastBracketIdx > 0) {
            const fixedContent = rawContent.substring(0, lastBracketIdx + 1);
            const cleaned = fixedContent
              .replace(/```json\n?|\n?```/g, '')
              .replace(/```\n?|\n?```/g, '')
              .trim();
            
            parsed = JSON.parse(cleaned);
            console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Successfully fixed and parsed JSON`);
            console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Sections in chunk:`, parsed.sections?.length || 0);
          } else {
            throw new Error('Could not find closing bracket');
          }
        } catch (fixErr) {
          console.error(`[splitTNSections] Chunk ${chunkIdx + 1} - Failed to fix JSON:`, fixErr.message);
          continue;
        }
      }

      if (parsed.sections && Array.isArray(parsed.sections)) {
        // Add sections from this chunk, avoiding duplicates
        parsed.sections.forEach(section => {
          // Clean section title: remove section number prefix if present
          let cleanTitle = section.sectionTitle || '';
          
          // Remove patterns like "1.1 ", "1.2 ", "2.1 " from the beginning (for subsections only)
          if (section.sectionType === 'section') {
            cleanTitle = cleanTitle.replace(/^\d+\.\d+\s+/, '').trim();
          }
          // For chapter sections (X.0), keep the "X - Title" format as is
          // No cleanup needed - the AI should already provide it in correct format
          
          const key = `${section.sectionNumber}-${cleanTitle}`;
          const contentHash = `${section.sectionNumber}-${(section.content || '').substring(0, 100)}`;
          
          // Improved duplicate detection: Allow new subsections even if parent unit exists
          // Only skip if EXACT same section number AND title AND content
          const isDuplicate = processedUnits.has(key) && 
                             sectionContentMap.has(contentHash);
          
          if (!isDuplicate) {
            allSections.push({
              ...section,
              sectionTitle: cleanTitle,
            });
            processedUnits.set(key, section);
            sectionContentMap.set(contentHash, section);
            console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Added section: ${section.sectionNumber} - ${cleanTitle}${section.division ? ` [${section.division}]` : ''}`);
          } else {
            console.log(`[splitTNSections] Chunk ${chunkIdx + 1} - Skipped duplicate: ${section.sectionNumber}`);
          }
        });
      }
    }

    console.log('[splitTNSections] ===== COMBINING RESULTS =====');
    console.log('[splitTNSections] Total unique sections extracted:', allSections.length);
    console.log('[splitTNSections] Processed units map size:', processedUnits.size);
    console.log('[splitTNSections] Section content map size:', sectionContentMap.size);

    // POST-PROCESSING: Detect and re-process incomplete units
    console.log('[splitTNSections] ===== POST-PROCESSING: DETECTING INCOMPLETE UNITS =====');
    const unitMap = new Map();
    allSections.forEach(section => {
      const unitNum = section.sectionNumber.split('.')[0];
      if (!unitMap.has(unitNum)) {
        unitMap.set(unitNum, []);
      }
      unitMap.get(unitNum).push(section);
    });

    const incompleteUnits = [];
    unitMap.forEach((sections, unitNum) => {
      // A unit is incomplete if it only has the chapter (X.0) but no subsections (X.1, X.2, etc.)
      const hasChapter = sections.some(s => s.sectionNumber === `${unitNum}.0`);
      const hasSubsections = sections.some(s => s.sectionNumber.includes('.') && s.sectionNumber !== `${unitNum}.0`);
      
      if (hasChapter && !hasSubsections) {
        incompleteUnits.push(parseInt(unitNum));
        console.log(`[splitTNSections] ⚠️  Unit ${unitNum} is incomplete - has chapter but no subsections`);
      }
    });

    // Re-process chunks for incomplete units
    if (incompleteUnits.length > 0) {
      console.log(`[splitTNSections] Re-processing ${incompleteUnits.length} incomplete unit(s)...`);
      
      for (const incompleteUnitNum of incompleteUnits) {
        console.log(`[splitTNSections] Re-processing Unit ${incompleteUnitNum}...`);
        
        // Find chunks that might contain this unit
        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
          const chunkData = chunks[chunkIdx];
          const chunkText = chunkData.text;
          
          // Check if this chunk likely contains the unit (by searching for unit pattern)
          const unitPattern = new RegExp(`\\b${incompleteUnitNum}\\s*[.:]`, 'i');
          if (!unitPattern.test(chunkText)) {
            continue;
          }
          
          console.log(`[splitTNSections] Re-processing Unit ${incompleteUnitNum} in Chunk ${chunkIdx + 1}...`);
          
          const url = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-08-01-preview`;
          
          const systemPrompt = `You are an expert at extracting structured information from TN State Board textbooks.
Your task is to extract ALL subsections for a specific unit.

IMPORTANT: Extract EVERY subsection (X.1, X.2, X.3, etc.) for the given unit.
Do NOT skip any subsections.`;

          const userPrompt = `Extract ALL subsections for Unit ${incompleteUnitNum} from this textbook chunk.
Include EVERY subsection numbered ${incompleteUnitNum}.1, ${incompleteUnitNum}.2, ${incompleteUnitNum}.3, etc.

TEXTBOOK CONTENT:
${chunkText}

Return JSON in this exact format:
{
  "success": true,
  "sections": [
    {
      "sectionNumber": "${incompleteUnitNum}.1",
      "sectionTitle": "Section Title Here",
      "division": null,
      "content": "Complete section content here...",
      "sectionType": "section"
    }
  ]
}

CRITICAL: Extract EVERY subsection for Unit ${incompleteUnitNum}. Do not skip any.`;

          const requestBody = {
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 6144,
            temperature: 0,
          };

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'api-key': azureApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              console.error(`[splitTNSections] Re-process failed for Unit ${incompleteUnitNum} in Chunk ${chunkIdx + 1}`);
              continue;
            }

            const data = await response.json();
            const rawContent = data.choices[0].message?.content;

            if (!rawContent) {
              continue;
            }

            let parsed;
            try {
              const cleaned = rawContent
                .replace(/```json\n?|\n?```/g, '')
                .replace(/```\n?|\n?```/g, '')
                .trim();
              parsed = JSON.parse(cleaned);
            } catch (e) {
              console.error(`[splitTNSections] Parse error during re-process for Unit ${incompleteUnitNum}`);
              continue;
            }

            if (parsed.sections && Array.isArray(parsed.sections)) {
              let addedCount = 0;
              parsed.sections.forEach(section => {
                let cleanTitle = section.sectionTitle || '';
                cleanTitle = cleanTitle.replace(/^\d+\.\d+\s+/, '').trim();
                
                const key = `${section.sectionNumber}-${cleanTitle}`;
                
                if (!processedUnits.has(key)) {
                  allSections.push({
                    ...section,
                    sectionTitle: cleanTitle,
                  });
                  processedUnits.set(key, section);
                  addedCount++;
                  console.log(`[splitTNSections] Re-process: Added section ${section.sectionNumber} - ${cleanTitle}`);
                }
              });
              
              if (addedCount > 0) {
                console.log(`[splitTNSections] Re-process: Added ${addedCount} new sections for Unit ${incompleteUnitNum}`);
                break; // Move to next incomplete unit
              }
            }
          } catch (err) {
            console.error(`[splitTNSections] Re-process error for Unit ${incompleteUnitNum}:`, err.message);
            continue;
          }
        }
      }
    }
    
    console.log('[splitTNSections] ===== POST-PROCESSING COMPLETE =====');

    // Validate and normalize sections
    const sections = allSections.map(s => {
      let title = s.sectionTitle || '';
      
      // Additional cleanup for section titles
      if (s.sectionType === 'section') {
        // Remove any remaining section number prefix for subsections
        title = title.replace(/^\d+\.\d+\s+/, '').trim();
      }
      // For chapters, keep the "X - Title" format as is - no cleanup needed
      
      const normalized = {
        sectionNumber: s.sectionNumber || '',
        sectionTitle: title,
        content: s.content || '',
        sectionType: s.sectionType || 'section',
      };
      
      // Preserve division field if present (for Social Science books)
      if (s.division) {
        normalized.division = s.division;
      }
      
      return normalized;
    });

    // Log validation warnings for any remaining incomplete units
    const incompleteUnitTitles = sections.filter(s => 
      s.sectionType === 'chapter' && 
      (s.sectionTitle.match(/^Unit \d+$/) || !s.sectionTitle.includes(':'))
    );
    
    if (incompleteUnitTitles.length > 0) {
      console.warn('[splitTNSections] WARNING: Found incomplete unit titles:');
      incompleteUnitTitles.forEach(unit => {
        console.warn(`[splitTNSections]   - ${unit.sectionNumber}: "${unit.sectionTitle}"`);
      });
    }

    // Final coverage validation
    console.log('[splitTNSections] ===== FINAL COVERAGE VALIDATION =====');
    const unitSections = sections.filter(s => s.sectionType === 'chapter');
    const contentSections = sections.filter(s => s.sectionType === 'section');
    
    console.log('[splitTNSections] Total units (chapters) extracted:', unitSections.length);
    console.log('[splitTNSections] Total sections extracted:', contentSections.length);
    console.log('[splitTNSections] Total items:', sections.length);
    
    // Check for divisions (Social Science books)
    const divisions = [...new Set(sections.filter(s => s.division).map(s => s.division))];
    if (divisions.length > 0) {
      console.log('[splitTNSections] Divisions found:', divisions.join(', '));
      divisions.forEach(div => {
        const divSections = sections.filter(s => s.division === div);
        console.log(`[splitTNSections]   - ${div}: ${divSections.length} sections`);
      });
    }
    
    // Extract unit numbers to check for gaps
    const unitNumbers = unitSections
      .map(u => parseInt(u.sectionNumber.split('.')[0]))
      .sort((a, b) => a - b);
    
    if (unitNumbers.length > 0) {
      console.log('[splitTNSections] Unit range: Unit', unitNumbers[0], 'to Unit', unitNumbers[unitNumbers.length - 1]);
      
      // Check for missing units
      const missingUnits = [];
      for (let i = unitNumbers[0]; i <= unitNumbers[unitNumbers.length - 1]; i++) {
        if (!unitNumbers.includes(i)) {
          missingUnits.push(i);
        }
      }
      
      if (missingUnits.length > 0) {
        console.warn('[splitTNSections] WARNING: Missing units:', missingUnits.join(', '));
      } else {
        console.log('[splitTNSections] ✓ All units in range are present (no gaps)');
      }
    }

    console.log('[splitTNSections] Normalized sections count:', sections.length);
    console.log('[splitTNSections] Sections with proper titles:', sections.filter(s => s.sectionTitle.length > 0).length);
    console.log('[splitTNSections] ===== END REQUEST (SUCCESS) =====');

    return res.json({ success: true, sections });

  } catch (error) {
    console.error('[splitTNSections] ===== END REQUEST (ERROR) =====');
    console.error('[splitTNSections] Error type:', error.constructor.name);
    console.error('[splitTNSections] Error message:', error.message);
    console.error('[splitTNSections] Error stack:', error.stack);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  uploadBookFile,
  getChaptersForSubject,
  getBookFilesForChapter,
  getAllBooks,
  getBookDetails,
  deleteBook,
  splitBookSections,
  splitTNSections,
};
