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
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
