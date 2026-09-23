/**
 * GET /api/auth/google/callback — Google redirige aquí con ?code=&state=.
 * Valida state, canjea el código, crea/actualiza el usuario, firma la
 * sesión (cookie httpOnly) y redirige a /bienvenida (que reenvía si ya
 * completó el onboarding).
 */
import {
  baseUrl,
  clearSessionCookie,
  db,
  exchangeCode,
  isSecure,
  rateOk,
  readCookies,
  rowsOf,
  sessionCookie,
  signSession,
  type ApiReq,
  type ApiRes,
} from '../../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  const fail = (msg: string) =>
    res.redirect(302, `${baseUrl(req)}/ingresar?error=${encodeURIComponent(msg)}`)
  try {
    if (!rateOk(req, 'oauth-callback', 30, 60_000)) {
      fail('Demasiados intentos. Espera un minuto.')
      return
    }
    const q = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined
    const code = q(req.query.code)
    const state = q(req.query.state)
    const cookies = readCookies(req)
    if (!code || !state || !cookies.elj_oauth_state || state !== cookies.elj_oauth_state) {
      fail('Sesión de Google inválida o expirada. Intenta de nuevo.')
      return
    }
    const { sub, email, nombre } = await exchangeCode(req, code)
    // 1) ¿google_sub ya registrado? (login habitual)
    let userId = rowsOf<{ id: string }>(
      await db().query('select id from users where google_sub = $1', [sub]),
    )[0]?.id
    if (!userId) {
      // 2) ¿email ya existe por otra vía? Vincular solo cuentas vecinas;
      // las admin sin Google entran exclusivamente por /acceso.
      const porEmail = rowsOf<{ id: string; rol: string; google_sub: string | null }>(
        await db().query('select id, rol, google_sub from users where email = $1', [email]),
      )[0]
      if (porEmail) {
        if (porEmail.rol === 'admin' && !porEmail.google_sub) {
          fail('Esta es una cuenta administrativa. Ingresa por /acceso.')
          return
        }
        userId = rowsOf<{ id: string }>(
          await db().query(
            `update users set google_sub = $1, email = $2,
              nombre = coalesce(nombre, $3) where id = $4 returning id`,
            [sub, email, nombre, porEmail.id],
          ),
        )[0]?.id
      } else {
        userId = rowsOf<{ id: string }>(
          await db().query(
            'insert into users (google_sub, email, nombre) values ($1, $2, $3) returning id',
            [sub, email, nombre],
          ),
        )[0]?.id
      }
    } else {
      await db().query(
        'update users set email = $1, nombre = coalesce(nombre, $2) where id = $3',
        [email, nombre, userId],
      )
    }
    if (!userId) throw new Error('No se pudo crear la sesión')
    const token = await signSession(userId)
    res.setHeader('Set-Cookie', [
      sessionCookie(token, isSecure(req)),
      'elj_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ])
    res.redirect(302, `${baseUrl(req)}/bienvenida`)
  } catch (e) {
    res.setHeader('Set-Cookie', clearSessionCookie())
    fail(e instanceof Error ? e.message : 'No se pudo completar el login con Google.')
  }
}
