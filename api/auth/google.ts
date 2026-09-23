/** GET /api/auth/google — inicia el login: 302 a Google con state anti-CSRF. */
import { googleAuthUrl, rateOk, type ApiReq, type ApiRes } from '../_lib'
import { randomBytes } from 'node:crypto'

export default async function handler(_req: ApiReq, res: ApiRes) {
  try {
    if (!rateOk(_req, 'oauth-start', 20, 60_000)) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' })
      return
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(503).json({
        error: 'Google OAuth no configurado: faltan GOOGLE_CLIENT_ID/SECRET en el entorno.',
      })
      return
    }
    const state = randomBytes(16).toString('hex')
    const url = googleAuthUrl(_req, state)
    res.setHeader(
      'Set-Cookie',
      `elj_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    )
    res.redirect(302, url)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
