/** GET /api/auth/config — ¿está configurado Google OAuth? (para el botón de login) */
import type { ApiReq, ApiRes } from '../_lib'

export default async function handler(_req: ApiReq, res: ApiRes) {
  res.status(200).json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  })
}
