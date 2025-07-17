# ----------------------------
# Stage 1 — Base (shared env)
# ----------------------------
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install common packages (FFmpeg, curl, etc.)
RUN apk add --no-cache \
    ffmpeg \
    curl \
    bash \
    ca-certificates \
    libc6-compat \
    && update-ca-certificates

# Download Shaka Packager binary
ENV SHAKA_VERSION=v4.5.0
RUN curl -L -o /usr/local/bin/packager https://github.com/shaka-project/shaka-packager/releases/download/${SHAKA_VERSION}/packager-linux-x64 \
    && chmod +x /usr/local/bin/packager

# ----------------------------
# Stage 2 — Build
# ----------------------------
FROM base AS build

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

RUN npm run build

# ----------------------------
# Stage 3 — Final Runtime
# ----------------------------
FROM base AS run

# Set working directory
WORKDIR /app

# Copy built code and node_modules from build stage
COPY --from=build /app ./dist

# Final CMD
CMD ["node", "dist", "worker.js"]
