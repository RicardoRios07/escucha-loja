import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, Megaphone } from 'lucide-react'
import PageBanner from '../../components/escucha/PageBanner'
import MediaThumb from '../../components/escucha/MediaThumb'
import { useAuth } from '../../components/escucha/AuthContext'
import { getBarrioAprox } from '../../lib/escucha/store'
import { useMisReportes, useReportesPublicos } from '../../lib/escucha/repo'
import { categoriaColor } from '../../lib/escucha/geo'

function useDatos() {
  const { user } = useAuth()
  const publicos = useReportesPublicos()
  const mios = useMisReportes()
  useEffect(() => {
    const refrescar = () => {
      publicos.recargar()
      mios.recargar()
    }
    window.addEventListener('focus', refrescar)
    const onVis = () => {
      if (document.visibilityState === 'visible') refrescar()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refrescar)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const recientes = [...publicos.datos]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
  return { user, todas: publicos.datos, mias: mios.datos, recientes }
}

export default function VecinoHome() {
  const navigate = useNavigate()
  const { salir } = useAuth()
  const { user, todas, mias, recientes } = useDatos()

  const logout = () => {
    void salir()
    navigate('/')
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-5xl lg:px-8">
      {/* Banner editorial completo (solo Home) */}
      <PageBanner
        variant="full"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Escucha Loja"
        title={user?.nombre ? `Hola, ${user.nombre.split(' ')[0]}` : 'Hola, vecino'}
        desc="Tu voz construye la ciudad: reporta lo que ves en tu barrio."
        actions={
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="grid h-11 w-11 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        }
      />

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6 lg:items-start">
        {/* Columna izquierda: métricas + CTA */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">Mis reportes</p>
              <p className="num mt-1 text-3xl font-black text-[#002693]">{mias.length}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">En comunidad</p>
              <p className="num mt-1 text-3xl font-black text-[#002693]">{todas.length}</p>
            </div>
          </div>

          <Link
            to="/encuesta"
            className="mt-3 flex min-h-[60px] items-center gap-3 rounded-2xl bg-[#FE4102] px-5 font-extrabold text-white shadow-[3px_4px_0_rgba(0,0,0,0.2)] transition-transform active:translate-y-[1px] active:scale-[0.99] active:shadow-none"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
              <Megaphone size={20} aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-[16px]">Nuevo reporte</span>
              <span className="block text-[12px] font-semibold text-white/80">Foto o video, ubicación y relato</span>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>

        {/* Columna derecha: lo último */}
        <section aria-labelledby="t-recientes" className="mt-6 lg:mt-0">
          <div className="flex items-center justify-between">
            <h2 id="t-recientes" className="text-[15px] font-black text-[#111]">
              Lo último en tu ciudad
            </h2>
            <Link to="/vecino/comunidad" className="min-h-[44px] px-2 py-2 text-[13px] font-bold text-[#002693]">
              Ver todo
            </Link>
          </div>
          {recientes.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed bg-white p-6 text-center">
              <p className="text-sm font-bold text-[#111]">Aún no hay reportes</p>
              <p className="mt-1 text-[13px] text-[#111]/55">Sé la primera voz de tu barrio.</p>
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-3 lg:grid lg:grid-cols-2">
              {recientes.map((d) => (
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
          )}
        </section>
      </div>
    </main>
  )
}
