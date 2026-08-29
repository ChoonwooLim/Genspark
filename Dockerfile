# CUSTOM — Orbitron must not replace this with its generated template.
# Orbitron builds this when the repo provides it, falling back to a generated
# node:20-alpine image otherwise. It is provided here because rendering needs
# two things Alpine's default image does not carry:
#
#   chromium — imported handoff prototypes are HTML/CSS animations. They can
#              only be turned into frames by actually running them, which is
#              also what the handoff README prescribes.
#   ffmpeg   — encodes those frames into an MP4 master.
#
# Debian rather than Alpine because Playwright does not support musl; it drives
# the distro Chromium here instead of downloading its own build.
FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ffmpeg \
        ca-certificates \
        fonts-noto-core \
        fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Playwright must not fetch its own browsers — the image already has one.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Dev dependencies stay: `npm start` runs the esbuild bundle step first.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

CMD ["npm", "start"]
