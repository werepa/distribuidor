# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia o pacote xlsx local (evita download do CDN bloqueado pelo proxy)
COPY xlsx-0.20.2.tgz ./xlsx-0.20.2.tgz

# Copia manifests e ajusta a referência do xlsx para o arquivo local
COPY package.json package-lock.json ./
RUN node -e "\
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); \
  pkg.dependencies.xlsx = 'file:./xlsx-0.20.2.tgz'; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
"

RUN npm install --legacy-peer-deps

# Copia o restante do código-fonte e builda
COPY . .
RUN npm run build

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Instala apenas dependências de produção
COPY xlsx-0.20.2.tgz ./xlsx-0.20.2.tgz
COPY package.json package-lock.json ./
RUN node -e "\
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); \
  pkg.dependencies.xlsx = 'file:./xlsx-0.20.2.tgz'; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
" && npm install --omit=dev --legacy-peer-deps

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
