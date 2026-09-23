/**
 * POST /api/auth/admin/login — login administrativo sin Google.
 * Solo cuentas con password_hash (creadas con scripts/crear-admin.mjs).
 * Rate-limit estricto + error genérico (no revela si el email existe).
 */
import {
  db,
  rateOk,
  rateOkDb,
  rowsOf,
  sessionCookie,
  isSecure,
  signSession,
  verificarPassword,
  type ApiReq,
  type ApiRes,
} from '../../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    if (!rateOk(req, 'admin-login', 5, 60_000)) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' })
      return
    }
    // rateOk es best-effort en serverless (memoria por instancia);
    // el límite real lo impone la tabla login_intentos.
    if (!(await rateOkDb(req, 'admin-login', 5))) {
      res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' })
      return
    }
    const body = (req.body ?? {}) as { email?: unknown; password?: unknown }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const INVALIDO = 'Credenciales inválidas.'
    if (!email || !password) {
      res.status(401).json({ error: INVALIDO })
      return
    }
    const rows = rowsOf<{ id: string; password_hash: string | null; rol: string }>(
      await db().query('select id, password_hash, rol from users where email = $1', [email]),
    )
    const u = rows[0]
    if (!u?.password_hash || !verificarPassword(password, u.password_hash)) {
      res.status(401).json({ error: INVALIDO })
      return
    }
    const token = await signSession(u.id)
    res.setHeader('Set-Cookie', sessionCookie(token, isSecure(req)))
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
