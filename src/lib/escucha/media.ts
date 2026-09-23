import { upload } from '@vercel/blob/client'

/** Límites de evidencia por reporte (foto o video corto, directo a la nube). */
export const MAX_MEDIA_FILES = 3
export const MAX_VIDEO_SECONDS = 10
export const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB por archivo

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-m4v']

export interface MediaRef {
  id: string
  kind: 'foto' | 'video'
  mime: string
  size: number
  /** Duración en segundos (solo video). */
  duration?: number
  createdAt: string // ISO
}

/** Un adjunto puede ser un dataURL heredado (string) o una URL remota (Vercel Blob). */
export type MediaItem = string | MediaRef | MediaRemota

export interface MediaRemota {
  remoto: true
  kind: 'foto' | 'video'
  url: string
  /** Duración en segundos (solo video). */
  duration?: number
}

export function isMediaRef(item: MediaItem): item is MediaRef {
  return typeof item !== 'string' && (item as MediaRemota).remoto !== true
}

export function isMediaRemota(item: MediaItem): item is MediaRemota {
  return typeof item !== 'string' && (item as MediaRemota).remoto === true
}

// ---------- Subida directa a la nube (sin almacenamiento local) ----------

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

/**
 * Sube un archivo validado al Blob store y devuelve su referencia remota.
 * Nada queda en el dispositivo: el navegador envía directo a la nube.
 */
export async function subirEvidencia(
  file: File,
  kind: 'foto' | 'video',
  duration?: number,
): Promise<MediaRemota> {
  const ext = EXT_POR_MIME[file.type] ?? (kind === 'foto' ? 'jpg' : 'mp4')
  const nombre = `${crypto.randomUUID()}.${ext}`
  const subida = await upload(`evidencia/${nombre}`, file, {
    access: 'public',
    handleUploadUrl: '/api/evidencia/token',
  })
  return { remoto: true, kind, url: subida.url, duration }
}

/** Hook: resuelve un MediaItem a URL usable en <img>/<video>. */
export function useMediaUrl(item: MediaItem | null | undefined): string | null {
  if (!item) return null
  if (typeof item === 'string') return item
  if (isMediaRemota(item)) return item.url
  return null
}

// ---------- Validación ----------

export interface MediaCheck {
  ok: boolean
  kind?: 'foto' | 'video'
  error?: string
}

export function checkMediaKind(file: File): MediaCheck {
  const mime = (file.type || '').toLowerCase()
  const name = file.name.toLowerCase()
  const isImage =
    IMAGE_MIMES.includes(mime) || /\.(jpe?g|png|webp)$/i.test(name)
  const isVideo =
    VIDEO_MIMES.includes(mime) ||
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|3gp)$/i.test(name)
  if (isImage) return { ok: true, kind: 'foto' }
  if (isVideo) return { ok: true, kind: 'video' }
  return { ok: false, error: 'Formato no soportado (usa JPG, PNG, WEBP o video MP4/WEBM)' }
}

export function getVideoDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.muted = true
    const done = (v: number) => {
      URL.revokeObjectURL(url)
      resolve(v)
    }
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la duración del video'))
    }, 8000)
    el.onloadedmetadata = () => {
      window.clearTimeout(timer)
      done(Number.isFinite(el.duration) ? el.duration : 0)
    }
    el.onerror = () => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error('Video ilegible'))
    }
    el.src = url
  })
}

/** Valida tamaño + tipo + duración (video). Devuelve kind o mensaje de error. */
export async function validateMediaFile(file: File): Promise<MediaCheck> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `Archivo muy pesado (máx ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB)` }
  }
  const kind = checkMediaKind(file)
  if (!kind.ok || !kind.kind) return kind
  if (kind.kind === 'video') {
    try {
      const d = await getVideoDuration(file)
      if (d > MAX_VIDEO_SECONDS) {
        return { ok: false, error: `El video supera los ${MAX_VIDEO_SECONDS}s (dura ${Math.round(d)}s)` }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Video ilegible' }
    }
  }
  return { ok: true, kind: kind.kind }
}
