const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  /**
   * Path to a custom directory for Puppeteer to use for its cache.
   * This is crucial for environments like Azure App Service where the default
   * home directory (~/.cache/puppeteer) might not be persisted or accessible.
   * By setting this to a path within our project, we ensure that the
   * downloaded browser is included with our deployment artifacts.
   */
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};