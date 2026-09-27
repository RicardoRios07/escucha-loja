import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TextShimmerProps = {
  /** Elemento a renderizar. Por defecto un span. */
  as?: string
  /** Segundos de cada pasada del brillo. */
  duration?: number
  /** Amplitud del brillo en % (5-45). */
  spread?: number
  /** Colores del degradado: apagado, brillo y apagado. */
  from?: string
  via?: string
  to?: string
  /**
   * true (por defecto): el brillo se recorta al texto.
   * false: el degradado se pinta sobre el propio bloque, para las barras de
   * esqueleto (sin glifo que recorte).
   */
  clip?: boolean
  children?: ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>

/**
 * TextShimmer — texto con brillo animado, para estados de carga.
 *
 * Técnica: un degradado lineal recortado al texto (`background-clip: text` con
 * `color: transparent`) que se desplaza con el keyframe `shimmer`
 * (backgroundPosition 200% → -200%). Port del componente público de
 * shim.ai, sin dependencias: aquí los colores son explícitos en vez de
 * variables de tema, para poder usarlo sobre fondo azul o blanco.
 */
export function TextShimmer({
  as = 'span',
  className,
  duration = 4,
  spread = 20,
  from = 'rgba(255,255,255,0.35)',
  via = 'rgba(255,255,255,0.95)',
  to = 'rgba(255,255,255,0.35)',
  clip = true,
  children,
  style,
  ...props
}: TextShimmerProps) {
  const amplitud = Math.min(Math.max(spread, 5), 45)
  const Componente = as as React.ElementType
  return (
    <Componente
      className={cn(clip && 'bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: `linear-gradient(to right, ${from} ${50 - amplitud}%, ${via} 50%, ${to} ${50 + amplitud}%)`,
        backgroundSize: '200% auto',
        animation: `shimmer ${duration}s infinite linear`,
        ...style,
      }}
      {...props}
    >
      {children}
    </Componente>
  )
}
