# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments with defaults (set via docker-compose or docker build --build-arg)
ARG VITE_IGDB_CLIENT_ID=""
ARG VITE_IGDB_CLIENT_SECRET=""
ARG VITE_PORT=5173

# Set environment variables for build
ENV VITE_IGDB_CLIENT_ID=${VITE_IGDB_CLIENT_ID}
ENV VITE_IGDB_CLIENT_SECRET=${VITE_IGDB_CLIENT_SECRET}
ENV VITE_PORT=${VITE_PORT}

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server script
COPY prod-server.js .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
