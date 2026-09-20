export const IMG = {
  portrait: '/Imagen%20sin%20fondo%20candidato.png',
  phone: '/celular.png',
  cityCorner: '/imagen%20esquina%20inferior%20ciudad.png',
  heroBackground: '/imagen%20fondo%20superior.png',
  candidateTop: '/imagen%20candidato%20parte%20superior.png',
  cityTop: '/imagen%20ciudad%20parte%20superior.png',
  map: '/mapa.jpeg',
} as const

export type CategoryKey = 'agua' | 'movilidad' | 'seguridad' | 'espacio'

export const CATEGORIES: {
  key: CategoryKey
  label: string
  emoji: string
  count: number
  color: string
  description: string
}[] = [
  {
    key: 'agua',
    label: 'Agua',
    emoji: '💧',
    count: 12,
    color: '#0DB954',
    description: 'Fugas, cortes y calidad del servicio.',
  },
  {
    key: 'movilidad',
    label: 'Movilidad',
    emoji: '🚌',
    count: 8,
    color: '#002693',
    description: 'Vías, transporte y congestión.',
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    emoji: '🛡️',
    count: 6,
    color: '#FE4102',
    description: 'Alumbrado, vigilancia y riesgos.',
  },
  {
    key: 'espacio',
    label: 'Espacio público',
    emoji: '🌳',
    count: 4,
    color: '#007BFF',
    description: 'Parques, aceras y limpieza.',
  },
]

export type Marker = {
  id: number
  x: number
  y: number
  category: CategoryKey
  barrio: string
  title: string
}

export const MARKERS: Marker[] = [
  { id: 1, x: 24, y: 30, category: 'agua', barrio: 'El Valle', title: 'Fuga en tubería' },
  { id: 2, x: 40, y: 24, category: 'movilidad', barrio: 'San Sebastián', title: 'Semáforo dañado' },
  { id: 3, x: 55, y: 38, category: 'seguridad', barrio: 'Sagrario', title: 'Calle sin alumbrado' },
  { id: 4, x: 68, y: 28, category: 'espacio', barrio: 'Punzara', title: 'Parque descuidado' },
  { id: 5, x: 34, y: 52, category: 'agua', barrio: 'Clodoveo', title: 'Corte de agua' },
  { id: 6, x: 50, y: 62, category: 'seguridad', barrio: 'El Pedestal', title: 'Cámara en mal estado' },
  { id: 7, x: 76, y: 50, category: 'movilidad', barrio: 'La Tebaida', title: 'Bache en la vía' },
  { id: 8, x: 28, y: 72, category: 'espacio', barrio: 'Zamora Huayco', title: 'Acera en mal estado' },
  { id: 9, x: 62, y: 76, category: 'agua', barrio: 'Sauces', title: 'Presión baja del agua' },
  { id: 10, x: 45, y: 86, category: 'movilidad', barrio: 'Cresta de Galilea', title: 'Ruta de bus propuesta' },
]

export const CATEGORY_COLOR: Record<CategoryKey, string> = {
  agua: '#0DB954',
  movilidad: '#002693',
  seguridad: '#FE4102',
  espacio: '#007BFF',
}