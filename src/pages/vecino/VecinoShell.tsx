import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, Home, LogOut, Map, UserRound } from 'lucide-react'
import TabBar from '../../components/escucha/TabBar'
import Logo from '../../components/escucha/Logo'
import { useAuth } from '../../components/escucha/AuthContext'

const NAV = [
  { to: '/vecino', label: 'Inicio', icon: Home, end: true },
  { to: '/vecino/comunidad', label: 'Comunidad', icon: Map, end: false },
  { to: '/vecino/mis-reportes', label: 'Mis reportes', icon: ClipboardList, end: false },
  { to: '/vecino/cuenta', label: 'Cuenta', icon: UserRound, end: false },
]

/**
 * Shell del ciudadano: contenido + tab bar inferior (mobile) / sidebar con el
 * mismo estilo del banner editorial — hover y active en naranja (desktop lg+).
 */
export default function VecinoShell() {
  const navigate = useNavigate()
  const { salir } = useAuth()

  return (
    <div className="min-h-dvh bg-[#f8fafc] lg:flex">
      {/* Sidebar desktop: mismo tratamiento editorial que el banner */}
      <aside className="sticky top-0 z-30 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden bg-[#002693] text-white lg:flex">
        <div className="halftone halftone-tiny pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[#0635c4] opacity-70 blur-3xl" aria-hidden="true" />
        <div className="relative flex min-h-full flex-col px-4 py-6">
        <div className="flex justify-center py-1">
          <Logo height={46} />
        </div>
          <nav aria-label="Navegación del vecino" className="mt-8 flex flex-col gap-1.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[14px] font-bold transition-colors ${
                    isActive
                      ? 'bg-[#FE4102] text-white shadow-[0_10px_24px_-10px_rgba(254,65,2,0.8)]'
                      : 'text-white/70 hover:bg-[#FE4102]/15 hover:text-[#FE4102]'
                  }`
                }
              >
                <n.icon size={18} aria-hidden="true" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => {
              salir()
              navigate('/')
            }}
            className="mt-auto flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-white/60 transition-colors hover:bg-[#FE4102]/15 hover:text-[#FE4102]"
          >
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido (padding de tab bar solo en móvil) */}
      <div className="min-w-0 flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </div>

      {/* Tab bar móvil: oculto en desktop */}
      <div className="lg:hidden">
        <TabBar />
      </div>
    </div>
  )
}
