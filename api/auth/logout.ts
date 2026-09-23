/** POST /api/auth/logout — borra la cookie de sesión. */
import { clearSessionCookie, type ApiReq, type ApiRes } from '../_lib'

export default async function handler(req: ApiReq, res: ApiRes) {
  if ((req.method || 'GET').toUpperCase() !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }
  res.setHeader('Set-Cookie', clearSessionCookie())
  res.status(200).json({ ok: true })
}
