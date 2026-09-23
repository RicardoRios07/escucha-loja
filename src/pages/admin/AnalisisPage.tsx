import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BusFront,
  ChevronDown,
  CircleDashed,
  Cpu,
  Droplets,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { PanelCard, PanelPage } from '../../components/escucha/PanelPage'
import { generateAnalysis, type AnalysisReport, type LecturaUnificada } from '../../lib/escucha/analisis'
import {
  getClusters,
  getDailySeries,
} from '../../lib/escucha/store'
import { useReportesAdmin } from '../../lib/escucha/repo'
import { LLMProvider } from '../../lib/escucha/llmProvider'
import {
  cargaSnapshotIA,
  debeActualizarIA,
  fingerprintDenuncias,
  guardaSnapshotIA,
  IA_SCHEMA_VERSION,
  type IASnapshot,
} from '../../lib/escucha/iaHistorial'
import type { MvpDenuncia } from '../../lib/escucha/types'

interface Contexto {
  denuncias: MvpDenuncia[]
  reporte: AnalysisReport
  fp: string
}

function computeContexto(denuncias: MvpDenuncia[]): Contexto {
  const clusters = getClusters(denuncias)
  return {
    denuncias,
    reporte: generateAnalysis(denuncias, clusters),
    fp: fingerprintDenuncias(denuncias),
  }
}

export default function AnalisisPage() {
  const [verSectores, setVerSectores] = useState(false)
  const { datos: denuncias, cargando, error } = useReportesAdmin()
  const [ctx, setCtx] = useState<Contexto>(() => computeContexto([]))
  const [snapshotIA, setSnapshotIA] = useState<IASnapshot | null>(null)
  const llmRef = useRef<LLMProvider | null>(null)

  const getLlm = () => {
    llmRef.current ??= new LLMProvider()
    return llmRef.current
  }

  useEffect(() => {
    setCtx(computeContexto(denuncias))
  }, [denuncias])

  useEffect(() => {
    let alive = true
    cargaSnapshotIA().then((snap) => {
      if (alive) setSnapshotIA(snap)
    })
    return () => {
      alive = false
    }
  }, [])

  const ejecutaIA = useCallback(async () => {
    try {
      const res = await getLlm().generateAnalysis(ctx.denuncias, getClusters(ctx.denuncias))
      if (res.aiAvailable) {
        const nuevo: IASnapshot = {
          id: 'snapshot',
          version: IA_SCHEMA_VERSION,
          timestamp: Date.now(),
          aportesCount: res.total,
          fingerprint: ctx.fp,
          resultado: res.lectura,
        }
        await guardaSnapshotIA(nuevo)
        setSnapshotIA(nuevo)
      }
    } catch {
      /* la lectura heurística actúa de respaldo */
    }
  }, [ctx.denuncias, ctx.fp])

  useEffect(() => {
    let alive = true
    void (async () => {
      const snap = snapshotIA ?? (await cargaSnapshotIA())
      if (!alive) return
      if (!debeActualizarIA(ctx.fp, snap)) return
      await ejecutaIA()
    })()
    return () => {
      alive = false
    }
  }, [ctx.fp, ctx.reporte.total, snapshotIA, ejecutaIA])

  const reporte = ctx.reporte
  const lectura: LecturaUnificada = snapshotIA?.resultado ?? reporte.lectura
  const conIA = snapshotIA !== null
  const criticalCount = ctx.denuncias.filter((d) => d.encuesta.gravedad === 'Crítica').length

  const graveOrd: Record<string, number> = { Baja: 1, Media: 2, Alta: 3, Crítica: 4 }

  interface SectorInfo {
    sector: string
    casos: number
    gravedadMax: string
    categorias: string[]
  }

  const sectoresHeuristicos: SectorInfo[] = (() => {
    const map = new Map<string, SectorInfo>()
    for (const p of reporte.prioridades) {
      const prev = map.get(p.sector)
      if (prev) {
        prev.casos += p.casos
        if (graveOrd[p.gravedadMax] > graveOrd[prev.gravedadMax]) prev.gravedadMax = p.gravedadMax
        if (!prev.categorias.includes(p.categoriaPrincipal)) prev.categorias.push(p.categoriaPrincipal)
      } else {
        map.set(p.sector, {
          sector: p.sector,
          casos: p.casos,
          gravedadMax: p.gravedadMax,
          categorias: [p.categoriaPrincipal],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.casos - a.casos)
  })()

  const sectoresUnificados: SectorInfo[] = (() => {
    const porSector = new Map(sectoresHeuristicos.map((s) => [s.sector, s]))
    const ordenIA = conIA
      ? Array.from(new Set(lectura.recomendaciones.map((r) => r.sector).filter(Boolean)))
      : []
    if (ordenIA.length > 0) {
      return [
        ...ordenIA.map((s) => porSector.get(s)).filter((s): s is SectorInfo => !!s),
        ...sectoresHeuristicos.filter((s) => !ordenIA.includes(s.sector)),
      ].slice(0, 4)
    }
    return sectoresHeuristicos.slice(0, 4)
  })()

  const maxSectoresCasos = Math.max(1, ...sectoresUnificados.map((s) => s.casos))

  const severityCounts = ['Crítica', 'Alta', 'Media', 'Baja'].map((level) => ({
    level,
    count: ctx.denuncias.filter((d) => d.encuesta.gravedad === level).length,
  }))

  const categoryTotals = Object.entries(
    ctx.denuncias.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoriaLabel] = (acc[item.categoriaLabel] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const pieCategories = [
    { label: 'Movilidad Urbana', value: categoryTotals.find(([cat]) => cat === 'Movilidad Urbana')?.[1] ?? 0, color: '#002693' },
    { label: 'Saneamiento ambiental', value: categoryTotals.find(([cat]) => cat === 'Saneamiento ambiental')?.[1] ?? 0, color: '#fe4102' },
    { label: 'Agua y Alcantarillado', value: categoryTotals.find(([cat]) => cat === 'Agua y Alcantarillado')?.[1] ?? 0, color: '#f7c948' },
    { label: 'Servicios ciudadanos', value: categoryTotals.find(([cat]) => cat === 'Servicios ciudadanos')?.[1] ?? 0, color: '#b4c3ff' },
  ]

  const pieTotal = pieCategories.reduce((sum, item) => sum + item.value, 0) || 1
  const gradient = pieCategories.reduce<{ start: number; segments: string[] }>((acc, item) => {
    const start = acc.start
    const end = start + (item.value / pieTotal) * 100
    acc.segments.push(`${item.color} ${start}% ${end}%`)
    acc.start = end
    return acc
  }, { start: 0, segments: [] }).segments.join(', ')

  const dailySeries = getDailySeries(ctx.denuncias, 30)
  const maxDaily = Math.max(1, ...dailySeries.values)
  const linePoints = dailySeries.values
    .map((value, index) => {
      const x = (index / Math.max(dailySeries.values.length - 1, 1)) * 100
      const y = 100 - (value / maxDaily) * 80 - 10
      return `${x},${y}`
    })
    .join(' ')

  const severityPalette = {
    Crítica: '#1d4ed8',
    Alta: '#f97316',
    Media: '#fbbf24',
    Baja: '#cbd5e1',
  }

  return (
    <PanelPage
      eyebrow="Panel · ciudad"
      title="Análisis"
      subtitle="Conoce el panorama general de los aportes ciudadanos y detecta los principales tendencias para tomar mejores decisiones."
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {cargando && ctx.denuncias.length === 0 ? (
        <p role="status" className="mb-4 rounded-2xl border border-[#e2e9f6] bg-white p-4 text-sm font-semibold text-[#5d6f92]">
          Cargando análisis…
        </p>
      ) : null}
      <p className="num mt-1 text-[13px] font-bold text-[#5d6f92]" aria-label="Contexto del análisis">
        {reporte.total} {reporte.total === 1 ? 'aporte' : 'aportes'} · {criticalCount} {criticalCount === 1 ? 'crítico' : 'críticos'} · últimos 30 días
      </p>
      <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1.5fr_1.1fr]">
          <div className="rounded-[22px] border border-[#e2e9f6] bg-[#f2f8ff] p-4 shadow-sm">
            <div className="flex items-center gap-3 text-[#002693]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white">
                <CircleDashed size={18} aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black text-[#1b2b4d]">¿Qué está pasando?</h2>
            </div>

            <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-[#42557d]">
              {lectura.queEstaPasando.map((parrafo, i) => (
                <p key={`${parrafo}-${i}`}>{parrafo}</p>
              ))}
            </div>

            {lectura.advertenciaEstadistica && (
              <div className="mt-4 rounded-2xl border border-[#fde0c9] bg-[#fff6ee] p-3 text-[12px] leading-relaxed text-[#8a4b1f]">
                ⚠️ {lectura.advertenciaEstadistica}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#dfe8fb] bg-white p-3">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#5e6e8d]">
                <AlertTriangle size={14} className="text-[#fe4102]" aria-hidden="true" />
                Observación principal
              </div>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#3d4d6e]">
                {lectura.observacionPrincipal}
              </p>
            </div>
          </div>

          <PanelCard
            icon={TrendingUp}
            title="Tendencia · 30 días"
            action={
              <div className="flex gap-2 text-[11px] font-bold text-[#5d6f92]">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#002693]" /> Total</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#fe4102]" /> Casos críticos</span>
              </div>
            }
          >
            <div className="h-[180px] rounded-2xl bg-[#f5f8ff] p-2">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="lineBlue" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#1f3dac" />
                    <stop offset="100%" stopColor="#4d75ff" />
                  </linearGradient>
                  <linearGradient id="lineOrange" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff8a5c" />
                    <stop offset="100%" stopColor="#fe4102" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((y) => (
                  <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#dfe8fb" strokeWidth="0.7" />
                ))}
                <polyline fill="none" stroke="url(#lineBlue)" strokeWidth="2.2" points={linePoints} />
                <polyline
                  fill="none"
                  stroke="url(#lineOrange)"
                  strokeWidth="2"
                  points={dailySeries.values
                    .map((value, index) => {
                      const x = (index / Math.max(dailySeries.values.length - 1, 1)) * 100
                      const y = 100 - (Math.max(value - 1, 0) / maxDaily) * 80 - 10
                      return `${x},${y}`
                    })
                    .join(' ')}
                  opacity="0.9"
                />
              </svg>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#66759a]">
              {dailySeries.labels
                .filter((_, i) => i % 5 === 0 || i === dailySeries.labels.length - 1)
                .map((label) => (
                  <span key={label}>{label}</span>
                ))}
            </div>
          </PanelCard>

          <PanelCard icon={ArrowRight} title="Aportes por categoría">
            <div className="mt-4 flex items-center justify-between gap-3">
              <div
                className="relative grid h-36 w-36 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${gradient})`,
                  boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.03)',
                }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-inner">
                  <span className="text-[1.7rem] font-black tracking-[-0.06em] text-[#1f2b4d]">{reporte.total}</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 pl-2">
                {pieCategories.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-[13px] text-[#344868]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                    <span className="font-black text-[#1f2b4d]">{Math.round((item.value / pieTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_1.35fr_1.1fr]">
          <PanelCard className="min-w-0" id="sectores" icon={Wrench} title="Prioridad por sector">
            <div className="mt-4 space-y-3">
              {sectoresUnificados.length === 0 ? (
                <p className="text-sm text-[#5d6f92]">Aún no hay sectores para priorizar.</p>
              ) : (
                sectoresUnificados.map((item, i) => (
                  <div key={item.sector} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-[#1f2b4d]">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#002693] text-[11px] font-black text-white">
                          {i + 1}
                        </span>
                        <span>{item.sector}</span>
                        <span className="text-[11px] font-semibold text-[#5d6f92]">
                          {item.casos} casos · {item.gravedadMax}
                          {item.categorias.length > 0 ? ` · ${item.categorias.join(', ')}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3ff]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0d2d8c] via-[#1a47d8] to-[#7ca2ff]"
                        style={{ width: `${Math.max(18, Math.min(100, (item.casos / maxSectoresCasos) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-[#eef2f9] pt-3">
              <button
                onClick={() => setVerSectores((v) => !v)}
                aria-expanded={verSectores}
                className="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#7283a8] transition-colors hover:text-[#002693]"
              >
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`text-[#002693] transition-transform ${verSectores ? 'rotate-180' : ''}`}
                />
                Clusters heurísticos
              </button>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8aa0c4]">
                {reporte.prioridades.length} cluster{reporte.prioridades.length === 1 ? '' : 'es'} agrupado
                {reporte.prioridades.length === 1 ? '' : 's'} por cercanía (~550 m), ordenados por casos y gravedad.
              </p>

              {verSectores && (
                <div className="mt-3 space-y-2 rounded-2xl border border-[#e5ebf7] bg-[#f7f9ff] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#5e6e8d]">
                    Vista cruda del motor
                  </p>
                  {reporte.prioridades.map((p) => (
                    <div key={`${p.titulo}-${p.sector}-${p.casos}`} className="text-[12px] leading-relaxed text-[#3d4d6e]">
                      <span className="font-black text-[#0f172a]">{p.titulo}</span>
                      <span> · {p.sector} · {p.casos} caso{p.casos === 1 ? '' : 's'} · {p.gravedadMax}</span>
                      <div className="text-[#5d6f92]">{p.breakdown}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard className="min-w-0" icon={BarChart3} title="Distribución de gravedad">
            <div className="mt-5 flex h-36 items-end gap-3">
              {severityCounts.map(({ level, count }) => (
                <div key={level} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-black text-[#516280]">{count}</span>
                  <div
                    className="w-full rounded-t-xl"
                    style={{
                      height: `${16 + (count / Math.max(1, Math.max(...severityCounts.map((x) => x.count)))) * 88}px`,
                      background: severityPalette[level as keyof typeof severityPalette],
                    }}
                  />
                  <span className="text-[11px] font-bold text-[#5a6987]">{level}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard className="min-w-0" icon={Sparkles} title="Tendencias y patrones">
            <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-[#3d4d6e]">
              {lectura.tendenciasYPatrones.slice(0, 3).map((trend, index) => (
                <div key={`${trend}-${index}`} className="flex gap-3 rounded-2xl bg-[#f5f8ff] p-3">
                  <div className="mt-0.5 text-lg text-[#002693]">
                    {index === 0 ? (
                      <BusFront size={16} aria-hidden="true" />
                    ) : index === 1 ? (
                      <AlertTriangle size={16} className="text-[#fe4102]" aria-hidden="true" />
                    ) : (
                      <Droplets size={16} className="text-[#1d4ed8]" aria-hidden="true" />
                    )}
                  </div>
                  <p>{trend}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-[#dfe8fb] bg-[#fffaf5] p-3 text-[#3d4d6e]">
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#002693]">
                  <Star size={14} className="text-[#f7b500]" aria-hidden="true" />
                  Prioridad
                </div>
                <p className="mt-2 text-[13px] leading-relaxed">{lectura.prioridad}</p>
              </div>

              {lectura.notaHonesta && (
                <p className="rounded-2xl bg-[#f0f7ff] p-3 font-semibold text-[#1f4e8c]">
                  ℹ️ {lectura.notaHonesta}
                </p>
              )}
            </div>
          </PanelCard>
        </section>

        <section className="mt-5">
          <PanelCard className="min-w-0" icon={Cpu} title="Recomendaciones">
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e5ebf7]">
              <table className="w-full min-w-[600px] border-collapse text-left text-[12px]">
                <thead className="bg-[#f4f7fd] text-[#586d8c]">
                  <tr>
                    <th className="px-3 py-3 font-black uppercase tracking-[0.08em]">Prioridad</th>
                    <th className="px-3 py-3 font-black uppercase tracking-[0.08em]">Acción recomendada</th>
                    <th className="px-3 py-3 font-black uppercase tracking-[0.08em]">Sector</th>
                    <th className="px-3 py-3 font-black uppercase tracking-[0.08em]">Categoría</th>
                    <th className="px-3 py-3 font-black uppercase tracking-[0.08em]">Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  {lectura.recomendaciones.length === 0 ? (
                    <tr className="border-t border-[#edf1f8] text-[#2e3e5f]">
                      <td colSpan={5} className="px-3 py-4 text-center font-semibold">
                        Aún no hay recomendaciones. Comparte la encuesta para empezar a priorizar.
                      </td>
                    </tr>
                  ) : (
                    lectura.recomendaciones.map((item, index) => (
                      <tr key={`${item.accion}-${index}`} className="border-t border-[#edf1f8] text-[#2e3e5f]">
                        <td className="px-3 py-3 font-black text-[#002693]">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold">{item.accion}</td>
                        <td className="px-3 py-3">{item.sector}</td>
                        <td className="px-3 py-3">{item.categoria}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              item.impacto === 'Alta'
                                ? 'bg-[#fff0f0] text-[#ef4444]'
                                : item.impacto === 'Media'
                                  ? 'bg-[#fff7df] text-[#b45309]'
                                  : 'bg-[#f5f7fb] text-[#5a6987]'
                            }`}
                          >
                            {item.impacto}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </section>
    </PanelPage>
  )
}
