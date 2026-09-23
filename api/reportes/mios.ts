/**
 * GET /api/reportes/mios — reportes del usuario en sesión (con direcciones
 * y estado; sin datos de otros usuarios).
 */
import { cargarEvidencia, currentUser, db, rowsOf, type ApiReq, type ApiRes } from '../_lib'
import type { PublicRow } from '../reportes'

export interface MiRow extends PublicRow {
  direccion_principal: string
  calle_secundaria: string
  referencia: string
  estado: string
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
    const rows = rowsOf<Omit<MiRow, 'evidencia'>>(
      await db().query(
        `select r.id, r.categoria_code, c.label as categoria_label, r.descripcion,
           r.lat, r.lng, r.parroquia_id, r.barrio_id, r.gravedad, r.frecuencia,
           r.tiempo_problema, r.afecta_movilidad, r.afecta_salud,
           r.direccion_principal, r.calle_secundaria, r.referencia,
           r.estado, r.created_at
         from reportes r join categorias c on c.code = r.categoria_code
         where r.user_id = $1 order by r.created_at desc`,
        [me.id],
      ),
    )
    const ev = await cargarEvidencia(rows.map((r) => r.id))
    res.status(200).json({ reportes: rows.map((r) => ({ ...r, evidencia: ev[r.id] ?? [] })) })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
