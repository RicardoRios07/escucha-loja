/**
 * GET /api/auth/estado — estado de auth en una sola llamada:
 * { user } (o 401 si no hay sesión) + { google } (OAuth configurado).
 */
import { currentUser, type ApiReq, type ApiRes } from '../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    const user = await currentUser(req)
    if (!user) {
      res.status(401).json({ user: null, google })
      return
    }
    res.status(200).json({ user, google })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
