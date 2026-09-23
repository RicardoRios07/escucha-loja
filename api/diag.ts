/** TEMPORAL diagnóstico prod — borrar después. */
import { cargarEvidencia, db, rowsOf, type ApiReq, type ApiRes } from './_lib.js'

export default async function handler(_req: ApiReq, res: ApiRes) {
  const marca: Record<string, string> = {}
  try {
    marca.inicio = 'ok'
    const a = rowsOf<{ n: number }>(await db().query('select 1 as n'))
    marca.simple = JSON.stringify(a)
    const b = rowsOf<Record<string, unknown>>(
      await db().query('select id, categoria_code from reportes limit 1'),
    )
    marca.reportes = `rows=${b.length}`
    const c = rowsOf<Record<string, unknown>>(
      await db().query(
        `select r.id, c.label as categoria_label from reportes r
         join categorias c on c.code = r.categoria_code limit 1`,
      ),
    )
    marca.join = `rows=${c.length}`
    const ids = b.map((r) => String(r.id))
    const ev = await cargarEvidencia(ids)
    marca.evidencia = `keys=${Object.keys(ev).length}`
    res.status(200).json({ marca })
  } catch (e) {
    res.status(200).json({ marca, error: e instanceof Error ? e.message : String(e) })
  }
}
