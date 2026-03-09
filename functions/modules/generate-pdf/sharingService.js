require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Sharing Service - Handles multiple sharing options
 * Supports: Email, WhatsApp, Telegram, Google Drive, Dropbox, etc.
 */

/**
 * Email Sharing
 */
async function shareViaEmail(pdfBase64, filename, emailData) {
  try {
    const { recipientEmail, senderEmail, subject, message } = emailData;

    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    console.log(`[Email] Preparing to send email to: ${recipientEmail}`);

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Send email with PDF attachment
    const mailOptions = {
      from: senderEmail || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject || 'Question Paper',
      html: `
        <h2>Question Paper</h2>
        <p>${message || 'Please find the question paper attached.'}</p>
        <p>Best regards,<br/>Question Paper Generator</p>
      `,
      attachments: [
        {
          filename: `${filename}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Email sent successfully: ${info.messageId}`);

    return {
      success: true,
      message: `Email sent to ${recipientEmail}`,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    throw error;
  }
}

/**
 * WhatsApp Sharing
 */
function shareViaWhatsApp(phoneNumber, message) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Format phone number
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const formattedPhoneNumber = cleanPhoneNumber.startsWith('91')
      ? cleanPhoneNumber
      : '91' + cleanPhoneNumber;

    console.log(`[WhatsApp] Preparing share for: ${formattedPhoneNumber}`);

    return {
      success: true,
      platform: 'whatsapp',
      phoneNumber: formattedPhoneNumber,
      message: message || 'Check out this question paper!',
      whatsappWebUrl: `https://web.whatsapp.com/send?phone=${formattedPhoneNumber}&text=${encodeURIComponent(
        message || 'Check out this question paper!'
      )}`,
      whatsappMobileUrl: `whatsapp://send?phone=${formattedPhoneNumber}&text=${encodeURIComponent(
        message || 'Check out this question paper!'
      )}`,
    };
  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    throw error;
  }
}

/**
 * Telegram Sharing
 */
function shareViaTelegram(chatId, message) {
  try {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    console.log(`[Telegram] Preparing share for chat: ${chatId}`);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    return {
      success: true,
      platform: 'telegram',
      chatId: chatId,
      message: message || 'Check out this question paper!',
      telegramUrl: `https://t.me/share/url?url=YOUR_PDF_URL&text=${encodeURIComponent(
        message || 'Check out this question paper!'
      )}`,
      botToken: botToken,
    };
  } catch (error) {
    console.error('[Telegram] Error:', error);
    throw error;
  }
}

/**
 * Google Drive Sharing
 */
async function shareViaGoogleDrive(pdfBase64, filename, googleDriveData) {
  try {
    const { accessToken, folderId } = googleDriveData;

    if (!accessToken) {
      throw new Error('Google Drive access token is required');
    }

    console.log(`[Google Drive] Uploading file: ${filename}`);

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Upload to Google Drive
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, `${filename}.pdf`);

    const metadata = {
      name: `${filename}.pdf`,
      mimeType: 'application/pdf',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Google Drive upload failed: ${response.statusText}`);
    }

    const fileData = await response.json();
    console.log(`[Google Drive] File uploaded successfully: ${fileData.id}`);

    return {
      success: true,
      platform: 'google-drive',
      fileId: fileData.id,
      fileName: fileData.name,
      webViewLink: fileData.webViewLink,
      message: 'File uploaded to Google Drive',
    };
  } catch (error) {
    console.error('[Google Drive] Error:', error);
    throw error;
  }
}

/**
 * Dropbox Sharing
 */
async function shareViaDropbox(pdfBase64, filename, dropboxData) {
  try {
    const { accessToken, path } = dropboxData;

    if (!accessToken) {
      throw new Error('Dropbox access token is required');
    }

    console.log(`[Dropbox] Uploading file: ${filename}`);

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const uploadPath = path ? `${path}/${filename}.pdf` : `/${filename}.pdf`;

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: uploadPath,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
      },
      body: pdfBuffer,
    });

    if (!response.ok) {
      throw new Error(`Dropbox upload failed: ${response.statusText}`);
    }

    const fileData = await response.json();
    console.log(`[Dropbox] File uploaded successfully: ${fileData.id}`);

    // Create shared link
    const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: fileData.path_lower,
        settings: {
          requested_visibility: 'public',
        },
      }),
    });

    let sharedLink = null;
    if (shareResponse.ok) {
      const shareData = await shareResponse.json();
      sharedLink = shareData.url;
    }

    return {
      success: true,
      platform: 'dropbox',
      fileId: fileData.id,
      fileName: fileData.name,
      path: fileData.path_display,
      sharedLink: sharedLink,
      message: 'File uploaded to Dropbox',
    };
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    throw error;
  }
}

/**
 * OneDrive Sharing
 */
async function shareViaOneDrive(pdfBase64, filename, oneDriveData) {
  try {
    const { accessToken, folderId } = oneDriveData;

    if (!accessToken) {
      throw new Error('OneDrive access token is required');
    }

    console.log(`[OneDrive] Uploading file: ${filename}`);

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const uploadUrl = folderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${filename}.pdf:/content`
      : `https://graph.microsoft.com/v1.0/me/drive/root:/${filename}.pdf:/content`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer,
    });

    if (!response.ok) {
      throw new Error(`OneDrive upload failed: ${response.statusText}`);
    }

    const fileData = await response.json();
    console.log(`[OneDrive] File uploaded successfully: ${fileData.id}`);

    return {
      success: true,
      platform: 'onedrive',
      fileId: fileData.id,
      fileName: fileData.name,
      webUrl: fileData.webUrl,
      message: 'File uploaded to OneDrive',
    };
  } catch (error) {
    console.error('[OneDrive] Error:', error);
    throw error;
  }
}

/**
 * SMS Sharing (via Twilio or similar)
 */
async function shareViaSMS(phoneNumber, message) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    console.log(`[SMS] Preparing SMS for: ${phoneNumber}`);

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const formattedPhoneNumber = cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : '+91' + cleanPhoneNumber;

    return {
      success: true,
      platform: 'sms',
      phoneNumber: formattedPhoneNumber,
      message: message || 'Check out this question paper!',
      provider: 'twilio',
      note: 'SMS sending requires Twilio integration',
    };
  } catch (error) {
    console.error('[SMS] Error:', error);
    throw error;
  }
}

/**
 * Direct Download Link
 */
function generateDownloadLink(pdfBase64, filename) {
  try {
    console.log(`[Download] Generating download link for: ${filename}`);

    return {
      success: true,
      platform: 'download',
      fileName: filename,
      pdfBase64: pdfBase64,
      message: 'PDF ready for download',
      downloadUrl: `/api/pdf/download?filename=${encodeURIComponent(filename)}`,
    };
  } catch (error) {
    console.error('[Download] Error:', error);
    throw error;
  }
}

/**
 * Social Media Sharing (Facebook, Twitter, LinkedIn)
 */
function shareViasSocialMedia(platform, message, url) {
  try {
    if (!['facebook', 'twitter', 'linkedin'].includes(platform)) {
      throw new Error('Invalid social media platform');
    }

    console.log(`[Social] Preparing share for: ${platform}`);

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    return {
      success: true,
      platform: platform,
      message: message || 'Check out this question paper!',
      shareUrl: shareUrls[platform],
    };
  } catch (error) {
    console.error('[Social] Error:', error);
    throw error;
  }
}

module.exports = {
  shareViaEmail,
  shareViaWhatsApp,
  shareViaTelegram,
  shareViaGoogleDrive,
  shareViaDropbox,
  shareViaOneDrive,
  shareViaSMS,
  generateDownloadLink,
  shareViasSocialMedia,
};
