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

// ---------- Capa 1: firmas de metadatos ----------
const FIRMAS_IA = [
  // Solo identificadores largos y distintivos de generadores IA.
  // Política anti-falsos-positivos (incidente prod 2026-09-28: 'mage' ⊂
  // 'image' y 'fal' ⊂ 'false'/'flash' bloqueaban el ~100% de fotos reales
  // de celular con EXIF): prohibidas firmas de ≤4 caracteres y palabras
  // que sean subcadenas de inglés común o de tags EXIF/XMP
  // (ImageWidth, Flash, False, Model...). Editores/retocadores (Canva,
  // Photoshop, Topaz, upscalers) NO bloquean: editar ≠ generar.
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

/** Busca marcas de metadatos IA en los primeros 2000 bytes. */
function detectarFirmaMetadatosIA(buffer: Buffer): string | null {
  const header = buffer.toString('utf8', 0, 2000).toLowerCase()
  return FIRMAS_IA.find((firma) => header.includes(firma)) ?? null
}

// ---------- Capa 2: Google Vision (guía §2, §7, §11) ----------
const DOMINIOS_IA = [
  'midjourney.com', 'openai.com', 'civitai.com', 'stability.ai',
  'nightcafe.studio', 'bing.com/create',
  'gemini.google.com', 'bard.google.com', 'claude.ai', 'anthropic.com',
  'perplexity.ai', 'perplexity.com',
  'leonardo.ai', 'runwayml.com', 'pika.art', 'sora.openai.com',
  'firefly.adobe.com', 'canva.com', 'designer.microsoft.com',
  'huggingface.co', 'replicate.com', 'fal.ai', 'ideogram.ai',
  'playgroundai.com', 'starryai.com', 'wombo.art', 'lensa.app',
  'artbreeder.com', 'deepai.org', 'craiyon.com', 'hotpot.ai',
  'fotor.com', 'cutout.pro', 'photoroom.com', 'remove.bg',
  'upscale.media', 'bigjpg.com', 'waifu2x.udp.jp', 'topazlabs.com',
  'magnific.ai', 'krea.ai', 'everart.ai', 'getimg.ai',
  'mage.space', 'neural.love', 'artflow.ai', 'dreamstudio.ai',
  'openjourney.com', 'anything-v.com',
]

const CATEGORIAS_PROHIBIDAS = [
  // Solo etiquetas explícitas de contenido sintético (incidente prod
  // 2026-09-28: 'font', 'logo', 'poster', 'graphics', 'illustration' y
  // 'artwork' a 0.45 marcaban fotos reales de calles con letreros o murales;
  // una foto DE un mural no es una imagen generada por IA).
  'artificial intelligence',
  'generated image', 'deepfake', 'synthetic photo',
  'clip art', 'animated cartoon',
  'cgi', 'cg artwork', '3d render',
  'fictional character', 'digital art',
]

/** Umbral de etiquetas IA: alto para no marcar fotos reales con letreros. */
const UMBRAL_LABEL_IA = 0.75

const MENSAJE_RECHAZO = 'Imagen/Video rechazado: no cumple las normas de contenido. Por favor, intenta con otra.'

/** Nombre de archivo desde la URL del blob (solo para logs, sin PII). */
function nombreArchivo(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() ?? '?'
  } catch {
    return '?'
  }
}

interface SafeSearchResp {
  adult?: string
  violence?: string
  racy?: string
  spoof?: string
  /** Solo se evalúa para fotogramas de vídeo (sangre; guía vídeos §A). */
  medical?: string
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
export async function validarFotosIA(fotos: { url: string; origen?: 'foto' | 'video' }[]): Promise<void> {
  if (fotos.length === 0) return

  // Capa 1 — firmas de metadatos (rechazo duro, aplica igual a fotogramas de vídeo).
  for (const foto of fotos) {
    const buf = await descargar(foto.url)
    if (!buf) continue
    const firma = detectarFirmaMetadatosIA(buf)
    if (firma) {
      console.warn(`[vision] rechazo capa1 firma="${firma}" archivo="${nombreArchivo(foto.url)}" origen="${foto.origen ?? 'foto'}"`)
      throw new Error(MENSAJE_RECHAZO)
    }
  }

  // Capa 2 — Google Vision (solo si hay key y hay buffer completo).
  if (!KEY) return
  const completas: { url: string; content: Buffer; origen: 'foto' | 'video' }[] = []
  for (const foto of fotos) {
    const buf = await descargar(foto.url)
    if (!buf || buf.length <= 2000) continue // cabecera → no analizable por Vision
    completas.push({ url: foto.url, content: buf, origen: foto.origen })
  }
  if (completas.length === 0) return

  try {
    const respuestas = await analizarVision(completas)
    respuestas.forEach((r, i) => {
      if (r.error?.message) throw new Error(r.error.message)

      // 2a) Gore/NSFW (SafeSearch): adult/violencia LIKELY+, racy VERY_LIKELY.
      //     Para fotogramas de vídeo se evalúa además `medical` (sangre, guía vídeos §A).
      const s = r.safeSearchAnnotation ?? {}
      const lvl = (v: string | undefined) => v ?? ''
      const esPornoOGore =
        ['LIKELY', 'VERY_LIKELY'].includes(lvl(s.adult)) ||
        ['LIKELY', 'VERY_LIKELY'].includes(lvl(s.violence)) ||
        lvl(s.racy) === 'VERY_LIKELY'
      if (esPornoOGore) {
        console.warn(`[vision] rechazo gore/nsfw archivo="${nombreArchivo(completas[i]?.url ?? '')}" adult="${lvl(s.adult)}" violence="${lvl(s.violence)}" racy="${lvl(s.racy)}"`)
        throw new Error(MENSAJE_RECHAZO)
      }
      if (
        completas[i]?.origen === 'video' &&
        ['LIKELY', 'VERY_LIKELY'].includes(lvl(s.medical))
      ) {
        console.warn(`[vision] rechazo medical(video) archivo="${nombreArchivo(completas[i]?.url ?? '')}" medical="${lvl(s.medical)}"`)
        throw new Error(MENSAJE_RECHAZO)
      }

      // 2b) Spoof (ilustración / diseño / IA).
      if (['LIKELY', 'VERY_LIKELY'].includes(lvl(s.spoof))) {
        console.warn(`[vision] rechazo spoof archivo="${nombreArchivo(completas[i]?.url ?? '')}" spoof="${lvl(s.spoof)}"`)
        throw new Error(MENSAJE_RECHAZO)
      }

      // 2c) Páginas web con imágenes coincidentes en dominios de generadores IA.
      const paginas = r.webDetection?.pagesWithMatchingImages ?? []
      const paginaIA = paginas.find((p) =>
        DOMINIOS_IA.some((d) => p.url?.toLowerCase().includes(d)),
      )
      if (paginaIA) {
        console.warn(`[vision] rechazo web-ia archivo="${nombreArchivo(completas[i]?.url ?? '')}" pagina="${paginaIA.url}"`)
        throw new Error(MENSAJE_RECHAZO)
      }

      // 2d) Etiquetas explícitas de contenido sintético con score alto.
      const labels = r.labelAnnotations ?? []
      const labelIA = labels.find(
        (label) =>
          label.description &&
          CATEGORIAS_PROHIBIDAS.some((cat) => label.description!.toLowerCase().includes(cat)) &&
          (label.score ?? 0) > UMBRAL_LABEL_IA,
      )
      if (labelIA) {
        console.warn(`[vision] rechazo label-ia archivo="${nombreArchivo(completas[i]?.url ?? '')}" label="${labelIA.description}" score="${labelIA.score}"`)
        throw new Error(MENSAJE_RECHAZO)
      }
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
