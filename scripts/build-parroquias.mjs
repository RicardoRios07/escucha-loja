#!/usr/bin/env node
/**
 * build-parroquias.mjs — catálogo territorial oficial del cantón Loja desde el
 * SIL municipal (GeoServer WFS, EPSG:4326) hacia la app.
 *
 * Entrada (descargadas del SIL, NO se sirven al cliente):
 *   scripts/.cache/sil/parroquias.geojson  (planificacion:limites_parroquiales, 14 feats)
 *   scripts/.cache/sil/urbanas.geojson     (limites_parroquias_urbanas_ciudad_loja, 6 feats)
 *   scripts/.cache/sil/barrios.geojson     (planificacion:limites_barriales, 63 feats)
 *   scripts/.cache/sil/cabeceras.geojson   (limites_cabeceras_parroquiales_2023_2033, 14 feats)
 *
 * Salida:
 *   src/data/parroquias.ts  (19 parroquias: 6 urbanas + 13 rurales, con centroide+bbox)
 *   src/data/barrios.ts     (63 barrios urbanos + 14 cabeceras, con centroide+bbox)
 *   scripts/.cache/sil/tiles-*.geojson (slim, para `npm run data:territorio` → PMTiles)
 *
 * Uso: node scripts/build-parroquias.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const CACHE = path.resolve('scripts/.cache/sil')
const SRC_DATA = path.resolve('src/data')

const load = (f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')).features

// ---------- utilidades geográficas ----------

function eachRing(geom, cb) {
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
  for (const poly of polys) cb(poly[0])
}

function ringArea(rs) {
  let s = 0
  for (let i = 0; i < rs.length - 1; i++) s += rs[i][0] * rs[i + 1][1] - rs[i + 1][0] * rs[i][1]
  return Math.abs(s) / 2
}

function analyze(geom) {
  let parts = []
  eachRing(geom, (ring) => parts.push(ring))
  parts = parts.filter((r) => r.length >= 4)
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
  for (const r of parts) for (const [x, y] of r) {
    if (x < minx) minx = x
    if (y < miny) miny = y
    if (x > maxx) maxx = x
    if (y > maxy) maxy = y
  }
  // Centroide = promedio de vértices del anillo más grande (estable y barato).
  let big = parts[0]
  for (const r of parts) if (ringArea(r) > ringArea(big)) big = r
  let cx = 0, cy = 0
  for (const [x, y] of big) { cx += x; cy += y }
  cx /= big.length; cy /= big.length
  const q = (v) => Number(v.toFixed(6))
  return { cx: q(cx), cy: q(cy), bbox: { w: q(minx), s: q(miny), e: q(maxx), n: q(maxy) } }
}

const q5 = (v) => Number(v.toFixed(5))

/** Douglas-Peucker sobre anillo en grados. Tol por defecto ~90 m. */
function simplifyRing(ring, tol = 0.0008) {
  if (ring.length <= 8) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  // Anillo cerrado: el segmento inicial es degenerado (distancia 0 a todo);
  // se parte por el vértice más lejano al inicio.
  let far = -1, farD = -1
  for (let i = 1; i < ring.length - 1; i++) {
    const dx = ring[i][0] - ring[0][0], dy = ring[i][1] - ring[0][1]
    const d = dx * dx + dy * dy
    if (d > farD) { farD = d; far = i }
  }
  const stack = far > 0 ? [[0, far], [far, ring.length - 1]] : [[0, ring.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = ring[a]
    const [bx, by] = ring[b]
    const dx = bx - ax, dy = by - ay
    const norm = Math.sqrt(dx * dx + dy * dy) || 1
    let dMax = 0, iMax = -1
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((ring[i][0] - ax) * dy - (ring[i][1] - ay) * dx) / norm
      if (d > dMax) { dMax = d; iMax = i }
    }
    if (dMax > tol) { keep[iMax] = 1; stack.push([a, iMax], [iMax, b]) }
  }
  return ring.filter((_, i) => keep[i])
}

/** Contorno exterior simplificado (anillos [lng,lat]) para point-in-polygon en cliente. */
function contorno(geom) {
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
  return polys.map((poly) => simplifyRing(poly[0]).map(([x, y]) => [q5(x), q5(y)]))
}

const PARTICULAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e'])
const title = (s) => (s || '').toLowerCase().split(/(\s+|[-'])/).map((w, i) => {
  if (/^\s+$/.test(w) || w === '-' || w === "'") return w
  if (i > 0 && PARTICULAS.has(w)) return w
  return w.charAt(0).toUpperCase() + w.slice(1)
}).join('')
const slug = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Nombre SIL (mayúsculas / sin tilde) → nombre de catálogo.
const PARROQUIA_URBANA_NOMBRE = {
  SAGRARIO: 'El Sagrario', SUCRE: 'Sucre', 'EL VALLE': 'El Valle',
  'SAN SEBASTIÁN': 'San Sebastián', PUNZARA: 'Punzara', CARIGAN: 'Carigán',
}
const BARRIO_PARROQUIA_ID = {
  Sagrario: 'el-sagrario', Sucre: 'sucre', 'El Valle': 'el-valle',
  'San Sebastian': 'san-sebastian', Punzara: 'punzara', Carigan: 'carigan',
}

// ---------- 1. parroquias ----------

const ruralesRaw = load('parroquias.geojson').filter((f) => f.properties.dpa_despar !== 'LOJA')
const urbanasRaw = load('urbanas.geojson')

const parroquias = []
for (const f of urbanasRaw) {
  const p = f.properties
  const g = analyze(f.geometry)
  const nombre = PARROQUIA_URBANA_NOMBRE[p.parroquia] || title(p.parroquia)
  parroquias.push({
    id: slug(nombre), nombre, tipo: 'urbana',
    codigo: `110150${p.cod_parroq}`, fuente: 'SIL-GADM/PUGS2023',
    centro: [g.cy, g.cx], bbox: g.bbox,
  })
}
for (const f of ruralesRaw) {
  const p = f.properties
  const g = analyze(f.geometry)
  const nombre = title(p.dpa_despar)
  parroquias.push({
    id: slug(nombre), nombre, tipo: 'rural',
    codigo: String(p.dpa_parroq), areaHa: Math.round((p.areas || 0) * 100) / 100,
    fuente: 'SIL/DPA-INEC',
    centro: [g.cy, g.cx], bbox: g.bbox,
    contorno: contorno(f.geometry),
  })
}
parroquias.sort((a, b) => (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, 'es') : a.tipo === 'urbana' ? -1 : 1))

// ---------- 2. barrios + cabeceras ----------

const barriosRaw = load('barrios.geojson')
const barrios = barriosRaw.map((f) => {
  const p = f.properties
  const g = analyze(f.geometry)
  const parroquiaId = BARRIO_PARROQUIA_ID[p.parroquia] || slug(p.parroquia)
  return {
    id: `${parroquiaId}--${slug(p.barrio)}`, nombre: p.barrio, parroquiaId,
    poblacion: p.poblacion ?? null, densidad: p.densidad == null ? null : Math.round(p.densidad * 100) / 100,
    centro: [g.cy, g.cx], bbox: g.bbox,
  }
}).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

const cabecerasRaw = load('cabeceras.geojson')
const cabeceras = cabecerasRaw.map((f) => {
  const p = f.properties
  const g = analyze(f.geometry)
  const esLoja = p.parroquia === 'Loja'
  return {
    id: esLoja ? 'loja-cabecera-cantonal' : `${slug(p.parroquia)}-cabecera`,
    nombre: esLoja ? 'Loja (cabecera cantonal)' : `Cabecera de ${title(p.parroquia)}`,
    parroquiaId: esLoja ? 'loja-urbano' : slug(p.parroquia),
    categoria: p.categoria, descripcion: p.descripción || '',
    centro: [g.cy, g.cx], bbox: g.bbox,
  }
})

// ---------- 3. bounds cantonales ----------

const allRural = ruralesRaw.map((f) => analyze(f.geometry).bbox)
const CANTON_BOUNDS = {
  w: Math.min(...allRural.map((b) => b.w)) - 0.01,
  s: Math.min(...allRural.map((b) => b.s)) - 0.01,
  e: Math.max(...allRural.map((b) => b.e)) + 0.01,
  n: Math.max(...allRural.map((b) => b.n)) + 0.01,
}
for (const k of Object.keys(CANTON_BOUNDS)) CANTON_BOUNDS[k] = Number(CANTON_BOUNDS[k].toFixed(4))

// ---------- 4. emitir TS ----------

const header = (fuente) => `/**\n * ${fuente}\n * Generado por scripts/build-parroquias.mjs desde el SIL municipal (GeoServer WFS).\n * NO editar a mano: regenerar con \`npm run data:territorio\`.\n */\n`

const parroquiasTs = header('Catálogo oficial de parroquias del cantón Loja (6 urbanas + 13 rurales).') + `
export type ParroquiaTipo = 'urbana' | 'rural'

export interface Parroquia {
  id: string
  nombre: string
  tipo: ParroquiaTipo
  /** Código DPA-INEC (rurales) o código parroquia urbana PUGS (urbanas). */
  codigo: string
  areaHa?: number
  fuente: string
  /** [lat, lng] centroide del polígono oficial. */
  centro: [number, number]
  bbox: { w: number; s: number; e: number; n: number }
  /** Contorno exterior simplificado ([lng,lat]) solo en rurales: point-in-polygon en cliente. */
  contorno?: [number, number][][]
}

export const PARROQUIAS: Parroquia[] = ${JSON.stringify(parroquias, null, 2)}

export const PARROQUIA_POR_ID: Record<string, Parroquia> = Object.fromEntries(
  PARROQUIAS.map((p) => [p.id, p]),
)

/** Bounds del cantón (cobertura rural completa + padding). W/S/E/N. */
export const CANTON_BOUNDS = ${JSON.stringify(CANTON_BOUNDS)} as const

/** Bounds [[lng,lat],[lng,lat]] listos para maplibre (maxBounds). */
export const CANTON_BOUNDS_LL: [[number, number], [number, number]] = [
  [CANTON_BOUNDS.w, CANTON_BOUNDS.s],
  [CANTON_BOUNDS.e, CANTON_BOUNDS.n],
]
`
fs.writeFileSync(path.join(SRC_DATA, 'parroquias.ts'), parroquiasTs)

const barriosTs = header('Catálogo oficial de barrios urbanos (63) y cabeceras parroquiales (14).') + `
export interface Barrio {
  id: string
  nombre: string
  parroquiaId: string
  poblacion: number | null
  densidad: number | null
  /** [lat, lng] centroide del polígono oficial. */
  centro: [number, number]
  bbox: { w: number; s: number; e: number; n: number }
}

export interface Cabecera {
  id: string
  nombre: string
  parroquiaId: string
  categoria: string
  descripcion: string
  centro: [number, number]
  bbox: { w: number; s: number; e: number; n: number }
}

export const BARRIOS: Barrio[] = ${JSON.stringify(barrios, null, 2)}

export const CABECERAS: Cabecera[] = ${JSON.stringify(cabeceras, null, 2)}

export const BARRIOS_POR_PARROQUIA: Record<string, Barrio[]> = BARRIOS.reduce(
  (acc, b) => {
    ;(acc[b.parroquiaId] ||= []).push(b)
    return acc
  },
  {} as Record<string, Barrio[]>,
)
`
fs.writeFileSync(path.join(SRC_DATA, 'barrios.ts'), barriosTs)

// ---------- 5. geojsons slim para tiles ----------

// Rurales: 13 (sin el polígono LOJA urbano) + nombre normalizado para el mapa.
const ruralesTiles = {
  type: 'FeatureCollection',
  features: ruralesRaw.map((f) => ({
    type: 'Feature',
    properties: { nombre: title(f.properties.dpa_despar), codigo: String(f.properties.dpa_parroq), tipo: 'rural' },
    geometry: f.geometry,
  })),
}
fs.writeFileSync(path.join(CACHE, 'tiles-rurales.geojson'), JSON.stringify(ruralesTiles))
const URBANA_NOMBRE_POR_ID = {
  'el-sagrario': 'El Sagrario', sucre: 'Sucre', 'el-valle': 'El Valle',
  'san-sebastian': 'San Sebastián', punzara: 'Punzara', carigan: 'Carigán',
}
fs.writeFileSync(path.join(CACHE, 'tiles-urbanas.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: urbanasRaw.map((f) => ({
    type: 'Feature',
    properties: {
      nombre: PARROQUIA_URBANA_NOMBRE[f.properties.parroquia] || title(f.properties.parroquia),
      codigo: `110150${f.properties.cod_parroq}`, tipo: 'urbana',
    },
    geometry: f.geometry,
  })),
}))
fs.writeFileSync(path.join(CACHE, 'tiles-barrios.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: barriosRaw.map((f) => ({
    type: 'Feature',
    properties: {
      nombre: f.properties.barrio,
      parroquia: URBANA_NOMBRE_POR_ID[BARRIO_PARROQUIA_ID[f.properties.parroquia]] || f.properties.parroquia,
      parroquiaId: BARRIO_PARROQUIA_ID[f.properties.parroquia] || slug(f.properties.parroquia),
      poblacion: f.properties.poblacion ?? 0,
    },
    geometry: f.geometry,
  })),
}))
fs.writeFileSync(path.join(CACHE, 'tiles-cabeceras.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: cabecerasRaw.map((f) => ({
    type: 'Feature',
    properties: {
      nombre: f.properties.parroquia === 'Loja' ? 'Loja' : title(f.properties.parroquia),
      categoria: f.properties.categoria,
    },
    geometry: f.geometry,
  })),
}))

// Centroides puntuales para etiquetas: los símbolos sobre polígonos se
// duplican cuando el polígono cruza bordes de tile; los puntos, nunca.
const pt = ([lat, lng], properties) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates: [lng, lat] },
})
fs.writeFileSync(path.join(CACHE, 'tiles-centroides.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: [
    ...parroquias.map((p) => pt(p.centro, { nombre: p.nombre, tipo: p.tipo })),
    ...barrios.map((b) => pt(b.centro, { nombre: b.nombre, tipo: 'barrio', parroquiaId: b.parroquiaId })),
    ...cabeceras
      .filter((c) => c.parroquiaId !== 'loja-urbano')
      .map((c) => pt(c.centro, { nombre: c.nombre.replace(/^Cabecera de /, ''), tipo: 'cabecera' })),
  ],
}))

console.log(`✓ ${parroquias.length} parroquias (${parroquias.filter((p) => p.tipo === 'urbana').length} urbanas + ${parroquias.filter((p) => p.tipo === 'rural').length} rurales) → src/data/parroquias.ts`)
console.log(`✓ ${barrios.length} barrios + ${cabeceras.length} cabeceras → src/data/barrios.ts`)
console.log(`✓ tiles-*.geojson listos en ${path.relative(process.cwd(), CACHE)}`)
console.log(`✓ CANTON_BOUNDS lng[${CANTON_BOUNDS.w},${CANTON_BOUNDS.e}] lat[${CANTON_BOUNDS.s},${CANTON_BOUNDS.n}]`)
