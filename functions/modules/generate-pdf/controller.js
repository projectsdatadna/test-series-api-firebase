require('dotenv').config();

/**
 * Get the appropriate puppeteer instance and launch options based on environment
 * Uses @sparticuz/chromium for all environments (most reliable)
 */
async function getPuppeteerAndOptions() {
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = require('puppeteer-core');
    
    console.log('[PDF] Using @sparticuz/chromium for PDF generation');
    
    return {
      puppeteer: puppeteerCore,
      launchOptions: {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      },
    };
  } catch (error) {
    console.error('[PDF] Failed to load @sparticuz/chromium:', error.message);
    throw new Error('Chromium not available. Please ensure @sparticuz/chromium is installed: npm install @sparticuz/chromium');
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
 * Handles MCQ, Short Answer, and custom question types (Long Answer, Essay, etc.)
 */
function generateExamHTML(examData) {
  const { examDetails, sections, mcqQuestions, shortAnswerQuestions, customQuestions } = examData;
  
  // Ensure topic is not displayed - only use subject
  const displaySubject = examDetails.subject || 'Exam';
   


  let sectionsHTML = '';

  // MCQ Section
  if (mcqQuestions && mcqQuestions.length > 0) {
    const mcqSection = sections.find(s => s.sectionName === 'MCQ');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section A: Multiple Choice Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${mcqSection?.note || 'Answer all questions'} | ${mcqSection?.totalMarks} marks
        </div>
        ${mcqQuestions.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question}</p>
            <div data-options>
              ${Object.entries(q.options).map(([key, value]) => `
                <p data-option>(${key}) ${value}</p>
              `).join('')}
            </div>
            <div data-answer>
              <p data-answer-label>Correct Answer: (${q.correctAnswer})</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Short Answer Section
  if (shortAnswerQuestions && shortAnswerQuestions.length > 0) {
    const shortSection = sections.find(s => s.sectionName === 'Short Answer');
    sectionsHTML += `
      <div data-section>
        <div data-section-title>Section B: Short Answer Questions</div>
        <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
          ${shortSection?.note || 'Answer all questions'} | ${shortSection?.totalMarks} marks
        </div>
        ${shortAnswerQuestions.map((q) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question} (${q.marksAllocated} marks)</p>
            <div data-answer>
              <p data-answer-label>Expected Answer:</p>
              <p data-answer-text>${q.expectedAnswer}</p>
              ${q.keyPoints && q.keyPoints.length > 0 ? `
                <div data-key-points>
                  <strong>Key Points:</strong>
                  <ul>
                    ${q.keyPoints.map(point => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Custom Questions (Dynamic types: Long Answer, Essay, etc.)
  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((customSection) => {
      const sectionInfo = sections.find(s => s.sectionName === customSection.section);
      const sectionTitle = customSection.section;
      const questionType = customSection.type;

      sectionsHTML += `
        <div data-section>
          <div data-section-title>${sectionTitle}: ${questionType} Questions</div>
          <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
            ${sectionInfo?.note || 'Answer as instructed'} | ${sectionInfo?.totalMarks} marks
          </div>
          ${customSection.questions.map((q) => `
            <div data-question>
              <p data-question-text>${q.questionNumber}. ${q.question} (${q.marksAllocated} marks)</p>
              <div data-answer>
                <p data-answer-label>Expected Answer:</p>
                <p data-answer-text>${q.expectedAnswer}</p>
                ${q.keyPoints && q.keyPoints.length > 0 ? `
                  <div data-key-points>
                    <strong>Key Points:</strong>
                    <ul>
                      ${q.keyPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    });
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
