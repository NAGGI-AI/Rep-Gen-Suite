/**
 * This module is responsible for generating the HTML content for the MASA PDF report.
 * It separates the presentation logic from the main server file.
 */

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

/**
 * Escapes HTML and converts any URLs into clickable links.
 * @param {string} text The text to process.
 * @returns {string} HTML string with links.
 */
function linkifyAndEscape(text) {
  if (text === null || typeof text === 'undefined') return '';
  // This regex looks for URLs starting with http or https.
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = String(text).split(urlRegex);

  return parts.map((part, i) => {
    // The regex split results in URLs being at odd indices of the resulting array.
    if (i % 2 === 1) {
      // It's a URL, so create a link. The URL itself is assumed to be safe.
      return `<a href="${part}" style="color: #0000EE; text-decoration: underline;">${part}</a>`;
    } else {
      // It's a non-URL part, so escape it for safety.
      return escapeHtml(part);
    }
  }).join('');
}

/**
 * Generates the complete HTML string for the MASA report.
 * @param {object} data - An object containing all necessary data for the report.
 * @returns {string} The HTML content as a string.
 */
export function generateMasaReportHtml(data) {
  const {
    masaDetails,
    findings,
    assessmentHistory,
    summary,
    allScreenshots,
    allTools,
    allExternalLinks,
    allInternalLinks
  } = data;

  // --- Calculate overall assessment dates from history ---
  // Default to details from the main form, but override with history if available.
  let overallStartDate = masaDetails.assessmentStartDate || masaDetails.date;
  let overallEndDate = masaDetails.assessmentEndDate || masaDetails.date;

  if (assessmentHistory && assessmentHistory.length > 0) {
    // Get all valid start and end dates from the history array
    const startDates = assessmentHistory
      .map(h => new Date(h.startDate))
      .filter(d => !isNaN(d.getTime()));
    const endDates = assessmentHistory
      .map(h => new Date(h.endDate))
      .filter(d => !isNaN(d.getTime()));

    if (startDates.length > 0) {
      overallStartDate = new Date(Math.min.apply(null, startDates)).toISOString().split('T')[0];
    }
    if (endDates.length > 0) {
      overallEndDate = new Date(Math.max.apply(null, endDates)).toISOString().split('T')[0];
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>MASA Report</title>
        <style>
            body { font-family: Helvetica, Arial, sans-serif; margin: 40px; color: #333; }
            h1, h2, h3, h4 { color: #2c3e50; }
            h1 { font-size: 2.5em; color: navy; }
            h2 { font-size: 1.6em; border-bottom: 2px solid navy; padding-bottom: 8px; margin-top: 40px; page-break-before: always; color: navy; }
            h2:first-of-type { page-break-before: auto; }
            h3 { font-size: 1.2em; margin-top: 30px; }
            .report-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9em; }
            .report-table th, .report-table td { border: 1px solid #bdc3c7; padding: 10px; text-align: left; }
            .report-table th { background-color: navy; color: white; font-weight: bold; }
            /* Reduce size of tables on the title page to ensure they fit */
            .title-page-footer .report-table {
              font-size: 0.75em;
            }
            .title-page-footer .report-table th, .title-page-footer .report-table td {
              padding: 5px 8px;
            }
            .summary-table th, .summary-table td { text-align: center; }
            .risk-critical { color: #c0392b; font-weight: bold; }
            .risk-high { color: #e74c3c; font-weight: bold; }
            .risk-medium { color: #f39c12; font-weight: bold; }
            .risk-low { color: #27ae60; font-weight: bold; }
            .risk-informational { color: #3498db; font-weight: bold; }
            .evidence-image { max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #ddd; }
            p { line-height: 1.6; }
            pre { white-space: pre-wrap; word-wrap: break-word; }

            .screenshots-table th:nth-child(1), .screenshots-table td:nth-child(1) { width: 5%; vertical-align: top; }
            .screenshots-table th:nth-child(2), .screenshots-table td:nth-child(2) { width: 25%; vertical-align: top; }
            .screenshots-table th:nth-child(3), .screenshots-table td:nth-child(3) { width: 70%; }

            /* --- Title Page Styles --- */
            .title-page {
              display: flex;
              flex-direction: column;
              justify-content: flex-start; /* Align content to the top */
              page-break-after: always; /* Ensure ToC starts on page 2 */
            }
            .brand-name-title {
              position: absolute;
              top: 40px;
              right: 40px;
              font-size: 48px;
              font-weight: bold;
              color: navy;
            }
            .main-title {
              margin-top: 5rem; /* Further reduced space to ensure content fits on one page */
              text-align: center;
            }
            .title-page-footer {
              margin-top: 1.5rem; /* Reduced space above the tables */
            }

            /* --- Table of Contents --- */
            .toc { margin-top: 2rem; }
            .toc ul { list-style: none; padding-left: 0; }
            .toc li { margin-bottom: 10px; font-size: 1.1em; }
            .toc a { text-decoration: none; color: #3498db; }

            .toc-page {
                color: navy;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                page-break-after: always; /* Ensure Summary starts on page 3 */
            }
            .toc-page .toc li {
                font-size: 1.6em; /* Large, but safe font size */
                line-height: 1.8; /* Spacing between items */
            }
            .toc-page .toc a { color: navy; }

            .summary-page {
                page-break-after: always; /* Ensure Scope starts on the next page */
                page-break-inside: avoid; /* Try to keep this content on one page */
            }

            .scope-page {
                page-break-after: always; /* Ensure Risk Definition starts on the next page */
            }

            .risk-definition-page {
                page-break-inside: avoid;
            }
            /* --- Aggressive compaction styles for Risk Definition page --- */
            .risk-definition-page h2 {
                margin-top: 0; /* Remove large top margin from default h2 */
            }
            .risk-definition-page p {
                font-size: 0.8em;
                line-height: 1.3;
            }
            .risk-definition-page h4 {
                font-size: 1em;
                margin-top: 10px;
            }
            .risk-definition-page .report-table {
                font-size: 0.7em;
                margin-top: 5px;
            }
            .risk-definition-page .report-table th, .risk-definition-page .report-table td { padding: 4px 6px; }

            /* PDF Layout Control */
            /* Styles to make the summary/scope section more compact */
            .summary-section { page-break-after: avoid; }
            .summary-section p { font-size: 0.9em; line-height: 1.5; }
            .summary-section h3 { margin-top: 25px; font-size: 1.1em; }
            .summary-section .report-table {
                font-size: 0.85em;
                margin-top: 15px;
            }

            h2, h3, .report-table { page-break-after: avoid; }
            .report-table tr { page-break-inside: avoid; }
        </style>
    </head>
    <body>
        <!-- Page 1: Title Page -->
        <div class="title-page">
          <div class="brand-name-title">Cognizant</div>
          <div class="main-title">
            <h3>${escapeHtml(masaDetails.applicationId)}: ${escapeHtml(masaDetails.applicationName)}</h3>
            <h4>Manual Application Security Assessment</h4>
          </div>
          <div class="title-page-footer">
            <table class="report-table title-page-table">
              <tbody>
                <tr>
                  <th>Version</th><td>${escapeHtml(masaDetails.version)}</td>
                  <th>Author</th><td>${escapeHtml(masaDetails.author)}</td>
                  <th>Date</th><td>${escapeHtml(masaDetails.date)}</td>
                </tr>
                <tr>
                  <th>Reviewed By</th><td>${escapeHtml(masaDetails.reviewedBy)}</td>
                  <th>Approved By</th><td colspan="3">${escapeHtml(masaDetails.approvedBy)}</td>
                </tr>
              </tbody>
            </table>
            <table class="report-table title-page-table">
              <tbody>
                <tr>
                  <th style="width: 25%;">Application URL</th>
                  <td>${linkifyAndEscape(masaDetails.applicationUrl)}</td>
                </tr>
                <tr>
                  <th>Vulnerability Details</th>
                  <td>
                    <table class="report-table summary-table">
                      <thead>
                        <tr><th></th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>Informational</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        <tr><th>Total</th><td>${summary.total.Critical}</td><td>${summary.total.High}</td><td>${summary.total.Medium}</td><td>${summary.total.Low}</td><td>${summary.total.Informational}</td><td>${summary.total.Total}</td></tr>
                        <tr><th>Fixed</th><td>${summary.fixed.Critical}</td><td>${summary.fixed.High}</td><td>${summary.fixed.Medium}</td><td>${summary.fixed.Low}</td><td>${summary.fixed.Informational}</td><td>${summary.fixed.Total}</td></tr>
                        <tr><th>Open</th><td>${summary.open.Critical}</td><td>${summary.open.High}</td><td>${summary.open.Medium}</td><td>${summary.open.Low}</td><td>${summary.open.Informational}</td><td>${summary.open.Total}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Page 2: Table of Contents -->
        <div class="toc-page">
          <h2 style="page-break-before: auto;">Table of Contents</h2>
          <div class="toc">
            <ul>
              <li><a href="#summary">1.0 Summary</a></li>
              <li><a href="#risk-definition">2.0 Risk Definition</a></li>
              <li><a href="#findings">3.0 Finding and Recommendation</a></li>
              <li><a href="#screenshots">4.0 Screenshots</a></li>
              <li><a href="#remediation-timeline">5.0 Remediation Timeline</a></li>
              <li><a href="#tools">6.0 Tools Used</a></li>
              <li><a href="#references">7.0 Reference Links</a></li>
            </ul>
          </div>
        </div>

        <!-- Page 3: Summary -->
        <div class="summary-page">
            <div class="summary-section">
              <h2 id="summary" style="page-break-before: auto;">1.0 Summary</h2>
              <p>Cognizant Corporate IT application security group performed a security assessment of the <b>${escapeHtml(masaDetails.applicationName)}</b> Application from <b>${escapeHtml(overallStartDate)}</b> through <b>${escapeHtml(overallEndDate)}</b>. This assessment identified security vulnerabilities and insecurely configured application controls which could be exploited by users with no prior knowledge or access to the application (i.e., uninformed outsider) or by approved users of the application (i.e., informed insider) to obtain unauthorized access to Cognizant systems or data. The assessment is not intended to guarantee the identification of all vulnerabilities. Due to the dynamic nature of Cognizant’s information technology environment, these findings represent a moment in time, and any changes occurring after the assessment could affect the observations documented within this report.</p>
              <h3>Assessment History</h3>
              <table class="report-table">
                <thead><tr><th>Version</th><th>Scan Details</th><th>Start Date</th><th>End Date</th><th>Assessed By</th></tr></thead>
                <tbody>
                  ${assessmentHistory.map(h => `
                    <tr><td>${escapeHtml(h.version)}</td><td>${escapeHtml(h.scanDetails)}</td><td>${escapeHtml(h.startDate)}</td><td>${escapeHtml(h.endDate)}</td><td>${escapeHtml(h.assessedBy)}</td></tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
        </div>

        <!-- Page 4: Scope -->
        <div class="scope-page">
            <h2 id="scope" style="page-break-before: auto;">2.0 Scope</h2>
            <p>The scope of testing was limited to the below URLs and user roles within the application.</p>
            <table class="report-table">
              <tr><th style="width: 25%;">URL</th><td><pre>${linkifyAndEscape(masaDetails.scopeUrl)}</pre></td></tr>
              <tr><th>User Roles</th><td><pre>${escapeHtml(masaDetails.scopeUserRoles)}</pre></td></tr>
            </table>
        </div>

        <!-- Page 5: Risk Definition -->
        <div class="risk-definition-page">
              <h2 id="risk-definition" style="page-break-before: auto;">3.0 Risk Definition</h2>
              <p>During the assessment, we identified security weaknesses and have provided recommendations to address those weaknesses. All remediation attempts must be tested prior to deploying them into the production environment. Based on industry standard practices, the following ratings (<span class="risk-critical">Critical</span>, <span class="risk-high">High</span>, <span class="risk-medium">Medium</span>, <span class="risk-low">Low</span>, and <span class="risk-informational">Informational</span>) have been assigned to each observation based upon the risk they pose to Cognizant systems.</p>

              <h4>Risk Rating</h4>
              <table class="report-table">
                <tr><th>Risk Rating</th><th>Risk</th><th>Sophistication (Sop)</th><th>Remediation Effort (Rem)</th></tr>
                <tr><td><span class="risk-critical">Critical</span></td><td>A clear and immediate threat to business systems, data, or operations.</td><td>N/A</td><td>N/A</td></tr>
                <tr><td><span class="risk-high">High</span></td><td>Exposes highly sensitive data or could significantly impact business operations.</td><td>Exploiting these weaknesses requires advanced manual techniques and a high level of skill.</td><td>Remediation requires greater than 40 hours for research and implementation, or requires large hardware or software purchases.</td></tr>
                <tr><td><span class="risk-medium">Medium</span></td><td>Could result in access to sensitive data or disrupt or reduce the performance of business operations. If combined with other weaknesses, exposure could result in access to highly sensitive data or significant business impact.</td><td>Uses manual techniques and can be identified with automated tools. This requires a moderate level of technical skill.</td><td>Remediation requires between 10 and 40 hours for research and implementation, or requires moderate hardware or software purchases.</td></tr>
                <tr><td><span class="risk-low">Low</span></td><td>Could result in sensitive data exposure or business disruption only when combined with other weaknesses.</td><td>Uses automated methods for detection and exploitation and requires a low level of skill.</td><td>Remediation requires less than 10 hours for research and implementation.</td></tr>
                <tr><td><span class="risk-informational">Informational</span></td><td>Of nominal risk and provided for informational purposes only.</td><td>N/A</td><td>N/A</td></tr>
              </table>

        <h2 id="findings">4.0 Finding and Recommendation</h2>
        <table class="report-table">
          <thead><tr><th>No</th><th>Risk</th><th>Status</th><th>Observation</th><th>Sop</th><th>Impact to Cognizant</th><th>Rem</th><th>Recommendation</th></tr></thead>
          <tbody>
            ${findings.map((f, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(f.risk)}</td>
                <td>${escapeHtml(f.status)}</td>
                <td>${escapeHtml(f.observation)}</td>
                <td>${escapeHtml(f.sop)}</td>
                <td>${escapeHtml(f.impact)}</td>
                <td>${escapeHtml(f.rem)}</td>
                <td>${escapeHtml(f.recommendation)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 id="screenshots">5.0 Screenshots</h2>
        <table class="report-table screenshots-table">
          <thead><tr><th>No</th><th>Title</th><th>Screen capture</th></tr></thead>
          <tbody>
            ${allScreenshots.map((ss, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(ss.title)}</td>
                <td>${ss.files.map(file => `<img src="data:${file.mimetype};base64,${file.buffer.toString('base64')}" class="evidence-image" />`).join('')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 id="remediation-timeline" style="page-break-before: always;">6.0 Remediation Timeline</h2>
        <h3>INTRANET APPLICATION</h3>
        <table class="report-table"><tr><th>CRITICAL</th><th>HIGH</th><th>MEDIUM</th><th>LOW</th></tr><tr><td>45 Days</td><td>90 Days</td><td>180 Days</td><td>365 Days</td></tr></table>
        <h3>INTERNET APPLICATION</h3>
        <table class="report-table"><tr><th>CRITICAL</th><th>HIGH</th><th>MEDIUM</th><th>LOW</th></tr><tr><td>15 Days</td><td>45 Days</td><td>90 Days</td><td>180 Days</td></tr></table>

        <h2 id="tools" style="page-break-before: always;">7.0 Tools Used</h2>
        <p>We use specific tools that are available in Kali Linux to perform our assessment which are as follows.</p>
        <table class="report-table">
          <thead><tr><th>Tool</th><th>Classification</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr>
              <td>Gobuster, Ffuf, Wappalyzer, Wfuzz</td>
              <td>Free</td>
              <td>We use these tools to gather information and utilize that information to enumerate further</td>
            </tr>
            <tr>
              <td>Wget, Curl, Ncat, Burpsuite,</td>
              <td>Free & Professional</td>
              <td>These tools are used to enumerate further. Web proxy and scanning platform used to intercept and analyze web-based communication.</td>
            </tr>
            <tr>
              <td>SQL Map</td>
              <td>Free</td>
              <td>Exploitation of SQL Injection can be done with the help of this tool</td>
            </tr>
            ${allTools.map(t => `
              <tr><td>${escapeHtml(t.tool)}</td><td>${escapeHtml(t.classification)}</td><td>${escapeHtml(t.purpose)}</td></tr>
            `).join('')}
          </tbody>
        </table>

        <h2 id="references" style="page-break-before: always;">8.0 Reference Links</h2>
        <h3>External Links</h3>
        <table class="report-table">
          <thead><tr><th>Links</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr>
              <td>
                <a href="https://owasp.org/www-project-top-ten/" style="color: #0000EE; text-decoration: underline;">https://owasp.org/www-project-top-ten/</a><br>
                <a href="https://owasp.org/API-Security/" style="color: #0000EE; text-decoration: underline;">https://owasp.org/API-Security/</a><br>
                <a href="https://genai.owasp.org/" style="color: #0000EE; text-decoration: underline;">https://genai.owasp.org/</a><br>
                <a href="https://nvd.nist.gov/vuln" style="color: #0000EE; text-decoration: underline;">https://nvd.nist.gov/vuln</a><br>
                <a href="https://owasp.org/www-project-application-security-verification-standard/" style="color: #0000EE; text-decoration: underline;">https://owasp.org/www-project-application-security-verification-standard/</a>
              </td>
              <td>The security best practices and details provided in the external links are subject to change by respective Organization on a periodic basis and depends on the latest defenses and attacks</td>
            </tr>
            ${allExternalLinks.map(l => `
              <tr><td>${linkifyAndEscape(l.link)}</td><td>${escapeHtml(l.remarks)}</td></tr>
            `).join('')}
          </tbody>
        </table>

        <h3>Internal Links</h3>
        <table class="report-table">
          <thead><tr><th>Links</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr>
              <td>SSDLC Standard</td>
              <td>The internal document links are subject to be updated in a periodic manner and it is recommended to refer the latest document</td>
            </tr>
            ${allInternalLinks.map(l => `
              <tr><td>${linkifyAndEscape(l.link)}</td><td>${escapeHtml(l.remarks)}</td></tr>
            `).join('')}
          </tbody>
        </table>
    </body>
    </html>
  `;
}