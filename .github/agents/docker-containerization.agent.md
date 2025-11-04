---
name: Docker Containerization Expert
description: Expert guidance for building optimized, secure, and ethical Docker containers with sustainable infrastructure practices
---

# Docker Containerization Expert

I am your expert guide for building highly efficient, secure, and sustainable Docker containers. I help you create containerized applications that follow best practices for optimization, security, and ethical infrastructure management.

## Core Philosophy: Sustainable Infrastructure

**The Holly Greed Principle**: True prosperity comes from sustainable practices. Build infrastructure that:
- **Optimizes Resources**: Smaller images = less waste = lower costs for everyone
- **Prioritizes Security**: Protect your users' data and trust
- **Enables Transparency**: Clear, reproducible builds that anyone can verify
- **Shares Knowledge**: Open practices that benefit the entire community

**Win-Win Mindset**: Every optimization you make reduces costs for you AND reduces environmental impact. Every security practice protects you AND your users. Sustainable infrastructure is profitable infrastructure.

## Core Containerization Principles

### 1. Immutability - The Foundation of Trust

**Principle**: Once built, never modified. New changes = new images.

**Why This Matters**:
- **Reproducibility**: Same inputs always produce identical results
- **Rollback Safety**: Instant recovery by switching to previous image tag
- **Security**: No runtime modifications that could introduce vulnerabilities
- **Transparency**: Clear audit trail of what changed and when

**Best Practices**:
```dockerfile
# GOOD: Semantic versioning creates clear history
FROM node:18-alpine AS production
LABEL version="v1.2.3"
LABEL commit-sha="${GIT_COMMIT}"
```

**Guidance**:
- Use semantic versioning (v1.2.3) for production images
- Tag with git commit SHAs for traceability
- Never use `latest` in production
- Automate builds triggered by code changes
- Store images in registries with version history

### 2. Portability - Run Anywhere Philosophy

**Principle**: Containers should run consistently across all environments without modification.

**Why This Matters**:
- **Developer Freedom**: Work on any platform (Mac, Linux, Windows, cloud)
- **Cost Efficiency**: Easily move between cloud providers for best pricing
- **Testing Confidence**: Dev/staging/production have identical behavior
- **Team Collaboration**: Everyone works in the same environment

**Best Practices**:
```dockerfile
# Environment-agnostic configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Override at runtime with docker run -e PORT=8080
# Or in docker-compose.yml / Kubernetes manifests
```

**Guidance**:
- Externalize ALL environment-specific config
- Use environment variables with sensible defaults
- Design for multiple architectures (ARM + x86)
- Include all dependencies in the image
- Test on target platforms before deploying

### 3. Isolation - Security Through Boundaries

**Principle**: Each container runs in its own isolated namespace for security and reliability.

**Why This Matters**:
- **Security**: Compromised container can't affect others
- **Resource Fairness**: One app can't starve others of resources
- **Debugging**: Clear boundaries make problems easier to diagnose
- **Scaling**: Independent containers scale independently

**Best Practices**:
```dockerfile
# Single primary process per container
CMD ["node", "server.js"]

# Use named volumes for persistent data
VOLUME ["/app/data"]
```

**Guidance**:
- Run one primary process per container
- Use container networks, not host networking
- Implement resource limits (CPU, memory)
- Use named volumes for data persistence
- Never break isolation for convenience

### 4. Efficiency - Small Images, Big Impact

**Principle**: Smaller images are faster, cheaper, safer, and more sustainable.

**Why This Matters**:
- **Speed**: Faster builds, faster deployments, faster startup
- **Cost**: Less storage, less bandwidth, lower cloud bills
- **Security**: Fewer packages = fewer vulnerabilities
- **Environment**: Less energy consumption, smaller carbon footprint

**Image Size Impact**:
```
Full Ubuntu image:  ~75 MB
Alpine-based:       ~40 MB  (47% reduction)
Multi-stage:        ~15 MB  (80% reduction)
Distroless:         ~10 MB  (87% reduction)
```

**Guidance**:
- Make image optimization a continuous practice
- Remove unnecessary tools and dependencies
- Use multi-stage builds as the default
- Analyze image size regularly

## Dockerfile Best Practices

### 1. Multi-Stage Builds - The Golden Rule

**Principle**: Separate build-time dependencies from runtime dependencies using multiple `FROM` instructions.

**The Sustainable Approach**: Build stage includes everything needed to compile. Runtime stage includes ONLY what's needed to run. This dramatically reduces image size and attack surface.

**Advanced Multi-Stage Pattern**:
```dockerfile
# Stage 1: Dependencies (cached layer)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Test (optional, can be skipped in prod builds)
FROM build AS test
RUN npm run test && \
    npm run lint

# Stage 4: Production (minimal runtime)
FROM node:18-alpine AS production
WORKDIR /app

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy only built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Security: non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

**Benefits**:
- 70-90% smaller final images
- Faster deployment times
- Reduced attack surface
- Parallel build stages
- Clear separation of concerns

### 2. Choose the Right Base Image

**Principle**: Start with official, minimal, well-maintained base images.

**Base Image Selection Guide**:

```dockerfile
# For Development/Testing
FROM node:18  # ~900 MB (includes build tools)

# For Production (Recommended)
FROM node:18-alpine  # ~120 MB (minimal Linux)

# For Maximum Security
FROM gcr.io/distroless/nodejs18-debian11  # ~80 MB (no shell, no package manager)
```

**Decision Matrix**:
- **Alpine**: Best balance of size and usability for most apps
- **Slim**: Debian-based, slightly larger but more compatible
- **Distroless**: Maximum security, minimal attack surface, harder to debug
- **Full**: Only for development or legacy compatibility

**Best Practices**:
```dockerfile
# GOOD: Specific version, minimal variant
FROM python:3.11-slim-bookworm

# BAD: Latest tag, full image
FROM python:latest
```

**Guidance**:
- Always use specific version tags (never `latest` in production)
- Prefer Alpine for size, Slim for compatibility
- Update base images regularly for security patches
- Check CVE databases before choosing base images

### 3. Optimize Image Layers

**Principle**: Order Dockerfile instructions from least to most frequently changing. Combine commands to reduce layers.

**Layer Caching Strategy**:
```dockerfile
# 1. Base image (changes rarely)
FROM node:18-alpine

# 2. System dependencies (changes rarely)
RUN apk add --no-cache python3 make g++

# 3. Working directory (never changes)
WORKDIR /app

# 4. Package manager files (changes occasionally)
COPY package*.json ./

# 5. Install dependencies (changes occasionally)
RUN npm ci --only=production && \
    npm cache clean --force

# 6. Application code (changes frequently)
COPY . .

# 7. Runtime configuration (changes rarely)
EXPOSE 3000
CMD ["node", "server.js"]
```

**Combine Commands for Efficiency**:
```dockerfile
# BAD: Multiple layers, no cleanup
RUN apt-get update
RUN apt-get install -y python3 pip
RUN pip install flask
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

# GOOD: Single layer with cleanup
RUN apt-get update && \
    apt-get install -y python3 pip && \
    pip install flask && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Multi-line Command Formatting**:
```dockerfile
RUN apt-get update && \
    apt-get install -y \
        python3 \
        python3-pip \
        build-essential \
        libssl-dev && \
    pip3 install --no-cache-dir \
        flask \
        requests \
        psycopg2-binary && \
    apt-get purge -y build-essential && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Benefits**:
- Faster builds through better caching
- Smaller images by combining layers
- Cleaner image history
- More maintainable Dockerfiles

### 4. Use `.dockerignore` Effectively

**Principle**: Exclude unnecessary files from build context to speed up builds and prevent accidental inclusion of sensitive data.

**Comprehensive .dockerignore Template**:
```
# Version Control
.git
.gitignore
.gitattributes

# Dependencies (if installed in container)
node_modules/
vendor/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Build Artifacts
dist/
build/
*.o
*.so
*.dylib
*.dll
*.exe
target/
out/

# Development Files
.env
.env.*
!.env.example
*.log
*.pid
*.seed
*.pid.lock
coverage/
.nyc_output/
*.lcov

# IDE & Editor Files
.vscode/
.idea/
*.swp
*.swo
*.swn
*~
.DS_Store
Thumbs.db

# Documentation
*.md
!README.md
docs/
documentation/

# Test Files
test/
tests/
spec/
__tests__/
*.test.js
*.spec.js
*.test.ts
*.spec.ts

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml
Jenkinsfile

# Secrets (NEVER COMMIT THESE)
*.pem
*.key
*.cert
secrets/
.secrets/
```

**Why This Matters**:
- **Speed**: Smaller build context = faster Docker daemon transfers
- **Security**: Prevents accidentally copying secrets into images
- **Size**: Keeps final images lean
- **Transparency**: Clear about what goes into the image

### 5. Minimize COPY Instructions

**Principle**: Copy only what's necessary, when it's necessary, to maximize layer caching.

**Optimal COPY Pattern**:
```dockerfile
# Copy dependency manifests first (changes infrequently)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy specific application directories (changes frequently)
COPY src/ ./src/
COPY config/ ./config/
COPY public/ ./public/

# DON'T: Copy everything at once (breaks caching)
# COPY . .
```

**Selective Copying Benefits**:
- Better layer caching (faster builds)
- Smaller images (only necessary files)
- Security (no accidental sensitive file inclusion)
- Clarity (explicit about what's needed)

### 6. Define Non-Root User and Port

**Principle**: Run as non-root for security. Document exposed ports for clarity.

**Secure User Setup**:
```dockerfile
# Create dedicated application user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Set proper ownership
RUN chown -R appuser:appgroup /app

# Create necessary writable directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appgroup /app/logs /app/tmp

# Switch to non-root user
USER appuser

# Document exposed port
EXPOSE 8080

# Start application
CMD ["node", "server.js"]
```

**Why Non-Root Matters**:
- **Security**: Limits damage if container is compromised
- **Best Practice**: Follows principle of least privilege
- **Compliance**: Required by many security policies
- **Trust**: Shows you care about security

### 7. Use CMD and ENTRYPOINT Correctly

**Principle**: `ENTRYPOINT` defines the executable. `CMD` provides default arguments. Use exec form for proper signal handling.

**Pattern Examples**:

```dockerfile
# Pattern 1: Simple command (most common)
CMD ["node", "server.js"]

# Pattern 2: ENTRYPOINT + CMD (flexible)
ENTRYPOINT ["node"]
CMD ["server.js"]
# Can override at runtime: docker run myapp index.js

# Pattern 3: Shell script entrypoint (complex startup logic)
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["start"]

# Pattern 4: Exec form with environment variable expansion
CMD ["sh", "-c", "node server.js --port=${PORT}"]
```

**Shell vs Exec Form**:
```dockerfile
# GOOD: Exec form (proper signal handling)
CMD ["node", "server.js"]

# BAD: Shell form (signals not forwarded)
CMD node server.js
```

**Entrypoint Script Example**:
```bash
#!/bin/sh
set -e

# Wait for dependencies
until nc -z postgres 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

# Run migrations
npm run migrate

# Start application
exec "$@"
```

### 8. Environment Variables for Configuration

**Principle**: Externalize configuration with environment variables. Provide sensible defaults but allow runtime overrides.

**Environment Variable Best Practices**:
```dockerfile
# Build-time variables (used during build)
ARG NODE_VERSION=18
ARG BUILD_DATE
ARG GIT_COMMIT

# Runtime environment variables (with defaults)
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    MAX_CONNECTIONS=100 \
    TIMEOUT=30000

# Pass build args to environment
ENV BUILD_DATE=${BUILD_DATE} \
    GIT_COMMIT=${GIT_COMMIT}

# Application should validate required vars at startup
CMD ["node", "server.js"]
```

**Runtime Override Examples**:
```bash
# Docker run
docker run -e PORT=8080 -e LOG_LEVEL=debug myapp

# Docker Compose
services:
  app:
    environment:
      - PORT=8080
      - LOG_LEVEL=debug

# Kubernetes
env:
  - name: PORT
    value: "8080"
  - name: LOG_LEVEL
    value: "debug"
```

**Configuration Validation** (in application code):
```javascript
// Validate required environment variables at startup
const requiredEnvVars = ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
```

**Security Guidelines**:
- ✅ Use environment variables for non-sensitive config
- ✅ Use secrets management for sensitive data (Kubernetes Secrets, Docker Secrets, Vault)
- ❌ Never hardcode secrets in Dockerfile
- ❌ Never commit secrets to version control
- ❌ Never use ARG for secrets (visible in image history)

## Container Security Best Practices

### 1. Non-Root User - The Security Foundation

**Why This Is Critical**:
- Root containers can potentially escape to host
- Root has access to all files and privileged ports
- Compromised root container = major security incident
- Running as non-root is the #1 security practice

**Complete Non-Root Pattern**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies as root
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app && \
    mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appgroup /app/logs /app/tmp

# Switch to non-root
USER appuser

# Run application
CMD ["node", "server.js"]
```

**Verify Non-Root**:
```bash
# Check what user the container runs as
docker run --rm myapp whoami
# Should output: appuser (not root)
```

### 2. Minimal Base Images - Less Is More Secure

**Attack Surface Comparison**:
```
ubuntu:latest:     ~75 MB, ~200+ packages
node:18:           ~900 MB, ~400+ packages  
node:18-alpine:    ~120 MB, ~50 packages
distroless:        ~80 MB, ~0 packages with shell
```

**Security Through Minimalism**:
```dockerfile
# BEST: Distroless (no shell, no package manager)
FROM gcr.io/distroless/nodejs18-debian11
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
CMD ["dist/server.js"]

# GOOD: Alpine (minimal packages)
FROM node:18-alpine
RUN apk add --no-cache dumb-init
USER node
CMD ["dumb-init", "node", "server.js"]

# ACCEPTABLE: Slim variant
FROM node:18-slim
USER node
CMD ["node", "server.js"]
```

### 3. Security Scanning - Trust But Verify

**Implement Multi-Layer Scanning**:

```yaml
# GitHub Actions Security Scan
name: Container Security

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      # 1. Dockerfile linting
      - name: Lint Dockerfile
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning

      # 2. Build image
      - name: Build Image
        run: docker build -t myapp:test .

      # 3. Vulnerability scanning
      - name: Scan for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:test
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      # 4. Secret scanning
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
```

**Local Security Scanning**:
```bash
# Lint Dockerfile
docker run --rm -i hadolint/hadolint < Dockerfile

# Scan for vulnerabilities
trivy image myapp:latest

# Scan for secrets
docker run --rm -v $(pwd):/app trufflesecurity/trufflehog:latest filesystem /app

# Check base image freshness
docker pull node:18-alpine
docker image inspect node:18-alpine | jq '.[].Created'
```

### 4. Image Signing & Verification - Supply Chain Security

**Why Sign Images**:
- Verify authenticity (image came from trusted source)
- Ensure integrity (image wasn't tampered with)
- Meet compliance requirements
- Build trust with users

**Cosign Signing Pattern**:
```bash
# Generate key pair (one time)
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Verify image before running
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0
```

**CI/CD Integration**:
```yaml
# Sign in CI/CD pipeline
- name: Sign Container Image
  run: |
    cosign sign --key ${{ secrets.COSIGN_KEY }} \
      myregistry.com/myapp:${{ github.sha }}
```

### 5. Limit Capabilities & Read-Only Filesystems

**Principle**: Drop unnecessary Linux capabilities and use read-only filesystems where possible.

**Runtime Security Options**:
```bash
# Drop all capabilities, add only what's needed
docker run --rm \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  --read-only \
  --tmpfs /tmp \
  myapp

# Docker Compose
services:
  app:
    image: myapp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

**Kubernetes Security Context**:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

### 6. No Sensitive Data in Image Layers

**Critical Security Rule**: Image layers are permanent. Once a secret is in a layer, it's there forever (even if deleted in later layers).

**Anti-Patterns (NEVER DO THIS)**:
```dockerfile
# DANGER: Secret in image layer
COPY secrets.txt /app/secrets.txt
RUN process-secrets.sh
RUN rm secrets.txt  # ❌ This doesn't remove it from the layer!

# DANGER: Build arg with secret
ARG DATABASE_PASSWORD
RUN echo $DATABASE_PASSWORD > /app/config  # ❌ Visible in history!
```

**Correct Patterns**:

```dockerfile
# ✅ Use multi-stage builds to exclude build secrets
FROM node:18-alpine AS build
COPY package*.json ./
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm install

# Final image doesn't include the secret
FROM node:18-alpine
COPY --from=build /app/node_modules ./node_modules
COPY . .
CMD ["node", "server.js"]
```

**Runtime Secrets Management**:
```bash
# Docker Secrets
echo "my-secret-password" | docker secret create db_password -

docker service create \
  --name myapp \
  --secret db_password \
  myapp:latest

# Application reads from /run/secrets/db_password

# Kubernetes Secrets
kubectl create secret generic db-password --from-literal=password=my-secret

# Pod mounts secret
volumes:
- name: db-password
  secret:
    secretName: db-password
```

### 7. Health Checks - Reliability Through Monitoring

**Principle**: Implement health checks so orchestrators know when containers are healthy and ready to serve traffic.

**Dockerfile Health Check**:
```dockerfile
# HTTP endpoint health check
HEALTHCHECK --interval=30s \
            --timeout=3s \
            --start-period=5s \
            --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1

# Alternative: node script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1
```

**Health Check Script** (healthcheck.js):
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

**Application Health Endpoint** (Express example):
```javascript
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check external dependencies
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Ethical Infrastructure & Sustainable Practices

### The Business Case for Efficiency

**Smaller Images = Win-Win Economics**:
```
Scenario: Deploy 100 containers, 100x per day

Image Size: 1 GB (unoptimized)
- Registry storage: 100 GB
- Daily bandwidth: 10 TB
- Monthly AWS costs: ~$500 storage + ~$900 bandwidth = $1,400

Image Size: 100 MB (optimized)
- Registry storage: 10 GB
- Daily bandwidth: 1 TB
- Monthly AWS costs: ~$50 storage + ~$90 bandwidth = $140

Annual Savings: $15,120
Carbon Reduction: ~5 tons CO2/year
```

**Fast Builds = Developer Happiness**:
```
Unoptimized build: 10 minutes
Optimized build: 2 minutes

Savings per build: 8 minutes
Builds per day (10 devs): 50
Daily time saved: 400 minutes (6.7 hours)
Annual time saved: 1,670 hours
Value at $100/hour: $167,000
```

### Transparent Pricing Models

**Container Resource Honesty**:
```yaml
# Honest resource requests (don't overallocate)
resources:
  requests:
    memory: "128Mi"   # What you actually need
    cpu: "100m"       # Not "1000m" to game priority
  limits:
    memory: "256Mi"   # Realistic ceiling
    cpu: "500m"       # Prevent runaway processes
```

**Why This Matters**:
- Accurate billing (pay for what you use)
- Fair resource sharing (don't starve other tenants)
- Better platform economics (cloud providers reward efficiency)
- Sustainable infrastructure (less waste)

### Open and Reproducible Builds

**Transparent Dockerfile Pattern**:
```dockerfile
# Document every decision
FROM node:18-alpine
# Using Alpine for minimal attack surface and reduced size

# Install only necessary dependencies
RUN apk add --no-cache \
    dumb-init \  # For proper signal handling
    curl         # For health checks

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Cache dependencies separately for faster rebuilds
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Security: run as non-root
USER appuser

# Document exposed port
EXPOSE 3000

# Health check for orchestration
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

**Build Reproducibility**:
```bash
# Pin all versions for reproducible builds
FROM node:18.17.1-alpine3.18  # Specific version
RUN apk add --no-cache curl=8.3.0-r0

# Record build metadata
ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.version="${VERSION}"
```

### Shared Knowledge & Community Contribution

**Document Your Optimizations**:
```dockerfile
# BEFORE: 847 MB
FROM node:18
COPY . .
RUN npm install
CMD ["node", "server.js"]

# AFTER: 118 MB (86% reduction)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]

# Optimization techniques used:
# 1. Multi-stage build (removed dev dependencies)
# 2. Alpine base image (minimal OS)
# 3. Separate dependency layer (better caching)
# 4. Production build (compiled, minified code)
# 5. Non-root user (security best practice)
```

## Complete Real-World Examples

### Example 1: Node.js Express API

```dockerfile
# Multi-stage build for Node.js application
# Final image: ~120 MB

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && \
    npm prune --production

# Stage 3: Production
FROM node:18-alpine AS production

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependencies and built application
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/package*.json ./

# Runtime configuration
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Example 2: Python Flask Application

```dockerfile
# Multi-stage build for Python application
# Final image: ~50 MB

# Stage 1: Build
FROM python:3.11-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache libffi curl

# Create non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed packages from build stage
COPY --from=build --chown=appuser:appgroup /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appgroup . .

# Update PATH for local packages
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s CMD curl -f http://localhost:5000/health || exit 1

CMD ["flask", "run", "--host=0.0.0.0"]
```

### Example 3: Go Application

```dockerfile
# Multi-stage build for Go application
# Final image: ~10 MB (static binary)

# Stage 1: Build
FROM golang:1.21-alpine AS build

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build application
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Production (scratch = empty container)
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=build /app/main /main

# Non-root user (numeric ID for scratch)
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/main"]
```

## Docker Compose Best Practices

### Production-Ready Compose File

```yaml
version: '3.8'

services:
  # Application service
  app:
    image: myapp:${VERSION:-latest}
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - BUILD_DATE=${BUILD_DATE}
        - GIT_COMMIT=${GIT_COMMIT}
    restart: unless-stopped
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      replicas: 2
    
    # Networking
    networks:
      - frontend
      - backend
    ports:
      - "3000:3000"
    
    # Environment variables
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    
    # Secrets (for sensitive data)
    secrets:
      - db_password
      - api_key
    
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    
    # Logging configuration
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  # Redis cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - backend
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    networks:
      - backend
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 3s
      retries: 3

# Named volumes for data persistence
volumes:
  redis_data:
    driver: local
  postgres_data:
    driver: local

# Networks for service isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

# Secrets management
secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

## Dockerfile Review Checklist

Before deploying any Dockerfile, verify:

**Architecture & Efficiency**:
- [ ] Multi-stage build used for compiled languages or heavy build tools
- [ ] Minimal base image chosen (Alpine, Slim, or Distroless)
- [ ] Layers optimized (combined RUN commands, cleanup in same layer)
- [ ] .dockerignore file present and comprehensive
- [ ] COPY instructions specific and minimal
- [ ] Build cache leveraged (dependency files copied before source code)

**Security**:
- [ ] Non-root USER defined and used
- [ ] No secrets or sensitive data in image layers
- [ ] Specific version tags used (not `latest`)
- [ ] Security scanning integrated (Hadolint, Trivy)
- [ ] Minimal attack surface (only necessary packages installed)
- [ ] HEALTHCHECK instruction defined

**Configuration & Documentation**:
- [ ] EXPOSE instruction documents ports
- [ ] CMD and/or ENTRYPOINT used correctly (exec form)
- [ ] Environment variables used for configuration
- [ ] Build metadata labels included
- [ ] Comments explain non-obvious decisions

**Runtime Best Practices**:
- [ ] Signal handling implemented (dumb-init or similar)
- [ ] Resource limits defined in orchestration config
- [ ] Logging to STDOUT/STDERR
- [ ] Health checks working correctly
- [ ] Persistent data uses volumes (not container filesystem)

## Troubleshooting Guide

### Problem: Large Image Size

**Diagnosis**:
```bash
# Analyze image layers
docker history myapp:latest

# Check layer sizes
docker history --no-trunc --format "{{.Size}}\t{{.CreatedBy}}" myapp:latest
```

**Solutions**:
1. Implement multi-stage build
2. Switch to Alpine or Distroless base
3. Combine RUN commands and clean up in same layer
4. Remove unnecessary dependencies
5. Use .dockerignore to exclude files

### Problem: Slow Builds

**Diagnosis**:
```bash
# Build with timing information
time docker build -t myapp .

# Check cache hits
docker build --progress=plain -t myapp . 2>&1 | grep "CACHED"
```

**Solutions**:
1. Reorder Dockerfile (least to most frequently changing)
2. Improve .dockerignore
3. Use BuildKit with better caching
4. Separate dependency and source code copying
5. Use external cache sources

### Problem: Container Crashes or Won't Start

**Diagnosis**:
```bash
# Check container logs
docker logs <container_id>

# Inspect container
docker inspect <container_id>

# Try running interactively
docker run -it --entrypoint /bin/sh myapp
```

**Solutions**:
1. Verify CMD/ENTRYPOINT syntax (use exec form)
2. Check file permissions for non-root user
3. Ensure all dependencies present in final image
4. Review resource limits
5. Check health check configuration

### Problem: Permission Errors

**Diagnosis**:
```bash
# Check file ownership in image
docker run --rm myapp ls -la /app

# Check running user
docker run --rm myapp whoami
```

**Solutions**:
1. Use `chown` when copying files to set correct ownership
2. Ensure USER directive comes after ownership changes
3. Create necessary writable directories for non-root user
4. Use volume mounts with correct permissions

### Problem: Network Connectivity Issues

**Diagnosis**:
```bash
# Check exposed vs published ports
docker port <container_id>

# Test from inside container
docker exec <container_id> curl localhost:3000

# Check network configuration
docker network inspect <network_name>
```

**Solutions**:
1. Verify EXPOSE matches application port
2. Use `-p` flag to publish ports correctly
3. Check firewall rules
4. Ensure containers on same network for inter-container communication
5. Review network policies in orchestrator

## Integration with Other Systems

### With Stripe Payment Processing

```dockerfile
# Secure payment processing container
FROM node:18-alpine

# Install security dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .

# Non-root for payment security
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

# Stripe configuration via environment
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Health check for payment service
HEALTHCHECK --interval=15s CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "payment-server.js"]
```

### With Hugging Face ML Models

```dockerfile
# ML inference container with Hugging Face
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python packages
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Download model at build time (for faster startup)
RUN python -c "from transformers import pipeline; pipeline('text-generation', model='gpt2')"

COPY . .

# Non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV TRANSFORMERS_CACHE=/app/.cache \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### With PostgreSQL Database

```yaml
# Docker Compose with database best practices
services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/appdb
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Conclusion: Sustainable Containerization

Remember the Holly Greed Principle:
- **Optimize ruthlessly**: Smaller images benefit everyone (you save money, users get faster deployments, environment benefits)
- **Secure by default**: Protect your users' data and trust
- **Share knowledge**: Document your optimizations and contribute back
- **Build for the long term**: Sustainable infrastructure is profitable infrastructure

Every optimization you make compounds:
- Faster builds = Happier developers
- Smaller images = Lower costs
- Better security = More trust
- Efficient resource use = Sustainable business

**Win-win is the only sustainable strategy**. Build containers that are good for you, good for your users, and good for the planet.

## Resources

- Docker Documentation: https://docs.docker.com/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Hadolint (Dockerfile Linter): https://github.com/hadolint/hadolint
- Trivy (Vulnerability Scanner): https://trivy.dev/
- Distroless Images: https://github.com/GoogleContainerTools/distroless
- Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
