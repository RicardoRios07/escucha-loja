import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from './escucha/Logo'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-white/25 bg-[#002693] transition-shadow ${
          scrolled ? 'shadow-[0_14px_40px_-18px_rgba(0,0,0,0.55)]' : ''
        }`}
      >

        <div className="campaign-nav mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-5 py-2.5 lg:px-10">
          {/* Logo */}
          <a href="#inicio" className="group flex items-center gap-3 transition-transform group-hover:-rotate-1">
            <Logo height={34} />
          </a>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="#mapa"
              className="campaign-nav-button border border-white text-[12px] font-bold text-white transition-colors hover:bg-white hover:text-[#002693]"
            >
              Ver mapa
            </a>
            <Link
              to="/ingresar"
              className="campaign-nav-button bg-[#FE4102] text-[12px] font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff5a1f]"
            >
              Alzar mi voz
            </Link>
          </div>

          {/* Botón móvil */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/25 text-white lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-x-0 top-[62px] z-40 border-b-2 border-white bg-[#002693] px-6 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            <a href="#mapa" onClick={() => setOpen(false)} className="border-b border-white/10 py-4 text-base font-bold text-white/90">
              Ver mapa
            </a>
            <a href="#como-funciona" onClick={() => setOpen(false)} className="border-b border-white/10 py-4 text-base font-bold text-white/90">
              Cómo participar
            </a>
            <Link
              to="/ingresar"
              onClick={() => setOpen(false)}
              className="mt-5 flex items-center justify-center rounded-full bg-[#FE4102] px-5 py-3.5 text-sm font-extrabold text-white shadow-[2px_3px_0_rgba(0,0,0,0.25)]"
            >
              Alzar mi voz
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}