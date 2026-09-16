import { NavLink } from 'react-router-dom'
import { ClipboardList, Home, Map, Plus, UserRound } from 'lucide-react'

const linkBase =
  'flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-colors'

/** Barra inferior móvil del ciudadano: 4 destinos + acción central [＋]. */
export default function TabBar() {
  return (
    <nav
      aria-label="Navegación del vecino"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 px-2 pt-1.5">
        <NavLink
          to="/vecino"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'text-[#002693]' : 'text-[#111]/45 hover:text-[#111]'}`
          }
        >
          <Home size={22} aria-hidden="true" />
          Inicio
        </NavLink>
        <NavLink
          to="/vecino/comunidad"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'text-[#002693]' : 'text-[#111]/45 hover:text-[#111]'}`
          }
        >
          <Map size={22} aria-hidden="true" />
          Comunidad
        </NavLink>
        <NavLink to="/encuesta" aria-label="Crear nuevo reporte" className="flex flex-col items-center gap-1 pb-1">
          <span className="grid h-14 w-14 -translate-y-3 place-items-center rounded-full bg-[#FE4102] text-white shadow-[0_10px_24px_-8px_rgba(254,65,2,0.7)] ring-4 ring-white transition-transform active:scale-95">
            <Plus size={26} aria-hidden="true" />
          </span>
          <span className="-mt-2 text-[11px] font-bold text-[#111]/70">Nuevo</span>
        </NavLink>
        <NavLink
          to="/vecino/mis-reportes"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'text-[#002693]' : 'text-[#111]/45 hover:text-[#111]'}`
          }
        >
          <ClipboardList size={22} aria-hidden="true" />
          Mis reportes
        </NavLink>
        <NavLink
          to="/vecino/cuenta"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? 'text-[#002693]' : 'text-[#111]/45 hover:text-[#111]'}`
          }
        >
          <UserRound size={22} aria-hidden="true" />
          Cuenta
        </NavLink>
      </div>
    </nav>
  )
}
