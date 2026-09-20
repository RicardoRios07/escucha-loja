import type { LucideIcon } from 'lucide-react'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import PageBanner from './PageBanner'

/**
 * Conjunto compartido de las páginas del panel de gestión (Mapa, Resumen,
 * Análisis). Garantiza que las tres usen el mismo contenedor editorial, el
 * mismo header y las mismas cards, para mantener un estilo consistente.
 *
 * En móvil se convierte en una app bar como la de /vecino: banner azul
 * (#002693) con título y descripción del panel, y las acciones a la derecha.
 * En desktop (lg+) mantiene el header editorial claro, ya que el logo y el
 * cierre de sesión viven en la sidebar del shell.
 */
export function PanelPage({
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  right?: ReactNode
  children: ReactNode
}) {
  const { manejarSalir } = useOutletContext<{ manejarSalir?: () => void }>() ?? {}

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-6 lg:px-8">
      {/* App bar móvil: banner editorial con el título de la página, como /vecino */}
      <div className="lg:hidden">
        <PageBanner
          variant="compact"
          className="rounded-2xl"
          eyebrow={eyebrow}
          title={title}
          desc={subtitle}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {right}
              {manejarSalir && (
                <button
                  onClick={manejarSalir}
                  aria-label="Cerrar sesión de administrador"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white active:scale-95"
                >
                  <LogOut size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          }
        />
      </div>

      <div className="mt-5 rounded-[28px] border border-[#e3eaf5] bg-[#f4f7fb] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] lg:mt-0 lg:p-6">
        <header className="mb-5 hidden flex-wrap items-start justify-between gap-3 lg:flex">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7283a8]">{eyebrow}</p>
            <h1 className="mt-1 text-[clamp(2.2rem,3vw,3.1rem)] font-black leading-none tracking-[-0.045em] text-[#111827]">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4b5a78]">{subtitle}</p>
          </div>
          {right}
        </header>
        {children}
      </div>
    </main>
  )
}

export function PanelCard({
  icon: Icon,
  title,
  action,
  id,
  className = '',
  children,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`rounded-[22px] border border-[#e2e9f6] bg-white p-4 shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 text-[#1b2b4d]">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ff]">
            <Icon size={18} className="text-[#002693]" aria-hidden="true" />
          </div>
          <h2 className="text-[18px] font-black">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}