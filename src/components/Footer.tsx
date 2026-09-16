import { MapPin, MessageCircle, Globe } from 'lucide-react'

const LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Mapa', href: '#mapa' },
  { label: 'Participar', href: '#participar' },
  { label: 'Aportes', href: '#aportes' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Footer() {
  return (
    <footer id="contacto" className="relative overflow-hidden bg-[#002693] text-white">
      <div className="halftone halftone-tiny absolute inset-0 opacity-10" />
      <div className="absolute left-1/2 top-0 h-px w-full max-w-[1280px] -translate-x-1/2 bg-white/25" />

      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:grid-cols-[1.3fr_1fr] md:items-center lg:px-10 lg:py-20">
        {/* Marca */}
        <div>
          <a href="#inicio" className="group inline-flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition-transform group-hover:-rotate-6">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path
                  d="M4 11a7 7 0 0 1 14-.2M20 12.5A7.5 7.5 0 0 1 12.5 20H8"
                  stroke="#002693"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M4.5 14.5 2 20l5.5-2.5"
                  stroke="#FE4102"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#FE4102"
                />
              </svg>
            </span>
            <span className="leading-none">
              <span className="block text-xl font-black tracking-tight">Escucha Loja</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
                La ciudad tiene la palabra
              </span>
            </span>
          </a>
          <p className="mt-6 max-w-[380px] text-[14px] leading-relaxed text-white/70">
            Una plataforma ciudadana hecha por y para la gente de Loja: comparte lo que tu
            barrio necesita y construyamos juntos una mejor ciudad.
          </p>
          <div className="mt-6 flex items-center gap-3 text-[13px] font-semibold text-white/70">
            <Globe size={16} className="text-[#FE4102]" />
            Loja, Ecuador
          </div>
        </div>

        {/* Links */}
        <nav className="grid grid-cols-2 gap-x-6 gap-y-3 md:justify-items-end">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="group flex items-center gap-2 py-1 text-[14px] font-bold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#FE4102] opacity-70 transition-transform group-hover:scale-125" />
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="relative border-t border-white/15">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-5 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:flex-row lg:px-10">
          <span>© 2026 Escucha Loja · Hecho en Loja</span>
          <span className="flex items-center gap-2">
            <MapPin size={13} className="text-[#FE4102]" />
            <MessageCircle size={13} className="text-[#FE4102]" />
            Por y para la gente de la ciudad
          </span>
        </div>
      </div>
    </footer>
  )
}