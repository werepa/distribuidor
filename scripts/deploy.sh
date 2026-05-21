#!/usr/bin/env bash
# Deploy distribuidor-cfp no droplet DigitalOcean
# Uso: ./scripts/deploy.sh
set -euo pipefail

log() { printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }

REMOTE="weber@134.199.217.117"
APP_DIR="$HOME/distribuidor"

log "Fazendo deploy em $REMOTE..."
ssh "$REMOTE" bash -s <<'ENDSSH'
  set -euo pipefail
  APP_DIR="$HOME/distribuidor"

  if [ ! -d "$APP_DIR/.git" ]; then
    echo "[INFO] Clonando repositório..."
    git clone https://github.com/werepa/distribuidor.git "$APP_DIR"
  else
    echo "[INFO] Atualizando repositório..."
    cd "$APP_DIR" && git pull
  fi

  cd "$APP_DIR"
  echo "[INFO] Subindo container..."
  docker compose up -d --build
  echo "[INFO] Deploy concluído!"
  docker ps --filter name=distribuidor-cfp --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
ENDSSH

log "Deploy finalizado com sucesso!"
