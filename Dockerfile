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

EXPOSE 8080

# Run the compiled JavaScript application
CMD ["node", "dist/index.js"]
