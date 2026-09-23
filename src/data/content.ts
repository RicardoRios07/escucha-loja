export const IMG = {
  portrait: '/candidato.webp',
  phone: '/celular.webp',
  cityCorner: '/ciudad-esquina.webp',
  heroBackground: '/fondo-top.webp',
  candidateTop: '/candidato-top.webp',
  cityTop: '/ciudad-top.webp',
  map: '/mapa.jpeg',
} as const

export type CategoryKey = 'agua' | 'saneamiento' | 'movilidad' | 'servicios'

export const CATEGORIES: {
  key: CategoryKey
  label: string
  emoji: string
  color: string
  description: string
}[] = [
  {
    key: 'agua',
    label: 'Agua',
    emoji: '💧',
    color: '#0DB954',
    description: 'Fugas, cortes y calidad del servicio.',
  },
  {
    key: 'saneamiento',
    label: 'Saneamiento',
    emoji: '🌳',
    color: '#007BFF',
    description: 'Desechos, limpieza y ambiente.',
  },
  {
    key: 'movilidad',
    label: 'Movilidad',
    emoji: '🚌',
    color: '#002693',
    description: 'Vías, transporte y congestión.',
  },
  {
    key: 'servicios',
    label: 'Servicios',
    emoji: '🏛️',
    color: '#FE4102',
    description: 'Trámites y atención municipal.',
  },
]
