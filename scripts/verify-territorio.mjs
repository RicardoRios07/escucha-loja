#!/usr/bin/env node
/**
 * verify-territorio.mjs — valida brading/data/loja-territorio.pmtiles:
 * header, capas (rurales/urbanas/barrios/cabeceras) y un tile con atributos.
 *
 * Uso: node scripts/verify-territorio.mjs [ruta.pmtiles]
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import { PMTiles, FileSource } from 'pmtiles'
import { PbfReader } from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'

const file = process.argv[2] || 'brading/data/loja-territorio.pmtiles'
const archive = new PMTiles(new FileSource(new File([fs.readFileSync(file)], 'x.pmtiles')))

const header = await archive.getHeader()
console.log(`zooms: ${header.minZoom}–${header.maxZoom} | tipo: ${header.tileType} (1=MVT)`)
console.log(`bounds: ${header.bounds?.join(', ')}`)
if (header.tileType !== 1) throw new Error('el archivo no contiene vector tiles')
const meta = await archive.getMetadata()
const layers = meta.vector_layers?.map((l) => `${l.id}(${l.count})`) || []
console.log(`capas: ${JSON.stringify(layers)}`)
for (const need of ['rurales', 'urbanas', 'barrios', 'cabeceras']) {
  if (!layers.some((l) => l.startsWith(need))) throw new Error(`capa "${need}" ausente`)
}

// Tile z10 sobre el cantón: lon -79.32, lat -4.09 → x,y
const z = 10
const x = Math.floor((( -79.32 + 180) / 360) * 2 ** z)
const latR = (-4.09 * Math.PI) / 180
const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * 2 ** z)
const res = await archive.getZxy(z, x, y)
if (!res) throw new Error(`tile ${z}/${x}/${y} ausente`)
let raw = Buffer.from(res.data)
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)
const tile = new VectorTile(new PbfReader(raw))
for (const name of Object.keys(tile.layers || {})) {
  const lyr = tile.layers[name]
  const p = lyr.length ? lyr.feature(0).properties : {}
  console.log(`tile ${z}/${x}/${y} [${name}]: ${lyr.length} features | ej: ${JSON.stringify(p).slice(0, 120)}`)
}
console.log('✓ Territorio válido: header, 4 capas y atributos OK')
