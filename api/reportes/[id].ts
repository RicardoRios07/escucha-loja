/** DELETE /api/reportes?id= — elimina un reporte propio (o cualquiera si admin). */
import { currentUser, db, rowsOf, type ApiReq, type ApiRes } from '../_lib'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'DELETE') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    const q = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
    if (!q) {
      res.status(400).json({ error: 'Falta id.' })
      return
    }
    const borrados = rowsOf<{ id: string }>(
      await db().query(
        `delete from reportes where id = $1 and ($2 = 'admin' or user_id = $3) returning id`,
        [q, me.rol, me.id],
      ),
    )
    if (borrados.length === 0) {
      res.status(404).json({ error: 'Reporte no encontrado.' })
      return
    }
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
