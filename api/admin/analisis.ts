/**
 * /api/admin/analisis — caché del análisis IA en Neon (un slot global).
 * GET: snapshot actual o 404. POST: guarda (upsert). Solo rol admin.
 */
import { currentUser, db, rateOkDb, rowsOf, type ApiReq, type ApiRes } from '../_lib.js'

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    const me = await currentUser(req)
    if (!me) {
      res.status(401).json({ error: 'Sin sesión' })
      return
    }
    if (me.rol !== 'admin') {
      res.status(403).json({ error: 'Solo administradores.' })
      return
    }
    const method = (req.method || 'GET').toUpperCase()
    if (method === 'GET') {
      if (!(await rateOkDb(req, 'admin-analisis', 60))) {
        res.status(429).json({ error: 'Demasiadas solicitudes, intenta en un minuto.' })
        return
      }
      const rows = rowsOf<Record<string, unknown>>(
        await db().query(
          `select version, fingerprint, aportes_count as "aportesCount",
             resultado, extract(epoch from created_at)::bigint * 1000 as timestamp
           from analisis_cache where id = 'snapshot'`,
        ),
      )
      const r = rows[0]
      if (!r) {
        res.status(404).json({ snapshot: null })
        return
      }
      res.status(200).json({
        snapshot: {
          id: 'snapshot',
          version: Number(r.version),
          timestamp: Number(r.timestamp),
          aportesCount: Number(r.aportesCount),
          fingerprint: String(r.fingerprint),
          resultado: r.resultado,
        },
      })
      return
    }
    if (method === 'POST') {
      const b = (req.body ?? {}) as {
        version?: unknown
        fingerprint?: unknown
        aportesCount?: unknown
        resultado?: unknown
      }
      if (
        typeof b.version !== 'number' ||
        typeof b.fingerprint !== 'string' ||
        typeof b.aportesCount !== 'number' ||
        typeof b.resultado !== 'object' ||
        b.resultado === null
      ) {
        res.status(400).json({ error: 'Snapshot inválido.' })
        return
      }
      // Cotas anti-bloat: fingerprint corto y resultado acotado.
      const resultadoJson = JSON.stringify(b.resultado)
      if (b.fingerprint.length > 200 || resultadoJson.length > 500_000) {
        res.status(400).json({ error: 'Snapshot demasiado grande.' })
        return
      }
      if (!(await rateOkDb(req, 'admin-analisis-post', 30))) {
        res.status(429).json({ error: 'Demasiadas solicitudes, intenta en un minuto.' })
        return
      }
      await db().query(
        `insert into analisis_cache (id, version, fingerprint, aportes_count, resultado, updated_at)
         values ('snapshot', $1, $2, $3, $4, now())
         on conflict (id) do update set
           version = excluded.version, fingerprint = excluded.fingerprint,
           aportes_count = excluded.aportes_count, resultado = excluded.resultado,
           updated_at = now()`,
        [b.version, b.fingerprint, b.aportesCount, resultadoJson],
      )
      res.status(200).json({ ok: true })
      return
    }
    res.status(405).json({ error: 'Método no permitido' })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
