import type { MvpDenuncia, CategoriaId, Gravedad, Cluster } from "./types"
import { PARROQUIAS, PARROQUIA_POR_ID, CANTON_BOUNDS } from "../../data/parroquias"
import type { Parroquia } from "../../data/parroquias"
import { BARRIOS, BARRIOS_POR_PARROQUIA, CABECERAS } from "../../data/barrios"
import type { Barrio, Cabecera } from "../../data/barrios"

const KEY_DENUNCIAS = "mvp_denuncias_loja"
const KEY_USER = "mvp_user_loja"

function safeParse<T>(v: string | null, fallback: T): T {
  if (!v) return fallback
  try { return JSON.parse(v) as T } catch { return fallback }
}

export function getDenuncias(): MvpDenuncia[] {
  if (typeof window === "undefined") return []
  return safeParse<MvpDenuncia[]>(localStorage.getItem(KEY_DENUNCIAS), [])
}

export function saveDenuncias(list: MvpDenuncia[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY_DENUNCIAS, JSON.stringify(list))
}

export function addDenuncia(d: MvpDenuncia) {
  const cur = getDenuncias()
  cur.unshift(d)
  saveDenuncias(cur)
}

/** Elimina un reporte por id. Devuelve true si existía. */
export function deleteDenuncia(id: string): boolean {
  const cur = getDenuncias()
  const next = cur.filter((d) => d.id !== id)
  if (next.length === cur.length) return false
  saveDenuncias(next)
  return true
}

export function clearDenuncias() {
  if (typeof window === "undefined") return
  localStorage.removeItem(KEY_DENUNCIAS)
}

export function getUser() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEY_USER)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setUser(u: any) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY_USER, JSON.stringify(u))
}

// Seed demo con 10 denuncias dispersas en Loja para que el heatmap no quede vacío
export function ensureSeed() {
  if (typeof window === "undefined") return
  const existing = getDenuncias()
  if (existing.length > 0) return
  const now = Date.now()
  const seeds: MvpDenuncia[] = [
    {
      id: "seed_1", createdAt: new Date(now - 1000*60*60*2).toISOString(),
      categoria: "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial" as CategoriaId,
      categoriaLabel: "Agua y Alcantarillado",
      descripcion: "Fuga de agua potable en vereda, lleva 3 semanas sin reparación. Afecta a 4 familias.",
      lat: -3.9921, lng: -79.2045,
      evidencia: [],
      encuesta: { gravedad: "Alta" as Gravedad, frecuencia: "Permanente", tiempoProblema: "> 6 meses", afectaMovilidad: false, afectaSalud: true, yaReportadoMunicipio: true, direccionPrincipal: "Av. Universitaria", calleSecundaria: "Azogues", referencia: "Frente al parque" },
      cedula: "1100000000"
    },
    {
      id: "seed_2", createdAt: new Date(now - 1000*60*60*5).toISOString(),
      categoria: "Recolección de Desechos y Saneamiento Ambiental" as CategoriaId,
      categoriaLabel: "Recolección",
      descripcion: "Microbasural en esquina, acumulación de desechos y mal olor. Riesgo sanitario.",
      lat: -3.9985, lng: -79.2012,
      evidencia: [],
      encuesta: { gravedad: "Crítica", frecuencia: "Diario", tiempoProblema: "1-6 meses", afectaMovilidad: false, afectaSalud: true, yaReportadoMunicipio: false, direccionPrincipal: "Calle Lourdes", calleSecundaria: "Bolívar", referencia: "" },
      cedula: "1100000001"
    },
    {
      id: "seed_3", createdAt: new Date(now - 1000*60*60*24).toISOString(),
      categoria: "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc." as CategoriaId,
      categoriaLabel: "Movilidad Urbana",
      descripcion: "Bache profundo en calzada, varios vehículos afectados, peligro para motos.",
      lat: -4.0032, lng: -79.2078,
      evidencia: [],
      encuesta: { gravedad: "Alta", frecuencia: "Permanente", tiempoProblema: "1-4 semanas", afectaMovilidad: true, afectaSalud: false, yaReportadoMunicipio: true, direccionPrincipal: "Av. Cuxibamba", calleSecundaria: "Guayaquil", referencia: "Junto al semáforo" },
      cedula: "1100000002"
    },
    {
      id: "seed_4", createdAt: new Date(now - 1000*60*60*30).toISOString(),
      categoria: "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc." as CategoriaId,
      categoriaLabel: "Movilidad Urbana",
      descripcion: "Aceras obstruidas por comercio informal, peatones deben bajar a la vía.",
      lat: -3.9955, lng: -79.1998,
      evidencia: [],
      encuesta: { gravedad: "Media", frecuencia: "Diario", tiempoProblema: "1-6 meses", afectaMovilidad: true, afectaSalud: false, yaReportadoMunicipio: false, direccionPrincipal: "Calle 18 de Noviembre", calleSecundaria: "Mercadillo", referencia: "" },
      cedula: "1100000003"
    },
    {
      id: "seed_5", createdAt: new Date(now - 1000*60*60*48).toISOString(),
      categoria: "Obstrucción de vías por construcciones, ornato, permisos de construcción" as CategoriaId,
      categoriaLabel: "Control Urbano",
      descripcion: "Construcción sin permiso obstruye vía y genera escombros en acera.",
      lat: -4.0101, lng: -79.2025,
      evidencia: [],
      encuesta: { gravedad: "Media", frecuencia: "Semanal", tiempoProblema: "< 1 semana", afectaMovilidad: true, afectaSalud: false, yaReportadoMunicipio: false, direccionPrincipal: "Cdla. Zamora", calleSecundaria: "S/N", referencia: "" },
      cedula: "1100000004"
    },
    {
      id: "seed_6", createdAt: new Date(now - 1000*60*60*10).toISOString(),
      categoria: "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial" as CategoriaId,
      categoriaLabel: "Agua y Alcantarillado",
      descripcion: "Alcantarillado tapado rebosa aguas servidas en época de lluvia.",
      lat: -3.9872, lng: -79.211,
      evidencia: [],
      encuesta: { gravedad: "Crítica", frecuencia: "Semanal", tiempoProblema: "> 6 meses", afectaMovilidad: false, afectaSalud: true, yaReportadoMunicipio: true, direccionPrincipal: "Barrio San Sebastián", calleSecundaria: "Sucre", referencia: "" },
      cedula: "1100000005"
    },
    {
      id: "seed_7", createdAt: new Date(now - 1000*60*60*15).toISOString(),
      categoria: "Recolección de Desechos y Saneamiento Ambiental" as CategoriaId,
      categoriaLabel: "Recolección",
      descripcion: "Contenedores desbordados, recolección irregular hace 2 semanas.",
      lat: -4.0018, lng: -79.195,
      evidencia: [],
      encuesta: { gravedad: "Alta", frecuencia: "Semanal", tiempoProblema: "1-4 semanas", afectaMovilidad: false, afectaSalud: true, yaReportadoMunicipio: false, direccionPrincipal: "Barrio El Valle", calleSecundaria: "Av. Orillas del Zamora", referencia: "" },
      cedula: "1100000006"
    },
    {
      id: "seed_8", createdAt: new Date(now - 1000*60*60*8).toISOString(),
      categoria: "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc." as CategoriaId,
      categoriaLabel: "Movilidad Urbana",
      descripcion: "Semáforo dañado intermitente, alto riesgo de accidente en intersección.",
      lat: -3.9938, lng: -79.2065,
      evidencia: [],
      encuesta: { gravedad: "Crítica", frecuencia: "Permanente", tiempoProblema: "< 1 semana", afectaMovilidad: true, afectaSalud: false, yaReportadoMunicipio: true, direccionPrincipal: "Av. Isidro Ayora", calleSecundaria: "Av. 8 de Diciembre", referencia: "Redondel" },
      cedula: "1100000007"
    },
  ]
  // duplicar algunos cerca para crear clusters visibles
  seeds.push(
    { ...seeds[2], id: "seed_9", lat: -4.0045, lng: -79.2085, descripcion: "Bache contiguo al anterior, misma cuadra." },
    { ...seeds[1], id: "seed_10", lat: -3.9989, lng: -79.2005, descripcion: "Mismo microbasural, reporte vecino." },
  )
  saveDenuncias(seeds)
}

// Agregación simple por grid para priorización
export function getClusters(denuncias: MvpDenuncia[], gridSize = 0.005): Cluster[] {
  const map = new Map<string, Cluster>()
  const gravedadOrd: Record<string, number> = { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }
  for (const d of denuncias) {
    const gx = Math.round(d.lat / gridSize)
    const gy = Math.round(d.lng / gridSize)
    const key = `${gx}_${gy}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key, lat: d.lat, lng: d.lng, count: 1,
        categorias: { [d.categoriaLabel]: 1 },
        maxGravedad: d.encuesta.gravedad
      })
    } else {
      // promedio posición
      existing.lat = (existing.lat * existing.count + d.lat) / (existing.count + 1)
      existing.lng = (existing.lng * existing.count + d.lng) / (existing.count + 1)
      existing.count += 1
      existing.categorias[d.categoriaLabel] = (existing.categorias[d.categoriaLabel] || 0) + 1
      if (gravedadOrd[d.encuesta.gravedad] > gravedadOrd[existing.maxGravedad]) existing.maxGravedad = d.encuesta.gravedad
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return gravedadOrd[b.maxGravedad] - gravedadOrd[a.maxGravedad]
  })
}

export function getStats(denuncias: MvpDenuncia[]) {
  const total = denuncias.length
  const porCategoria: Record<string, number> = {}
  const porGravedad: Record<string, number> = {}
  const porFrecuencia: Record<string, number> = {}
  const porTiempo: Record<string, number> = {}
  let afectanMovilidad = 0
  let afectanSalud = 0
  let reincidentes = 0
  for (const d of denuncias) {
    porCategoria[d.categoriaLabel] = (porCategoria[d.categoriaLabel] || 0) + 1
    porGravedad[d.encuesta.gravedad] = (porGravedad[d.encuesta.gravedad] || 0) + 1
    porFrecuencia[d.encuesta.frecuencia] = (porFrecuencia[d.encuesta.frecuencia] || 0) + 1
    porTiempo[d.encuesta.tiempoProblema] = (porTiempo[d.encuesta.tiempoProblema] || 0) + 1
    if (d.encuesta.afectaMovilidad) afectanMovilidad++
    if (d.encuesta.afectaSalud) afectanSalud++
    if (d.encuesta.yaReportadoMunicipio) reincidentes++
  }
  return { total, porCategoria, porGravedad, porFrecuencia, porTiempo, afectanMovilidad, afectanSalud, reincidentes }
}

// --- Score ponderado 0-100 para priorización ---
const GRAVEDAD_W: Record<string, number> = { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }
const FRECUENCIA_W: Record<string, number> = { "Una vez": 1, Semanal: 2, Diario: 3, Permanente: 4 }
const TIEMPO_W: Record<string, number> = { "< 1 semana": 1, "1-4 semanas": 2, "1-6 meses": 3, "> 6 meses": 4 }

export function getPriorityScore(d: MvpDenuncia, clusterCount: number, maxClusterCount: number): number {
  // Fórmula documentable para tesis: 40% densidad cluster + 25% gravedad +15% cronicidad +10% salud +10% movilidad + bonus reincidencia
  const normDensity = maxClusterCount > 1 ? (clusterCount - 1) / (maxClusterCount - 1) : clusterCount > 1 ? 1 : 0
  const gravedad = GRAVEDAD_W[d.encuesta.gravedad] / 4
  const frecuencia = FRECUENCIA_W[d.encuesta.frecuencia] / 4
  const tiempo = TIEMPO_W[d.encuesta.tiempoProblema] / 4
  const impacto = ((d.encuesta.afectaSalud ? 1 : 0) + (d.encuesta.afectaMovilidad ? 1 : 0)) / 2
  const reinc = d.encuesta.yaReportadoMunicipio ? 0.08 : 0
  // frecuencia promedia con tiempo para cronicidad
  const cronicidad = (frecuencia + tiempo) / 2
  const raw = 0.40 * normDensity + 0.25 * gravedad + 0.15 * cronicidad + 0.10 * impacto + reinc
  return Math.round(Math.min(100, raw * 100))
}

export function getScoredDenuncias(denuncias: MvpDenuncia[], clusters: Cluster[]) {
  const maxCount = Math.max(1, ...clusters.map(c => c.count))
  const clusterByKey = new Map(clusters.map(c => [c.key, c]))
  return denuncias.map(d => {
    const key = `${Math.round(d.lat / 0.005)}_${Math.round(d.lng / 0.005)}`
    const cl = clusterByKey.get(key)
    const score = getPriorityScore(d, cl?.count ?? 1, maxCount)
    return { ...d, _score: score, _clusterCount: cl?.count ?? 1, _clusterKey: key }
  }).sort((a, b) => b._score - a._score)
}

// Tendencias temporales: buckets por día
export function getDailySeries(denuncias: MvpDenuncia[], days: number) {
  const now = new Date()
  const map = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    map.set(k, 0)
  }
  for (const den of denuncias) {
    const k = new Date(den.createdAt).toISOString().slice(0, 10)
    if (map.has(k)) map.set(k, (map.get(k) || 0) + 1)
  }
  const labels = Array.from(map.keys()).map(k => k.slice(5)) // MM-DD
  const values = Array.from(map.values())
  // acumulado
  let acc = 0; const cumulative = values.map(v => acc += v)
  // variación semanal si hay al menos 14 días
  let wow: number | null = null
  if (days >= 14) {
    const last7 = values.slice(-7).reduce((a, b) => a + b, 0)
    const prev7 = values.slice(-14, -7).reduce((a, b) => a + b, 0)
    wow = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / Math.max(1, prev7)) * 100)
  }
  return { labels, values, cumulative, wow }
}

// Matrices cruzadas
export function getCrossTabCategoriaGravedad(denuncias: MvpDenuncia[]) {
  const cats = Array.from(new Set(denuncias.map(d => d.categoriaLabel)))
  const gravs: Gravedad[] = ["Baja", "Media", "Alta", "Crítica"]
  const matrix: Record<string, Record<string, number>> = {}
  cats.forEach(c => { matrix[c] = {}; gravs.forEach(g => matrix[c][g] = 0) })
  for (const d of denuncias) matrix[d.categoriaLabel][d.encuesta.gravedad]++
  return { cats, gravs, matrix }
}

export interface UbicacionResuelta {
  parroquia: Parroquia
  /** Barrio urbano cuando el punto cae en la mancha urbana; null en rural. */
  barrio: Barrio | null
  /** Cabecera cantonal/parroquial más cercana (referencia en rural). */
  cabecera: Cabecera | null
  /** Etiqueta corta para mostrar: barrio, cabecera o parroquia. */
  etiqueta: string
}

type Bbox = { w: number; s: number; e: number; n: number }

function enBbox(lat: number, lng: number, b: Bbox): boolean {
  return lng >= b.w && lng <= b.e && lat >= b.s && lat <= b.n
}

function areaBbox(b: Bbox): number {
  return Math.max(0, b.e - b.w) * Math.max(0, b.n - b.s)
}

/** Distancia aprox en grados (suficiente para comparar cercanía). */
function distGrados(lat: number, lng: number, centro: [number, number]): number {
  const dLat = lat - centro[0]
  const dLng = (lng - centro[1]) * Math.cos((lat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/** Ray-casting sobre anillos [lng,lat]. */
function enPoligono(lng: number, lat: number, anillos: [number, number][][]): boolean {
  let dentro = false
  for (const anillo of anillos) {
    let j = anillo.length - 1
    for (let i = 0; i < anillo.length; i++) {
      const [xi, yi] = anillo[i]
      const [xj, yj] = anillo[j]
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        dentro = !dentro
      }
      j = i
    }
  }
  return dentro
}

function cabeceraMasCercana(lat: number, lng: number): Cabecera | null {
  let best: Cabecera | null = null
  let bestD = Infinity
  for (const c of CABECERAS) {
    const d = distGrados(lat, lng, c.centro)
    if (d < bestD) { bestD = d; best = c }
  }
  return best
}

/**
 * Resuelve un punto contra el catálogo oficial SIL (polígonos aproximados por
 * bbox + centroide; los polígonos exactos viven en el PMTiles del mapa).
 * - Dentro de un bbox de barrio → ese barrio y su parroquia urbana.
 * - Dentro de un bbox de parroquia rural → la parroquia + cabecera más cercana.
 * - Fuera de todo bbox → la parroquia (urbana o rural) con centroide más cercano.
 */
export function resolverUbicacion(lat: number, lng: number): UbicacionResuelta {
  // 1) Barrio urbano por contención (desempata por bbox más pequeña).
  let barrio: Barrio | null = null
  let barrioArea = Infinity
  for (const b of BARRIOS) {
    if (!enBbox(lat, lng, b.bbox)) continue
    const a = areaBbox(b.bbox)
    if (a < barrioArea) { barrioArea = a; barrio = b }
  }
  if (barrio) {
    const parroquia = PARROQUIA_POR_ID[barrio.parroquiaId] ?? PARROQUIAS[0]
    return { parroquia, barrio, cabecera: cabeceraMasCercana(lat, lng), etiqueta: barrio.nombre }
  }

  // 2) Parroquia rural por point-in-polygon exacto sobre el contorno SIL
  // simplificado (los bboxes rurales se solapan; el bbox solo pre-filtra).
  let rural: Parroquia | null = null
  for (const p of PARROQUIAS) {
    if (p.tipo !== 'rural' || !p.contorno || !enBbox(lat, lng, p.bbox)) continue
    if (!enPoligono(lng, lat, p.contorno)) continue
    rural = p
    break
  }
  if (rural) {
    const cab = CABECERAS.find((c) => c.parroquiaId === rural.id)
      ?? cabeceraMasCercana(lat, lng)
    return { parroquia: rural, barrio: null, cabecera: cab, etiqueta: cab && cab.parroquiaId === rural.id ? cab.nombre : rural.nombre }
  }

  // 3) Fallback: centroide más cercano (puntos fuera de bboxes o en bordes).
  let parroquia: Parroquia = PARROQUIAS[0]
  let bestD = Infinity
  for (const p of PARROQUIAS) {
    const d = distGrados(lat, lng, p.centro)
    if (d < bestD) { bestD = d; parroquia = p }
  }
  if (parroquia.tipo === 'urbana') {
    let bBest: Barrio | null = null
    let bD = Infinity
    for (const b of BARRIOS_POR_PARROQUIA[parroquia.id] ?? []) {
      const d = distGrados(lat, lng, b.centro)
      if (d < bD) { bD = d; bBest = b }
    }
    return {
      parroquia, barrio: bBest, cabecera: cabeceraMasCercana(lat, lng),
      etiqueta: bBest?.nombre ?? parroquia.nombre,
    }
  }
  const cab = CABECERAS.find((c) => c.parroquiaId === parroquia.id)
    ?? cabeceraMasCercana(lat, lng)
  return { parroquia, barrio: null, cabecera: cab, etiqueta: parroquia.nombre }
}

/** ¿El punto está dentro del cantón Loja (cobertura urbana + rural)? */
export function isInsideCanton(lat: number, lng: number): boolean {
  return (
    lng >= CANTON_BOUNDS.w && lng <= CANTON_BOUNDS.e &&
    lat >= CANTON_BOUNDS.s && lat <= CANTON_BOUNDS.n
  )
}

/** Nombre de la parroquia oficial (urbana o rural) más probable para el punto. */
export function getParroquiaAprox(lat: number, lng: number): string {
  return resolverUbicacion(lat, lng).parroquia.nombre
}

export function getBarrioAprox(lat: number, lng: number) {
  return resolverUbicacion(lat, lng).etiqueta
}

/** Valor especial de barrioId para "otro sector" en parroquias rurales. */
export const SECTOR_RURAL_OTRO = "rural-otro"

/** Nombre de parroquia por id de catálogo ("" si no existe). */
export function nombreParroquia(parroquiaId: string): string {
  return PARROQUIA_POR_ID[parroquiaId]?.nombre ?? ""
}

/**
 * Nombre del segundo nivel (barrio urbano, cabecera rural u "otro sector")
 * para mostrar. Recibe los ids guardados en la denuncia.
 */
export function nombreSector(parroquiaId: string, barrioId: string): string {
  if (!barrioId) return ""
  if (barrioId === SECTOR_RURAL_OTRO) {
    const p = PARROQUIA_POR_ID[parroquiaId]
    return p ? `Otro sector de ${p.nombre}` : "Otro sector"
  }
  const b = BARRIOS.find((x) => x.id === barrioId)
  if (b) return b.nombre
  const c = CABECERAS.find((x) => x.id === barrioId)
  if (c) return c.nombre
  return ""
}

/** Opciones del segundo nivel según parroquia: barrios o cabecera+otro. */
export function opcionesSector(parroquiaId: string): { value: string; label: string }[] {
  const p = PARROQUIA_POR_ID[parroquiaId]
  if (!p) return []
  if (p.tipo === 'urbana') {
    return (BARRIOS_POR_PARROQUIA[parroquiaId] ?? []).map((b) => ({ value: b.id, label: b.nombre }))
  }
  const cab = CABECERAS.find((c) => c.parroquiaId === parroquiaId)
  const opts = cab ? [{ value: cab.id, label: cab.nombre }] : []
  opts.push({ value: SECTOR_RURAL_OTRO, label: `Otro sector de ${p.nombre}` })
  return opts
}

export function getYaReportadoStats(denuncias: MvpDenuncia[]) {
  const total = denuncias.length || 1
  const ya = denuncias.filter(d => d.encuesta.yaReportadoMunicipio).length
  return { ya, pct: Math.round((ya / total) * 100) }
}

// Insights rule-based 3 bullets
export function getInsights(denuncias: MvpDenuncia[], clusters: Cluster[]) {
  const stats = getStats(denuncias)
  const bullets: string[] = []
  // 1 - categoría dominante
  const topCat = Object.entries(stats.porCategoria).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
  if (topCat && (topCat[1] as number) / Math.max(1, stats.total) > 0.35) {
    bullets.push(`${topCat[0]} concentra ${Math.round(((topCat[1] as number) / stats.total) * 100)}% de los casos, priorice cuadrillas de esa especialidad.`)
  } else if (topCat) {
    bullets.push(`Distribución equilibrada, ${topCat[0]} lidera levemente con ${topCat[1]} casos.`)
  }
  // 2 - salud vs movilidad
  if (stats.afectanSalud > stats.afectanMovilidad && stats.afectanSalud / Math.max(1, stats.total) > 0.3) {
    bullets.push(`Fuerte impacto en salud y ambiente (${stats.afectanSalud} casos), refuerce recolección y alcantarillado.`)
  } else if (stats.afectanMovilidad / Math.max(1, stats.total) > 0.3) {
    bullets.push(`Movilidad afectada en ${stats.afectanMovilidad} casos, programe ruta agrupada de bacheo.`)
  } else {
    bullets.push(`Impacto mixto, evalúe visitas técnicas por sector.`)
  }
  // 3 - reincidencia / cronicidad
  const ya = getYaReportadoStats(denuncias)
  const critCount = stats.porGravedad["Crítica"] || 0
  if (ya.pct > 30) bullets.push(`${ya.pct}% ya fue reportado antes sin respuesta, recupere confianza con intervención visible en 48h.`)
  else if (critCount > 0) bullets.push(`${critCount} casos críticos requieren inspección inmediata.`)
  else bullets.push(`Mayoría de casos con menos de un mes, ventana oportuna para actuar rápido.`)

  // hotspot
  if (clusters[0]?.count >= 3) bullets.push(`Hotspot en sector ${getBarrioAprox(clusters[0].lat, clusters[0].lng)} con ${clusters[0].count} casos agrupados, actúe de forma agregada.`)

  return bullets.slice(0, 3)
}

export function exportToCSV(denuncias: MvpDenuncia[]): string {
  const headers = ["id", "fecha", "categoria", "gravedad", "frecuencia", "tiempo", "afectaMovilidad", "afectaSalud", "yaReportado", "lat", "lng", "direccion", "descripcion"]
  const rows = denuncias.map(d => [
    d.id,
    new Date(d.createdAt).toISOString(),
    `"${d.categoriaLabel.replace(/"/g, '""')}"`,
    d.encuesta.gravedad,
    d.encuesta.frecuencia,
    d.encuesta.tiempoProblema,
    d.encuesta.afectaMovilidad ? 1 : 0,
    d.encuesta.afectaSalud ? 1 : 0,
    d.encuesta.yaReportadoMunicipio ? 1 : 0,
    d.lat,
    d.lng,
    `"${(d.encuesta.direccionPrincipal + " " + d.encuesta.calleSecundaria).replace(/"/g, '""')}"`,
    `"${d.descripcion.replace(/"/g, '""').slice(0, 120)}"`
  ].join(","))
  return "\uFEFF" + [headers.join(","), ...rows].join("\n")
}
