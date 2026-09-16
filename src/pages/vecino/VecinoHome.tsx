import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, Megaphone } from 'lucide-react'
import Logo from '../../components/escucha/Logo'
import MediaThumb from '../../components/escucha/MediaThumb'
import { useAuth } from '../../components/escucha/AuthContext'
import { ensureSeed, getBarrioAprox, getDenuncias } from '../../lib/escucha/store'
import { categoriaColor } from '../../lib/escucha/geo'

function useDatos() {
  const { sesion } = useAuth()
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
  return useMemo(() => {
    try {
      ensureSeed()
    } catch {
      /* noop */
    }
    const todas = getDenuncias()
    const mias = sesion?.cedula ? todas.filter((d) => d.cedula === sesion.cedula) : []
    const recientes = [...todas]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
    return { sesion, todas, mias, recientes }
  }, [sesion, tick])
}

export default function VecinoHome() {
  const navigate = useNavigate()
  const { salir } = useAuth()
  const { sesion, todas, mias, recientes } = useDatos()

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-6">
      <header className="flex items-center gap-3">
        <Logo height={38} tile />
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-[#111]">
            Hola{sesion?.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ', vecino'}
          </h1>
        </div>
        <button
          onClick={() => {
            salir()
            navigate('/')
          }}
          aria-label="Cerrar sesión"
          className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-[#111]/60 active:scale-95"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3">
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
        className="mt-4 flex min-h-[60px] items-center gap-3 rounded-2xl bg-[#FE4102] px-5 font-extrabold text-white shadow-[3px_4px_0_rgba(0,0,0,0.2)] transition-transform active:translate-y-[1px] active:scale-[0.99] active:shadow-none"
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

      <section aria-labelledby="t-recientes" className="mt-6">
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
          <ul className="mt-2 flex flex-col gap-3">
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
    </main>
  )
}
