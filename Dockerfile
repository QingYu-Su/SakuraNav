# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3 + util-linux (provides taskset for CPU affinity)
RUN apk add --no-cache python3 make g++ util-linux

# Detect resources early — shared by all heavy steps
RUN CPU_TOTAL=$(nproc) && \
    if [ "$CPU_TOTAL" -le 2 ]; then \
        echo "${CPU_TOTAL}" > /tmp/build_cpus; \
        echo "0-$((CPU_TOTAL - 1))" > /tmp/build_mask; \
    else \
        echo "2" > /tmp/build_cpus; \
        echo "0-$((CPU_TOTAL / 2 - 1))" > /tmp/build_mask; \
    fi && \
    echo "CPU cores: $(cat /tmp/build_cpus) workers, mask: $(cat /tmp/build_mask)"

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install all dependencies (taskset limits CPU for better-sqlite3 native compilation)
RUN taskset -c $(cat /tmp/build_mask) npm ci

# Copy source code
COPY . .

# Copy config example for build process
RUN cp config.example.yml config.yml

# Build with resource limits (memory + CPU affinity + worker count)
RUN TOTAL_MEM_KB=$(awk '/MemAvailable/ {print $2}' /proc/meminfo) && \
    TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024)) && \
    NODE_HEAP=$(( (TOTAL_MEM_MB - 512) * 60 / 100 )) && \
    [ "$NODE_HEAP" -lt 1024 ] && NODE_HEAP=1024; \
    [ "$NODE_HEAP" -gt 4096 ] && NODE_HEAP=4096; \
    BUILD_CPUS=$(cat /tmp/build_cpus) && \
    CPU_MASK=$(cat /tmp/build_mask) && \
    echo "============================================" && \
    echo "  Available RAM:   ${TOTAL_MEM_MB}MB" && \
    echo "  Node heap limit: ${NODE_HEAP}MB" && \
    echo "  Build workers:   ${BUILD_CPUS}" && \
    echo "  CPU affinity:    ${CPU_MASK}" && \
    echo "============================================" && \
    NODE_OPTIONS="--max-old-space-size=${NODE_HEAP}" \
    BUILD_MAX_CPUS=${BUILD_CPUS} \
    taskset -c ${CPU_MASK} \
    npm run build

# Prune devDependencies after build
RUN rm -rf node_modules && taskset -c $(cat /tmp/build_mask) npm ci --only=production

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
