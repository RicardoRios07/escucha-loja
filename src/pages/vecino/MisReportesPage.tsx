import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import PageBanner from '../../components/escucha/PageBanner'
import MediaThumb from '../../components/escucha/MediaThumb'
import { useAuth } from '../../components/escucha/AuthContext'
import { getBarrioAprox, getDenuncias } from '../../lib/escucha/store'
import { categoriaColor, gravedadColor } from '../../lib/escucha/geo'

export default function MisReportesPage() {
  const { sesion } = useAuth()
  const [filtro, setFiltro] = useState('Todas')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const refrescar = () => setTick((t) => t + 1)
    window.addEventListener('focus', refrescar)
    const onVis = () => {
      if (document.visibilityState === 'visible') refrescar()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refrescar)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const { mias, categorias } = useMemo(() => {
    const todas = getDenuncias()
    const mias = (sesion?.cedula ? todas.filter((d) => d.cedula === sesion.cedula) : []).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
    const filtradas = filtro === 'Todas' ? mias : mias.filter((d) => d.categoriaLabel === filtro)
    return {
      mias: filtradas,
      categorias: ['Todas', ...Array.from(new Set(mias.map((d) => d.categoriaLabel)))],
    }
  }, [sesion?.cedula, filtro, tick])

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-5xl lg:px-8">
      <PageBanner
        variant="compact"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Escucha Loja"
        title="Mis reportes"
        desc={sesion?.cedula ? `Vinculados a tu cédula · ${mias.length}` : 'Agrega tu cédula para verlos aquí'}
      />

      {!sesion?.cedula ? (
        <div className="mt-4 rounded-2xl border bg-white p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#002693]/[0.07] text-[#002693]">
            <ClipboardList size={22} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-bold text-[#111]">Sin cédula en tu sesión</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#111]/55">
            Vuelve a ingresar con tu cédula y tus reportes aparecerán aquí automáticamente.
          </p>
          <Link
            to="/ingresar"
            className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-[#002693] px-6 text-sm font-bold text-white active:scale-[0.98]"
          >
            Agregar mi cédula
          </Link>
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
