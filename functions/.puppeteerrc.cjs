const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Directs Puppeteer to use a local .cache folder inside your project
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
