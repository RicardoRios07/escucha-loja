import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export function Reveal({
  delay = 0,
  children,
  className = '',
}: {
  delay?: number
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 34, filter: 'blur(12px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Pincelada naranja dibujada debajo de una palabra. */
export function Brush({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 220 34"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
      preserveAspectRatio="none"
    >
      <path
        d="M6 26C38 12 74 8 110 15c36 7 72 6 104-4"
        stroke="#FE4102"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 30c34-8 76-9 116-4"
        stroke="#002693"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
    </svg>
  )
}

/** Flecha dibujada a mano para dirigir la mirada. */
export function DoodleArrow({
  className = '',
  direction = 'right',
}: {
  className?: string
  direction?: 'right' | 'down' | 'left' | 'up'
}) {
  const paths: Record<string, string> = {
    right: 'M4 62 C 46 64, 78 50, 108 20',
    down: 'M10 8 C 12 34, 20 58, 48 70',
    left: 'M108 20 C 78 50, 46 64, 4 62',
    up: 'M48 6 C 20 20, 12 42, 10 66',
  }
  const dots: Record<string, [number, number]> = {
    right: [98, 13],
    down: [44, 62],
    left: [18, 55],
    up: [40, 14],
  }
  return (
    <svg viewBox="0 0 116 76" fill="none" aria-hidden="true" className={className}>
      <path
        d={paths[direction]}
        stroke="#FE4102"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="7 7"
        className="doodle-svg"
      />
      <path
        d={dirTri(direction)}
        stroke="#FE4102"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={dots[direction][0]} cy={dots[direction][1]} r="4" fill="#FE4102" />
    </svg>
  )
}

function dirTri(direction: 'right' | 'down' | 'left' | 'up') {
  switch (direction) {
    case 'right':
      return 'M92 8 l16 6 -14 12'
    case 'down':
      return 'M38 54 l7 16 -15 10'
    case 'left':
      return 'M20 58 L4 52 l14 -12'
    case 'up':
      return 'M36 22 l-7 -16 15 -10'
  }
}

/** Etiqueta tipo pincel naranja. */
export function BrushTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center -skew-x-6 rounded-[6px] bg-[#FE4102] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[2px_3px_0_rgba(0,0,0,0.22)]">
      <span className="inline-block skew-x-6">{children}</span>
    </span>
  )
}

/** Cinta adhesiva sobre un recorte. */
export function Tape({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`tape ${className}`} />
}

/** Sticker blanco con sombra dura, rotable. */
export function Sticker({
  children,
  rotate = -3,
  className = '',
}: {
  children: ReactNode
  rotate?: number
  className?: string
}) {
  return (
    <span
      className={`sticker inline-block rounded-[6px] px-4 py-2 font-extrabold ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  )
}

/** Vínculo con pincelada animada al hover. */
export function BrushLink({
  children,
  href,
  onClick,
  active = false,
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group relative py-3 text-sm font-bold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-white"
    >
      <span className="relative z-10">{children}</span>
      <span
        className={`absolute bottom-1 left-0 h-[7px] w-full rounded-full bg-[#FE4102] opacity-0 transition-all duration-300 group-hover:bottom-1.5 group-hover:opacity-100 ${
          active ? 'bottom-1.5 opacity-100' : ''
        }`}
      />
    </a>
  )
}