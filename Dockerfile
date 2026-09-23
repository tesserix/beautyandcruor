# =============================================================================
# beautyandcruor.com — static export served by nginx
#
# IMAGE STRATEGY (read before changing anything here)
#
# The pipeline turns 279 originals into ~4,200 derivatives, about 224 MB. That
# is too much for plain git, so neither the originals (225 MB) nor the
# derivatives are committed. Two supported paths:
#
#   A. CI / reproducible (intended): originals live in object storage. The
#      builder fetches them to capture/assets/uploads, runs `npm run images`,
#      then builds. Reproducible from a clean clone. Needs ORIGINALS_URI and
#      credentials — see docs/OPEN-QUESTIONS.md, this is not wired up yet.
#
#   B. Local / current: run `npm run images` on your machine first, so
#      public/img and src/generated/images.json already exist in the build
#      context. Fast to iterate, NOT reproducible from a clean clone.
#
# WHAT ACTUALLY SHIPS: only the manifest. public/img is in .dockerignore
# because the derivatives are served from GCS behind Cloudflare — see
# scripts/assets-sync.mjs, which uploads only the images the site references.
# The runtime image is the HTML/CSS/JS plus nginx, a couple of MB.
#
# The builder below takes B when the manifest is present and otherwise fails
# with an explicit message, rather than silently producing a site with holes.
# =============================================================================

# ---- deps -------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# libvips is needed if this stage ever runs the sharp pipeline itself (path A).
RUN apk add --no-cache vips-dev >/dev/null 2>&1 || true

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Where the image derivatives are served from.
#
# This is a BUILD-time value and can only be a build arg: `output: 'export'`
# freezes every srcset URL into the emitted HTML, so setting it in the Helm
# chart at runtime would change nothing about pages that were already built.
# Empty by default, which keeps same-origin `/img/...` working for a local
# `docker build` that still has public/img in context.
ARG ASSET_BASE_URL=""
ENV NEXT_PUBLIC_ASSET_BASE_URL=$ASSET_BASE_URL

# Fail loudly and early. A missing manifest means every <Picture> would throw
# mid-render, which is a confusing way to discover the same problem.
RUN if [ ! -s src/generated/images.json ]; then \
      echo "" && \
      echo "BUILD STOPPED: src/generated/images.json is missing or empty." && \
      echo "Run 'npm run images' before building, or wire up path A" && \
      echo "(fetch originals from object storage in this stage)." && \
      echo "" && \
      exit 1; \
    fi

RUN npm run build

# The export must be fully static — no server bundle should exist.
RUN if [ -d .next/server/app ] && [ ! -d out ]; then \
      echo "BUILD STOPPED: no out/ directory — is output:'export' still set?" && exit 1; \
    fi

# ---- runtime ----------------------------------------------------------------
# Unprivileged image: already runs as uid 101 and binds above 1024, which is
# what allows runAsNonRoot with a read-only root filesystem in the pod spec.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
