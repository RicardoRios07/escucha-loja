#!/bin/sh
# build-tiles.sh — GeoJSON horneado → PMTiles servible (un solo archivo, range requests).
# Requiere: tippecanoe (brew install tippecanoe).
# Regenerar con: npm run data:tiles
set -eu
cd "$(dirname "$0")/.."
INPUT="scripts/.cache/loja-buildings.full.geojson"
OUT="brading/data/loja-buildings.pmtiles"
[ -f "$INPUT" ] || { echo "✗ Falta $INPUT — corre primero: npm run data:buildings"; exit 1; }
mkdir -p brading/data
tippecanoe \
  -o "$OUT" \
  --force \
  --layer=buildings \
  --minimum-zoom=13 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  "$INPUT"
ls -la "$OUT"
