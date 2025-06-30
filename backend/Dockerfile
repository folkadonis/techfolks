# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Install production dependencies
RUN apk add --no-cache dumb-init curl

# Create app user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy other necessary files
COPY --chown=nodejs:nodejs ./src/database ./src/database
COPY --chown=nodejs:nodejs .env.example .env.example

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads tmp && \
    chown -R nodejs:nodejs logs uploads tmp

# Create a healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Set Node.js production environment
ENV NODE_ENV=production

# Disable npm update notifications
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]