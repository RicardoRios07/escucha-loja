/**
 * POST /api/auth/onboarding — primer login: guarda celular + acepta términos.
 * Body: { celular: "09…" | "+593…", terms: true }
 */
import {
  currentUser,
  db,
  normalizarCelular,
  rateOk,
  TERMS_VERSION,
  type ApiReq,
  type ApiRes,
} from '../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    if (!rateOk(req, 'onboarding', 10, 60_000)) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' })
      return
    }
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    const body = (req.body ?? {}) as { celular?: unknown; terms?: unknown }
    const celular = normalizarCelular(body.celular)
    if (!celular) {
      res.status(400).json({
        error: 'Celular inválido: usa 10 dígitos empezando con 09 (ej. 0991234567).',
      })
      return
    }
    if (body.terms !== true) {
      res.status(400).json({ error: 'Debes aceptar los términos y condiciones.' })
      return
    }
    await db().query(
      `update users set celular = $1, celular_verificado = false,
        terms_version = $2, terms_aceptados_at = now() where id = $3`,
      [celular, TERMS_VERSION, me.id],
    )
    const updated = await currentUser(req)
    res.status(200).json({ user: updated })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
