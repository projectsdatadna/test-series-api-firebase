const { generatePDFBase64 } = require('./controller');
const {
  shareViaEmail,
  shareViaWhatsApp,
  shareViaTelegram,
  shareViaGoogleDrive,
  shareViaDropbox,
  shareViaOneDrive,
  shareViaSMS,
  generateDownloadLink,
  shareViasSocialMedia,
} = require('./sharingService');

/**
 * Unified Sharing Controller
 * Handles all sharing options through a single endpoint
 */

/**
 * Share via Email
 */
async function shareEmail(req, res) {
  try {
    const { html, css, filename, examData, recipientEmail, senderEmail, subject, message } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required',
      });
    }

    console.log(`[Sharing] Generating PDF for email sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via email
    const result = await shareViaEmail(pdfBase64, filename || 'document', {
      recipientEmail,
      senderEmail,
      subject: subject || 'Question Paper',
      message: message || 'Please find the question paper attached.',
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via email',
      error: error.message,
    });
  }
}

/**
 * Share via WhatsApp
 */
async function shareWhatsApp(req, res) {
  try {
    const { html, css, filename, examData, phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    console.log(`[Sharing] Generating PDF for WhatsApp sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via WhatsApp
    const result = shareViaWhatsApp(phoneNumber, message || 'Check out this question paper!');

    res.status(200).json({
      success: true,
      data: {
        ...result,
        pdfBase64,
      },
    });
  } catch (error) {
    console.error('[Sharing] WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via WhatsApp',
      error: error.message,
    });
  }
}

/**
 * Share via Telegram
 */
async function shareTelegram(req, res) {
  try {
    const { html, css, filename, examData, chatId, message } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required',
      });
    }

    console.log(`[Sharing] Generating PDF for Telegram sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via Telegram
    const result = shareViaTelegram(chatId, message || 'Check out this question paper!');

    res.status(200).json({
      success: true,
      data: {
        ...result,
        pdfBase64,
      },
    });
  } catch (error) {
    console.error('[Sharing] Telegram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via Telegram',
      error: error.message,
    });
  }
}

/**
 * Share via Google Drive
 */
async function shareGoogleDrive(req, res) {
  try {
    const { html, css, filename, examData, accessToken, folderId } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive access token is required',
      });
    }

    console.log(`[Sharing] Generating PDF for Google Drive sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via Google Drive
    const result = await shareViaGoogleDrive(pdfBase64, filename || 'document', {
      accessToken,
      folderId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] Google Drive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via Google Drive',
      error: error.message,
    });
  }
}

/**
 * Share via Dropbox
 */
async function shareDropbox(req, res) {
  try {
    const { html, css, filename, examData, accessToken, path } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Dropbox access token is required',
      });
    }

    console.log(`[Sharing] Generating PDF for Dropbox sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via Dropbox
    const result = await shareViaDropbox(pdfBase64, filename || 'document', {
      accessToken,
      path,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] Dropbox error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via Dropbox',
      error: error.message,
    });
  }
}

/**
 * Share via OneDrive
 */
async function shareOneDrive(req, res) {
  try {
    const { html, css, filename, examData, accessToken, folderId } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'OneDrive access token is required',
      });
    }

    console.log(`[Sharing] Generating PDF for OneDrive sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via OneDrive
    const result = await shareViaOneDrive(pdfBase64, filename || 'document', {
      accessToken,
      folderId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] OneDrive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via OneDrive',
      error: error.message,
    });
  }
}

/**
 * Share via SMS
 */
async function shareSMS(req, res) {
  try {
    const { html, css, filename, examData, phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    console.log(`[Sharing] Generating PDF for SMS sharing`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Share via SMS
    const result = await shareViaSMS(phoneNumber, message || 'Check out this question paper!');

    res.status(200).json({
      success: true,
      data: {
        ...result,
        pdfBase64,
      },
    });
  } catch (error) {
    console.error('[Sharing] SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via SMS',
      error: error.message,
    });
  }
}

/**
 * Download PDF
 */
async function downloadPDF(req, res) {
  try {
    const { html, css, filename, examData } = req.body;

    console.log(`[Sharing] Generating PDF for download`);

    // Generate PDF
    let finalHTML = html;
    if (examData) {
      const { generateExamHTML } = require('./controller');
      finalHTML = generateExamHTML(examData);
    }

    const pdfBase64 = await generatePDFBase64(finalHTML, css, {
      filename: filename || 'document',
    });

    // Generate download link
    const result = generateDownloadLink(pdfBase64, filename || 'document');

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download link',
      error: error.message,
    });
  }
}

/**
 * Share via Social Media
 */
async function shareSocialMedia(req, res) {
  try {
    const { platform, message, url } = req.body;

    if (!platform || !url) {
      return res.status(400).json({
        success: false,
        message: 'Platform and URL are required',
      });
    }

    console.log(`[Sharing] Preparing social media share for: ${platform}`);

    const result = shareViasSocialMedia(platform, message || 'Check out this question paper!', url);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Sharing] Social media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share via social media',
      error: error.message,
    });
  }
}

module.exports = {
  shareEmail,
  shareWhatsApp,
  shareTelegram,
  shareGoogleDrive,
  shareDropbox,
  shareOneDrive,
  shareSMS,
  downloadPDF,
  shareSocialMedia,
};
