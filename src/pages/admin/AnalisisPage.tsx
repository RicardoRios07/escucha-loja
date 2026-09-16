import { useMemo, useState } from 'react'
import { ChevronDown, Cpu, FileText, Lightbulb, ListOrdered, TrendingUp } from 'lucide-react'
import { generateAnalysis } from '../../lib/escucha/analisis'
import { ensureSeed, getClusters, getDenuncias } from '../../lib/escucha/store'
import { gravedadColor } from '../../lib/escucha/geo'

/** Tab Análisis: priorización inteligente (motor local, interfaz lista para IA real). */
export default function AnalisisPage() {
  const [verMetodo, setVerMetodo] = useState(false)

  const reporte = useMemo(() => {
    try {
      ensureSeed()
    } catch {
      /* noop */
    }
    const denuncias = getDenuncias()
    return generateAnalysis(denuncias, getClusters(denuncias))
  }, [])

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[#111]">
            Análisis y priorización
          </h1>
          <p className="mt-0.5 text-[13px] text-[#111]/55">
            {reporte.total} aportes · generado {new Date(reporte.generadoEn).toLocaleString()}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[12px] font-bold text-[#002693]">
          <Cpu size={14} aria-hidden="true" /> Motor local · auditable
        </span>
      </div>

      {/* Resumen ejecutivo */}
      <section aria-label="Resumen ejecutivo" className="mt-4 rounded-2xl bg-[#002693] p-5 text-white">
        <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-white/70">
          <FileText size={14} aria-hidden="true" /> Resumen ejecutivo
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {reporte.resumen.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] font-medium leading-relaxed">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#FE4102]" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* Prioridades */}
      <section aria-label="Sectores priorizados" className="mt-4">
        <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/50">
          <ListOrdered size={14} aria-hidden="true" /> Dónde actuar primero
        </h2>
        {reporte.prioridades.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-[#111]/50">
            Aún no hay sectores para priorizar.
          </p>
        ) : (
          <ol className="mt-2 grid gap-3 lg:grid-cols-2">
            {reporte.prioridades.map((p) => (
              <li key={p.orden} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-black text-[#111]">
                      <span className="num mr-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-[#002693] text-[12px] text-white">
                        {p.orden}
                      </span>
                      {p.sector} · {p.casos} casos
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-[#111]/50">{p.breakdown}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-1 text-[11px] font-black text-white"
                    style={{ background: gravedadColor(p.gravedadMax) }}
                  >
                    {p.gravedadMax}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#111]/70">{p.justificacion}</p>
                <p className="mt-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-[13px] font-bold text-[#002693]">
                  → {p.accion}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* Tendencias */}
        <section aria-label="Tendencias" className="rounded-2xl border bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/50">
            <TrendingUp size={14} aria-hidden="true" /> Tendencias
          </h2>
          <ul className="mt-2.5 flex flex-col gap-2 text-[13px] leading-relaxed text-[#111]/75">
            {reporte.tendencias.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#FE4102]" aria-hidden="true">•</span> {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Recomendaciones */}
        <section aria-label="Recomendaciones" className="rounded-2xl border bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/50">
            <Lightbulb size={14} aria-hidden="true" /> Recomendaciones
          </h2>
          <ul className="mt-2.5 flex flex-col gap-2 text-[13px] leading-relaxed text-[#111]/75">
            {reporte.recomendaciones.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-black text-[#0db954]" aria-hidden="true">{i + 1}.</span> {r}
              </li>
            ))}
            {reporte.recomendaciones.length === 0 && (
              <li className="text-[#111]/50">Sin recomendaciones todavía.</li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* Palabras clave */}
        <section aria-label="Temas frecuentes" className="rounded-2xl border bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/50">
            <FileText size={14} aria-hidden="true" /> Temas frecuentes
          </h2>
          {reporte.palabrasClave.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#111]/50">Sin suficientes relatos todavía.</p>
          ) : (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {reporte.palabrasClave.map((k) => (
                <span
                  key={k.texto}
                  className="rounded-full bg-[#002693]/[0.06] px-3 py-1.5 text-[12px] font-bold text-[#002693]"
                >
                  {k.texto} <span className="num text-[#002693]/60">×{k.casos}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Focos nuevos + racha */}
        <section aria-label="Focos nuevos y actividad" className="rounded-2xl border bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/50">
            <TrendingUp size={14} aria-hidden="true" /> Focos nuevos
          </h2>
          {reporte.emergentes.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#111]/50">Ningún sector nuevo en los últimos 7 días.</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] text-[#111]/75">
              {reporte.emergentes.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="font-black text-[#FE4102]" aria-hidden="true">▲</span> {s}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2.5 border-t border-black/5 pt-2.5 text-[13px] text-[#111]/60">
            Racha de participación: <strong className="num text-[#111]">{reporte.rachaDias} día{reporte.rachaDias === 1 ? '' : 's'}</strong> consecutivos con aportes.
          </p>
        </section>
      </div>

      {/* Metodología */}
      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <button
          onClick={() => setVerMetodo((v) => !v)}
          aria-expanded={verMetodo}
          className="flex min-h-[52px] w-full items-center justify-between gap-2 p-4 text-left"
        >
          <span className="text-sm font-black text-[#002693]">Cómo se calculó (metodología)</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-[#002693] transition-transform ${verMetodo ? 'rotate-180' : ''}`}
          />
        </button>
        {verMetodo && (
          <p className="border-t border-black/5 px-4 py-3 text-[13px] leading-relaxed text-[#111]/65">
            {reporte.metodologia}
          </p>
        )}
      </div>
    </main>
  )
}
