import type { MediaItem } from './media'

export type CategoriaId =
  | "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial"
  | "Recolección de Desechos y Saneamiento Ambiental"
  | "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc."
  | "Servicios Ciudadanos: Trámites, Atención al Ciudadano y Servicios Administrativos"

export type Gravedad = "Baja" | "Media" | "Alta" | "Crítica"
export type Frecuencia = "Una vez" | "Semanal" | "Diario" | "Permanente"
export type TiempoProblema = "< 1 semana" | "1-4 semanas" | "1-6 meses" | "> 6 meses"

export interface EncuestaRespuestas {
  gravedad: Gravedad
  frecuencia: Frecuencia
  tiempoProblema: TiempoProblema
  afectaMovilidad: boolean
  afectaSalud: boolean
  yaReportadoMunicipio: boolean
  direccionPrincipal: string
  calleSecundaria: string
  referencia: string
}

export interface MvpDenuncia {
  id: string
  createdAt: string // ISO
  categoria: CategoriaId
  categoriaLabel: string
  descripcion: string
  lat: number
  lng: number
  /** Parroquia/barrio declarados en el wizard (catálogo SIL). Opcionales: se resuelven por punto si faltan. */
  parroquiaId?: string
  barrioId?: string
  /** Adjuntos: dataURL heredado (string) o referencia a IndexedDB (MediaRef). */
  evidencia: MediaItem[]
  encuesta: EncuestaRespuestas
  cedula: string
  nombreCiudadano?: string
  /** Solo en filas admin: contacto del autor (nunca se publica). */
  contacto?: { nombre: string | null; email: string; celular: string | null }
}

export interface MvpUser {
  cedula: string
  nombre?: string
  telefono?: string
  createdAt: string
}

export interface Cluster {
  key: string
  lat: number
  lng: number
  count: number
  categorias: Record<string, number>
  maxGravedad: Gravedad
}
