import puppeteer from 'puppeteer';

/**
 * Generates a PDF from an HTML string using Puppeteer.
 * @param {string} htmlContent The HTML to render.
 * @param {object} pdfOptions Puppeteer PDF options.
 * @returns {Promise<Buffer>} A promise that resolves with the PDF buffer.
 */
export async function generatePdfFromHtml(htmlContent, pdfOptions) {
  let browser;
  try {
    // These arguments are crucial for running Puppeteer in a containerized
    // environment like Azure App Service or Docker.
    browser = await puppeteer.launch({
      // Explicitly provide the path to the bundled Chromium executable.
      // This can resolve path issues in some containerized environments.
      executablePath: puppeteer.executablePath(),
      headless: 'new', // Explicitly use the new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcomes limited resource problems
        '--disable-gpu', // Often necessary in headless environments
      ],
      // Pipe the browser process's stdout and stderr into process.stdout and
      // process.stderr. This is useful for debugging launch issues.
      dumpio: true,
    });
    const page = await browser.newPage();
    // Use 'load' instead of 'networkidle0' as it's more reliable in cloud environments,
    // especially when dealing with external resources like charts.
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 60000 }); // 60s timeout
    return await page.pdf(pdfOptions);
  } catch (error) {
    // Add specific logging for Puppeteer launch errors to get more details.
    console.error('Error launching Puppeteer for PDF generation:', error);
    // Re-throw the error so it's handled by the global error handler in server.js
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}