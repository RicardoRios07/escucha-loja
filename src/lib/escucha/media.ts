import { useEffect, useState } from 'react'

/** Límites de evidencia por reporte (Fase 2: foto o video corto). */
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

/** Un adjunto puede ser un dataURL heredado (string), una referencia a IndexedDB o una URL remota (Vercel Blob). */
export type MediaItem = string | MediaRef | MediaRemota

export interface MediaRemota {
  remoto: true
  kind: 'foto' | 'video'
  url: string
}

export function isMediaRef(item: MediaItem): item is MediaRef {
  return typeof item !== 'string' && (item as MediaRemota).remoto !== true
}

export function isMediaRemota(item: MediaItem): item is MediaRemota {
  return typeof item !== 'string' && (item as MediaRemota).remoto === true
}

// ---------- IndexedDB ----------

const DB_NAME = 'escucha-loja'
const DB_VERSION = 2
const STORE_MEDIA = 'media'
export const STORE_IA = 'ia'

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin ventana'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_IA)) {
        db.createObjectStore(STORE_IA, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error ?? new Error('No se pudo abrir la base local'))
    }
  })
  return dbPromise
}

/** Transaction genérica sobre cualquier store de la base local (media, ia, ...). */
export function idbStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        let req: IDBRequest<T>
        try {
          req = run(s)
        } catch (e) {
          reject(e)
          return
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Error de almacenamiento local'))
      }),
  )
}

interface MediaRecord {
  id: string
  blob: Blob
  meta: MediaRef
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE_MEDIA, mode)
        const store = t.objectStore(STORE_MEDIA)
        let req: IDBRequest<T>
        try {
          req = run(store)
        } catch (e) {
          reject(e)
          return
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Error de almacenamiento local'))
      }),
  )
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** Guarda un blob y devuelve su referencia (metadatos para localStorage). */
export async function putMedia(
  blob: Blob,
  kind: 'foto' | 'video',
  duration?: number,
): Promise<MediaRef> {
  const meta: MediaRef = {
    id: newId(),
    kind,
    mime: blob.type || (kind === 'foto' ? 'image/jpeg' : 'video/mp4'),
    size: blob.size,
    duration,
    createdAt: new Date().toISOString(),
  }
  try {
    await tx('readwrite', (s) => s.put({ id: meta.id, blob, meta } satisfies MediaRecord))
  } catch {
    throw new Error('No hay espacio suficiente en este dispositivo para guardar la evidencia')
  }
  return meta
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const rec = await tx<MediaRecord | undefined>('readonly', (s) => s.get(id))
    return rec?.blob ?? null
  } catch {
    return null
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* noop: mejor esfuerzo */
  }
  revokeObjectUrl(id)
}

/** Borra blobs que ya no referencia ningún reporte (higiene de cuota). */
export async function sweepMedia(keepIds: string[]): Promise<void> {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    const keep = new Set(keepIds)
    await Promise.all(
      keys.map(String).filter((k) => !keep.has(k)).map((k) => deleteMedia(k)),
    )
  } catch {
    /* noop */
  }
}

// ---------- Object URLs (caché en memoria) ----------

const urlCache = new Map<string, string>()

export async function getObjectUrlForRef(ref: MediaRef): Promise<string | null> {
  const cached = urlCache.get(ref.id)
  if (cached) return cached
  const blob = await getMediaBlob(ref.id)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(ref.id, url)
  return url
}

export function revokeObjectUrl(id: string) {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}

/** Hook: resuelve un MediaItem a URL usable en <img>/<video>. */
export function useMediaUrl(item: MediaItem | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(
    typeof item === 'string' ? item : item && isMediaRemota(item) ? item.url : null,
  )
  useEffect(() => {
    if (!item || typeof item === 'string') {
      setUrl(typeof item === 'string' ? item : null)
      return
    }
    if (isMediaRemota(item)) {
      setUrl(item.url)
      return
    }
    let alive = true
    getObjectUrlForRef(item).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [item])
  return url
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
