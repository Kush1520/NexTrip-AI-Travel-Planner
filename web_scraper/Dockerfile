FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (default for Render, or matching the app)
ENV PORT=3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
