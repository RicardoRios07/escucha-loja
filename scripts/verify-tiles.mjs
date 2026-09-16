#!/usr/bin/env node
/**
 * verify-tiles.mjs — verifica que los tiles vectoriales conserven los atributos
 * que el mapa necesita (i, h, cx, cy, ml) tras tippecanoe.
 *
 * Uso: node scripts/verify-tiles.mjs [dirTiles]  (default: /tmp/loja-tiles)
 * Sale con código 1 si algún tile muestreado pierde atributos.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { PbfReader as PbfClass } from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'

const dir = process.argv[2] || '/tmp/loja-tiles'
const NEED = ['i', 'h', 'cx', 'cy']

function* walkPbf(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) yield* walkPbf(p)
    else if (e.name.endsWith('.pbf')) yield p
  }
}

let tiles = 0, feats = 0, bad = 0, ml = 0
const badExamples = []
for (const p of walkPbf(dir)) {
  // Muestra: todos los z13-14, 1 de cada 8 en z15-16 (suficiente y rápido).
  const m = p.match(/\/(\d+)\/\d+\/\d+\.pbf$/)
  const z = Number(m?.[1] || 0)
  tiles++
  if (z >= 15 && tiles % 8 !== 0) continue
  let raw = fs.readFileSync(p)
  // tippecanoe escribe los tiles con gzip (MapLibre los detecta por magic bytes).
  if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)
  const tile = new VectorTile(new PbfClass(raw))
  const lyr = tile.layers?.buildings
  if (!lyr) continue
  for (let k = 0; k < lyr.length; k++) {
    const props = lyr.feature(k).properties
    feats++
    if (props.ml === 1) ml++
    const missing = NEED.filter((key) => typeof props[key] !== 'number')
    if (missing.length) {
      bad++
      if (badExamples.length < 3) badExamples.push(`${p}#${k}: falta ${missing.join(',')} props=${JSON.stringify(props)}`)
    }
  }
}

console.log(`tiles: ${tiles} | features: ${feats} | ml: ${ml} | sin atributos: ${bad}`)
for (const ex of badExamples) console.log('  ✗', ex)
process.exit(bad ? 1 : 0)
