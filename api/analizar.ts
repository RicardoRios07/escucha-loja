import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { currentUser, rateOkDb, type ApiReq } from './_lib.js'

/**
 * Endpoint serverless (Vercel) que llama al proveedor de IA (OpenCode Zen /
 * DeepSeek, ambos OpenAI-compatible). Configuración por variables de entorno:
 *   AI_API_KEY   — obligatoria, solo existe aquí en el servidor
 *   AI_BASE_URL  — por defecto https://opencode.ai/zen/v1
 *   AI_MODEL     — por defecto deepseek-v4-flash-free
 * Nunca se expone la key al frontend.
 */

interface VercelRes extends ServerResponse {
  status(code: number): VercelRes
  json(payload: unknown): void
}

const SYSTEM_PROMPT = `Eres el analista jefe de datos del municipio de Loja, Ecuador, y redactas el PANEL ÚNICO de análisis ciudadano en español para los funcionarios municipales.

Recibes métricas REALES y agregadas de la base de denuncias ciudadanas, ya procesadas por un motor heurístico local (scores 0-100, clusters por cercanía, tendencias). NO inventes cifras: usa exclusivamente los datos del payload y conserva los números que aparecen en él.

Tu tarea: redactar LA LECTURA ÚNICA de la ciudad en lenguaje natural, unificando, priorizando y recomendando acciones según los datos reales. Debes cubrir 7 bloques:

1. "queEstaPasando": 2-3 frases cortas con el panorama general (total de aportes, variación semanal, categorías que concentran casos, casos críticos y dónde se ubican).
2. "observacionPrincipal": 1 frase con el hallazgo más relevante del periodo.
3. "tendenciasYPatrones": 2-3 patrones concretos y basados en datos (crecimiento/descenso semanal, impacto en salud/movilidad, reincidencia de "yaReportado", racha de días).
4. "prioridadSector": 1-2 frases indicando qué sector exige atención inmediata y con qué gravedad/casos, apoyándote en "prioridades" (sectorAprox, casos, gravedad, scoreMaximo, categoriaPrincipal).
5. "recomendaciones": entre 1 y 4 acciones concretas PRIORIZADAS por urgencia real (usa casos, gravedad, scoreMaximo y categorías). Si un mismo sectorAprox aparece en varias prioridades con categorías distintas, UNIFÍCALO en una sola recomendación integral en vez de listarlas por separado.
6. "enfoqueUrgente": 1-2 frases sobre dónde concentrar la intervención primero y por qué.
7. PRUDENCIA ESTADÍSTICA: si "totalAportes" o "aportes7dias" es menor a 30, llena "advertenciaEstadistica" explicando que la muestra es pequeña y que un porcentaje grande de variación no debe leerse como tendencia consolidada todavía. Si no hay nada delicado, déjalo en null.

Redacción: directa, ejecutiva, sin muletillas de IA. Usa los nombres exactos de sector y categoría que aparecen en el payload.

Responde ÚNICAMENTE con este JSON, sin texto adicional ni markdown:
{
  "queEstaPasando": string[],
  "observacionPrincipal": string,
  "tendenciasYPatrones": string[],
  "prioridadSector": string,
  "recomendaciones": [{ "texto": string, "sector": string, "categoria": string, "impacto": "Alta" | "Media" | "Baja" }],
  "enfoqueUrgente": string,
  "advertenciaEstadistica": string | null,
  "notaHonesta": string | null
}`

const MAX_BODY = 256 * 1024 // 256 KB: el payload son métricas agregadas, nunca más.

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    let data = ''
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('body-muy-grande'))
        try {
          req.destroy()
        } catch {
          /* noop */
        }
        return
      }
      data += c.toString()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** Extrae el primer JSON válido aunque el modelo añada texto o fences de markdown. */
function extraerJson(texto: string): unknown {
  const sinFences = texto.replace(/```(?:json)?/gi, '').trim()
  const inicio = sinFences.indexOf('{')
  const fin = sinFences.lastIndexOf('}')
  if (inicio === -1 || fin === -1 || fin <= inicio) {
    throw new Error('El modelo no devolvió un JSON válido')
  }
  return JSON.parse(sinFences.slice(inicio, fin + 1))
}

interface RecomendacionRaw {
  texto: string
  sector: string
  categoria: string
  impacto: 'Alta' | 'Media' | 'Baja'
}

interface LecturaRaw {
  queEstaPasando: string[]
  observacionPrincipal: string
  tendenciasYPatrones: string[]
  prioridadSector: string
  recomendaciones: RecomendacionRaw[]
  enfoqueUrgente: string
  advertenciaEstadistica: string | null
  notaHonesta: string | null
}

function nstr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function impactoDe(v: unknown): 'Alta' | 'Media' | 'Baja' {
  return v === 'Alta' || v === 'Media' || v === 'Baja' ? v : 'Media'
}

/** Garantiza el shape esperado aunque el modelo envíe campos raros o nulos. */
function sanearInsights(raw: unknown): LecturaRaw {
  const obj = (raw ?? {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
      : []
  const recomendaciones = Array.isArray(obj.recomendaciones)
    ? (obj.recomendaciones as unknown[])
        .map((r) => {
          const it = (r ?? {}) as Record<string, unknown>
          return {
            texto: nstr(it.texto) ?? '',
            sector: nstr(it.sector) ?? '',
            categoria: nstr(it.categoria) ?? '',
            impacto: impactoDe(it.impacto),
          } satisfies RecomendacionRaw
        })
        .filter((r) => r.texto !== '')
    : []
  return {
    queEstaPasando: arr(obj.queEstaPasando),
    observacionPrincipal: nstr(obj.observacionPrincipal) ?? '',
    tendenciasYPatrones: arr(obj.tendenciasYPatrones),
    prioridadSector: nstr(obj.prioridadSector) ?? '',
    recomendaciones,
    enfoqueUrgente: nstr(obj.enfoqueUrgente) ?? '',
    advertenciaEstadistica: nstr(obj.advertenciaEstadistica),
    notaHonesta: nstr(obj.notaHonesta),
  }
}

export default async function handler(req: IncomingMessage, res: VercelRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' })
    return
  }

  // Solo administradores con sesión (el panel de Análisis es el único cliente).
  // IA_SIN_AUTH=1 reserva el uso sin sesión al script local scripts/serve-ia.mjs.
  if (process.env.IA_SIN_AUTH !== '1') {
    const apiReq = { method: req.method, headers: req.headers as ApiReq['headers'], query: {} } as ApiReq
    let admin = false
    try {
      const me = await currentUser(apiReq)
      admin = !!me && me.rol === 'admin'
      if (admin && !(await rateOkDb(apiReq, 'analizar', 20))) {
        res.status(429).json({ error: 'demasiadas-solicitudes' })
        return
      }
    } catch {
      res.status(503).json({ error: 'no-disponible' })
      return
    }
    if (!admin) {
      res.status(403).json({ error: 'solo-admin' })
      return
    }
  }

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'no-key' })
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(await readBody(req))
  } catch (e) {
    if (e instanceof Error && e.message === 'body-muy-grande') {
      res.status(413).json({ error: 'body-muy-grande' })
      return
    }
    res.status(400).json({ error: 'bad-json' })
    return
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.AI_BASE_URL || 'https://opencode.ai/zen/v1',
    })

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || 'deepseek-v4-flash-free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      max_tokens: 3000,
      temperature: 0.2,
    })

    const texto = completion.choices?.[0]?.message?.content ?? ''
    res.status(200).json(sanearInsights(extraerJson(texto)))
  } catch {
    // Sin detalle: no exponer errores del proveedor (keys, cuota, modelo).
    res.status(502).json({ error: 'ia-fallida' })
  }
}