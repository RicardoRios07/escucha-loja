#!/bin/sh
# build-territorio.sh — GeoJSONs SIL horneados → PMTiles de límites (un solo archivo).
# Requiere: tippecanoe (brew install tippecanoe).
# Regenerar con: npm run data:territorio
set -eu
cd "$(dirname "$0")/.."
CACHE="scripts/.cache/sil"
OUT="brading/data/loja-territorio.pmtiles"
for f in tiles-rurales tiles-urbanas tiles-barrios tiles-cabeceras tiles-centroides; do
  [ -f "$CACHE/$f.geojson" ] || { echo "✗ Falta $CACHE/$f.geojson — corre primero: node scripts/build-parroquias.mjs"; exit 1; }
done
mkdir -p brading/data
# Polígonos (con thinning agresivo: solo importan los contornos).
tippecanoe \
  -o "$CACHE/territorio-base.pmtiles" \
  --force \
  -L rurales:"$CACHE/tiles-rurales.geojson" \
  -L urbanas:"$CACHE/tiles-urbanas.geojson" \
  -L barrios:"$CACHE/tiles-barrios.geojson" \
  -L cabeceras:"$CACHE/tiles-cabeceras.geojson" \
  --minimum-zoom=8 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --simplify-only-low-zooms
# Centroides puntuales para etiquetas: SIN thinning (cada punto debe existir
# en todos los zooms; si no, las etiquetas parpadean según el tile).
# --base-zoom=8 desactiva el descarte progresivo de puntos en zooms bajos.
tippecanoe \
  -o "$CACHE/territorio-centroides.pmtiles" \
  --force \
  -L centroides:"$CACHE/tiles-centroides.geojson" \
  --minimum-zoom=8 \
  --maximum-zoom=16 \
  --base-zoom=8 \
  --no-tile-compression
tile-join -f -o "$OUT" "$CACHE/territorio-base.pmtiles" "$CACHE/territorio-centroides.pmtiles"
ls -la "$OUT"
