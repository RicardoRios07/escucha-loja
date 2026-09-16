#!/bin/sh
# verify-tiles.sh — regenera tiles a directorio temporal y verifica atributos.
# Uso: npm run data:verify
set -eu
cd "$(dirname "$0")/.."
INPUT="scripts/.cache/loja-buildings.full.geojson"
[ -f "$INPUT" ] || { echo "✗ Falta $INPUT — corre primero: npm run data:buildings"; exit 1; }
rm -rf /tmp/loja-tiles
tippecanoe \
  --output-to-directory=/tmp/loja-tiles \
  --force \
  --layer=buildings \
  --minimum-zoom=13 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  "$INPUT" > /dev/null
node scripts/verify-tiles.mjs /tmp/loja-tiles
