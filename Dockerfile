# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy config example for build process
RUN cp config.example.yml config.yml

# Auto-detect available resources and build with appropriate limits:
# - Read available memory from /proc/meminfo, reserve 512MB for OS, use 60% of remainder as Node heap cap
# - Limit CPU workers: min(available_cores, 2) to prevent CPU spike
# - Clamp Node heap between 1024MB ~ 4096MB
RUN TOTAL_MEM_KB=$(awk '/MemAvailable/ {print $2}' /proc/meminfo) && \
    TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024)) && \
    NODE_HEAP=$(( (TOTAL_MEM_MB - 512) * 60 / 100 )) && \
    [ "$NODE_HEAP" -lt 1024 ] && NODE_HEAP=1024; \
    [ "$NODE_HEAP" -gt 4096 ] && NODE_HEAP=4096; \
    CPU_COUNT=$(nproc) && \
    [ "$CPU_COUNT" -gt 2 ] && CPU_COUNT=2; \
    echo "============================================" && \
    echo "  Available RAM: ${TOTAL_MEM_MB}MB" && \
    echo "  Node heap limit: ${NODE_HEAP}MB" && \
    echo "  Build workers: ${CPU_COUNT}" && \
    echo "============================================" && \
    NODE_OPTIONS="--max-old-space-size=${NODE_HEAP}" \
    BUILD_MAX_CPUS=${CPU_COUNT} \
    npm run build

# Prune devDependencies after build
RUN rm -rf node_modules && npm ci --only=production

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install su-exec for user switching
RUN apk add --no-cache su-exec

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/package.json ./

# Copy config example for auto-initialization
COPY config.example.yml ./

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create storage directories
RUN mkdir -p storage/database storage/uploads

# Expose port
EXPOSE 8080

# Set port
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
ENTRYPOINT ["docker-entrypoint.sh"]
