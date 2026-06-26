# Use the official Microsoft Playwright image with Node.js
# This container comes pre-configured with all necessary dependencies for running Chromium, Firefox, and WebKit headlessly.
FROM mcr.microsoft.com/playwright:v1.61.0-jammy

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies to build TypeScript)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript project into JavaScript (outputs to /dist)
RUN npm run build

# Expose the server port (Render will override or map this port using the PORT env variable)
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run migrations and start the server
CMD ["npm", "run", "start"]
