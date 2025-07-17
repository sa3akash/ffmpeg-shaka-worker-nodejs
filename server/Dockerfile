# ----------------------------
# Stage 1 — Base (shared env)
# ----------------------------
FROM node:22-alpine AS base

# Set working directory
WORKDIR /usr/src/app


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
FROM base AS install
RUN mkdir -p /temp/dev
COPY package*.json /temp/dev/
RUN cd /temp/dev && npm ci

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package*.json /temp/prod/
RUN cd /temp/prod && bun ci --only=production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
# RUN bun test
RUN npm run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=prerelease /usr/src/app/dist ./dist
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER node
EXPOSE 5000/tcp
ENTRYPOINT [ "node", "dist", "worker.js" ]
