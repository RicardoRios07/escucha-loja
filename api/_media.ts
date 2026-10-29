/**
 * api/_media.ts — almacenamiento local de evidencia + validación sin servicios.
 *
 * Las fotos y videos se guardan en disco (uploads/ por defecto) y se sirven
 * desde /api/evidencia/archivo/<archivo>. La validación es 100% local:
 *  - tipo real del archivo por magic bytes;
 *  - firmas de metadatos/marcas de agua de generadores IA.
 *
 * No se llama a Google Vision ni a ningún servicio externo.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const MAX_BYTES = 25 * 1024 * 1024
export const MENSAJE_RECHAZO =
  'Imagen/Video rechazado: no cumple las normas de contenido. Por favor, intenta con otra.'

const PREFIJO_URL = '/api/evidencia/archivo/'
const DIR_EVIDENCIA = process.env.EVIDENCIA_DIR || path.resolve(process.cwd(), 'uploads')

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

const MIME_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  '3gp': 'video/3gpp',
}

// ---------- firmas de metadatos IA ----------
const FIRMAS_IA = [
  // Solo identificadores largos y distintivos de generadores IA.
  // Evita falsos positivos (incidente prod 2026-09-28: 'mage' ⊂ 'image' y
  // 'fal' ⊂ 'false'/'flash' bloqueaban fotos reales de celular con EXIF).
  // Prohibidas firmas de ≤4 caracteres y palabras que sean subcadenas de
  // inglés común o tags EXIF/XMP (ImageWidth, Flash, False, Model...).
  // Editores/retocadores (Canva, Photoshop, Topaz, upscalers) NO bloquean.
  'chatgpt', 'openai',
  'dall-e', 'dalle',
  'midjourney',
  'stable diffusion', 'stablediffusion',
  'comfyui', 'automatic1111', 'invokeai',
  'gemini', 'claude', 'anthropic', 'perplexity',
  'leonardo.ai', 'runwayml', 'nightcafe.studio',
  'starryai', 'artbreeder', 'deepai.org', 'craiyon',
  'civitai.com', 'huggingface.co', 'replicate.com', 'fal.ai',
  'ideogram.ai', 'photoroom.com',
  'neural.love', 'dreamstudio', 'stability.ai',
  'openjourney', 'realisticvision',
  'chilloutmix', 'epicrealism', 'juggernaut',
  'controlnet', 'lycoris',
  'ddim', 'dpm++',
  'negative prompt', 'cfg scale',
  'bing image creator', 'adobe firefly',
  'sora.openai.com', 'pika.art', 'designer.microsoft',
  'github.com/comfyanonymous',
]

function detectarFirmaMetadatosIA(buffer: Buffer): string | null {
  const header = buffer.toString('utf8', 0, 2000).toLowerCase()
  return FIRMAS_IA.find((firma) => header.includes(firma)) ?? null
}

// ---------- tipo real por magic bytes ----------
function esJpeg(b: Buffer): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
}

function esPng(b: Buffer): boolean {
  return (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
}

function esWebp(b: Buffer): boolean {
  return b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
}

function esMp4(b: Buffer): boolean {
  return b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp'
}

function esWebm(b: Buffer): boolean {
  return b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3
}

export function tipoMedia(mime: string): 'foto' | 'video' | null {
  const m = mime.toLowerCase().split(';')[0].trim()
  if (m.startsWith('image/')) return m in EXT_POR_MIME ? 'foto' : null
  if (m.startsWith('video/')) return m in EXT_POR_MIME ? 'video' : null
  return null
}

function coincideTipo(real: Buffer, mime: string, kind: 'foto' | 'video'): boolean {
  if (kind === 'foto') {
    if (mime === 'image/jpeg') return esJpeg(real)
    if (mime === 'image/png') return esPng(real)
    if (mime === 'image/webp') return esWebp(real)
    return false
  }
  if (mime === 'video/webm') return esWebm(real)
  // mp4 / quicktime / m4v / 3gp comparten la caja ftyp.
  return esMp4(real)
}

/** Lanza MENSAJE_RECHAZO si el archivo no es del tipo declarado o tiene marcas IA. */
export function validarContenido(buffer: Buffer, kind: 'foto' | 'video', mime: string): void {
  if (buffer.length === 0) throw new Error(MENSAJE_RECHAZO)
  if (!coincideTipo(buffer, mime, kind)) throw new Error(MENSAJE_RECHAZO)
  if (detectarFirmaMetadatosIA(buffer)) throw new Error(MENSAJE_RECHAZO)
}

// ---------- almacenamiento en disco ----------
function nombreDesdeUrl(url: string): string | null {
  try {
    const u = new URL(url, 'http://local')
    if (!u.pathname.startsWith(PREFIJO_URL)) return null
    const nombre = u.pathname.slice(PREFIJO_URL.length)
    return /^[a-f0-9-]{36}\.(jpe?g|png|webp|mp4|webm|mov|m4v|3gp)$/i.test(nombre) ? nombre : null
  } catch {
    return null
  }
}

export function esUrlEvidenciaLocal(url: string): boolean {
  return nombreDesdeUrl(url) !== null
}

export function mimeDeArchivo(nombre: string): string {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? ''
  return MIME_POR_EXT[ext] ?? 'application/octet-stream'
}

export async function guardarEvidencia(buffer: Buffer, mime: string): Promise<string> {
  const ext = EXT_POR_MIME[mime.toLowerCase().split(';')[0].trim()]
  if (!ext) throw new Error('Tipo de archivo no soportado.')
  await mkdir(DIR_EVIDENCIA, { recursive: true })
  const nombre = `${randomUUID()}.${ext}`
  await writeFile(path.join(DIR_EVIDENCIA, nombre), buffer)
  return `${PREFIJO_URL}${nombre}`
}

export async function leerEvidenciaPorNombre(nombre: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(DIR_EVIDENCIA, nombre))
  } catch {
    return null
  }
}

export async function leerEvidencia(url: string): Promise<Buffer | null> {
  const nombre = nombreDesdeUrl(url)
  return nombre ? leerEvidenciaPorNombre(nombre) : null
}

export async function borrarEvidencia(url: string): Promise<void> {
  const nombre = nombreDesdeUrl(url)
  if (!nombre) return
  await unlink(path.join(DIR_EVIDENCIA, nombre)).catch(() => {})
}

export async function borrarEvidenciasLocales(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map((url) => borrarEvidencia(url)))
}

/**
 * Revalida archivos ya guardados (defensa en profundidad al crear el reporte).
 * Si el archivo no existe o no pasa el chequeo, lanza el rechazo genérico.
 */
export async function validarEvidenciaLocal(
  items: { url: string; kind: 'foto' | 'video' }[],
): Promise<void> {
  for (const item of items) {
    const buffer = await leerEvidencia(item.url)
    if (!buffer) throw new Error(MENSAJE_RECHAZO)
    const mime = mimeDeArchivo(nombreDesdeUrl(item.url) ?? '')
    validarContenido(buffer, item.kind, mime)
  }
}
