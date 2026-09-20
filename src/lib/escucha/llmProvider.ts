import {
  generateAnalysis,
  type AnalysisReport,
  type ImpactoRecomendacion,
  type LecturaUnificada,
} from './analisis'
import {
  getBarrioAprox,
  getDailySeries,
  getScoredDenuncias,
  getStats,
  getYaReportadoStats,
} from './store'
import type { Cluster, MvpDenuncia } from './types'

/**
 * Capa de IA sobre el motor heurístico. No recalcula nada: arma un payload
 * agregado con métricas REALES de la base de denuncias (sin datos crudos/
 * personales: privacidad + costo), consulta /api/analizar y devuelve la
 * LECTURA ÚNICA unificada del panel, redactada por el modelo en lenguaje
 * natural. Si la IA falla, queda la lectura heurística: la app nunca se rompe.
 */

interface PayloadPrioridad {
  orden: number
  sectorAprox: string
  categoriaPrincipal: string
  categorias: Record<string, number>
  casos: number
  gravedad: string
  scoreMaximo: number
}

interface PayloadIA {
  fecha: string
  totalAportes: number
  aportes7dias: number
  variacionWoW: string
  distribucionCategoria: { categoria: string; casos: number }[]
  distribucionGravedad: { nivel: string; casos: number }[]
  liderImpacto: string
  yaReportado: { casos: number; pct: number }
  temasFrecuentes: string[]
  racha: number
  prioridades: PayloadPrioridad[]
}

function topCategoria(c: Cluster): string {
  return Object.entries(c.categorias).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? 'Varios'
}

function buildPayload(
  denuncias: MvpDenuncia[],
  clusters: Cluster[],
  heuristico: AnalysisReport,
): PayloadIA {
  const serie = getDailySeries(denuncias, 30)
  const stats = getStats(denuncias)
  const ya = getYaReportadoStats(denuncias)
  const scored = getScoredDenuncias(denuncias, clusters)
  const scorePorCluster = new Map<string, number>()
  for (const d of scored) {
    const key = `${Math.round(d.lat / 0.005)}_${Math.round(d.lng / 0.005)}`
    scorePorCluster.set(key, Math.max(scorePorCluster.get(key) ?? 0, d._score ?? 0))
  }
  const variacionWoW = serie.wow === null ? '—' : `${serie.wow > 0 ? '+' : ''}${serie.wow}%`

  return {
    fecha: heuristico.generadoEn.slice(0, 10),
    totalAportes: heuristico.total,
    aportes7dias: serie.values.slice(-7).reduce((a, b) => a + b, 0),
    variacionWoW,
    distribucionCategoria: Object.entries(stats.porCategoria)
      .map(([categoria, casos]) => ({ categoria, casos }))
      .sort((a, b) => b.casos - a.casos),
    distribucionGravedad: (['Crítica', 'Alta', 'Media', 'Baja'] as const).map((nivel) => ({
      nivel,
      casos: stats.porGravedad[nivel] ?? 0,
    })),
    liderImpacto:
      stats.afectanSalud >= stats.afectanMovilidad
        ? `Salud y ambiente (${stats.afectanSalud} casos)`
        : `Movilidad (${stats.afectanMovilidad} casos)`,
    yaReportado: { casos: ya.ya, pct: ya.pct },
    temasFrecuentes: heuristico.palabrasClave.map((k) => k.texto),
    racha: heuristico.rachaDias,
    prioridades: clusters.slice(0, 10).map((c, i) => ({
      orden: i + 1,
      sectorAprox: getBarrioAprox(c.lat, c.lng),
      categoriaPrincipal: topCategoria(c),
      categorias: c.categorias,
      casos: c.count,
      gravedad: c.maxGravedad,
      scoreMaximo: scorePorCluster.get(c.key) ?? 0,
    })),
  }
}

function nstr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function impactoDe(v: unknown): ImpactoRecomendacion {
  return v === 'Alta' || v === 'Media' || v === 'Baja' ? v : 'Media'
}

function sanearIA(raw: unknown): LecturaUnificada | null {
  const obj = (raw ?? {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
      : []
  const recomendaciones = Array.isArray(obj.recomendaciones)
    ? (obj.recomendaciones as unknown[])
        .map((r) => {
          const it = (r ?? {}) as Record<string, unknown>
          return {
            accion: nstr(it.texto) ?? '',
            sector: nstr(it.sector) ?? '',
            categoria: nstr(it.categoria) ?? '',
            impacto: impactoDe(it.impacto),
          }
        })
        .filter((r) => r.accion !== '')
    : []
  const queEstaPasando = arr(obj.queEstaPasando)
  const observacionPrincipal = nstr(obj.observacionPrincipal) ?? ''
  const tengaNarrativa = queEstaPasando.length > 0 || observacionPrincipal !== '' || recomendaciones.length > 0
  if (!tengaNarrativa) return null
  return {
    origen: 'ia',
    queEstaPasando,
    observacionPrincipal,
    tendenciasYPatrones: arr(obj.tendenciasYPatrones),
    prioridad: nstr(obj.prioridadSector) ?? '',
    recomendaciones,
    enfoqueUrgente: nstr(obj.enfoqueUrgente) ?? '',
    advertenciaEstadistica: nstr(obj.advertenciaEstadistica),
    notaHonesta: nstr(obj.notaHonesta),
  }
}

export class LLMProvider {
  async generateAnalysis(denuncias: MvpDenuncia[], clusters: Cluster[]): Promise<AnalysisReport> {
    const heuristico = generateAnalysis(denuncias, clusters)
    try {
      const payload = buildPayload(denuncias, clusters, heuristico)
      const res = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const lectura = sanearIA(await res.json())
      if (!lectura) throw new Error('respuesta IA inválida')
      return { ...heuristico, lectura, aiAvailable: true }
    } catch {
      return { ...heuristico, aiAvailable: false }
    }
  }
}