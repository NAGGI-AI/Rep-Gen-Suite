# Rep Gen Suite — DAST & MASA Report Generator

A Cognizant internal tool for generating professional, branded PDF security reports for **DAST** (Dynamic Application Security Testing) and **MASA** (Manual Application Security Assessment) engagements. Runs entirely on the local machine — no cloud dependency, no internet required after setup.

---

## Features

| Feature | Description |
|---------|-------------|
| DAST Report Generator | Fill application details, add vulnerabilities with severity/status/evidence, export branded PDF |
| MASA Report Generator | Capture findings, screenshots, tools, assessment history into a landscape PDF |
| Application selector | Pre-loaded Cognizant application list — auto-fills App ID and Name |
| Vulnerability database | 157-entry library with pre-filled descriptions and remediations; supports custom names too |
| Free-text vulnerability input | Type any custom vulnerability name not in the database — not restricted to the list |
| Severity filter | Select which severity levels (High / Medium / Low / Informational) to include in the PDF |
| Backend health banner | Red warning banner appears in the UI if the backend server is not running |
| One-click launcher | `Start App.bat` and `Stop App.bat` — no terminal knowledge needed |
| Cognizant branding | Cover page with logo, colour-coded severity chart, header/footer on every page |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 18, Vite 7 |
| Backend | Node.js + Express | Node 18+, Express 4 |
| PDF engine | Puppeteer (headless Chromium) | Puppeteer 22 |
| Data store | JSON flat files | — |
| Package manager | npm | — |

---

## Prerequisites

- **Node.js 18 or later** — [nodejs.org](https://nodejs.org) (download the LTS version)
- **Git** *(optional)* — only needed if cloning from GitHub; teammates can use the shared folder directly

---

## Getting the Project

**Option A — From GitHub (developers)**
```bash
git clone https://github.com/NAGGI-AI/Rep-Gen-Suite.git
cd Rep-Gen-Suite
```

**Option B — From shared folder (teammates)**

Team lead shares the `Rep_Gen_Suite` folder via OneDrive or Teams. Copy it to your local machine (Desktop or Documents).

---

## Installation (First Time Only)

Run `npm install` once in each sub-folder. This downloads all dependencies including a bundled Chromium (~170 MB) for PDF generation.

```bash
# Backend
cd my-backend-app
npm install

# Frontend
cd ../my-frontend-app
npm install
```

> This step is only needed once per machine. After that, just use the bat files to start the app.

---

## Running the App

### Method 1 — One-click (Recommended)

Double-click **`Start App.bat`** in the project root.

It automatically:
1. Clears port 3001 if anything is already using it
2. Starts the backend server in its own window
3. Starts the frontend dev server in its own window
4. Opens `http://localhost:5173` in the browser

To stop: double-click **`Stop App.bat`**.

### Method 2 — Manual (Developers)

Open two terminals:

```bash
# Terminal 1 — Backend
cd my-backend-app
npm start
# Expected: "Backend server is running and listening at http://localhost:3001"

# Terminal 2 — Frontend
cd my-frontend-app
npm run dev
# Expected: "Local: http://localhost:5173"
```

Then open **http://localhost:5173** in Chrome or Edge.

> For backend auto-reload during development, use `npm run dev` instead of `npm start` in the backend terminal.

---

## Project Structure

```
Rep_Gen_Suite/
├── my-backend-app/
│   ├── server.js                    # Express API — /api/generate-report, /api/generate-masa-report
│   ├── pdf-generator.js             # Puppeteer — launches headless Chrome, renders HTML to PDF
│   ├── dast-report-template.js      # DAST report HTML/CSS template (cover + vuln details)
│   ├── masa-report-template.js      # MASA report HTML/CSS template (landscape)
│   ├── database.js                  # Loads vulnerabilities.json into memory on startup
│   ├── vulnerabilities.json         # 157 vulnerability definitions (name, description, remediation)
│   ├── applications.json            # Cognizant application list with IDs
│   ├── nodemon.json                 # Nodemon config for dev auto-reload
│   └── assets/
│       └── cognizant-logo.png       # Embedded as base64 in PDF cover page
├── my-frontend-app/
│   ├── src/
│   │   ├── App.jsx                  # DAST report generator — main UI and form logic
│   │   ├── App.css                  # DAST UI styles
│   │   ├── MasaGenerator.jsx        # MASA report generator UI
│   │   ├── LandingPage.jsx          # Home page — links to DAST and MASA generators
│   │   ├── LandingPage.css          # Landing page styles
│   │   ├── main.jsx                 # React entry point + router setup
│   │   └── index.css                # Global CSS variables and base styles
│   ├── index.html                   # HTML shell
│   ├── vite.config.js               # Vite build config
│   └── .env.development             # VITE_API_URL=http://localhost:3001
├── Start App.bat                    # One-click launcher — starts both servers + opens browser
├── Stop App.bat                     # One-click shutdown — kills both servers
├── SETUP_GUIDE.txt                  # Plain-English setup guide for non-technical users
└── README.md                        # This file
```

---

## Generating a DAST Report

1. Open the app → click **DAST Report Generator**
2. **Application & Assessment Details**
   - Use the *Select Application* dropdown to auto-fill App ID and Name, or type manually
   - Fill in Requestor POC ID, AppSec POC ID, dates, environment, scan report type, and URL
3. **Add Vulnerabilities** (repeat for each finding)
   - Start typing in the *Vulnerability Name* field — autocomplete suggestions appear from the 157-entry database
   - Select a suggestion to auto-fill Description and Remediation, or type a completely custom name
   - Set Severity, Status, Affected URL, and optionally a Remark
   - Upload evidence screenshots if available
   - Click **Add Vulnerability to Report**
4. Use the **Severity Filter** to include/exclude severity levels from the report
5. Click **Generate PDF Report** — the PDF downloads automatically

---

## Generating a MASA Report

1. Open the app → click **MASA Report Generator**
2. Fill in application and assessment details
3. Add findings with risk level, status, and screenshots
4. Add assessment history entries
5. Click **Generate MASA Report** — landscape PDF downloads automatically

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | Returns the full application list from `applications.json` |
| GET | `/api/vulnerabilities` | Returns all 157 vulnerability definitions from `vulnerabilities.json` |
| POST | `/api/generate-report` | Accepts `multipart/form-data` — generates and streams a DAST PDF |
| POST | `/api/generate-masa-report` | Accepts `multipart/form-data` — generates and streams a MASA PDF |
| GET | `/healthz` | Health check endpoint — returns `{ status: "ok" }` |

---

## Configuration

| File | Key | Default | Purpose |
|------|-----|---------|---------|
| `my-frontend-app/.env.development` | `VITE_API_URL` | `http://localhost:3001` | Backend URL used by the frontend in dev mode |
| `my-backend-app/server.js` | `PORT` | `3001` | Backend port (overridden by `process.env.PORT` in cloud deployments) |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Red "Backend not running" banner | Backend server is not started | Double-click `Start App.bat` and refresh the page |
| "Port 3001 is already in use" | A previous server instance is still running | Run `Stop App.bat`, then `Start App.bat` again. Or in PowerShell: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force` |
| Vulnerability list empty | Backend not running when page loaded | Start backend, then press F5 to refresh |
| "An unexpected server error occurred" | Backend crashed during PDF generation | Check the backend terminal window for the error stack trace |
| PDF does not download | Puppeteer/Chrome failed | Check backend terminal; ensure backend window is still open |
| `npm install` fails | Node.js not installed or wrong version | Run `node --version` — must be v18 or higher |
| App not opening in browser | Frontend not started | Check that the frontend window shows "Local: http://localhost:5173" |

---

## Recent Changes

| Version | Change |
|---------|--------|
| May 2026 | Added `Start App.bat` and `Stop App.bat` — one-click launch and shutdown |
| May 2026 | Vulnerability name field changed from locked dropdown to free-text with autocomplete |
| May 2026 | Backend connectivity check — red warning banner shown if backend is not running |
| May 2026 | Description/remediation fields start empty with placeholder text instead of stale default |
| Mar 2026 | Added Cognizant logo to PDF cover page |
| Mar 2026 | Application selector dropdown — auto-fills App ID and Name |
| Mar 2026 | Severity filter — control which severities appear in the generated PDF |
| Mar 2026 | Vulnerability database expanded to 157 entries with full descriptions and remediations |

---

*Internal tool — Cognizant Application Security Practice*
