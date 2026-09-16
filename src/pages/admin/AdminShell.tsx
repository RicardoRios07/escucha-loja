import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LogOut, Map as MapIcon, Sparkles } from 'lucide-react'
import Logo from '../../components/escucha/Logo'
import { useAuth } from '../../components/escucha/AuthContext'

const TABS = [
  { to: '/admin/mapa', label: 'Mapa', icon: MapIcon, end: false },
  { to: '/admin/resumen', label: 'Resumen', icon: BarChart3, end: false },
  { to: '/admin/analisis', label: 'Análisis', icon: Sparkles, end: false },
]

/** Shell del administrador: header + tabs (Mapa · Resumen · Análisis). */
export default function AdminShell() {
  const navigate = useNavigate()
  const { salir } = useAuth()

  return (
    <div className="min-h-dvh bg-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#002693] text-white">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3 lg:px-10">
          <Logo height={30} />
          <div className="flex-1 leading-tight">
            <p className="hidden text-[11px] text-white/60 sm:block">Panel del candidato · lectura de la ciudad</p>
          </div>
          <button
            onClick={() => {
              salir()
              navigate('/')
            }}
            aria-label="Cerrar sesión de administrador"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 active:scale-95"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Secciones del panel" className="mx-auto grid max-w-[1240px] grid-cols-3 gap-1 px-5 pb-2 lg:px-10">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-[13px] font-extrabold transition-colors ${
                  isActive ? 'bg-white text-[#002693]' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <t.icon size={16} aria-hidden="true" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
