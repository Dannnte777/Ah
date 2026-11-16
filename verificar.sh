#!/usr/bin/env bash
# Revisa que existan todas las imágenes que usa src/looks.js
cd "$(dirname "$0")"
faltan=0; total=0
revisar() { total=$((total+1)); [ -f "public$1" ] || { echo "FALTA  public$1"; faltan=$((faltan+1)); }; }

for p in $(grep -oE "'/demo/[^']+\.jpeg'" src/looks.js | tr -d "'"); do revisar "$p"; done
for id in $(grep -oE "lookImages\('[^']+'\)" src/looks.js | sed -E "s/.*\('([^']+)'\)/\1/"); do
  for f in frente lado espalda; do revisar "/demo/looks/$id/$f.jpeg"; done; done
for id in $(grep -oE "flatLayImages\('[^']+'\)" src/looks.js | sed -E "s/.*\('([^']+)'\)/\1/"); do
  revisar "/demo/looks/$id/outfit.jpeg"; done
for id in $(grep -oE "lookGarments\('[^']+'" src/looks.js | sed -E "s/.*\('([^']+)'/\1/"); do
  for f in prenda1 prenda2 prenda3; do revisar "/demo/looks/$id/$f.jpeg"; done; done

echo "Looks en looks.js: $(grep -c "id: '" src/looks.js)"
echo "Imágenes revisadas: $total, faltan: $faltan"
[ "$faltan" -eq 0 ] && echo "TODO OK"