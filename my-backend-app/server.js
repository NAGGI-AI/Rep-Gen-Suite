import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import multer from 'multer';
import db from './database.js';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const applicationData = _require('./applications.json');
import { generatePdfFromHtml } from './pdf-generator.js';
import { generateMasaReportHtml } from './masa-report-template.js';
import { generateDastReportHtml, buildReportTitle, buildDocTitle } from './dast-report-template.js';
const app = express();

// --- Setup for serving static files ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load Cognizant logo as base64 for PDF embedding ---
let cognizantLogoBase64 = null;
const logoPath = path.join(__dirname, 'assets', 'cognizant-logo.png');
if (fs.existsSync(logoPath)) {
  cognizantLogoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
}

// Use the port Azure provides, or 3001 for local development.
const port = process.env.PORT || 3001;

// --- Serve the static files from the React app ---
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS for all routes. This must be done before defining routes.
app.use(cors());

// --- Health Check Endpoint ---
// A dedicated endpoint for platform health checks (like Azure App Service).
// This is crucial for cloud deployments. It signals that the server process is
// running, even if other parts (like the frontend files) are not ready.
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

// API Endpoint to fetch the application list
app.get('/api/applications', (req, res) => {
  res.json(applicationData);
});

// API Endpoint to fetch vulnerabilities from the database
app.get('/api/vulnerabilities', (req, res) => {
  const vulnerabilities = db.data.vulnerabilities;
  vulnerabilities.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  res.json({ data: vulnerabilities });
});

// A simple utility function to escape HTML to prevent injection.
function escapeHtml(unsafe) {
  if (unsafe === null || typeof unsafe === 'undefined') return '';
  return String(unsafe)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

// Configure multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// API endpoint to generate a DAST report
app.post('/api/generate-report', upload.any(), async (req, res, next) => {
  try {
    console.log(`--- Received request for /api/generate-report at ${new Date().toISOString()} ---`);
    
    // --- Input Validation ---
    if (!req.body.applicationDetails || !req.body.vulnerabilities) {
      return res.status(400).send({ error: 'Missing required report data fields (applicationDetails, vulnerabilities).' });
    }
    const applicationDetails = JSON.parse(req.body.applicationDetails);
    const vulnerabilities = JSON.parse(req.body.vulnerabilities);

    if (!applicationDetails || typeof applicationDetails !== 'object' || Array.isArray(applicationDetails)) {
      return res.status(400).send({ error: 'Invalid applicationDetails format. Expected a JSON object.' });
    }
    if (!Array.isArray(vulnerabilities)) {
      return res.status(400).send({ error: 'Invalid vulnerabilities format. Expected a JSON array.' });
    }
    if (vulnerabilities.length === 0) {
      return res.status(400).send({ error: 'At least one vulnerability is required to generate a report.' });
    }
    // --- End Input Validation ---

    // 2. Create the HTML content for the PDF

    // --- Re-associate uploaded files with their evidence entries ---
    vulnerabilities.forEach(vuln => {
      if (vuln.evidence && vuln.evidence.length > 0) {
        vuln.evidence.forEach(ev => {
          ev.files = req.files.filter(f => f.fieldname.startsWith(`evidence_${ev.id}_`));
        });
      }
    });
    // --- End Evidence Re-association ---

    // --- Prepare Chart Data ---
    const severityCounts = { High: 0, Medium: 0, Low: 0, Informational: 0 };
    if (vulnerabilities.length > 0) {
      vulnerabilities.forEach(vuln => {
        if (severityCounts.hasOwnProperty(vuln.severity)) {
          severityCounts[vuln.severity]++;
        }
      });
    }
    // --- End Chart Data ---


    // 2. Generate HTML using the dedicated template module
    const htmlContent = generateDastReportHtml({ applicationDetails, vulnerabilities, severityCounts, logoBase64: cognizantLogoBase64 });

    // 3. Build dynamic header / footer strings
    const reportTitle = buildReportTitle(applicationDetails.scanReportType);
    const docTitle    = buildDocTitle(applicationDetails.appType);

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="
          font-family: Helvetica, Arial, sans-serif;
          font-size: 8px;
          color: #003399;
          width: 100%;
          padding: 0 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #003399;
        ">
          <span style="font-weight:700;">${escapeHtml(applicationDetails.applicationName)}</span>
          <span>${escapeHtml(reportTitle)}</span>
        </div>`,
      footerTemplate: `
        <div style="
          font-family: Helvetica, Arial, sans-serif;
          font-size: 8px;
          color: #555;
          width: 100%;
          padding: 0 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>CONFIDENTIAL</span>
          <span>${escapeHtml(applicationDetails.appId)} — ${escapeHtml(applicationDetails.applicationName)}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;|&nbsp; Cognizant</span>
        </div>`,
      margin: { top: '52px', bottom: '52px', left: '0px', right: '0px' },
    };

    const pdfBuffer = await generatePdfFromHtml(htmlContent, pdfOptions);

    // 4. Send the PDF back to the client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=dast-report.pdf');
    res.send(pdfBuffer);
    console.log("PDF report sent successfully.");

  } catch (error) {
    // Check for JSON parsing errors specifically, which cause 500s if not caught
    if (error instanceof SyntaxError) {
      return res.status(400).send({ error: 'Invalid JSON in request body. Please check your data.' });
    }
    console.error('Detailed error in /api/generate-report:', error);
    // Pass other errors to the global error handler for a consistent response
    next(error); // Pass to global error handler for consistent responses
  }
});

// API endpoint to generate a MASA report
app.post('/api/generate-masa-report', upload.any(), async (req, res, next) => {
  try {
    console.log(`--- Received request for /api/generate-masa-report at ${new Date().toISOString()} ---`);
    
    // --- Input Validation ---
    if (!req.body.masaDetails || !req.body.findings || !req.body.assessmentHistory) {
      return res.status(400).send({ error: 'Missing required report data fields (masaDetails, findings, assessmentHistory).' });
    }
    const masaDetails = JSON.parse(req.body.masaDetails);
    const findings = JSON.parse(req.body.findings);
    const assessmentHistory = JSON.parse(req.body.assessmentHistory);

    if (!masaDetails || typeof masaDetails !== 'object' || Array.isArray(masaDetails)) {
      return res.status(400).send({ error: 'Invalid masaDetails format. Expected a JSON object.' });
    }
    if (!Array.isArray(findings)) {
      return res.status(400).send({ error: 'Invalid findings format. Expected a JSON array.' });
    }
    if (!Array.isArray(assessmentHistory)) {
      return res.status(400).send({ error: 'Invalid assessmentHistory format. Expected a JSON array.' });
    }
    // --- End Input Validation ---

    // Re-associate uploaded files with their screenshot objects
    findings.forEach(finding => {
      if (finding.screenshots && finding.screenshots.length > 0) {
        finding.screenshots.forEach(screenshot => {
          // Find all files that belong to this specific screenshot object
          screenshot.files = req.files.filter(f => f.fieldname.startsWith(`screenshot_${screenshot.id}_`));
        });
      }
    });

    // Aggregate all evidence from all findings into flat lists for the report
    const allScreenshots = findings.flatMap(f => f.screenshots || []);
    const allTools = findings.flatMap(f => f.tools || []);
    const allExternalLinks = findings.flatMap(f => f.externalLinks || []);
    const allInternalLinks = findings.flatMap(f => f.internalLinks || []);

    // Calculate vulnerability summary counts based on the new 'status' field
    const riskLevels = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    const summary = {
      open: { Total: 0 },
      fixed: { Total: 0 },
      total: { Total: 0 }
    };

    // Initialize counts for each risk level
    riskLevels.forEach(level => {
      summary.open[level] = 0;
      summary.fixed[level] = 0;
      summary.total[level] = 0;
    });

    findings.forEach(finding => {
      const risk = finding.risk;
      // Default to 'Open' for backward compatibility if status is not provided
      const status = finding.status || 'Open';

      if (riskLevels.includes(risk)) {
        summary.total[risk]++;
        if (status === 'Fixed') {
          summary.fixed[risk]++;
        } else { // Treat as 'Open' if not 'Fixed'
          summary.open[risk]++;
        }
      }
    });

    // Calculate grand totals
    riskLevels.forEach(level => {
      summary.open.Total += summary.open[level];
      summary.fixed.Total += summary.fixed[level];
      summary.total.Total += summary.total[level];
    });

    const htmlContent = generateMasaReportHtml({
      masaDetails,
      findings,
      assessmentHistory,
      summary,
      allScreenshots,
      allTools,
      allExternalLinks,
      allInternalLinks
    });

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      landscape: true, // Set the PDF orientation to landscape
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #555; width: 100%; text-align: center; padding: 0 40px;">
          Cognizant - Manual Application Security Assessment
        </div>
      `,
      footerTemplate: `
        <div style="font-family: Helvetica, Arial, sans-serif; font-size: 9px; color: #555; width: 100%; padding: 0 40px; display: flex; justify-content: space-between; align-items: center;">
          <span>CONFIDENTIAL</span>
          <span style="text-align: center;">${escapeHtml(masaDetails.applicationId)} - ${escapeHtml(masaDetails.applicationName)}</span>
          <span style="text-align: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Cognizant</span>
        </div>
      `,
      // Adjust margins to make space for the new header and footer
      margin: { top: '80px', bottom: '80px', left: '40px', right: '40px' }
    };
    const pdfBuffer = await generatePdfFromHtml(htmlContent, pdfOptions);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=masa-report.pdf');
    res.send(pdfBuffer);
    console.log("MASA PDF report sent successfully.");

  } catch (error) {
    // Check for JSON parsing errors specifically, which cause 500s if not caught
    if (error instanceof SyntaxError) {
      return res.status(400).send({ error: 'Invalid JSON in request body. Please check your data.' });
    }
    console.error('Detailed error in /api/generate-masa-report:', error);
    next(error); // Pass error to the global error handler for a consistent response
  }
});

// --- The "catchall" handler for client-side routing ---
// This sends the main index.html file for any request that doesn't match an API route.
// This must be placed AFTER all your API routes.
app.get('*', (req, res, next) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  // Check if the frontend build exists before trying to serve it.
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Provide a more helpful message if the frontend isn't built/synced.
    const devMessage = `
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>Backend is running!</h1>
        <p>Could not find the frontend's <code>index.html</code> in the <code>/public</code> directory.</p>
        <p><b>To fix this:</b> Build your frontend project and copy the output into the backend's <code>/public</code> folder.</p>
        <hr>
        <p>See the terminal where you ran <code>npm run dev</code> for more details.</p>
      </body>
    `;
    res.status(404).send(devMessage);
  }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('--- UNHANDLED ERROR CAUGHT ---');
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected server error occurred. Check backend logs for details.' });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Backend server is running and listening at http://localhost:${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ FATAL ERROR: Port ${port} is already in use.`);
    console.error('Please stop the other process or change the port in server.js.');
  } else {
    console.error('--- SERVER STARTUP ERROR ---');
    console.error(err);
  }
  // Exit the process with a failure code to ensure nodemon restarts correctly
  process.exit(1);
});