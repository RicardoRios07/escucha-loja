/**
 * /api/reportes — reportes ciudadanos.
 * GET: lista pública (sin user_id ni direcciones exactas). ?limit= (def. 500, máx. 2000)
 * POST: crea un reporte (requiere sesión Google con onboarding completo).
 */
import {
  CANTON_BBOX,
  CATEGORIAS_FIJAS,
  cargarEvidencia,
  currentUser,
  db,
  esUrlBlobPropia,
  FRECUENCIAS,
  GRAVEDADES,
  rowsOf,
  TIEMPOS,
  type ApiReq,
  type ApiRes,
  type EvidenciaApi,
} from './_lib'

export interface PublicRow {
  id: string
  categoria_code: string
  categoria_label: string
  descripcion: string
  lat: number
  lng: number
  parroquia_id: string | null
  barrio_id: string | null
  gravedad: string
  frecuencia: string
  tiempo_problema: string
  afecta_movilidad: boolean
  afecta_salud: boolean
  evidencia: EvidenciaApi[]
  created_at: string
}

export interface MiRow extends PublicRow {
  direccion_principal: string
  calle_secundaria: string
  referencia: string
  estado: string
}

const PUBLIC_COLS = `r.id, r.categoria_code, c.label as categoria_label, r.descripcion,
  r.lat, r.lng, r.parroquia_id, r.barrio_id, r.gravedad, r.frecuencia,
  r.tiempo_problema, r.afecta_movilidad, r.afecta_salud, r.created_at`

async function lista(limite: number): Promise<PublicRow[]> {
  const rows = rowsOf<Omit<PublicRow, 'evidencia'>>(
    await db().query(
      `select ${PUBLIC_COLS} from reportes r
       join categorias c on c.code = r.categoria_code
       order by r.created_at desc limit $1`,
      [limite],
    ),
  )
  const ev = await cargarEvidencia(rows.map((r) => r.id))
  return rows.map((r) => ({ ...r, evidencia: ev[r.id] ?? [] }))
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    const method = (req.method || 'GET').toUpperCase()
    if (method === 'GET') {
      const qv = (k: string) => {
        const v = req.query[k]
        return Array.isArray(v) ? v[0] : v
      }
      // ?mios=1: reportes propios (con direcciones y estado).
      if (qv('mios') === '1') {
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
        return
      }
      const limite = Math.min(2000, Math.max(1, parseInt(qv('limit') || '500', 10) || 500))
      res.status(200).json({ reportes: await lista(limite) })
      return
    }
    if (method === 'POST') {
      const me = await currentUser(req)
      if (!me) {
        res.status(401).json({ error: 'Sin sesión' })
        return
      }
      if (me.onboardingRequired) {
        res.status(403).json({ error: 'Completa tu celular y términos en /bienvenida.' })
        return
      }
      const b = (req.body ?? {}) as Record<string, unknown>
      const cat = CATEGORIAS_FIJAS[typeof b.categoria_code === 'string' ? b.categoria_code : '']
      if (!cat) {
        res.status(400).json({ error: 'Categoría inválida.' })
        return
      }
      const descripcion = str(b.descripcion, 2000)
      if (!descripcion) {
        res.status(400).json({ error: 'Describe lo sucedido.' })
        return
      }
      const lat = Number(b.lat)
      const lng = Number(b.lng)
      if (
        !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lng < CANTON_BBOX.w || lng > CANTON_BBOX.e ||
        lat < CANTON_BBOX.s || lat > CANTON_BBOX.n
      ) {
        res.status(400).json({ error: 'Ubicación fuera del cantón Loja.' })
        return
      }
      const gravedad = typeof b.gravedad === 'string' && (GRAVEDADES as readonly string[]).includes(b.gravedad) ? b.gravedad : 'Media'
      const frecuencia = typeof b.frecuencia === 'string' && (FRECUENCIAS as readonly string[]).includes(b.frecuencia) ? b.frecuencia : 'Semanal'
      const tiempo = typeof b.tiempo_problema === 'string' && (TIEMPOS as readonly string[]).includes(b.tiempo_problema) ? b.tiempo_problema : '1-4 semanas'
      const bool = (v: unknown) => v === true
      const parroquiaId = str(b.parroquia_id, 80)
      const barrioId = str(b.barrio_id, 120)

      // Evidencia ya subida al Blob (el navegador sube directo vía token).
      const evIn = Array.isArray(b.evidencia) ? b.evidencia.slice(0, 3) : []
      const evOk: { url: string; kind: 'foto' | 'video'; duracion_s: number | null }[] = []
      for (const e of evIn) {
        const o = e as { url?: unknown; kind?: unknown; duracion_s?: unknown }
        if (typeof o.url !== 'string' || !esUrlBlobPropia(o.url)) continue
        if (o.kind !== 'foto' && o.kind !== 'video') continue
        const dur = typeof o.duracion_s === 'number' && Number.isFinite(o.duracion_s) ? Math.round(o.duracion_s) : null
        evOk.push({ url: o.url.slice(0, 500), kind: o.kind, duracion_s: dur })
      }

      // Antispam simple: 50/día por usuario.
      const ya = rowsOf<{ n: number }>(
        await db().query(
          `select count(*)::int as n from reportes
           where user_id = $1 and created_at > now() - interval '1 day'`,
          [me.id],
        ),
      )
      if ((ya[0]?.n ?? 0) >= 50) {
        res.status(429).json({ error: 'Límite diario de reportes alcanzado.' })
        return
      }

      const creados = rowsOf<{ id: string }>(
        await db().query(
          `insert into reportes
             (user_id, categoria_code, descripcion, lat, lng,
              geom, parroquia_id, barrio_id, gravedad, frecuencia, tiempo_problema,
              afecta_movilidad, afecta_salud, ya_reportado_municipio,
              direccion_principal, calle_secundaria, referencia)
           values ($1,$2,$3,$4,$5, ST_SetSRID(ST_MakePoint($5,$4),4326)::geography,
                   $6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           returning id`,
          [
            me.id, typeof b.categoria_code === 'string' ? b.categoria_code : 'agua', descripcion,
            lat, lng, parroquiaId, barrioId, gravedad, frecuencia, tiempo,
            bool(b.afecta_movilidad), bool(b.afecta_salud), bool(b.ya_reportado_municipio),
            str(b.direccion_principal, 200) ?? '', str(b.calle_secundaria, 200) ?? '',
            str(b.referencia, 300) ?? '',
          ],
        ),
      )
      const nuevoId = creados[0]?.id
      if (!nuevoId) throw new Error('No se pudo crear el reporte')
      for (const e of evOk) {
        await db().query(
          'insert into evidencias (reporte_id, kind, storage_url, duracion_s) values ($1,$2,$3,$4)',
          [nuevoId, e.kind, e.url, e.duracion_s],
        )
      }
      const pub = (await lista(2000)).find((r) => r.id === nuevoId) ?? null
      res.status(201).json({ reporte: pub })
      return
    }
    res.status(405).json({ error: 'Método no permitido' })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error interno' })
  }
}
