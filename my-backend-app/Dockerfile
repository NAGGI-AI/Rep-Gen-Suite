# Use an official Node.js runtime as a parent image.
# This image is based on Debian, which works well for installing Puppeteer dependencies.
FROM node:18-slim

# Create a non-root user and group for security best practices.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/app \
    && chown -R pptruser:pptruser /home/pptruser

# Install system dependencies required by Puppeteer to run Chromium.
# The 'node:18-slim' image is minimal and does not include these by default.
# This is a common requirement for running Puppeteer in a container.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # Clean up apt-get cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Set the working directory to the app directory
WORKDIR /home/pptruser/app

# Copy package manifests
COPY package*.json ./

# Explicitly set the Puppeteer cache directory inside our app folder
# and ensure the non-root user owns it.
ENV PUPPETEER_CACHE_DIR=/home/pptruser/app/.cache/puppeteer
RUN mkdir -p $PUPPETEER_CACHE_DIR && chown -R pptruser:pptruser /home/pptruser

# Install app dependencies in the container
# This ensures the correct version of Puppeteer/Chromium is installed for Linux
# We explicitly skip the browser download during `npm install` and then
# use the `@puppeteer/browsers` CLI to install the exact browser version needed.
# This is the most reliable method for containerized environments.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --production
RUN npx puppeteer browsers install chrome

# Bundle app source
COPY . .

# Ensure all files are owned by the non-root user
RUN chown -R pptruser:pptruser /home/pptruser/app

# Switch to the non-root user
USER pptruser

# Your app listens on port 3001, but Azure provides the PORT env var.
# Exposing the port is good practice for documentation.
EXPOSE 3001

# Define the command to run your app
CMD [ "node", "server.js" ]