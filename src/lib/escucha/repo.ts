/**
 * repo.ts — capa de datos contra Neon (vía /api/*). Reemplaza el localStorage.
 * - useReportesPublicos: mapa, comunidad, landing (sin datos personales).
 * - useReportesAdmin: panel admin (con direcciones + contacto del autor).
 * - useMisReportes: reportes propios del vecino en sesión.
 * La evidencia fotográfica sigue en IndexedDB local hasta el storage Blob;
 * se reasocia en memoria por id de reporte.
 */
import { useCallback, useEffect, useState } from 'react'
import { upload } from '@vercel/blob/client'
import type { CategoriaId } from './types'
import type { MvpDenuncia } from './types'
import { deleteMedia, getMediaBlob, isMediaRef, type MediaRef } from './media'

const CODE_A_CATEGORIA: Record<string, CategoriaId> = {
  agua: 'Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial',
  recoleccion: 'Recolección de Desechos y Saneamiento Ambiental',
  movilidad: 'Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc.',
  servicios: 'Servicios Ciudadanos: Trámites, Atención al Ciudadano y Servicios Administrativos',
}

export function codigoCategoria(id: CategoriaId): string {
  for (const [code, cid] of Object.entries(CODE_A_CATEGORIA)) if (cid === id) return code
  return 'agua'
}

export interface ReporteApi {
  id: string
  categoria_code: string
  categoria_label: string
  descripcion: string
  lat: number
  lng: number
  parroquia_id: string | null
  barrio_id: string | null
  gravedad: MvpDenuncia['encuesta']['gravedad']
  frecuencia: MvpDenuncia['encuesta']['frecuencia']
  tiempo_problema: MvpDenuncia['encuesta']['tiempoProblema']
  afecta_movilidad: boolean
  afecta_salud: boolean
  evidencia: { kind: 'foto' | 'video'; url: string }[]
  ya_reportado_municipio?: boolean
  direccion_principal?: string
  calle_secundaria?: string
  referencia?: string
  estado?: string
  autor_nombre?: string | null
  autor_email?: string
  autor_celular?: string | null
  created_at: string
}

export function mapearReporte(r: ReporteApi): MvpDenuncia {
  return {
    id: r.id,
    createdAt: r.created_at,
    categoria: CODE_A_CATEGORIA[r.categoria_code] ?? 'Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial',
    categoriaLabel: r.categoria_label,
    descripcion: r.descripcion,
    lat: Number(r.lat),
    lng: Number(r.lng),
    parroquiaId: r.parroquia_id ?? undefined,
    barrioId: r.barrio_id ?? undefined,
    evidencia: (r.evidencia ?? []).map((e) => ({ remoto: true as const, kind: e.kind, url: e.url })),
    encuesta: {
      gravedad: r.gravedad,
      frecuencia: r.frecuencia,
      tiempoProblema: r.tiempo_problema,
      afectaMovilidad: r.afecta_movilidad,
      afectaSalud: r.afecta_salud,
      yaReportadoMunicipio: r.ya_reportado_municipio ?? false,
      direccionPrincipal: r.direccion_principal ?? '',
      calleSecundaria: r.calle_secundaria ?? '',
      referencia: r.referencia ?? '',
    },
    cedula: '',
    nombreCiudadano: r.autor_nombre ?? undefined,
    contacto: r.autor_email
      ? { nombre: r.autor_nombre ?? null, email: r.autor_email, celular: r.autor_celular ?? null }
      : undefined,
  }
}

async function leerJson(r: Response): Promise<{ reportes?: ReporteApi[]; reporte?: ReporteApi | null; error?: string }> {
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try {
      const d = (await r.json()) as { error?: string }
      if (d.error) msg = d.error
    } catch {
      /* cuerpo no JSON */
    }
    throw new Error(msg)
  }
  return (await r.json()) as { reportes?: ReporteApi[] }
}

async function cargar(url: string): Promise<MvpDenuncia[]> {
  const r = await fetch(url, { credentials: 'same-origin' })
  const d = await leerJson(r)
  return (d.reportes ?? []).map(mapearReporte)
}

export interface CrearReporteInput {
  categoria_code: string
  descripcion: string
  lat: number
  lng: number
  parroquiaId: string
  barrioId: string
  gravedad: MvpDenuncia['encuesta']['gravedad']
  frecuencia: MvpDenuncia['encuesta']['frecuencia']
  tiempoProblema: MvpDenuncia['encuesta']['tiempoProblema']
  afectaMovilidad: boolean
  afectaSalud: boolean
  yaReportadoMunicipio: boolean
  direccionPrincipal: string
  calleSecundaria: string
  referencia: string
  /** Adjuntos ya validados en IndexedDB; se suben al Blob al crear. */
  evidencia: MediaRef[]
  /** Progreso de subida (0..1 por archivo ya subido). */
  onProgreso?: (subidos: number, total: number) => void
}

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/x-m4v': 'm4v',
}

/** Sube un adjunto local al Blob store (vía token del servidor). */
async function subirEvidencia(ref: MediaRef): Promise<{ url: string; kind: 'foto' | 'video'; duracion_s: number | null }> {
  const blob = await getMediaBlob(ref.id)
  if (!blob) throw new Error('No se encontró la foto/video en este dispositivo. Vuelve a adjuntarla.')
  const ext = EXT_POR_MIME[ref.mime] ?? (ref.kind === 'foto' ? 'jpg' : 'mp4')
  const file = new File([blob], `${ref.id}.${ext}`, { type: ref.mime || undefined })
  const subida = await upload(`evidencia/${ref.id}.${ext}`, file, {
    access: 'public',
    handleUploadUrl: '/api/evidencia/token',
  })
  return { url: subida.url, kind: ref.kind, duracion_s: ref.duration ? Math.round(ref.duration) : null }
}

export async function crearReporte(input: CrearReporteInput): Promise<MvpDenuncia> {
  // 1) Evidencia al Blob (directo navegador→storage, sin pasar por la Function).
  const remotas: { url: string; kind: 'foto' | 'video'; duracion_s: number | null }[] = []
  let i = 0
  for (const ref of input.evidencia) {
    if (!isMediaRef(ref)) continue
    remotas.push(await subirEvidencia(ref))
    i += 1
    input.onProgreso?.(i, input.evidencia.length)
  }
  // 2) Reporte + vínculos a evidencia en Neon.
  const r = await fetch('/api/reportes', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoria_code: input.categoria_code,
      descripcion: input.descripcion,
      lat: input.lat,
      lng: input.lng,
      parroquia_id: input.parroquiaId || null,
      barrio_id: input.barrioId || null,
      gravedad: input.gravedad,
      frecuencia: input.frecuencia,
      tiempo_problema: input.tiempoProblema,
      afecta_movilidad: input.afectaMovilidad,
      afecta_salud: input.afectaSalud,
      ya_reportado_municipio: input.yaReportadoMunicipio,
      direccion_principal: input.direccionPrincipal,
      calle_secundaria: input.calleSecundaria,
      referencia: input.referencia,
      evidencia: remotas,
    }),
  })
  const d = await leerJson(r)
  if (!d.reporte) throw new Error('El servidor no devolvió el reporte creado')
  // 3) Higiene local: los blobs ya viven en la nube.
  for (const ref of input.evidencia) {
    if (isMediaRef(ref)) void deleteMedia(ref.id)
  }
  invalidarCache()
  return mapearReporte(d.reporte)
}

export async function borrarReporte(id: string): Promise<void> {
  const r = await fetch(`/api/reportes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  await leerJson(r)
  invalidarCache()
}

// Caché en memoria (60 s) compartida por los hooks.
const cache = new Map<string, { at: number; data: MvpDenuncia[] }>()

function invalidarCache(): void {
  cache.clear()
}

async function conCache(clave: string, fetcher: () => Promise<MvpDenuncia[]>): Promise<MvpDenuncia[]> {
  const hit = cache.get(clave)
  if (hit && Date.now() - hit.at < 60_000) return hit.data
  const data = await fetcher()
  cache.set(clave, { at: Date.now(), data })
  return data
}

export function invalidarReportes(): void {
  invalidarCache()
}

interface UsoReportes {
  datos: MvpDenuncia[]
  cargando: boolean
  error: string | null
  recargar: () => void
}

function useReportes(clave: string, fetcher: () => Promise<MvpDenuncia[]>): UsoReportes {
  const [datos, setDatos] = useState<MvpDenuncia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    conCache(clave, fetcher)
      .then((d) => {
        if (!vivo) return
        setDatos(d)
        setError(null)
      })
      .catch((e) => {
        if (!vivo) return
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los reportes')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [clave, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(() => {
    cache.delete(clave)
    setNonce((n) => n + 1)
  }, [clave])

  return { datos, cargando, error, recargar }
}

export function useReportesPublicos(): UsoReportes {
  return useReportes('publicos', () => cargar('/api/reportes'))
}

export function useReportesAdmin(): UsoReportes {
  return useReportes('admin', () => cargar('/api/admin/reportes'))
}

export function useMisReportes(): UsoReportes {
  return useReportes('mios', () => cargar('/api/reportes/mios'))
}
