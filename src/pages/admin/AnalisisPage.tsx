import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  CalendarDays,
  ChevronDown,
  CircleDashed,
  Cpu,
  Droplets,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { generateAnalysis, type AnalysisReport, type LecturaUnificada } from '../../lib/escucha/analisis'
import {
  ensureSeed,
  getClusters,
  getDailySeries,
  getDenuncias,
  getScoredDenuncias,
} from '../../lib/escucha/store'
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

function haceCuanto(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.round(h / 24)} d`
}

interface Contexto {
  denuncias: MvpDenuncia[]
  reporte: AnalysisReport
  fp: string
}

function computeContexto(): Contexto {
  try {
    ensureSeed()
  } catch {
    /* noop */
  }
  const denuncias = getDenuncias()
  const clusters = getClusters(denuncias)
  return {
    denuncias,
    reporte: generateAnalysis(denuncias, clusters),
    fp: fingerprintDenuncias(denuncias),
  }
}

export default function AnalisisPage() {
  const [verMetodo, setVerMetodo] = useState(false)
  const [ctx, setCtx] = useState<Contexto>(computeContexto)
  const [snapshotIA, setSnapshotIA] = useState<IASnapshot | null>(null)
  const [cargandoIA, setCargandoIA] = useState(false)
  const [falloIA, setFalloIA] = useState(false)
  const llmRef = useRef<LLMProvider | null>(null)

  const getLlm = () => {
    llmRef.current ??= new LLMProvider()
    return llmRef.current
  }

  useEffect(() => {
    const refresca = () => setCtx(computeContexto())
    window.addEventListener('storage', refresca)
    window.addEventListener('focus', refresca)
    return () => {
      window.removeEventListener('storage', refresca)
      window.removeEventListener('focus', refresca)
    }
  }, [])

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
    setCargandoIA(true)
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
        setFalloIA(false)
      } else {
        setFalloIA(true)
      }
    } finally {
      setCargandoIA(false)
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
  const movilidadCount = ctx.denuncias.filter((d) => d.categoriaLabel === 'Movilidad').length
  const movilidadPct = ctx.denuncias.length ? Math.round((movilidadCount / ctx.denuncias.length) * 100) : 0

  const maxPriority = ctx.denuncias.length
    ? Math.max(0, ...getScoredDenuncias(ctx.denuncias, getClusters(ctx.denuncias)).map((d) => d._score ?? 0))
    : 0

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
    { label: 'Movilidad', value: categoryTotals.find(([cat]) => cat === 'Movilidad')?.[1] ?? 0, color: '#002693' },
    { label: 'Recolección', value: categoryTotals.find(([cat]) => cat === 'Recolección')?.[1] ?? 0, color: '#fe4102' },
    { label: 'Agua', value: categoryTotals.find(([cat]) => cat === 'Agua')?.[1] ?? 0, color: '#f7c948' },
    {
      label: 'Otros',
      value: Math.max(
        0,
        ctx.denuncias.length -
          (categoryTotals.find(([cat]) => cat === 'Movilidad')?.[1] ?? 0) -
          (categoryTotals.find(([cat]) => cat === 'Recolección')?.[1] ?? 0) -
          (categoryTotals.find(([cat]) => cat === 'Agua')?.[1] ?? 0),
      ),
      color: '#b4c3ff',
    },
  ]

  const pieTotal = pieCategories.reduce((sum, item) => sum + item.value, 0) || 1
  const gradient = pieCategories.reduce<{ start: number; segments: string[] }>((acc, item) => {
    const start = acc.start
    const end = start + (item.value / pieTotal) * 100
    acc.segments.push(`${item.color} ${start}% ${end}%`)
    acc.start = end
    return acc
  }, { start: 0, segments: [] }).segments.join(', ')

  const dailySeries = getDailySeries(ctx.denuncias, 10)
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
    <main className="mx-auto w-full max-w-[1240px] px-4 py-6 lg:px-8">
      <div className="rounded-[28px] border border-[#e3eaf5] bg-[#f4f7fb] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] lg:p-6">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7283a8]">Panel · ciudad</p>
            <h1 className="mt-1 text-[clamp(2.2rem,3vw,3.1rem)] font-black leading-none tracking-[-0.045em] text-[#111827]">
              Análisis
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4b5a78]">
              Conoce el panorama general de los aportes ciudadanos y detecta los principales
              tendencias para tomar mejores decisiones.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe7f5] bg-white px-3 py-2 text-[12px] font-bold text-[#1f2b4d] shadow-sm">
            <CalendarDays size={15} className="text-[#002693]" aria-hidden="true" />
            <span>19/09/2026</span>
            <span className="text-[#8aa0c4]">•</span>
            <span className="text-[#52627f]">Datos actualizados</span>
            <span className="ml-1 rounded-full bg-[#edf2ff] px-2 py-0.5 text-[10px] font-black text-[#002693]">
              {haceCuanto(reporte.generadoEn ? new Date(reporte.generadoEn).getTime() : Date.now())}
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total de aportes',
              value: reporte.total,
              trend: '+25%',
              accent: 'text-[#002693]',
              icon: <MessageSquareText size={18} className="text-[#002693]" aria-hidden="true" />,
              color: 'bg-[#eef4ff]',
            },
            {
              label: 'Casos críticos',
              value: criticalCount,
              trend: '+33%',
              accent: 'text-[#ef4444]',
              icon: <TriangleAlert size={18} className="text-[#ef4444]" aria-hidden="true" />,
              color: 'bg-[#fff0f0]',
            },
            {
              label: 'Movilidad urbana',
              value: `${movilidadPct}%`,
              trend: '-12%',
              accent: 'text-[#002693]',
              icon: <BusFront size={18} className="text-[#002693]" aria-hidden="true" />,
              color: 'bg-[#edf5ff]',
            },
            {
              label: 'Prioridad máxima',
              value: `${Math.min(100, Math.max(0, Math.round(maxPriority)))} / 100`,
              trend: '+8%',
              accent: 'text-[#f7b500]',
              icon: <Star size={18} className="text-[#f7b500]" aria-hidden="true" />,
              color: 'bg-[#fff7df]',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}>
                  {item.icon}
                </div>
                <span className="rounded-full bg-[#f5f7fb] px-2 py-0.5 text-[10px] font-black text-[#5a6987]">
                  {item.trend}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#5d6f92]">{item.label}</p>
                  <p className={`mt-2 text-[clamp(2rem,2vw,2.8rem)] font-black tracking-[-0.05em] text-[#1d2a3d] ${item.accent}`}>
                    {item.value}
                  </p>
                </div>
                <div className="h-10 w-14 overflow-hidden rounded-full bg-[#edf3ff] p-1">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-[#1f3dac] via-[#4d75ff] to-[#93b2ff]" />
                </div>
              </div>
            </div>
          ))}
        </section>

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

          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-2">
              <div className="flex items-center gap-2 text-[#1b2b4d]">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                  <TrendingUp size={18} className="text-[#002693]" aria-hidden="true" />
                </div>
                <h2 className="text-[18px] font-black">Tendencia de aportes</h2>
              </div>
              <div className="flex gap-2 text-[11px] font-bold text-[#5d6f92]">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#002693]" /> Total</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#fe4102]" /> Casos críticos</span>
              </div>
            </div>

            <div className="mt-3 h-[180px] rounded-2xl bg-[#f5f8ff] p-2">
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
              {dailySeries.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                <ArrowRight size={18} className="text-[#002693]" aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black">Aportes por categoría</h2>
            </div>

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
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_1.35fr_1.1fr]">
          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                <Wrench size={18} className="text-[#002693]" aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black">Prioridad por sector</h2>
            </div>

            <div className="mt-4 space-y-3">
              {reporte.prioridades.length === 0 ? (
                <p className="text-sm text-[#5d6f92]">Aún no hay sectores para priorizar.</p>
              ) : (
                reporte.prioridades.slice(0, 4).map((item) => (
                  <div key={item.sector} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#1f2b4d]">
                      <span className="inline-flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#002693] text-[11px] font-black text-white">
                          {item.orden}
                        </span>
                        {item.sector}
                      </span>
                      <span className="text-[#5d6f92]">{item.casos} casos</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3ff]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0d2d8c] via-[#1a47d8] to-[#7ca2ff]"
                        style={{ width: `${Math.max(18, Math.min(100, item.casos * 18))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                <BarChartIcon />
              </div>
              <h2 className="text-[18px] font-black">Distribución de gravedad</h2>
            </div>

            <div className="mt-5 flex h-36 items-end gap-3">
              {severityCounts.map(({ level, count }) => (
                <div key={level} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-black text-[#516280]">{count}</span>
                  <div
                    className="w-full rounded-t-xl"
                    style={{
                      height: `${Math.max(18, (count / Math.max(1, Math.max(...severityCounts.map((x) => x.count)))) * 100)}%`,
                      background: severityPalette[level as keyof typeof severityPalette],
                    }}
                  />
                  <span className="text-[11px] font-bold text-[#5a6987]">{level}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                <Sparkles size={18} className="text-[#002693]" aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black">Tendencias y patrones</h2>
            </div>

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
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
                <Cpu size={18} className="text-[#002693]" aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black">Recomendaciones</h2>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5ebf7]">
              <table className="min-w-full border-collapse text-left text-[12px]">
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
          </div>

          <aside className="rounded-[22px] border border-[#e2e9f6] bg-[#edf5ff] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#1b2b4d]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white">
                <AlertTriangle size={18} className="text-[#002693]" aria-hidden="true" />
              </div>
              <h2 className="text-[18px] font-black">Enfócate en lo más urgente</h2>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-[13px] leading-relaxed text-[#42557d]">{lectura.enfoqueUrgente}</p>
            </div>

            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#002693] px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition-transform hover:-translate-y-0.5">
              Ver detalle por sector
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </aside>
        </section>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#e2e9f6] bg-white shadow-sm">
          <button
            onClick={() => setVerMetodo((v) => !v)}
            aria-expanded={verMetodo}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="text-[13px] font-black uppercase tracking-[0.12em] text-[#002693]">Cómo se calculó</span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`shrink-0 text-[#002693] transition-transform ${verMetodo ? 'rotate-180' : ''}`}
            />
          </button>
          {verMetodo && (
            <p className="border-t border-[#edf1f8] px-4 py-3 text-[13px] leading-relaxed text-[#4f5e7c]">
              {reporte.metodologia}
            </p>
          )}
        </div>

        <div className="mt-5 rounded-[22px] border border-[#e2e9f6] bg-[#f7f9ff] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf3ff] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#002693]">
              <Sparkles size={13} aria-hidden="true" />
              Análisis unificado
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                  conIA
                    ? 'bg-[#e6f6ec] text-[#0b8f4a]'
                    : 'bg-[#f5f7fb] text-[#5a6987]'
                }`}
              >
                {conIA ? 'IA' : 'Heurístico'}
              </span>
              <button
                onClick={() => void ejecutaIA()}
                disabled={cargandoIA}
                className="inline-flex items-center gap-2 rounded-full bg-[#002693] px-3.5 py-2 text-[12px] font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={13} aria-hidden="true" className={cargandoIA ? 'animate-spin' : ''} />
                {cargandoIA ? 'Analizando…' : conIA ? 'Actualizar con IA' : 'Generar análisis con IA'}
              </button>
            </div>
          </div>

          {cargandoIA ? (
            <p className="mt-3 text-[13px] font-semibold text-[#002693]">
              El modelo redacta la lectura única con los datos reales de la base…
            </p>
          ) : falloIA ? (
            <p className="mt-3 text-[13px] text-[#ef4444]">
              La lectura con IA no estuvo disponible; se mantiene el análisis heurístico.
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-[#4f5e7c]">
              La lectura la redacta un modelo de IA en lenguaje natural usando las mismas métricas reales del motor
              heurístico (abajo, en «Cómo se calculó»). Así el panel muestra un solo análisis unificado, priorizado y
              con recomendaciones según la base de datos.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#002693]" aria-hidden="true">
      <path d="M4 18.5V9.5M10 18.5V5.5M16 18.5V11.5M22 18.5V3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
