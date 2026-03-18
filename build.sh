#!/bin/bash
# =============================================================
# Render.com build script for Rep_Gen_Suite
# Runs from the repo root during each deployment.
# =============================================================
set -e   # Exit immediately if any command fails

echo ""
echo "===== [1/3] Building React frontend ====="
cd my-frontend-app
npm install
npm run build          # Vite picks up .env.production automatically

echo ""
echo "===== [2/3] Copying frontend build → backend/public ====="
cd ..
mkdir -p my-backend-app/public
# Clear old files first so stale assets don't linger
rm -rf my-backend-app/public/*
cp -r my-frontend-app/dist/. my-backend-app/public/

echo ""
echo "===== [3/3] Installing backend dependencies ====="
cd my-backend-app
npm install            # Also downloads Puppeteer's bundled Chrome

echo ""
echo "✅ Build complete — ready to start server."
