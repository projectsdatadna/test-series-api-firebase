const express = require('express');
const { generatePDF, shareViaWhatsApp } = require('./controller');
const {
  shareEmail,
  shareWhatsApp,
  shareTelegram,
  shareGoogleDrive,
  shareDropbox,
  shareOneDrive,
  shareSMS,
  downloadPDF,
  shareSocialMedia,
} = require('./sharingController');
const { verifyJWT } = require('../../middleware/jwtMiddleware');

const router = express.Router();

// PDF Generation
router.post('/generate-pdf', verifyJWT, generatePDF);
router.post('/generate-pdf/public', generatePDF);

// Sharing Options
router.post('/share/email', verifyJWT, shareEmail);
router.post('/share/email/public', shareEmail);

router.post('/share/whatsapp', verifyJWT, shareWhatsApp);
router.post('/share/whatsapp/public', shareWhatsApp);

router.post('/share/telegram', verifyJWT, shareTelegram);
router.post('/share/telegram/public', shareTelegram);

router.post('/share/google-drive', verifyJWT, shareGoogleDrive);
router.post('/share/google-drive/public', shareGoogleDrive);

router.post('/share/dropbox', verifyJWT, shareDropbox);
router.post('/share/dropbox/public', shareDropbox);

router.post('/share/onedrive', verifyJWT, shareOneDrive);
router.post('/share/onedrive/public', shareOneDrive);

router.post('/share/sms', verifyJWT, shareSMS);
router.post('/share/sms/public', shareSMS);

router.post('/share/social-media', verifyJWT, shareSocialMedia);
router.post('/share/social-media/public', shareSocialMedia);

router.post('/download', verifyJWT, downloadPDF);
router.post('/download/public', downloadPDF);

// Legacy routes (for backward compatibility)
router.post('/share-whatsapp', verifyJWT, shareViaWhatsApp);
router.post('/share-whatsapp/public', shareViaWhatsApp);

module.exports = router;
