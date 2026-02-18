/**
 * PDF Generation Service
 * Utility functions for common PDF generation tasks
 */

const { generatePDFBuffer, generatePDFBase64, generatePDFFile } = require('./controller');

/**
 * Generate Exam Paper PDF with all question types
 * Handles MCQ, Short Answer, Long Answer, and Essay questions
 * @param {Object} examData - Complete exam data with all sections and questions
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateExamPaperPDF(examData) {
  const { examDetails, sections, mcqQuestions, shortAnswerQuestions, customQuestions } = examData;
  
  // Ensure topic is not displayed - only use subject
  const displaySubject = examDetails.subject || 'Exam';

  // Build sections HTML
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
        ${mcqQuestions.map((q, idx) => `
          <div data-question>
            <p data-question-text>${q.questionNumber}. ${q.question}</p>
            <div data-options>
              ${Object.entries(q.options).map(([key, value]) => `
                <p data-option>(${key}) ${value}</p>
              `).join('')}
            </div>
            <div data-answer>
              <p data-answer-label>Correct Answer: (${q.correctAnswer})</p>
              <p data-answer-text>${q.explanation}</p>
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
        ${shortAnswerQuestions.map((q, idx) => `
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

  // Custom Questions (Long Answer and Essay)
  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((customSection, sectionIdx) => {
      const sectionInfo = sections.find(s => s.sectionName === customSection.section);
      const sectionTitle = customSection.section;
      const questionType = customSection.type;

      sectionsHTML += `
        <div data-section>
          <div data-section-title>${sectionTitle}: ${questionType} Questions</div>
          <div style="font-size: 0.7rem; color: #666; margin-bottom: 1rem; font-style: italic;">
            ${sectionInfo?.note || 'Answer as instructed'} | ${sectionInfo?.totalMarks} marks
          </div>
          ${customSection.questions.map((q, idx) => `
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

  // Generate HTML
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

  const css = ``;

  return generatePDFBuffer(html, css, {
    filename: `${displaySubject.replace(/\s+/g, '-')}-exam`,
    format: 'A4',
    printBackground: true,
  });
}

/**
 * Generate Assessment Paper PDF
 * @param {Object} paperData - Assessment paper data
 * @param {string} paperData.title - Paper title
 * @param {string} paperData.subject - Subject name
 * @param {number} paperData.duration - Duration in minutes
 * @param {number} paperData.totalMarks - Total marks
 * @param {Array} paperData.mcqQuestions - MCQ questions
 * @param {Array} paperData.shortAnswerQuestions - Short answer questions
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateAssessmentPaperPDF(paperData) {
  const { title, subject, duration, totalMarks, mcqQuestions, shortAnswerQuestions } = paperData;

  // Generate HTML
  const html = `
    <div class="pdf-content">
      <div class="header">
        <h2 class="subtitle">${subject || 'Subject'}</h2>
        <div class="metadata">
          Duration: ${duration || 0} mins | Total Marks: ${totalMarks || 0} | 
          Questions: ${(mcqQuestions?.length || 0) + (shortAnswerQuestions?.length || 0)}
        </div>
      </div>

      ${
        mcqQuestions && mcqQuestions.length > 0
          ? `
        <div class="section">
          <h3 class="section-title">Section A: Multiple Choice Questions</h3>
          ${mcqQuestions
            .map(
              (q, idx) => `
            <div class="question-block">
              <p class="question">${q.questionNumber || idx + 1}. ${q.question || ''}</p>
              <div class="options">
                ${['A', 'B', 'C', 'D']
                  .map(
                    (opt) => `
                  <p class="option">(${opt}) ${q.options?.[opt] || ''}</p>
                `
                  )
                  .join('')}
              </div>
              <div class="answer-box">
                <p class="answer">Correct Answer: (${q.correctAnswer || ''})</p>
              </div>
              ${q.explanation ? `<p class="explanation">${q.explanation}</p>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        shortAnswerQuestions && shortAnswerQuestions.length > 0
          ? `
        <div class="page-break"></div>
        <div class="section">
          <h3 class="section-title">Section B: Short Answer Questions</h3>
          ${shortAnswerQuestions
            .map(
              (q, idx) => `
            <div class="question-block">
              <p class="question">
                ${q.questionNumber || idx + 1}. ${q.question || ''} 
                (${q.marksAllocated || 0} marks)
              </p>
              <div class="expected-answer-section">
                <p class="label">Expected Answer:</p>
                <div class="answer-box">
                  <p class="expected-answer">${q.expectedAnswer || ''}</p>
                </div>
              </div>
              ${
                q.keyPoints && q.keyPoints.length > 0
                  ? `
                <div class="key-points">
                  <p class="label">Key Points:</p>
                  <ul>
                    ${q.keyPoints.map((point) => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    </div>
  `;

  // Default CSS for assessment papers
  const css = `
    .pdf-content {
      background-color: #ffffff;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
      font-family: 'Arial', sans-serif;
    }

    .subtitle {
      font-size: 18px;
      font-weight: bold;
      color: #34495e;
      margin-bottom: 10px;
    }

    .metadata {
      font-size: 14px;
      color: #555;
      padding-bottom: 15px;
      border-bottom: 2px solid #ccc;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 15px;
      padding: 10px;
      background: linear-gradient(to right, #f8f9fa, #e9ecef);
      border-left: 4px solid #3498db;
    }

    .question-block {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .question {
      font-size: 14px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
      line-height: 1.6;
    }

    .options {
      margin-left: 20px;
      margin-bottom: 10px;
    }

    .option {
      font-size: 13px;
      color: #34495e;
      margin-bottom: 5px;
      line-height: 1.5;
    }

    .answer-box {
      background: linear-gradient(135deg, #e8f4f8 0%, #d4ebf2 100%);
      padding: 12px;
      margin: 10px 0 10px 20px;
      border-left: 4px solid #3498db;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .answer {
      font-size: 13px;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }

    .explanation {
      font-size: 12px;
      font-style: italic;
      color: #555;
      margin-left: 20px;
      margin-top: 8px;
      line-height: 1.5;
    }

    .expected-answer-section {
      margin-left: 20px;
      margin-top: 10px;
    }

    .label {
      font-size: 13px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    .expected-answer {
      font-size: 12px;
      font-style: italic;
      color: #34495e;
      margin: 0;
    }

    .key-points {
      margin-left: 20px;
      margin-top: 10px;
    }

    .key-points ul {
      margin-left: 20px;
      margin-top: 5px;
    }

    .key-points li {
      font-size: 12px;
      color: #34495e;
      margin-bottom: 5px;
      line-height: 1.5;
    }

    .page-break {
      page-break-before: always;
    }
  `;

  return generatePDFBuffer(html, css, {
    filename: title || 'assessment-paper',
    format: 'A4',
    printBackground: true,
  });
}

/**
 * Generate Certificate PDF
 * @param {Object} certificateData - Certificate data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificatePDF(certificateData) {
  const { recipientName, courseName, completionDate, certificateNumber } = certificateData;

  const html = `
    <div class="certificate-container">
      <div class="certificate">
        <div class="certificate-header">
          <h1>Certificate of Completion</h1>
        </div>
        <div class="certificate-body">
          <p class="label">This is to certify that</p>
          <p class="recipient-name">${recipientName}</p>
          <p class="label">has successfully completed the course</p>
          <p class="course-name">${courseName}</p>
          <p class="label">on</p>
          <p class="completion-date">${completionDate}</p>
          <p class="certificate-number">Certificate No: ${certificateNumber}</p>
        </div>
      </div>
    </div>
  `;

  const css = `
    .certificate-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }

    .certificate {
      width: 100%;
      max-width: 900px;
      border: 3px solid #2c3e50;
      padding: 60px;
      text-align: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .certificate-header h1 {
      font-size: 48px;
      color: #2c3e50;
      margin-bottom: 40px;
      font-weight: bold;
    }

    .certificate-body {
      margin: 40px 0;
    }

    .label {
      font-size: 18px;
      color: #34495e;
      margin: 20px 0 10px 0;
    }

    .recipient-name {
      font-size: 36px;
      font-weight: bold;
      color: #2c3e50;
      margin: 20px 0;
      text-decoration: underline;
    }

    .course-name {
      font-size: 28px;
      font-weight: bold;
      color: #3498db;
      margin: 20px 0;
    }

    .completion-date {
      font-size: 20px;
      color: #34495e;
      margin: 20px 0;
    }

    .certificate-number {
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 40px;
    }
  `;

  return generatePDFBuffer(html, css, {
    filename: `certificate-${certificateNumber}`,
    format: 'A4',
    printBackground: true,
  });
}

module.exports = {
  generateExamPaperPDF,
  generateAssessmentPaperPDF,
  generateCertificatePDF,
};
