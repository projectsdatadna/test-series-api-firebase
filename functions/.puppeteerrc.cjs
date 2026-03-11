const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Skip downloading Chromium during deployment
  skipDownload: process.env.SKIP_PUPPETEER_DOWNLOAD === 'true' || process.env.FUNCTION_TARGET !== undefined,
  // Directs Puppeteer to use a local .cache folder inside your project (for local development)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
