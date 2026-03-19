/**
 * DAST Report HTML Template
 * Generates a professional, Cognizant-branded PDF report for DAST assessments.
 */

function escapeHtml(unsafe) {
  if (unsafe === null || typeof unsafe === 'undefined') return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Maps appType → document title */
export function buildDocTitle(appType) {
  if (appType === 'API') return 'Web API DAST Report';
  if (appType === 'Web Application') return 'Web Application DAST Report';
  return `${appType || 'Application'} DAST Report`;
}

/** Maps scanReportType → Puppeteer header string */
export function buildReportTitle(scanReportType) {
  const map = {
    'Initial':  'DAST Initial Vulnerability Report',
    'Rescan-1': 'DAST Rescan-1 Vulnerability Report',
    'Rescan-2': 'DAST Rescan-2 Vulnerability Report',
    'Rescan-3': 'DAST Rescan-3 Vulnerability Report',
    'Rescan-4': 'DAST Rescan-4 Vulnerability Report',
    'Rescan-5': 'DAST Rescan-5 Vulnerability Report',
    'Final':    'DAST Final Vulnerability Report',
  };
  return map[scanReportType] || `DAST ${scanReportType} Vulnerability Report`;
}

/**
 * Generates the full HTML string for the DAST PDF.
 * @param {object} data
 * @returns {string}
 */
export function generateDastReportHtml({ applicationDetails, vulnerabilities, severityCounts }) {
  const docTitle    = buildDocTitle(applicationDetails.appType);
  const reportTitle = buildReportTitle(applicationDetails.scanReportType);
  const totalVulns  = vulnerabilities.length;

  // Pre-compute open/fixed counts per severity for the title-page matrix
  const matrix = {
    High:          { total: severityCounts.High,          fixed: 0, open: 0 },
    Medium:        { total: severityCounts.Medium,        fixed: 0, open: 0 },
    Low:           { total: severityCounts.Low,           fixed: 0, open: 0 },
    Informational: { total: severityCounts.Informational, fixed: 0, open: 0 },
  };
  vulnerabilities.forEach(v => {
    if (!matrix[v.severity]) return;
    if (v.status === 'Fixed') matrix[v.severity].fixed++;
    else                      matrix[v.severity].open++;
  });
  const totalFixed = vulnerabilities.filter(v => v.status === 'Fixed').length;
  const totalOpen  = totalVulns - totalFixed;

  // ─── VULNERABILITY CARDS HTML ──────────────────────────────────────────────
  const vulnCardsHtml = vulnerabilities.map((vuln, index) => {
    const statusClass = {
      'Open':          'status-open',
      'Fixed':         'status-fixed',
      'In Progress':   'status-inprogress',
      'Accepted Risk': 'status-accepted',
    }[vuln.status] || 'status-open';

    const evidenceHtml = (vuln.evidence && vuln.evidence.length > 0)
      ? `<tr>
           <th class="row-th">Evidence</th>
           <td>${vuln.evidence.map(ev => `
             <div class="ev-block">
               ${ev.title ? `<p class="ev-title">${escapeHtml(ev.title)}</p>` : ''}
               ${(ev.files || []).map(f =>
                 `<img src="data:${f.mimetype};base64,${f.buffer.toString('base64')}"
                       class="ev-img" />`
               ).join('')}
             </div>`).join('')}
           </td>
         </tr>`
      : '';

    // Left-border colour based on severity
    const borderColor = {
      'High':          '#c0392b',
      'Medium':        '#e67e22',
      'Low':           '#27ae60',
      'Informational': '#2980b9',
    }[vuln.severity] || '#003399';

    return `
    <div class="vuln-card${index === 0 ? ' first-card' : ''}" style="border-left: 4px solid ${borderColor};">
      <div class="vuln-card-header">
        <span class="vuln-num">${index + 1}.</span>
        <span class="vuln-name">${escapeHtml(vuln.vulnerabilityName)}</span>
        <span class="sev-badge sev-${escapeHtml(vuln.severity)}">${escapeHtml(vuln.severity)}</span>
      </div>
      <table class="vuln-table">
        <tbody>
          <tr><th class="row-th">Affected URL</th>
              <td>${escapeHtml(vuln.affectedUrl || 'N/A')}</td></tr>
          <tr><th class="row-th">Description</th>
              <td>${escapeHtml(vuln.description)}</td></tr>
          <tr><th class="row-th">Remediation</th>
              <td>${escapeHtml(vuln.remediation)}</td></tr>
          <tr><th class="row-th">Severity</th>
              <td class="sev-text-${escapeHtml(vuln.severity)}">${escapeHtml(vuln.severity)}</td></tr>
          <tr><th class="row-th">Status</th>
              <td><span class="${statusClass}">${escapeHtml(vuln.status)}</span></td></tr>
          ${vuln.remark ? `<tr><th class="row-th">Remark</th><td>${escapeHtml(vuln.remark)}</td></tr>` : ''}
          ${evidenceHtml}
        </tbody>
      </table>
    </div>`;
  }).join('\n');

  // ─── FULL HTML ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    /* ── Reset & Base ──────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      color: #1a1a2e;
      background: #fff;
      padding: 0 44px 44px 44px;
      line-height: 1.55;
    }

    /* ══════════════════════════════════════════════════
       PAGE 1 — TITLE PAGE
    ══════════════════════════════════════════════════ */
    .title-page {
      page-break-after: always;
      padding-top: 24px;
    }

    /* "Cognizant" brand mark — top right */
    .brand-mark {
      text-align: right;
      font-size: 38pt;
      font-weight: 900;
      color: #003399;
      letter-spacing: -1px;
      padding-bottom: 10px;
      border-bottom: 3px solid #003399;
    }

    /* Centred title block */
    .title-block {
      margin-top: 52px;
      text-align: center;
      padding: 32px 24px 26px;
      background: linear-gradient(135deg, #001f6b 0%, #003399 50%, #0055cc 100%);
      border-radius: 8px;
      color: #fff;
      box-shadow: 0 4px 16px rgba(0, 51, 153, 0.25);
    }
    .title-block .app-name {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .title-block .report-type {
      font-size: 11pt;
      font-weight: 400;
      opacity: 0.88;
      margin-top: 8px;
      letter-spacing: 0.2px;
    }
    .title-block .generated-on {
      font-size: 8pt;
      opacity: 0.65;
      margin-top: 12px;
    }

    /* Meta details grid */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 26px;
      font-size: 9pt;
    }
    .meta-table th {
      background: #003399;
      color: #fff;
      padding: 9px 12px;
      text-align: left;
      width: 20%;
      font-weight: 600;
      border: 1px solid #0044bb;
    }
    .meta-table td {
      border: 1px solid #c8d4ec;
      padding: 9px 12px;
      width: 30%;
      background: #f7f9ff;
    }

    /* Vulnerability overview matrix */
    .matrix-wrap { margin-top: 24px; }
    .matrix-label {
      font-size: 8.5pt;
      font-weight: 700;
      color: #003399;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 7px;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      text-align: center;
    }
    .matrix-table th {
      background: #003399;
      color: #fff;
      padding: 8px 10px;
      border: 1px solid #0044bb;
      font-weight: 600;
    }
    .matrix-table td {
      border: 1px solid #c8d4ec;
      padding: 8px 10px;
      font-weight: 700;
      background: #f7f9ff;
    }
    .matrix-table .row-label {
      background: #e8eef8;
      color: #003399;
      font-weight: 700;
      text-align: center;
    }
    .c-high { color: #c0392b; }
    .c-med  { color: #d35400; }
    .c-low  { color: #1e8449; }
    .c-info { color: #1a5276; }

    /* ══════════════════════════════════════════════════
       PAGE 2 — VULNERABILITY SUMMARY
       (Application details already shown on page 1 — no duplication)
    ══════════════════════════════════════════════════ */
    .summary-page { page-break-before: always; }

    .section-heading {
      background: linear-gradient(90deg, #001f6b 0%, #003399 60%, #0055cc 100%);
      color: #fff;
      padding: 10px 18px;
      font-size: 10.5pt;
      font-weight: 700;
      border-radius: 5px 5px 0 0;
      page-break-after: avoid;
      letter-spacing: 0.3px;
    }
    .section-body {
      border: 1px solid #c8d4ec;
      border-top: none;
      padding: 20px;
      border-radius: 0 0 5px 5px;
      margin-bottom: 28px;
    }

    /* Chart + stat cards side by side */
    .summary-layout {
      display: flex;
      gap: 28px;
      align-items: flex-start;
    }
    .chart-wrap {
      width: 300px;
      height: 175px;
      flex-shrink: 0;
    }
    .stat-cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 8.5pt;
      border-left: 3px solid transparent;
    }
    .stat-card .sn { font-size: 20pt; font-weight: 800; line-height: 1; min-width: 28px; text-align: right; }
    .stat-card .sl { font-size: 8.5pt; color: #444; font-weight: 500; }
    .sc-total { background: #eef1f8; border-left-color: #003399; }
    .sc-total .sn { color: #003399; }
    .sc-high  { background: #fdf0ef; border-left-color: #c0392b; } .sc-high  .sn { color: #c0392b; }
    .sc-med   { background: #fef5ec; border-left-color: #d35400; } .sc-med   .sn { color: #d35400; }
    .sc-low   { background: #edfbf3; border-left-color: #1e8449; } .sc-low   .sn { color: #1e8449; }
    .sc-info  { background: #eaf4fb; border-left-color: #1a5276; } .sc-info  .sn { color: #1a5276; }

    /* ══════════════════════════════════════════════════
       PAGE 3+ — VULNERABILITY CARDS
    ══════════════════════════════════════════════════ */
    .vuln-details-page { page-break-before: always; }

    .vuln-card {
      page-break-inside: avoid;
      margin-top: 18px;
      border: 1px solid #c8d4ec;
      border-radius: 5px;
      overflow: hidden;
    }
    .vuln-card.first-card { margin-top: 0; }

    .vuln-card-header {
      background: linear-gradient(90deg, #001f6b 0%, #003399 70%, #0055cc 100%);
      color: #fff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 9.5pt;
    }
    .vuln-num  { font-weight: 800; flex-shrink: 0; }
    .vuln-name { font-weight: 600; flex: 1; }

    /* Severity badge */
    .sev-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 7.5pt;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .sev-High          { background: #c0392b; color: #fff; }
    .sev-Medium        { background: #e67e22; color: #fff; }
    .sev-Low           { background: #27ae60; color: #fff; }
    .sev-Informational { background: #2980b9; color: #fff; }

    /* Severity text colour inside table */
    .sev-text-High          { color: #c0392b; font-weight: 700; }
    .sev-text-Medium        { color: #e67e22; font-weight: 700; }
    .sev-text-Low           { color: #27ae60; font-weight: 700; }
    .sev-text-Informational { color: #2980b9; font-weight: 700; }

    .vuln-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .row-th {
      background: #f0f4fb;
      color: #003399;
      padding: 9px 12px;
      text-align: left;
      width: 20%;
      border: 1px solid #c8d4ec;
      font-weight: 600;
      vertical-align: top;
    }
    .vuln-table td {
      border: 1px solid #c8d4ec;
      padding: 9px 12px;
      vertical-align: top;
    }

    /* Status labels */
    .status-open      { color: #c0392b; font-weight: 700; }
    .status-fixed     { color: #1e8449; font-weight: 700; }
    .status-inprogress{ color: #e67e22; font-weight: 700; }
    .status-accepted  { color: #7f8c8d; font-weight: 700; }

    /* Evidence */
    .ev-block  { margin-bottom: 12px; }
    .ev-title  { font-weight: 700; font-size: 8.5pt; color: #003399; margin-bottom: 5px; }
    .ev-img    { max-width: 100%; height: auto; border: 1px solid #c8d4ec; border-radius: 3px; margin-top: 4px; display: block; }
  </style>
</head>
<body>

<!-- ══════════════ PAGE 1 — TITLE PAGE ══════════════ -->
<div class="title-page">

  <div class="brand-mark">Cognizant</div>

  <div class="title-block">
    <div class="app-name">${escapeHtml(applicationDetails.applicationName)}</div>
    <div class="report-type">${escapeHtml(docTitle)}</div>
    <div class="generated-on">Generated on ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</div>
  </div>

  <table class="meta-table">
    <tbody>
      <tr>
        <th>Application ID</th><td>${escapeHtml(applicationDetails.appId)}</td>
        <th>Application Type</th><td>${escapeHtml(applicationDetails.appType)}</td>
      </tr>
      <tr>
        <th>Application URL</th>
        <td colspan="3">${escapeHtml(applicationDetails.applicationUrl || 'N/A')}</td>
      </tr>
      <tr>
        <th>Requestor POC</th><td>${escapeHtml(applicationDetails.requestorPocId)}</td>
        <th>AppSec POC</th><td>${escapeHtml(applicationDetails.appsecPocId)}</td>
      </tr>
      <tr>
        <th>Assessment Start</th><td>${escapeHtml(applicationDetails.assessmentStartDate)}</td>
        <th>Assessment End</th><td>${escapeHtml(applicationDetails.assessmentEndDate)}</td>
      </tr>
      <tr>
        <th>Environment</th><td>${escapeHtml(applicationDetails.testedEnvironment)}</td>
        <th>Scan Report Type</th><td>${escapeHtml(applicationDetails.scanReportType)}</td>
      </tr>
    </tbody>
  </table>

  <div class="matrix-wrap">
    <div class="matrix-label">Vulnerability Overview</div>
    <table class="matrix-table">
      <thead>
        <tr>
          <th></th>
          <th class="c-high">High</th>
          <th class="c-med">Medium</th>
          <th class="c-low">Low</th>
          <th class="c-info">Informational</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">Total</td>
          <td class="c-high">${matrix.High.total}</td>
          <td class="c-med">${matrix.Medium.total}</td>
          <td class="c-low">${matrix.Low.total}</td>
          <td class="c-info">${matrix.Informational.total}</td>
          <td>${totalVulns}</td>
        </tr>
        <tr>
          <td class="row-label">Open</td>
          <td class="c-high">${matrix.High.open}</td>
          <td class="c-med">${matrix.Medium.open}</td>
          <td class="c-low">${matrix.Low.open}</td>
          <td class="c-info">${matrix.Informational.open}</td>
          <td>${totalOpen}</td>
        </tr>
        <tr>
          <td class="row-label">Fixed</td>
          <td class="c-high">${matrix.High.fixed}</td>
          <td class="c-med">${matrix.Medium.fixed}</td>
          <td class="c-low">${matrix.Low.fixed}</td>
          <td class="c-info">${matrix.Informational.fixed}</td>
          <td>${totalFixed}</td>
        </tr>
      </tbody>
    </table>
  </div>

</div>
<!-- END TITLE PAGE -->


<!-- ══════════════ PAGE 2 — VULNERABILITY SUMMARY ══════════════ -->
<!-- NOTE: Application details are already on Page 1. No duplication here. -->
<div class="summary-page">

  <div class="section-heading">1.0 &nbsp;Vulnerability Summary</div>
  <div class="section-body">
    <div class="summary-layout">
      <div class="chart-wrap">
        <canvas id="severityChart"></canvas>
      </div>
      <div class="stat-cards">
        <div class="stat-card sc-total"><div class="sn">${totalVulns}</div><div class="sl">Total Findings</div></div>
        <div class="stat-card sc-high" ><div class="sn">${severityCounts.High}</div><div class="sl">High</div></div>
        <div class="stat-card sc-med"  ><div class="sn">${severityCounts.Medium}</div><div class="sl">Medium</div></div>
        <div class="stat-card sc-low"  ><div class="sn">${severityCounts.Low}</div><div class="sl">Low</div></div>
        <div class="stat-card sc-info" ><div class="sn">${severityCounts.Informational}</div><div class="sl">Informational</div></div>
      </div>
    </div>
  </div>

</div>
<!-- END SUMMARY PAGE -->


<!-- ══════════════ PAGE 3+ — VULNERABILITY DETAILS ══════════════ -->
<div class="vuln-details-page">

  <div class="section-heading">2.0 &nbsp;Vulnerability Details</div>
  <div class="section-body" style="padding-top: 4px;">
    ${vulnCardsHtml}
  </div>

</div>
<!-- END VULNERABILITY DETAILS -->


<!-- Chart.js — rendered by Puppeteer's headless Chromium -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  new Chart(document.getElementById('severityChart'), {
    type: 'bar',
    data: {
      labels: ['High', 'Medium', 'Low', 'Informational'],
      datasets: [{
        data: [${severityCounts.High}, ${severityCounts.Medium}, ${severityCounts.Low}, ${severityCounts.Informational}],
        backgroundColor: [
          'rgba(192, 57, 43, 0.85)',
          'rgba(211, 84, 0, 0.85)',
          'rgba(30, 132, 73, 0.85)',
          'rgba(26, 82, 118, 0.85)'
        ],
        borderColor: ['#c0392b', '#d35400', '#1e8449', '#1a5276'],
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 9 }, color: '#444' },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { font: { size: 9 }, color: '#444' },
          grid: { display: false }
        }
      }
    }
  });
</script>

</body>
</html>`;
}
