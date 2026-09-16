import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Logo from './Logo'

type PageBannerProps = {
  /** Etiqueta pequeña sobre el título (ej: "Paso 2 de 5 · Ubicación"). */
  eyebrow?: string
  title: string
  desc?: string
  /** full: proporciones del wizard (portada). compact: mitad de alto. */
  variant?: 'full' | 'compact'
  /** Acciones a la derecha del logo (cerrar, logout, etc.). */
  actions?: ReactNode
  /** Contenido que reemplaza el logo a la izquierda (ej: botón volver). */
  leading?: ReactNode
  /** Barra de progreso segmentada (wizard). */
  progress?: { current: number; total: number }
  /** Anima el cambio de título entre pasos. */
  titleKey?: string | number
  /** Id para el h1 (aria-labelledby de diálogos). */
  titleId?: string
  className?: string
}

/**
 * Banner editorial azul (#002693 + halftone + glow) — el estilo del wizard
 * de /encuesta, extraído para reutilizarlo en /vecino y /admin.
 */
export default function PageBanner({
  eyebrow,
  title,
  desc,
  variant = 'full',
  actions,
  leading,
  progress,
  titleKey,
  titleId,
  className = '',
}: PageBannerProps) {
  const full = variant === 'full'
  return (
    <section className={`relative overflow-hidden bg-[#002693] text-white ${className}`}>
      <div className="halftone halftone-tiny pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#0635c4] opacity-70 blur-3xl" aria-hidden="true" />
      <div className={`relative px-4 sm:px-6 ${full ? 'pt-4 pb-6' : 'py-4'}`}>
        {(actions || leading) && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {leading}
              {!leading && <Logo height={full ? 30 : 26} />}
            </div>
            {actions}
          </div>
        )}
        {!(actions || leading) && <Logo height={full ? 30 : 26} />}
        {eyebrow && (
          <p className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/90 ${actions || leading ? 'mt-3' : 'mt-3'}`}>
            {eyebrow}
          </p>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={titleKey ?? title}
            id={titleId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`mt-2 font-display leading-[1.02] tracking-tight ${
              full
                ? 'text-[clamp(1.7rem,6vw,2.6rem)]'
                : 'text-[clamp(1.35rem,4.5vw,1.9rem)]'
            }`}
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        {desc && <p className={`text-sm text-white/70 ${full ? 'mt-1.5' : 'mt-1'}`}>{desc}</p>}
        {progress && (
          <div
            className="mt-4 flex gap-1.5"
            role="progressbar"
            aria-valuenow={Math.round((progress.current / progress.total) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`Paso ${progress.current} de ${progress.total}`}
            aria-label="Progreso"
          >
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < progress.current ? 'bg-[#FE4102]' : 'bg-white/20'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
