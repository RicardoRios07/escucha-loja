#!/usr/bin/env node
/**
 * verify-pmtiles.mjs — valida el archivo PMTiles servido al mapa:
 * header (zooms, capas), un tile sobre el centro de Loja y que conserve
 * los atributos que el mapa necesita (i, h, cx, cy, ml).
 *
 * Uso: node scripts/verify-pmtiles.mjs [ruta.pmtiles]
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import { PMTiles, FileSource } from 'pmtiles'
import { PbfReader } from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'

const file = process.argv[2] || 'brading/data/loja-buildings.pmtiles'
const archive = new PMTiles(new FileSource(new File([fs.readFileSync(file)], 'x.pmtiles')))

const header = await archive.getHeader()
console.log(`zooms: ${header.minZoom}–${header.maxZoom} | tipo: ${header.tileType} (1=MVT)`)
console.log(`capas: ${JSON.stringify(header.vectorLayers?.map((l) => l.id))}`)
console.log(`bounds: ${header.bounds?.join(', ')}`)
if (header.tileType !== 1) throw new Error('el archivo no contiene vector tiles')

// Tile z16 sobre el centro de Loja (-79.2042, -3.9931).
const z = 16, x = 18348, y = 33495
const res = await archive.getZxy(z, x, y)
if (!res) throw new Error(`tile ${z}/${x}/${y} ausente`)
let raw = Buffer.from(res.data)
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)
const tile = new VectorTile(new PbfReader(raw))
const lyr = tile.layers?.buildings
if (!lyr) throw new Error('capa "buildings" ausente en el tile')
let ml = 0, bad = 0
for (let k = 0; k < lyr.length; k++) {
  const p = lyr.feature(k).properties
  if (p.ml === 1) ml++
  if (!['i', 'h', 'cx', 'cy'].every((key) => typeof p[key] === 'number')) bad++
}
console.log(`tile ${z}/${x}/${y}: ${lyr.length} features | ml: ${ml} | sin atributos: ${bad}`)
if (!lyr.length || bad) throw new Error('verificación fallida')
console.log('✓ PMTiles válido: header, tile central y atributos OK')
