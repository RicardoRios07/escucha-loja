import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import LojaMap3D, { type LojaReport } from '../../components/escucha/LojaMap3D'
import PageBanner from '../../components/escucha/PageBanner'
import MediaThumb from '../../components/escucha/MediaThumb'
import { getBarrioAprox, getStats } from '../../lib/escucha/store'
import { useReportesPublicos } from '../../lib/escucha/repo'
import { categoriaColor } from '../../lib/escucha/geo'

const POR_PAGINA = 8

/** Resumen público: agregados y mapa sin datos personales (sin nombres ni correos). */
export default function ComunidadPage() {
  const { datos: denuncias, cargando } = useReportesPublicos()
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const { total, porCategoria, top, recientes, reports } = useMemo(() => {
    const stats = getStats(denuncias)
    const top = Object.entries(stats.porCategoria).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    const recientes = [...denuncias].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const reports: LojaReport[] = denuncias.map((d) => ({
      lat: d.lat,
      lng: d.lng,
      categoria: d.categoriaLabel,
      barrio: getBarrioAprox(d.lat, d.lng),
      gravedad: d.encuesta.gravedad,
      descripcion: d.descripcion,
      createdAt: d.createdAt,
      thumb: d.evidencia[0],
    }))
    return { total: stats.total, porCategoria: stats.porCategoria, top, recientes, reports }
  }, [denuncias])

  const maxCat = Math.max(1, ...Object.values(porCategoria).map(Number))

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-6xl lg:px-8">
      <PageBanner
        variant="compact"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Comunidad"
        title="Qué está pasando en Loja"
        desc={`${total} aportes de vecinos${top ? ` · ${top[0]} lidera con ${top[1]}` : ''}. Los datos personales nunca se publican.`}
      />

      <div className="pb-6 lg:grid lg:grid-cols-[1.15fr,1fr] lg:gap-6">
        <div>
          <section aria-label="Mapa de la comunidad" className="mt-4">
            <div className="relative h-[360px] overflow-hidden rounded-2xl border shadow-sm lg:h-[480px]">
              <LojaMap3D reports={reports} />
            </div>
          </section>

          <section aria-label="Por categoría" className="mt-4 rounded-2xl border bg-white p-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#111]/50">
              Por categoría
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {Object.entries(porCategoria).map(([cat, n]) => (
                <div key={cat}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-bold text-[#111]/80">{cat}</span>
                    <span className="num font-black text-[#002693]">{n as number}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${((n as number) / maxCat) * 100}%`, background: categoriaColor(cat) }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(porCategoria).length === 0 && (
                <p className="text-[13px] text-[#111]/50">Aún no hay datos para mostrar.</p>
              )}
            </div>
          </section>
        </div>

        <section aria-label="Aportes recientes" className="mt-4">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#111]/50">
            Recientes
          </h2>
          <ul className="mt-2 flex flex-col gap-3 lg:mt-4">
            {recientes.slice(0, visibles).map((d) => (
              <li key={d.id}>
                <Link
                  to={`/vecino/reporte/${d.id}`}
                  className="flex gap-3 rounded-2xl border bg-white p-3 transition-transform active:scale-[0.99]"
                >
                  <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {d.evidencia[0] ? (
                      <MediaThumb item={d.evidencia[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[11px] text-gray-400">sin foto</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                      style={{ background: categoriaColor(d.categoriaLabel) }}
                    >
                      {d.categoriaLabel}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-[#111]/80">
                      {d.descripcion}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-[#111]/45">
                      {getBarrioAprox(d.lat, d.lng)} · {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {visibles < recientes.length && (
            <button
              onClick={() => setVisibles((v) => v + POR_PAGINA)}
              className="mt-3 min-h-[48px] w-full rounded-2xl border-2 border-[#002693]/20 text-sm font-extrabold text-[#002693] active:scale-[0.99]"
            >
              Mostrar más ({recientes.length - visibles} restantes)
            </button>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#111]/45">
            <Eye size={14} aria-hidden="true" /> Vista pública: sin nombres, sin correos, sin direcciones exactas.
          </p>
          {cargando && (
            <p className="mt-2 text-[12px] font-semibold text-[#002693]" role="status">Actualizando aportes…</p>
          )}
        </section>
      </div>
    </main>
  )
}
