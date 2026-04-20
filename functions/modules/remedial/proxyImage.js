const express = require('express');
const router = express.Router();
const https = require('https');

router.get('/', (req, res) => {
  const { url } = req.query;

  if (!url || !url.startsWith('https://ts-generated-images.s3.')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  https.get(url, (s3Res) => {
    const contentType = s3Res.headers['content-type'] || 'image/png';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    s3Res.pipe(res);
  }).on('error', (err) => {
    console.error('[ProxyImage] fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch image from S3' });
  });
});

module.exports = router;