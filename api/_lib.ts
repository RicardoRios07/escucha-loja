/**
 * api/_lib.ts — utilidades compartidas de las Functions (auth + Neon).
 * Sin dependencias de @vercel/node: tipos mínimos propios.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import * as jose from 'jose'
import { OAuth2Client } from 'google-auth-library'

export interface ApiReq {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
  body?: unknown
  cookies?: Record<string, string>
}

export interface ApiRes {
  status: (code: number) => ApiRes
  json: (data: unknown) => void
  redirect: (code: number, url: string) => void
  setHeader: (name: string, value: string | string[]) => void
}

export interface SessionUser {
  id: string
  email: string
  nombre: string | null
  rol: 'vecino' | 'admin'
  celular: string | null
  onboardingRequired: boolean
}

const SESSION_COOKIE = 'elj_session'
export const TERMS_VERSION = 'v1'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta variable de entorno ${name}`)
  return v
}

let sqlClient: NeonQueryFunction<false, false> | null = null
export function db(): NeonQueryFunction<false, false> {
  if (!sqlClient) sqlClient = neon(env('DATABASE_URL'))
  return sqlClient
}

/** Filas de un sql.query tolerando ambas formas del driver (array | {rows}). */
export function rowsOf<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: unknown }).rows)) {
    return (r as { rows: T[] }).rows
  }
  return []
}

/** Base pública. localhost siempre gana (dev con `vercel dev` en :3000). */
export function baseUrl(req: ApiReq): string {
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    (req.headers.host as string) ||
    ''
  if (host.startsWith('localhost')) return `http://${host}`
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  return `${proto}://${host || 'localhost:3000'}`
}

function googleClient(req: ApiReq): OAuth2Client {
  return new OAuth2Client(
    env('GOOGLE_CLIENT_ID'),
    env('GOOGLE_CLIENT_SECRET'),
    `${baseUrl(req)}/api/auth/google/callback`,
  )
}

export function googleAuthUrl(req: ApiReq, state: string): string {
  return googleClient(req).generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  })
}

export async function exchangeCode(
  req: ApiReq,
  code: string,
): Promise<{ sub: string; email: string; nombre: string | null }> {
  const client = googleClient(req)
  const { tokens } = await client.getToken(code)
  if (!tokens.id_token) throw new Error('Google no devolvió id_token')
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env('GOOGLE_CLIENT_ID'),
  })
  const p = ticket.getPayload()
  if (!p?.sub || !p.email) throw new Error('ID token de Google incompleto')
  return { sub: p.sub, email: p.email, nombre: p.name ?? null }
}

export async function signSession(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env('SESSION_SECRET'))
  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(env('SESSION_SECRET'))
    const { payload } = await jose.jwtVerify(token, secret)
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function readCookies(req: ApiReq): Record<string, string> {
  if (req.cookies) return req.cookies
  const out: Record<string, string> = {}
  const header = req.headers.cookie
  const raw = Array.isArray(header) ? header.join('; ') : header || ''
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export async function currentUser(req: ApiReq): Promise<SessionUser | null> {
  const token = readCookies(req)[SESSION_COOKIE]
  if (!token) return null
  const userId = await verifySession(token)
  if (!userId) return null
  const rows = rowsOf<{
    id: string
    email: string
    nombre: string | null
    rol: 'vecino' | 'admin'
    celular: string | null
    terms_version: string | null
    google_sub: string | null
  }>(
    await db().query(
      'select id, email, nombre, rol, celular, terms_version, google_sub from users where id = $1',
      [userId],
    ),
  )
  const u = rows[0]
  if (!u) return null
  // Cuentas admin sin Google (password) no pasan por onboarding: el operador
  // acepta términos al ejecutar scripts/crear-admin.mjs.
  const onboardingRequired = u.google_sub === null ? false : !u.celular || u.terms_version !== TERMS_VERSION
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    celular: u.celular,
    onboardingRequired,
  }
}

/** Normaliza celular EC a E.164 (+593…) o null si inválido. */
export function normalizarCelular(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const v = input.replace(/[\s-]/g, '')
  let m = v.match(/^09(\d{8})$/)
  if (m) return `+5939${m[1]}`
  m = v.match(/^\+5939(\d{8})$/)
  if (m) return `+5939${m[1]}`
  return null
}

export function isSecure(req: ApiReq): boolean {
  const proto = req.headers['x-forwarded-proto']
  const p = Array.isArray(proto) ? proto[0] : proto
  return p ? p === 'https' : baseUrl(req).startsWith('https')
}

/** Categorías fijas (espejo de db/categorias + front). */
export const CATEGORIAS_FIJAS: Record<string, { id: string; label: string }> = {
  agua: {
    id: 'Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial',
    label: 'Agua y Alcantarillado',
  },
  recoleccion: {
    id: 'Recolección de Desechos y Saneamiento Ambiental',
    label: 'Saneamiento ambiental',
  },
  movilidad: {
    id: 'Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc.',
    label: 'Movilidad Urbana',
  },
  servicios: {
    id: 'Servicios Ciudadanos: Trámites, Atención al Vecino y Servicios Administrativos',
    label: 'Servicios ciudadanos',
  },
}

/** Bounds cantonales (fuente: src/data/parroquias.ts CANTON_BOUNDS). */
export const CANTON_BBOX = { w: -79.5566, s: -4.5208, e: -79.0903, n: -3.6622 } as const

export const GRAVEDADES = ['Baja', 'Media', 'Alta', 'Crítica'] as const
export const FRECUENCIAS = ['Una vez', 'Semanal', 'Diario', 'Permanente'] as const
export const TIEMPOS = ['< 1 semana', '1-4 semanas', '1-6 meses', '> 6 meses'] as const

export interface EvidenciaApi {
  kind: 'foto' | 'video'
  url: string
}

/** Evidencia por reporte (un query; N chico). */
export async function cargarEvidencia(ids: string[]): Promise<Record<string, EvidenciaApi[]>> {
  const out: Record<string, EvidenciaApi[]> = {}
  if (ids.length === 0) return out
  const rows = rowsOf<{ reporte_id: string; kind: string; storage_url: string }>(
    await db().query(
      `select reporte_id, kind, storage_url from evidencias
       where reporte_id = any($1) order by created_at`,
      [ids],
    ),
  )
  for (const r of rows) {
    if (r.kind !== 'foto' && r.kind !== 'video') continue
    ;(out[r.reporte_id] ||= []).push({ kind: r.kind, url: r.storage_url })
  }
  return out
}

/** ¿URL https del Blob store propio? */
export function esUrlBlobPropia(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.public.blob.vercel-storage.com') ||
        u.hostname.endsWith('.blob.vercel-storage.com'))
    )
  } catch {
    return false
  }
}

/* ---------- rate limit en memoria (por IP, por endpoint) ---------- */

const buckets = new Map<string, { n: number; reset: number }>()

function ipDe(req: ApiReq): string {
  const fwd = req.headers['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : fwd
  return (first || '').split(',')[0].trim() || 'unknown'
}

/** Devuelve true si el intento está permitido (ventana deslizante simple). */
export function rateOk(req: ApiReq, nombre: string, max: number, ventanaMs: number): boolean {
  if (buckets.size > 5000) buckets.clear()
  const clave = `${nombre}:${ipDe(req)}`
  const ahora = Date.now()
  const b = buckets.get(clave)
  if (!b || ahora > b.reset) {
    buckets.set(clave, { n: 1, reset: ahora + ventanaMs })
    return true
  }
  b.n += 1
  return b.n <= max
}

/**
 * Rate limit persistente en Neon (global entre instancias serverless).
 * Ventanas de 1 minuto por (nombre, ip). Devuelve true si permitido.
 */
export async function rateOkDb(req: ApiReq, nombre: string, max: number): Promise<boolean> {
  const ventana = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
  const rows = rowsOf<{ intentos: number }>(
    await db().query(
      `insert into login_intentos (ip, ventana, intentos)
       values ($1, $2::timestamptz, 1)
       on conflict (ip, ventana) do update set intentos = login_intentos.intentos + 1
       returning intentos`,
      [`${nombre}:${ipDe(req)}`, ventana],
    ),
  )
  // Higiene oportunista: borra ventanas viejas (1 de cada ~20 llamadas).
  if (Math.random() < 0.05) {
    void db()
      .query(`delete from login_intentos where ventana < now() - interval '10 minutes'`)
      .catch(() => {})
  }
  return (rows[0]?.intentos ?? 1) <= max
}

/* ---------- password hashing (scrypt, sin dependencias) ---------- */

import { scryptSync, timingSafeEqual } from 'node:crypto'

export function verificarPassword(password: string, hash: string): boolean {
  try {
    const [algo, n, r, p, salHex, keyHex] = hash.split('$')
    if (algo !== 'scrypt' || !salHex || !keyHex) return false
    const key = scryptSync(password, Buffer.from(salHex, 'hex'), 64, {
      N: parseInt(n, 10),
      r: parseInt(r, 10),
      p: parseInt(p, 10),
    })
    const esperado = Buffer.from(keyHex, 'hex')
    return key.length === esperado.length && timingSafeEqual(key, esperado)
  } catch {
    return false
  }
}
