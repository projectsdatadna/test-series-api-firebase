require('dotenv').config();

/**
 * Get the appropriate puppeteer instance and launch options based on environment
 * Uses puppeteer for local, @sparticuz/chromium for Firebase Cloud Functions
 */
async function getPuppeteerAndOptions() {
  // Check if running in actual Firebase Cloud Functions (not emulator)
  // GCP_PROJECT is set in actual cloud environment, not in emulator
  const isActualCloudFunction = !!process.env.GCP_PROJECT || !!process.env.FUNCTION_TARGET;
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  
  console.log('[PDF] Environment detection:', {
    GCP_PROJECT: !!process.env.GCP_PROJECT,
    FUNCTION_TARGET: !!process.env.FUNCTION_TARGET,
    FIREBASE_CONFIG: !!process.env.FIREBASE_CONFIG,
    FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
    isActualCloudFunction,
    isEmulator,
  });
  
  try {
    // Force local puppeteer for emulator or local development
    if (isEmulator || !isActualCloudFunction) {
      // Local environment or emulator - use regular puppeteer
      const puppeteer = require('puppeteer');
      
      console.log('[PDF] Using puppeteer for local development/emulator');
      
      // Check if Chromium is available
      try {
        const executablePath = puppeteer.executablePath();
        console.log('[PDF] Chromium path:', executablePath);
      } catch (e) {
        console.warn('[PDF] Could not get Chromium path:', e.message);
      }
      
      return {
        puppeteer,
        launchOptions: {
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        },
      };
    } else {
      // Actual Firebase Cloud Functions - use @sparticuz/chromium
      const chromium = require('@sparticuz/chromium');
      const puppeteerCore = require('puppeteer-core');
      
      console.log('[PDF] Using @sparticuz/chromium for Firebase Cloud Functions');
      
      return {
        puppeteer: puppeteerCore,
        launchOptions: {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        },
      };
    }
  } catch (error) {
    console.error('[PDF] Failed to load puppeteer:', error.message);
    console.error('[PDF] Error details:', error);
    
    // Provide helpful error message
    if (error.message.includes('ENOENT') || error.message.includes('spawn')) {
      throw new Error(
        'Chromium not found. Please run: cd functions && npx puppeteer browsers install chrome\n' +
        'Or reinstall puppeteer: npm install puppeteer --force'
      );
    }
    
    throw new Error(`Puppeteer error: ${error.message}`);
  }
}

/**
 * Generate PDF from HTML and CSS
 * Uses puppeteer (local) or puppeteer-core with chromium from Lambda Layer
 * @param {string} html - HTML content
 * @param {string} css - CSS styles
 * @param {Object} options - PDF options
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDFBuffer(html, css, options = {}) {
  let browser = null;

  try {
    const {
      filename = 'document',
      format = 'A4',
      margin = { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground = true,
      preferCSSPageSize = false,
    } = options;

    console.log(`[PDF] Launching browser for: ${filename}`);

    // Get appropriate puppeteer and launch options based on environment
    const { puppeteer, launchOptions } = await getPuppeteerAndOptions();
    
    console.log(`[PDF] Environment: ${process.env.LAMBDA_TASK_ROOT ? 'Lambda' : 'Local'}`);
    console.log(`[PDF] Using Chromium from: ${launchOptions.executablePath || 'default'}`);

    browser = await puppeteer.launch(launchOptions);
    console.log('[PDF] Browser launched successfully');

    const page = await browser.newPage();
    
    // Set viewport for A4 rendering (794x1123 at 96 DPI)
    await page.setViewport({ 
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Clean HTML - remove interactive elements and scripts
    const cleanHTML = html
      .replace(/<button[^>]*>.*?<\/button>/gi, '')
      .replace(/<input[^>]*>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/onclick="[^"]*"/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');

    // Create complete HTML document with EXACT template styling
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Assessment Paper Preview</title>
          <style>
            /* Reset and Base Styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            html, body {
              width: 100%;
              height: auto;
            }

            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              color: #1f2937;
              background-color: white;
              line-height: 1.5;
            }

            /* Page Styles */
            [data-page] {
              background-color: white;
              margin: 0;
              width: 100%;
              height: auto;
              padding: 1.5rem 3rem 1.5rem 3rem;
              font-family: 'Georgia', 'Times New Roman', serif;
              border: none;
              position: relative;
              overflow: hidden;
              page-break-after: always;
              break-after: page;
            }

            [data-page]:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }

            /* Watermark */
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
              opacity: 0.03;
              font-size: 25rem;
              line-height: 1;
            }

            /* Document Content */
            [data-page] > div {
              position: relative;
              z-index: 10;
              font-size: 0.8125rem;
              line-height: 1.5;
              color: #1f2937;
            }

            /* Header Styles */
            [data-header] {
              text-align: center;
              border-bottom: 2px solid rgba(15, 23, 42, 0.1);
              padding-bottom: 1rem;
              margin-bottom: 1.5rem;
            }

            [data-header-institute] {
              font-size: 2rem;
              font-weight: 600;
              margin: 0 0 0.5rem 0;
              color: #1f2937;
            }

            [data-header-title] {
              text-transform: uppercase;
              display: block;
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 3mm;
              color: #000;
            }

            [data-header-subtitle] {
              font-size: 0.75rem;
              font-style: italic;
              font-weight: 600;
              margin: 0;
            }

            [data-header-meta] {
              display: flex;
              justify-content: space-between;
              margin-top: 1rem;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-top: 1px solid rgba(15, 23, 42, 0.1);
              padding-top: 0.75rem;
            }

            /* Section Styles */
            [data-section] {
              margin-bottom: 2rem;
            }

            [data-section-title] {
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-style: italic;
              border-bottom: 1px solid rgba(15, 23, 42, 0.1);
              padding-bottom: 0.25rem;
              margin: 0 0 1rem 0;
              font-size: 0.875rem;
            }

            /* Question Styles */
            [data-question] {
              position: relative;
              margin-bottom: 1.5rem;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            [data-question-text] {
              font-weight: 600;
              padding-right: 2rem;
              margin: 0 0 0.5rem 0;
              font-size: 0.8rem;
            }

            /* Options Grid */
            [data-options] {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem;
              margin-left: 1rem;
            }

            [data-option] {
              margin: 0;
              font-size: 0.75rem;
            }

            /* Answer Box Styles */
            [data-answer] {
              margin-top: 0.75rem;
              padding: 0.75rem;
              background-color: rgba(37, 99, 235, 0.05);
              border-left: 4px solid #2563eb;
              border-radius: 0.25rem;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            [data-answer-label] {
              font-weight: 700;
              font-size: 0.625rem;
              text-transform: uppercase;
              color: #2563eb;
              margin: 0 0 0.25rem 0;
            }

            [data-answer-text] {
              font-size: 0.75rem;
              font-style: italic;
              line-height: 1.25;
              margin: 0;
            }

            [data-key-points] {
              margin-top: 0.5rem;
              font-size: 0.75rem;
            }

            [data-key-points] strong {
              display: block;
              margin-bottom: 0.25rem;
              color: #2563eb;
              font-weight: 700;
            }

            [data-key-points] ul {
              margin: 0.25rem 0 0 1rem;
              padding-left: 0;
            }

            [data-key-points] li {
              margin: 0.125rem 0;
              list-style-type: disc;
            }

            /* Print-friendly overrides */
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              [data-page] {
                page-break-after: always;
                break-after: page;
              }
              [data-page]:last-child {
                page-break-after: avoid;
                break-after: avoid;
              }
            }

            /* Hide non-printable elements */
            button, input, select, textarea, [role="button"],
            .material-symbols-outlined, svg {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${cleanHTML}
        </body>
      </html>
    `;

    console.log(`[PDF] Setting page content for: ${filename}`);
    console.log(`[PDF] HTML length: ${cleanHTML.length} characters`);

    // Set content with longer timeout
    await page.setContent(fullHTML, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for fonts and rendering
    console.log(`[PDF] Waiting for rendering...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[PDF] Generating PDF: ${filename}`);

    // Generate PDF with optimized settings
    const pdf = await page.pdf({
      format,
      printBackground,
      margin,
      preferCSSPageSize: false,
      timeout: 60000,
      displayHeaderFooter: false,
    });

    console.log(`[PDF] PDF generated successfully: ${filename} (${pdf.length} bytes)`);

    await page.close();
    await browser.close();
    browser = null;

    return pdf;
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF] Error closing browser:', closeError);
      }
    }
    throw error;
  }
}

/**
 * Express route handler for PDF generation
 */
async function generatePDF(req, res) {
  try {
    const { html, css, filename, format, margin, printBackground, preferCSSPageSize, examData } = req.body;

    // If examData is provided, generate HTML from exam structure
    let finalHTML = html;
    let finalCSS = css;

    if (examData) {
      console.log(`[PDF API] Generating PDF from exam data: ${examData.examDetails?.topic || 'exam'}`);
      finalHTML = generateExamHTML(examData);
      finalCSS = ''; // CSS is embedded in the template
    }

    // Validate input
    if (!finalHTML) {
      return res.status(400).json({
        success: false,
        message: 'HTML content or examData is required',
      });
    }

    console.log(`[PDF API] Received request for: ${filename || 'document'}`);

    // Generate PDF
    const pdf = await generatePDFBuffer(finalHTML, finalCSS, {
      filename: filename || 'document',
      format: format || 'A4',
      margin: margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: printBackground !== false,
      preferCSSPageSize: preferCSSPageSize === true,
    });

    // Send PDF
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'document'}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);

    console.log(`[PDF API] PDF sent successfully: ${filename || 'document'}`);
  } catch (error) {
    console.error('[PDF API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
}

/**
 * Generate HTML from exam data structure
 * Handles MCQ, Short Answer, Fill ups, Long Answer, Match the Following, True/False, Essay
 */
function generateExamHTML(examData) {
  const { examDetails, sections, questions } = examData;
  
  const displaySubject = examDetails.subject || 'Exam';
  let sectionsHTML = '';

  // MCQ Section
  if (questions.mcq && questions.mcq.length > 0) {
    const mcqSection = sections.find(s => s.sectionName === 'MCQ');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section A: Multiple Choice Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${mcqSection?.note || 'Answer all questions'} | ${mcqSection?.totalMarks} marks
        </div>
        ${questions.mcq.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question}</p>
            <div data-options>
              ${q.options.map((opt, idx) => `
                <p data-option>${String.fromCharCode(65 + idx)}) ${opt}</p>
              `).join('')}
            </div>
            <div data-answer>
              <p data-answer-label>Correct Answer: ${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Short Answer Section
  if (questions.shortAnswer && questions.shortAnswer.length > 0) {
    const shortSection = sections.find(s => s.sectionName === 'Short Answer');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section B: Short Answer Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${shortSection?.note || 'Answer all questions'} | ${shortSection?.totalMarks} marks
        </div>
        ${questions.shortAnswer.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question} (${q.marks} marks)</p>
            <div data-answer>
              <p data-answer-label>Expected Answer:</p>
              <p data-answer-text>${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Fill ups Section
  if (questions.fillups && questions.fillups.length > 0) {
    const fillSection = sections.find(s => s.sectionName === 'Fill ups');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section C: Fill in the Blanks</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${fillSection?.note || 'Answer all questions'} | ${fillSection?.totalMarks} marks
        </div>
        ${questions.fillups.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question} (${q.marks} marks)</p>
            <div data-answer>
              <p data-answer-label>Answer:</p>
              <p data-answer-text>${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Long Answer Section
  if (questions.longans && questions.longans.length > 0) {
    const longSection = sections.find(s => s.sectionName === 'Long Answer');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section D: Long Answer Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${longSection?.note || 'Answer all questions'} | ${longSection?.totalMarks} marks
        </div>
        ${questions.longans.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question} (${q.marks} marks)</p>
            <div data-answer>
              <p data-answer-label>Expected Answer:</p>
              <p data-answer-text>${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Match the Following Section
  if (questions.match && questions.match.length > 0) {
    const matchSection = sections.find(s => s.sectionName === 'Match the Following');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section E: Match the Following</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${matchSection?.note || 'Answer all questions'} | ${matchSection?.totalMarks} marks
        </div>
        ${questions.match.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. Match the Following (${q.marks} marks)</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-left: 1rem; margin-top: 0.5rem;">
              <div>
                <strong style="font-size: 0.75rem;">Column A</strong>
                ${q.columnA.map(item => `
                  <p style="font-size: 0.75rem; margin: 0.25rem 0;">${item.id}. ${item.text}</p>
                `).join('')}
              </div>
              <div>
                <strong style="font-size: 0.75rem;">Column B</strong>
                ${q.columnB.map(item => `
                  <p style="font-size: 0.75rem; margin: 0.25rem 0;">${item.id}. ${item.text}</p>
                `).join('')}
              </div>
            </div>
            <div data-answer>
              <p data-answer-label>Answers:</p>
              <div style="font-size: 0.75rem;">
                ${Object.entries(q.answers).map(([key, value]) => `
                  <p style="margin: 0.25rem 0;">${key} → ${value}</p>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // True or False Section
  if (questions.trueorfalse && questions.trueorfalse.length > 0) {
    const tfSection = sections.find(s => s.sectionName === 'True or False');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section F: True or False</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${tfSection?.note || 'Answer all questions'} | ${tfSection?.totalMarks} marks
        </div>
        ${questions.trueorfalse.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.statement} (${q.marks} marks)</p>
            <div data-answer>
              <p data-answer-label>Answer: ${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Essay Section
  if (questions.essay && questions.essay.length > 0) {
    const essaySection = sections.find(s => s.sectionName === 'Essay');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section G: Essay Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${essaySection?.note || 'Answer all questions'} | ${essaySection?.totalMarks} marks
        </div>
        ${questions.essay.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question} (${q.marks} marks)</p>
            <div data-answer>
              <p data-answer-label>Expected Answer:</p>
              <p data-answer-text>${q.answer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Generate final HTML
  const html = `
    <div data-page>
      <div>
        <!-- Header -->
        <div data-header>
          <p data-header-institute>${displaySubject}</p>
          <h2 data-header-subtitle>Difficulty: ${examDetails.difficultyLevel}</h2>
          <div data-header-meta>
            <span>Duration: ${examDetails.duration} mins</span>
            <span>Total Marks: ${examDetails.totalMarks}</span>
            <span>Questions: ${examDetails.totalQuestions}</span>
          </div>
        </div>

        <!-- Sections Info -->
        <div style="margin-bottom: 1.5rem; font-size: 0.75rem; color: #666;">
          <strong>Sections:</strong>
          <ul style="margin-left: 1rem; margin-top: 0.5rem;">
            ${sections.map(s => `
              <li style="margin-bottom: 0.25rem;">
                ${s.sectionName}: ${s.totalQuestions} questions, ${s.totalMarks} marks
                ${s.note ? `<span style="font-style: italic;"> - ${s.note}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- All Sections -->
        ${sectionsHTML}
      </div>
    </div>
  `;

  return html;
}

/**
 * Generate PDF and return as base64 (for internal use)
 */
async function generatePDFBase64(html, css, options = {}) {
  try {
    const pdf = await generatePDFBuffer(html, css, options);
    return pdf.toString('base64');
  } catch (error) {
    console.error('[PDF] Error generating base64 PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF and save to file (for internal use)
 */
async function generatePDFFile(html, css, filepath, options = {}) {
  const fs = require('fs').promises;
  try {
    const pdf = await generatePDFBuffer(html, css, options);
    await fs.writeFile(filepath, pdf);
    console.log(`[PDF] PDF saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('[PDF] Error saving PDF file:', error);
    throw error;
  }
}

module.exports = {
  generatePDF,
  generatePDFBuffer,
  generatePDFBase64,
  generatePDFFile,
};
