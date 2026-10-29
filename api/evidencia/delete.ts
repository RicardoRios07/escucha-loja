/**
 * POST /api/evidencia/delete — borra una evidencia local huérfana.
 * Solo el dueño del reporte (o una evidencia aún sin reporte) puede borrarla.
 * Body: { url: "/api/evidencia/archivo/<archivo>" }
 */
import { currentUser, db, rateOkDb, rowsOf, type ApiReq, type ApiRes } from '../_lib.js'
import { borrarEvidencia, esUrlEvidenciaLocal } from '../_media.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    if (!(await rateOkDb(req, 'evidencia-delete', 60))) {
      res.status(429).json({ error: 'Demasiadas solicitudes, intenta en un minuto.' })
      return
    }
    const body = (req.body ?? {}) as { url?: unknown }
    if (typeof body.url !== 'string' || !esUrlEvidenciaLocal(body.url)) {
      res.status(400).json({ error: 'URL inválida.' })
      return
    }
    const duenos = rowsOf<{ user_id: string }>(
      await db().query(
        `select r.user_id from evidencias e join reportes r on r.id = e.reporte_id where e.storage_url = $1`,
        [body.url],
      ),
    )
    if (duenos.some((d) => d.user_id !== me.id)) {
      res.status(403).json({ error: 'No puedes borrar evidencia de otro reporte.' })
      return
    }
    await borrarEvidencia(body.url)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
