# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Allow API URLs to be available during build for client bundles and server routes
ARG NEXT_PUBLIC_API_URL
ARG BACKEND_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

# Copy package files
COPY package*.json ./
COPY next.config.mjs ./

# Install deps
RUN npm ci

# Copy all source code for Next.js build
COPY . .

# Build
RUN npm run build


# Production stage
FROM node:20-alpine

WORKDIR /app

ARG BACKEND_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production deps only
RUN npm ci --only=production && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
