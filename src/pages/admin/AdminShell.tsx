import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LogOut, Map as MapIcon, Sparkles } from 'lucide-react'
import Logo from '../../components/escucha/Logo'
import { useAuth } from '../../components/escucha/AuthContext'

const TABS = [
  { to: '/admin/mapa', label: 'Mapa', icon: MapIcon },
  { to: '/admin/resumen', label: 'Resumen', icon: BarChart3 },
  { to: '/admin/analisis', label: 'Análisis', icon: Sparkles },
]

const tabLinkBase =
  'flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-colors'

/**
 * Shell del administrador: sidebar con estilo banner (desktop lg+) y
 * tab bar inferior (mobile). Cada página del panel dibuja su propia app bar
 * móvil con PageBanner (como en /vecino); aquí solo se provee el cierre de
 * sesión vía contexto del Outlet.
 */
export default function AdminShell() {
  const navigate = useNavigate()
  const { salir } = useAuth()
  const logout = () => {
    salir()
    navigate('/')
  }

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
          <p className="mt-1.5 text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
            Panel de gestión
          </p>

          <nav aria-label="Secciones del panel" className="mt-8 flex flex-col gap-1.5">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[14px] font-bold transition-colors ${
                    isActive
                      ? 'bg-[#FE4102] text-white shadow-[0_10px_24px_-10px_rgba(254,65,2,0.8)]'
                      : 'text-white/70 hover:bg-[#FE4102]/15 hover:text-[#FE4102]'
                  }`
                }
              >
                <t.icon size={18} aria-hidden="true" />
                {t.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-auto flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-white/60 transition-colors hover:bg-[#FE4102]/15 hover:text-[#FE4102]"
          >
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet context={{ manejarSalir: logout }} />
      </div>

      {/* Tab bar móvil: oculta en desktop */}
      <div className="lg:hidden">
        <nav
          aria-label="Secciones del panel"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <div className="mx-auto grid max-w-md grid-cols-3 items-end gap-1 px-2 pt-1.5">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `${tabLinkBase} ${isActive ? 'text-[#FE4102]' : 'text-[#111]/45 hover:text-[#111]'}`
                }
              >
                <t.icon size={22} aria-hidden="true" />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
