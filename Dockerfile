# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copia o restante do código-fonte e builda
COPY . .
RUN npm run build

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copia artefatos do build
COPY --from=builder /app/dist-web  ./dist-web
COPY --from=builder /app/dist-server ./dist-server

# Volume para persistência dos dados
VOLUME ["/app/data"]

EXPOSE 5180

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5180

CMD ["node", "--enable-source-maps", "dist-server/server/index.js"]
