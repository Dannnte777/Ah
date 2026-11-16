#!/usr/bin/env bash
# Inicia el servidor (Node), la página (Vite) y el túnel de Cloudflare.
# Uso: bash iniciar.sh      Para detener todo: Ctrl+C
cd "$(dirname "$0")"

node server.js &
SERVER=$!
npm run dev -- --port 5173 --strictPort &
VITE=$!
trap 'echo; echo "Deteniendo..."; kill $SERVER $VITE 2>/dev/null' EXIT

sleep 4
echo
echo "Página local: http://localhost:5173"
echo "Creando enlace público (tarda unos segundos)..."
cloudflared tunnel --url http://localhost:5173 2>&1 \
  | grep --line-buffered -o 'https://[a-z0-9-]*\.trycloudflare\.com' \
  | while read -r url; do
      echo
      echo "=============================================="
      echo " Abre esto en el celular:"
      echo " $url"
      echo "=============================================="
      echo
    done
