/** GET /api/auth/me — sesión actual o 401. */
import { currentUser, type ApiReq, type ApiRes } from '../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    const user = await currentUser(req)
    if (!user) {
      res.status(401).json({ user: null })
      return
    }
    res.status(200).json({ user })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
