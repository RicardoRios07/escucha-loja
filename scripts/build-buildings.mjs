#!/usr/bin/env node
/**
 * build-buildings.mjs — hornea las huellas de edificios de Loja para el mapa 3D.
 *
 * Entrada: GeoJSON de Overture Maps (buildings, bbox alrededor de Loja):
 *   uvx overturemaps download --bbox=-79.35,-4.14,-79.06,-3.85 -f geojson --type=building \
 *     -o ~/Downloads/loja-buildings.geojson
 *
 * El archivo trae huellas con fuentes mezcladas:
 *   - sources con dataset "osm"  → las huellas que OpenFreeMap ya renderiza (base)
 *   - sources solo "ml_buildings" → huellas ML nuevas (las casas hoy sin volumen)
 *
 * Salida: scripts/.cache/loja-buildings.full.geojson (intermedio; NO se sirve
 * al cliente). `npm run data:tiles` lo convierte a brading/data/loja-buildings.pmtiles.
 *   - huellas OSM horneadas (altura de height/num_floors o estimada por área)
 *   - huellas ML que NO duplican geométricamente una huella OSM
 *   - props mínimas: h (altura m), cx/cy (centroide p/ muestreo de techo), ml:1, i (índice)
 *
 * Uso: node scripts/build-buildings.mjs [rutaOverture.geojson] [--con-cabeceras]
 *
 *   Sin flags: solo la caja urbana de campaña (BBOX).
 *   --con-cabeceras: además incluye un buffer (~900 m) alrededor de cada
 *   cabecera parroquial rural (Fase C; requiere scripts/.cache/sil/cabeceras.geojson
 *   y una descarga Overture de bbox cantonal).
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BBOX = { w: -79.29, s: -4.08, e: -79.12, n: -3.91 } // caja de la campaña = maxBounds del mapa
const OUT = path.resolve('scripts/.cache/loja-buildings.full.geojson')

const args = process.argv.slice(2)
const overturePath = (!args[0] || args[0].startsWith('--') ? null : args[0])
  || path.join(os.homedir(), 'Downloads/loja-buildings.geojson')
const CON_CABECERAS = args.includes('--con-cabeceras')
/** Buffer en grados alrededor de cada cabecera rural (~900 m). */
const BUFFER_CABECERA = 0.008

// ---------- utilidades geográficas ----------

const toRad = (d) => (d * Math.PI) / 180

/** Área aproximada (m²) del anillo exterior [ [lon,lat], ... ] */
function ringArea(ring) {
  if (ring.length < 3) return 0
  let sum = 0
  const latRef = ring.reduce((a, c) => a + c[1], 0) / ring.length
  const kx = Math.cos(toRad(latRef)) * 111320
  const ky = 110540
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
  }
  return Math.abs(sum) / 2
}

function centroid(ring) {
  let cx = 0, cy = 0, n = 0
  for (const [x, y] of ring) { cx += x; cy += y; n++ }
  return n ? [cx / n, cy / n] : [0, 0]
}

/** Jitter determinista ±0.7 m según el centroide (estable entre builds). */
function jitter(cx, cy) {
  const h = Math.abs(Math.sin(cx * 1e5) * 43758.5453 + Math.sin(cy * 1e5) * 12345.6789) % 1
  return (h - 0.5) * 1.4
}

function parseNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(\.\d+)?/)
    if (m) return parseFloat(m[0])
  }
  return null
}

/** Altura: height real → num_floors × 3.2 → estimación por área (+jitter). */
function estimateHeight({ height, floors, area }, cx, cy) {
  const h = parseNum(height)
  if (h && h > 1.5 && h < 120) return h
  const f = parseNum(floors)
  if (f && f > 0 && f < 40) return f * 3.2
  const base = area < 250 ? 3.5 : area < 500 ? 6 : 9
  return Math.min(60, Math.max(3, base + jitter(cx, cy)))
}

const q6 = (v) => Number(v.toFixed(6))
const inside = (lon, lat) => lon >= BBOX.w && lon <= BBOX.e && lat >= BBOX.s && lat <= BBOX.n

// ---------- zonas Fase C: buffers de cabeceras rurales ----------

let cabeceraBoxes = []
if (CON_CABECERAS) {
  const cabPath = path.resolve('scripts/.cache/sil/cabeceras.geojson')
  if (!fs.existsSync(cabPath)) {
    console.error(`✗ Falta ${cabPath}: descarga primero las capas SIL (ver build-parroquias.mjs).`)
    process.exit(1)
  }
  const feats = JSON.parse(fs.readFileSync(cabPath, 'utf8')).features
  const walk = (c, cb) => {
    if (typeof c[0] === 'number') cb(c)
    else for (const i of c) walk(i, cb)
  }
  for (const f of feats) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
    walk(f.geometry.coordinates, ([x, y]) => {
      if (x < minx) minx = x
      if (y < miny) miny = y
      if (x > maxx) maxx = x
      if (y > maxy) maxy = y
    })
    cabeceraBoxes.push({
      nombre: f.properties.parroquia,
      w: minx - BUFFER_CABECERA, s: miny - BUFFER_CABECERA,
      e: maxx + BUFFER_CABECERA, n: maxy + BUFFER_CABECERA,
    })
  }
  console.log(`• ${cabeceraBoxes.length} cabeceras rurales con buffer de ~900 m`)
}

/** Devuelve 'urbano' | nombre de cabecera | null (fuera de cobertura). */
function zonaDe(lon, lat) {
  if (inside(lon, lat)) return 'urbano'
  if (CON_CABECERAS) {
    for (const b of cabeceraBoxes) {
      if (lon >= b.w && lon <= b.e && lat >= b.s && lat <= b.n) return b.nombre
    }
  }
  return null
}

// ---------- main ----------

const t0 = Date.now()
if (!fs.existsSync(overturePath)) {
  console.error(`✗ No existe ${overturePath}. Descárgalo con:`)
  console.error('  uvx overturemaps download --bbox=-79.35,-4.14,-79.06,-3.85 -f geojson --type=building -o ~/Downloads/loja-buildings.geojson')
  process.exit(1)
}
console.log('• Overture:', overturePath, `(${(fs.statSync(overturePath).size / 1e6).toFixed(1)} MB)`)
const overture = JSON.parse(fs.readFileSync(overturePath, 'utf8'))

// Partición por fuente
const osmFeats = [], osmMeta = [] // {cx, cy, area} para grid de dedupe
const mlCandidates = []
let outside = 0, badGeom = 0
const zonas = {} // zona -> n huellas (solo informativo con --con-cabeceras)

for (const f of overture.features || []) {
  const g = f.geometry
  if (!g || !g.coordinates?.length) { badGeom++; continue }
  const isMulti = g.type === 'MultiPolygon'
  const ring0 = isMulti ? g.coordinates[0]?.[0] : g.coordinates[0]
  if (!ring0 || ring0.length < 4) { badGeom++; continue }
  const [cx, cy] = centroid(ring0)
  const zona = zonaDe(cx, cy)
  if (!zona) { outside++; continue }
  zonas[zona] = (zonas[zona] || 0) + 1
  const area = ringArea(ring0)
  const srcs = JSON.stringify(f.properties?.sources || [])
  const item = { f, isMulti, ring0, cx, cy, area }
  if (srcs.includes('"osm"')) { osmFeats.push(item); osmMeta.push({ cx, cy, area }) }
  else mlCandidates.push(item)
}
console.log(`• Partición: ${osmFeats.length} OSM | ${mlCandidates.length} ML | ${outside} fuera de cobertura | ${badGeom} geometrías inválidas`)
if (CON_CABECERAS) {
  const top = Object.entries(zonas).sort((a, b) => b[1] - a[1])
  console.log('• Por zona: ' + top.map(([z, n]) => `${z}:${n}`).join(' '))
}

// Grid de dedupe (~22 m por celda)
const CELL = 0.0002
const grid = new Map()
for (const c of osmMeta) {
  const k = `${Math.floor(c.cx / CELL)}:${Math.floor(c.cy / CELL)}`
  if (!grid.has(k)) grid.set(k, [])
  grid.get(k).push(c)
}

let mlKept = 0, mlDup = 0, mlSmall = 0
const mlKeptItems = []
for (const it of mlCandidates) {
  if (it.area < 12) { mlSmall++; continue }
  const gx = Math.floor(it.cx / CELL), gy = Math.floor(it.cy / CELL)
  let dup = false
  outer: for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cands = grid.get(`${gx + dx}:${gy + dy}`) || []
      for (const c of cands) {
        const ddx = (c.cx - it.cx) * 111320 * Math.cos(toRad(it.cy))
        const ddy = (c.cy - it.cy) * 110540
        const ratio = it.area / c.area
        if (ddx * ddx + ddy * ddy < 18 * 18 && ratio > 0.55 && ratio < 1.9) { dup = true; break outer }
      }
    }
  }
  if (dup) { mlDup++; continue }
  mlKeptItems.push(it)
  mlKept++
}
console.log(`• ML: ${mlKept} huellas nuevas | ${mlDup} duplicadas de OSM | ${mlSmall} ruido <12m²`)

// ---------- serializar compacto ----------

const quantize = (coords) => {
  if (typeof coords[0] === 'number') return [q6(coords[0]), q6(coords[1])]
  return coords.map(quantize)
}

const buildFeature = (it, ml) => ({
  type: 'Feature',
  properties: {
    h: q6(estimateHeight(
      { height: it.f.properties?.height, floors: it.f.properties?.num_floors, area: it.area },
      it.cx, it.cy,
    )),
    cx: q6(it.cx),
    cy: q6(it.cy),
    ...(ml ? { ml: 1 } : {}),
  },
  geometry: { type: it.isMulti ? 'MultiPolygon' : 'Polygon', coordinates: quantize(it.isMulti ? it.f.geometry.coordinates : it.f.geometry.coordinates) },
})

const features = []
let i = 0
for (const it of osmFeats) features.push({ type: 'Feature', properties: { i: i++, ...buildFeature(it, false).properties }, geometry: buildFeature(it, false).geometry })
for (const it of mlKeptItems) features.push({ type: 'Feature', properties: { i: i++, ...buildFeature(it, true).properties }, geometry: buildFeature(it, true).geometry })

const fc = { type: 'FeatureCollection', features }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(fc))
const mb = (fs.statSync(OUT).size / 1e6).toFixed(1)
console.log(`\n✓ ${features.length} volúmenes → ${path.relative(process.cwd(), OUT)} (${mb} MB) en ${((Date.now() - t0) / 1000).toFixed(0)}s`)
