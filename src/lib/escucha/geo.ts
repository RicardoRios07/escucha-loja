export type CategoriaIconKey = 'droplet' | 'trash' | 'car' | 'building'

export interface CategoriaVisual {
  /** id corto para sprites/clusters/chips */
  key: string
  label: string
  color: string
  icono: CategoriaIconKey
  match: RegExp
}

/** Fuente de verdad visual de categorías: chips, pins del mapa y sprites comparten esto. */
export const CATEGORIAS_VISUALES: CategoriaVisual[] = [
  { key: 'agua', label: 'Agua', color: '#35C2FF', icono: 'droplet', match: /agua/i },
  { key: 'recoleccion', label: 'Saneamiento ambiental', color: '#16a34a', icono: 'trash', match: /saneamiento|recolecci/i },
  { key: 'movilidad', label: 'Movilidad', color: '#f59e0b', icono: 'car', match: /movilidad/i },
  { key: 'servicios', label: 'Servicios ciudadanos', color: '#8b5cf6', icono: 'building', match: /servicios/i },
]

export function categoriaVisual(label: string): CategoriaVisual {
  for (const c of CATEGORIAS_VISUALES) if (c.match.test(label)) return c
  return { key: 'varios', label: 'Reporte', color: '#8b5cf6', icono: 'building', match: /$^/ }
}

export function gravedadColor(g: string) {
  switch (g) {
    case "Crítica": return "#ef4444"
    case "Alta": return "#f97316"
    case "Media": return "#eab308"
    default: return "#22c55e"
  }
}

export function categoriaColor(label: string) {
  if (label.includes("Agua")) return "#35C2FF"
  if (label.includes("Saneamiento") || label.includes("Recolección")) return "#16a34a"
  if (label.includes("Movilidad")) return "#f59e0b"
  return "#8b5cf6"
}
