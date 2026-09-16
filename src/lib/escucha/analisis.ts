import type { Cluster, MvpDenuncia } from './types'
import {
  getBarrioAprox,
  getDailySeries,
  getInsights,
  getScoredDenuncias,
  getStats,
  getYaReportadoStats,
} from './store'

export interface Prioridad {
  orden: number
  titulo: string
  sector: string
  casos: number
  gravedadMax: string
  breakdown: string
  justificacion: string
  accion: string
}

export interface AnalysisReport {
  generadoEn: string // ISO
  total: number
  resumen: string[]
  prioridades: Prioridad[]
  tendencias: string[]
  recomendaciones: string[]
  metodologia: string
  palabrasClave: { texto: string; casos: number }[]
  emergentes: string[]
  rachaDias: number
}

/**
 * Interfaz lista para un proveedor real (LLM/API) cuando haya backend.
 * Hoy la implementa HeuristicProvider (reglas locales, auditable, sin red).
 */
export interface AnalysisProvider {
  id: string
  nombre: string
  generate(denuncias: MvpDenuncia[], clusters: Cluster[]): AnalysisReport
}

export function sugerenciaParaCluster(c: Cluster): string {
  const cats = Object.entries(c.categorias).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Varios'
  if (cats.includes('Agua') && c.maxGravedad === 'Crítica')
    return 'Intervención prioritaria · inspección en 48h y cuadrilla de agua'
  if (cats.includes('Movilidad') && c.count >= 2)
    return 'Intervención agrupada · bacheo y señalización en una sola ruta'
  if (cats.includes('Recolección')) return 'Refuerzo de recolección y limpieza focalizada'
  return 'Visita técnica y validación en campo'
}

const STOPWORDS = new Set(
  'de,la,el,en,y,a,los,del,se,las,por,un,para,con,no,una,su,al,es,como,mas,más,pero,sus,le,ya,o,este,esta,hay,son,fue,han,hacía,hacia,sobre,entre,donde,dónde,cuando,porque,qué,que,mi,mis,tu,tus,lo,los,nos,les,me,te,si,hasta,desde,hace,tiene,tienen,hay'.split(','),
)

function normTxt(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Top keywords en descripciones+direcciones (frecuencia simple, con stopwords ES). */
export function topKeywords(denuncias: MvpDenuncia[], top = 5): { texto: string; casos: number }[] {
  const freq = new Map<string, number>()
  const muestra = new Map<string, string>()
  for (const d of denuncias) {
    const texto = `${d.descripcion} ${d.encuesta.direccionPrincipal} ${d.encuesta.calleSecundaria} ${d.encuesta.referencia}`
    const vistas = new Set(
      normTxt(texto)
        .split(/[^a-z0-9ñ]+/i)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    )
    for (const w of vistas) {
      freq.set(w, (freq.get(w) ?? 0) + 1)
      if (!muestra.has(w)) {
        const orig = texto.split(/\s+/).find((t) => normTxt(t) === w)
        if (orig) muestra.set(w, orig.replace(/[.,;:!?()"]/g, ''))
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([w, casos]) => ({ texto: muestra.get(w) ?? w, casos }))
}

/** Sectores cuyo primer aporte tiene ≤7 días (focos nuevos). */
export function sectoresEmergentes(denuncias: MvpDenuncia[], clusters: Cluster[]): string[] {
  const ahora = Date.now()
  const primeroPorCluster = new Map<string, number>()
  for (const d of denuncias) {
    const key = `${Math.round(d.lat / 0.005)}_${Math.round(d.lng / 0.005)}`
    const t = new Date(d.createdAt).getTime()
    const prev = primeroPorCluster.get(key)
    if (prev === undefined || t < prev) primeroPorCluster.set(key, t)
  }
  const out: string[] = []
  for (const c of clusters) {
    const primero = primeroPorCluster.get(c.key)
    if (primero !== undefined && ahora - primero <= 7 * 86400000) {
      out.push(`${getBarrioAprox(c.lat, c.lng)} (${c.count} caso${c.count === 1 ? '' : 's'})`)
    }
  }
  return out.slice(0, 3)
}

/** Días consecutivos con aportes hasta hoy. */
export function rachaAportes(denuncias: MvpDenuncia[]): number {
  const dias = new Set(
    denuncias.map((d) => {
      const t = new Date(d.createdAt)
      return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
    }),
  )
  let racha = 0
  const cursor = new Date()
  for (;;) {
    const k = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    if (!dias.has(k)) break
    racha += 1
    cursor.setDate(cursor.getDate() - 1)
    if (racha > 365) break
  }
  return racha
}

const METODOLOGIA =
  'Priorización heurística y auditable (sin caja negra): cada aporte recibe un score 0–100 ' +
  '(40% densidad del cluster, 25% gravedad, 15% cronicidad, 10% impacto en salud/movilidad, +8 si ya fue reportado). ' +
  'Los sectores se agrupan por cercanía (~550 m) y se ordenan por casos y gravedad máxima. ' +
  'Las proyecciones sobre el mapa 3D son aproximadas por diseño. Esta interfaz (AnalysisProvider) ' +
  'permite conectar un modelo de IA real cuando haya backend sin cambiar la presentación.'

export const HeuristicProvider: AnalysisProvider = {
  id: 'heuristico-v1',
  nombre: 'Motor local de priorización',
  generate(denuncias, clusters) {
    const stats = getStats(denuncias)
    const ya = getYaReportadoStats(denuncias)
    const daily = getDailySeries(denuncias, 30)
    const scored = getScoredDenuncias(denuncias, clusters)
    const topScore = scored[0] as ({ _score?: number } & MvpDenuncia) | undefined

    const resumen: string[] = []
    if (stats.total === 0) {
      resumen.push('Aún no hay aportes registrados. Comparte la encuesta para empezar a escuchar.')
    } else {
      const topCat = Object.entries(stats.porCategoria).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
      resumen.push(
        `${stats.total} aportes en total${topCat ? ` · ${topCat[0]} concentra ${Math.round(((topCat[1] as number) / stats.total) * 100)}%` : ''}.`,
      )
      const crit = stats.porGravedad['Crítica'] || 0
      if (crit > 0) resumen.push(`${crit} caso${crit === 1 ? '' : 's'} crítico${crit === 1 ? '' : 's'} exigen inspección inmediata.`)
      if (ya.pct > 30)
        resumen.push(`${ya.pct}% ya fue reportado antes sin respuesta: hay una deuda de confianza que exige intervención visible.`)
      if (topScore?._score !== undefined && stats.total > 0)
        resumen.push(`El aporte de mayor prioridad alcanza score ${topScore._score}/100.`)
    }
    for (const b of getInsights(denuncias, clusters)) {
      if (!resumen.includes(b) && resumen.length < 4) resumen.push(b)
    }

    const prioridades: Prioridad[] = clusters.slice(0, 5).map((c, i) => {
      const breakdown = Object.entries(c.categorias)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([k, v]) => `${k.split(' ')[0]}: ${v}`)
        .join(' · ')
      return {
        orden: i + 1,
        titulo: `Sector #${i + 1}`,
        sector: getBarrioAprox(c.lat, c.lng),
        casos: c.count,
        gravedadMax: c.maxGravedad,
        breakdown,
        justificacion:
          c.count >= 3
            ? `Hotspot con ${c.count} casos agrupados y gravedad máxima ${c.maxGravedad}: la densidad multiplica el impacto.`
            : `Gravedad máxima ${c.maxGravedad} con ${c.count} caso${c.count === 1 ? '' : 's'}: atender temprano evita que escale.`,
        accion: sugerenciaParaCluster(c),
      }
    })

    const tendencias: string[] = []
    if (daily.wow !== null) {
      const dir = daily.wow > 0 ? 'subieron' : daily.wow < 0 ? 'bajaron' : 'se mantuvieron'
      tendencias.push(`Los aportes ${dir} ${Math.abs(daily.wow)}% esta semana frente a la anterior.`)
    }
    const ultimos7 = daily.values.slice(-7).reduce((a, b) => a + b, 0)
    tendencias.push(
      ultimos7 === 0
        ? 'Sin aportes en los últimos 7 días: la escucha se enfrió, conviene reactivar la convocatoria.'
        : `${ultimos7} aportes en los últimos 7 días mantienen viva la conversación con los barrios.`,
    )
    const saludVsMov =
      stats.afectanSalud >= stats.afectanMovilidad
        ? `Salud y ambiente lideran el impacto (${stats.afectanSalud} casos).`
        : `Movilidad lidera el impacto (${stats.afectanMovilidad} casos).`
    if (stats.total > 0) tendencias.push(saludVsMov)

    const recomendaciones: string[] = prioridades.slice(0, 3).map((p) => `${p.titulo} (${p.sector}): ${p.accion.toLowerCase()}.`)
    if (ya.pct > 30 && stats.total > 0)
      recomendaciones.push('Publica un compromiso visible de 48h en el hotspot principal para recuperar confianza.')

    return {
      generadoEn: new Date().toISOString(),
      total: stats.total,
      resumen: resumen.slice(0, 4),
      prioridades,
      tendencias: tendencias.slice(0, 3),
      recomendaciones: recomendaciones.slice(0, 4),
      metodologia: METODOLOGIA,
      palabrasClave: topKeywords(denuncias),
      emergentes: sectoresEmergentes(denuncias, clusters),
      rachaDias: rachaAportes(denuncias),
    }
  },
}

/** Punto de entrada de la app: hoy heurístico, mañana cualquier AnalysisProvider. */
export function generateAnalysis(
  denuncias: MvpDenuncia[],
  clusters: Cluster[],
  provider: AnalysisProvider = HeuristicProvider,
): AnalysisReport {
  return provider.generate(denuncias, clusters)
}
