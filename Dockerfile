# syntax=docker/dockerfile:1

FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY container_src/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy container source code
COPY container_src/ ./

# Build TypeScript
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Copy built application and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --only=production

# Set environment variables with defaults
ENV NODE_ENV=production
ENV PORT=8080

# Database configuration
ENV POSTGRES_CONNECTION_STRING=""

# R2 Storage configuration
ENV R2_BUCKET_NAME="attachments"
ENV R2_ENDPOINT=""
ENV R2_ACCESS_KEY_ID=""
ENV R2_SECRET_ACCESS_KEY=""

# Optional: Message for process endpoint
ENV MESSAGE="CF Container App"

EXPOSE 8080

# Run the compiled JavaScript application
CMD ["node", "dist/index.js"]
