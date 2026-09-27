# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server script
COPY prod-server.js .

# Copy data directory (contains games_db.json)
COPY data ./data

# Runtime environment variables (can be overridden in docker-compose or docker run)
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port (this should match the PORT env var)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
