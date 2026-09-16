interface Props {
  /** Altura en px (el ancho se ajusta solo). */
  height?: number
  /** Pastilla azul para fondos claros (el logo es texto blanco). */
  tile?: boolean
  className?: string
}

export default function Logo({ height = 32, tile = false, className = '' }: Props) {
  const img = (
    <img
      src="/logo.png"
      alt="Jesús Resuelve"
      height={height}
      style={{ height }}
      className={`w-auto ${className}`}
      draggable={false}
    />
  )
  if (!tile) return img
  return (
    <span className="inline-grid place-items-center rounded-xl bg-[#002693] px-2.5 py-2">
      {img}
    </span>
  )
}
