# Rep Gen Suite — DAST & MASA Report Generator

A Cognizant internal tool that generates professional, branded PDF security reports for **DAST** (Dynamic Application Security Testing) and **MASA** (Manual Application Security Assessment) engagements.

---

## Features

- **DAST Report Generator** — Fill in application details, add vulnerabilities (with severity, status, affected URL, description, remediation, and evidence screenshots), and export a formatted PDF
- **MASA Report Generator** — Capture assessment history, findings, screenshots, tools, and reference links into a landscape PDF
- **Application selector** — Pre-loaded list of applications for quick auto-fill
- **Vulnerability database** — Built-in library of 157 common vulnerabilities with pre-filled descriptions and remediations
- **Severity filter** — Choose which severity levels to include in the report
- **Cognizant branding** — Cover page with logo, colour-coded severity charts, header/footer on every page

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| PDF engine | Puppeteer (headless Chrome) |
| Data store | JSON flat files |

---

## Prerequisites

- **Node.js 18 or later** — download from [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — to clone this repository

---

## Setup (First Time Only)

### 1. Clone the repository

```bash
git clone https://github.com/NAGGI-AI/Rep-Gen-Suite.git
cd Rep-Gen-Suite
```

### 2. Install backend dependencies

```bash
cd my-backend-app
npm install
```

> Puppeteer will automatically download a bundled Chromium (~170 MB) during this step.

### 3. Install frontend dependencies

```bash
cd ../my-frontend-app
npm install
```

---

## Running the App

You need **two terminals** open at the same time.

**Terminal 1 — Backend**
```bash
cd my-backend-app
npm start
```
You should see: `Backend server is running and listening at http://localhost:3001`

**Terminal 2 — Frontend**
```bash
cd my-frontend-app
npm run dev
```
You should see: `Local: http://localhost:5173`

Then open **http://localhost:5173** in Chrome or Edge.

---

## Project Structure

```
Rep_Gen_Suite/
├── my-backend-app/
│   ├── server.js                   # Express API (report endpoints)
│   ├── pdf-generator.js            # Puppeteer PDF generation
│   ├── dast-report-template.js     # DAST HTML template
│   ├── masa-report-template.js     # MASA HTML template
│   ├── database.js                 # Vulnerability DB loader
│   ├── vulnerabilities.json        # 157 vulnerability definitions
│   ├── applications.json           # Application list
│   └── assets/
│       └── cognizant-logo.png      # Logo embedded in PDF cover
├── my-frontend-app/
│   └── src/
│       ├── App.jsx                 # DAST report generator UI
│       ├── MasaGenerator.jsx       # MASA report generator UI
│       └── LandingPage.jsx         # Home / navigation
├── SETUP_GUIDE.txt                 # Plain-English setup guide for non-technical users
└── README.md                       # This file
```

---

## Generating a DAST Report

1. Select your application from the dropdown (auto-fills App ID and Name)
2. Complete assessment details (dates, environment, report type)
3. For each vulnerability:
   - Select the vulnerability name (auto-fills description and remediation)
   - Set severity, status, and affected URL
   - Optionally upload evidence screenshots
   - Click **Add Vulnerability to Report**
4. Use the severity filter to choose which severities to include
5. Click **Generate PDF Report** — the PDF downloads automatically

---

## Generating a MASA Report

1. Navigate to the MASA Generator from the home page
2. Fill in application and assessment details
3. Add findings with risk level, status, and screenshots
4. Add assessment history entries
5. Click **Generate MASA Report**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "An unexpected server error occurred" | Make sure the backend (`npm start`) is running in a separate terminal |
| PDF does not download | Check the backend terminal for error details |
| `npm install` fails | Ensure Node.js 18+ is installed: `node --version` |
| App does not open | Make sure both terminals are running and visit `http://localhost:5173` |

---

## For Developers

To run the backend with auto-reload on file changes:
```bash
cd my-backend-app
npm run dev
```

The frontend's API URL is configured in `my-frontend-app/.env.development`:
```
VITE_API_URL=http://localhost:3001
```

---

*Internal tool — Cognizant Application Security Practice*
