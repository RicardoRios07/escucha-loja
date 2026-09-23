/**
 * GET /api/admin/reportes — todos los reportes con direcciones y contacto
 * del autor (solo rol admin). Sin cédulas: no existen en la BD.
 */
import { cargarEvidencia, currentUser, db, rateOkDb, rowsOf, type ApiReq, type ApiRes } from '../_lib.js'
import type { MiRow } from '../reportes.js'

export interface AdminRow extends MiRow {
  autor_nombre: string | null
  autor_email: string
  autor_celular: string | null
  ya_reportado_municipio: boolean
}

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    if (me.rol !== 'admin') {
      res.status(403).json({ error: 'Solo administradores.' })
      return
    }
    if (!(await rateOkDb(req, 'admin-reportes', 60))) {
      res.status(429).json({ error: 'Demasiadas solicitudes, intenta en un minuto.' })
      return
    }
    const rows = rowsOf<Omit<AdminRow, 'evidencia'>>(
      await db().query(
        `select r.id, r.categoria_code, c.label as categoria_label, r.descripcion,
           r.lat, r.lng, r.parroquia_id, r.barrio_id, r.gravedad, r.frecuencia,
           r.tiempo_problema, r.afecta_movilidad, r.afecta_salud,
           r.ya_reportado_municipio,
           r.direccion_principal, r.calle_secundaria, r.referencia,
           r.estado, r.created_at,
           u.nombre as autor_nombre, u.email as autor_email, u.celular as autor_celular
         from reportes r
         join categorias c on c.code = r.categoria_code
         join users u on u.id = r.user_id
         order by r.created_at desc limit 2000`,
      ),
    )
    const ev = await cargarEvidencia(rows.map((r) => r.id))
    res.status(200).json({ reportes: rows.map((r) => ({ ...r, evidencia: ev[r.id] ?? [] })) })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
