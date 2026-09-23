/**
 * POST /api/evidencia/token — protocolo client-upload de Vercel Blob.
 * Requiere sesión Google con onboarding completo. Devuelve el client token
 * para que el navegador suba directo al store (evita el límite de 4.5 MB
 * de las Functions con videos de hasta 25 MB).
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { baseUrl, currentUser, type ApiReq, type ApiRes } from '../_lib'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/x-m4v',
]
const EXT = /\.(jpe?g|png|webp|mp4|webm|mov|m4v|3gp)$/i

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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(503).json({ error: 'Storage de evidencia no configurado.' })
      return
    }
    const body = req.body as HandleUploadBody
    const host =
      (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || ''
    const request = new Request(`${baseUrl(req)}/api/evidencia/token`, {
      method: 'POST',
      headers: { host, 'content-type': 'application/json' },
    })
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('evidencia/') || !EXT.test(pathname)) {
          throw new Error('Ruta de evidencia inválida.')
        }
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          tokenPayload: JSON.stringify({ userId: me.id }),
        }
      },
    })
    res.status(200).json(jsonResponse)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
