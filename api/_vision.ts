/**
 * api/_vision.ts — detección y bloqueo de imágenes generadas por IA / gore.
 *
 * Dos capas (guía "Detección y bloqueo de imágenes generadas por IA"):
 *  1. Firmas de metadatos/marcas de agua IA en los primeros 2000 bytes (siempre activa).
 *  2. Google Cloud Vision vía REST (SAFE_SEARCH + LABEL + WEB), solo si hay API key.
 *
 * En este stack el navegador sube directo al Blob y el servidor nunca tiene el
 * buffer, así que este módulo descarga cada foto desde su URL propia y la analiza.
 *
 * Fail-open (guía §10): si la descarga o Vision fallan/expiran, solo se loguea y
 * las fotos pasan. Los rechazos IA/gore son duros y se propagan con mensaje 422.
 */

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate'

const KEY = process.env.GOOGLE_VISION_API_KEY || process.env.VISION_API_KEY
const VISION_TIMEOUT_MS = 15000
const FETCH_TIMEOUT_MS = 10_000
const MAX_BYTES_VISION = 15 * 1024 * 1024

// ---------- Capa 1: firmas de metadatos (guía §2, §7) ----------
const FIRMAS_IA = [
  'chatgpt', 'dall-e', 'midjourney', 'stable diffusion', 'c2pa', 'comfyui',
]

/** Busca marcas de metadatos IA en los primeros 2000 bytes. */
function detectarFirmaMetadatosIA(buffer: Buffer): string | null {
  const header = buffer.toString('utf8', 0, 2000).toLowerCase()
  return FIRMAS_IA.find((firma) => header.includes(firma)) ?? null
}

// ---------- Capa 2: Google Vision (guía §2, §7, §11) ----------
const DOMINIOS_IA = [
  'midjourney.com', 'openai.com', 'civitai.com', 'stability.ai',
  'nightcafe.studio', 'bing.com/create',
]

const CATEGORIAS_PROHIBIDAS = [
  'clip art', 'illustration', 'animated cartoon', 'artwork', 'drawing',
  'graphics', 'digital art', 'artificial intelligence', 'cgi', 'cg artwork',
  'generated image', 'deepfake', 'synthetic photo', '3d render',
  'graphic design', 'poster', 'fictional character', 'vector', 'novelty',
  'animation', 'font', 'logo',
]

const mensajeRechazo = (nombre: string): string =>
  `El archivo "${nombre}" fue rechazado: se detectó una ilustración, diseño gráfico o imagen generada por IA. Por favor sube una fotografía real.`

interface SafeSearchResp {
  adult?: string
  violence?: string
  racy?: string
  spoof?: string
}
interface LabelResp {
  description?: string
  score?: number
}
interface PageResp {
  url?: string
}
interface ImageResp {
  safeSearchAnnotation?: SafeSearchResp | null
  labelAnnotations?: LabelResp[]
  webDetection?: { pagesWithMatchingImages?: PageResp[] } | null
  error?: { message?: string }
}

/** Nombre de archivo desde la URL del blob. */
const nombreDe = (url: string): string => {
  try {
    return new URL(url).pathname.split('/').pop() ?? url
  } catch {
    return url
  }
}

/** Descarga la foto (con timeout y guardia de tamaño para Vision). */
async function descargar(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { range: 'bytes=0-15000000' },
    })
    if (!res.ok) return null
    const len = Number(res.headers.get('content-length') ?? '') || 0
    if (len > MAX_BYTES_VISION) {
      // Solo cabecera: firma de metadatos es viable, Vision se omite (fail-open).
      const cabecera = await res.arrayBuffer()
      return Buffer.from(cabecera.slice(0, 2000))
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > MAX_BYTES_VISION ? null : buf
  } catch {
    return null
  }
}

/** Llama a Vision en un solo batch (una request por foto). */
async function analizarVision(fotos: { url: string; content: Buffer }[]): Promise<ImageResp[]> {
  if (!KEY) return []
  const requests = fotos.map((f) => ({
    image: { content: f.content.toString('base64') },
    features: [
      { type: 'SAFE_SEARCH_DETECTION' },
      { type: 'LABEL_DETECTION' },
      { type: 'WEB_DETECTION' },
    ],
  }))
  const res = await fetch(`${VISION_URL}?key=${encodeURIComponent(KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Google Vision respondió ${res.status}`)
  const d = (await res.json()) as { responses?: ImageResp[] }
  return d.responses ?? []
}

/**
 * Valida fotos ya subidas al Blob (URLs tuyas). Lanza Error si alguna es rechazada.
 * Fail-open: errores de Vision/descarga no bloquean (guía §10).
 */
export async function validarFotosIA(fotos: { url: string }[]): Promise<void> {
  if (fotos.length === 0) return

  // Capa 1 — firmas de metadatos (rechazo duro).
  for (const foto of fotos) {
    const buf = await descargar(foto.url)
    if (!buf) continue
    const firma = detectarFirmaMetadatosIA(buf)
    if (firma) {
      throw new Error(
        `El archivo "${nombreDe(foto.url)}" fue rechazado: contiene metadatos o marcas de agua de Inteligencia Artificial.`,
      )
    }
  }

  // Capa 2 — Google Vision (solo si hay key y hay buffer completo).
  if (!KEY) return
  const completas: { url: string; content: Buffer }[] = []
  for (const foto of fotos) {
    const buf = await descargar(foto.url)
    if (!buf || buf.length <= 2000) continue // cabecera → no analizable por Vision
    completas.push({ url: foto.url, content: buf })
  }
  if (completas.length === 0) return

  try {
    const respuestas = await analizarVision(completas)
    respuestas.forEach((r, i) => {
      const nombre = nombreDe(completas[i]?.url ?? '')

      if (r.error?.message) throw new Error(r.error.message)

      // 2a) Gore/NSFW (SafeSearch): adult/violencia LIKELY+, racy VERY_LIKELY.
      const s = r.safeSearchAnnotation ?? {}
      const lvl = (v: string | undefined) => v ?? ''
      const esPornoOGore =
        ['LIKELY', 'VERY_LIKELY'].includes(lvl(s.adult)) ||
        ['LIKELY', 'VERY_LIKELY'].includes(lvl(s.violence)) ||
        lvl(s.racy) === 'VERY_LIKELY'
      if (esPornoOGore) {
        throw new Error(
          `El archivo "${nombre}" contiene material no permitido (contenido explícito o violencia).`,
        )
      }

      // 2b) Spoof (ilustración / diseño / IA).
      if (['LIKELY', 'VERY_LIKELY'].includes(lvl(s.spoof))) {
        throw new Error(mensajeRechazo(nombre))
      }

      // 2c) Páginas web con imágenes coincidentes en dominios de generadores IA.
      const paginas = r.webDetection?.pagesWithMatchingImages ?? []
      const enSitiosIA = paginas.some((p) =>
        DOMINIOS_IA.some((d) => p.url?.toLowerCase().includes(d)),
      )
      if (enSitiosIA) throw new Error(mensajeRechazo(nombre))

      // 2d) Etiquetas de arte/IA con score > 0.45.
      const labels = r.labelAnnotations ?? []
      const esArteOIA = labels.some(
        (label) =>
          label.description &&
          CATEGORIAS_PROHIBIDAS.some((cat) => label.description!.toLowerCase().includes(cat)) &&
          (label.score ?? 0) > 0.45,
      )
      if (esArteOIA) throw new Error(mensajeRechazo(nombre))
    })
  } catch (err) {
    // Fail-open (guía §10): solo los rechazos duros bloquean. Los errores de
    // infraestructura (Vision caído, key inválida, timeouts) se loguean y las
    // fotos pasan: nunca se muestra al vecino un mensaje técnico.
    const msg = err instanceof Error ? err.message : String(err)
    const esRechazo = /rechazado|no permitido/.test(msg)
    if (!esRechazo) console.error('validación de imagen con Google Vision (fail-open):', msg)
    if (esRechazo) throw err
  }
}
