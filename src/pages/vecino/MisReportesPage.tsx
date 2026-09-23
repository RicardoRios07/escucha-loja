import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import PageBanner from '../../components/escucha/PageBanner'
import MediaThumb from '../../components/escucha/MediaThumb'
import { getBarrioAprox } from '../../lib/escucha/store'
import { useMisReportes } from '../../lib/escucha/repo'
import { categoriaColor, gravedadColor } from '../../lib/escucha/geo'

export default function MisReportesPage() {
  const [filtro, setFiltro] = useState('Todas')
  const { datos: miasTodas, cargando } = useMisReportes()

  const { mias, categorias } = useMemo(() => {
    const ordenadas = [...miasTodas].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const filtradas = filtro === 'Todas' ? ordenadas : ordenadas.filter((d) => d.categoriaLabel === filtro)
    return {
      mias: filtradas,
      categorias: ['Todas', ...Array.from(new Set(ordenadas.map((d) => d.categoriaLabel)))],
    }
  }, [miasTodas, filtro])

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-5xl lg:px-8">
      <PageBanner
        variant="compact"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Escucha Loja"
        title="Mis reportes"
        desc={cargando && miasTodas.length === 0 ? 'Cargando tus reportes…' : `${miasTodas.length} reportes vinculados a tu cuenta`}
      />

      {cargando && miasTodas.length === 0 ? (
        <div className="mt-4 rounded-2xl border bg-white p-6 text-center" role="status">
          <p className="text-sm font-bold text-[#111]">Cargando…</p>
        </div>
      ) : (
        <div className="pb-6">
          {categorias.length > 2 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por categoría">
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltro(c)}
                  aria-pressed={filtro === c}
                  className={`min-h-[40px] shrink-0 rounded-full border px-4 text-[13px] font-bold ${
                    filtro === c
                      ? 'border-[#002693] bg-[#002693] text-white'
                      : 'border-black/10 bg-white text-[#111]/70'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {mias.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-white p-6 text-center">
              <p className="text-sm font-bold text-[#111]">Todavía no tienes reportes</p>
              <p className="mt-1 text-[13px] text-[#111]/55">Crea el primero en menos de 2 minutos.</p>
              <Link
                to="/encuesta"
                className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#FE4102] px-6 text-sm font-bold text-white active:scale-[0.98]"
              >
                <Plus size={16} aria-hidden="true" /> Nuevo reporte
              </Link>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {mias.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/vecino/reporte/${d.id}`}
                    className="flex gap-3 rounded-2xl border bg-white p-3 transition-transform active:scale-[0.99] lg:hover:shadow-md"
                  >
                    <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {d.evidencia[0] ? (
                        <MediaThumb item={d.evidencia[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-[11px] text-gray-400">sin foto</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                          style={{ background: categoriaColor(d.categoriaLabel) }}
                        >
                          {d.categoriaLabel}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                          style={{ background: gravedadColor(d.encuesta.gravedad) }}
                        >
                          {d.encuesta.gravedad}
                        </span>
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
          )}
        </div>
      )}
    </main>
  )
}
