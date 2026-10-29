/**
 * POST /api/evidencia/upload — sube una foto o video al disco local.
 * Requiere sesión con onboarding completo. El cuerpo es el archivo binario y
 * el Content-Type declara el MIME real. Devuelve { url } para guardar en el
 * reporte. La validación (magic bytes + firmas IA) ocurre antes de escribir.
 */
import { currentUser, rateOkDb, type ApiReq, type ApiRes } from '../_lib.js'
import { guardarEvidencia, MAX_BYTES, tipoMedia, validarContenido } from '../_media.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    if (me.onboardingRequired) {
      res.status(403).json({ error: 'Completa tu celular y términos en /bienvenida.' })
      return
    }
    if (!(await rateOkDb(req, 'evidencia-upload', 60))) {
      res.status(429).json({ error: 'Demasiadas solicitudes, intenta en un minuto.' })
      return
    }
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'Falta el archivo.' })
      return
    }
    if (req.body.length === 0) {
      res.status(400).json({ error: 'El archivo está vacío.' })
      return
    }
    if (req.body.length > MAX_BYTES) {
      res.status(413).json({ error: 'Archivo demasiado grande (máx 25 MB).' })
      return
    }
    const mime = String(req.headers['content-type'] ?? '').toLowerCase().split(';')[0].trim()
    const kind = tipoMedia(mime)
    if (!kind) {
      res.status(415).json({ error: 'Formato no soportado (usa JPG, PNG, WEBP o video MP4/WEBM).' })
      return
    }
    try {
      validarContenido(req.body, kind, mime)
    } catch (e) {
      console.warn(`[media] rechazo tipo="${mime}" bytes=${req.body.length}`)
      const msg = e instanceof Error ? e.message : 'La evidencia no pasó la validación local.'
      res.status(422).json({ error: msg })
      return
    }
    const url = await guardarEvidencia(req.body, mime)
    res.status(201).json({ url, kind })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
