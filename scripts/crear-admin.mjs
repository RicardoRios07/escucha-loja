#!/usr/bin/env node
/**
 * crear-admin.mjs — crea (o actualiza) la cuenta administradora sin Google.
 * La contraseña NUNCA va en el chat: se lee de ADMIN_PASSWORD del entorno.
 *
 * Uso: ADMIN_PASSWORD='...' node scripts/crear-admin.mjs administracion@jesusescucha.com
 *
 * - Hash scrypt (N=16384, r=8, p=1, sal de 16 B, clave de 64 B).
 * - google_sub queda NULL: esa cuenta solo entra por /acceso.
 * - Marca terms_version='v1' (el operador acepta al ejecutar este script).
 */
import { randomBytes, scryptSync } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
import path from 'node:path'

for (const f of ['.env', '.env.local']) {
  const p = path.resolve(f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (/^\s*#/.test(line)) continue
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const email = (process.argv[2] || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!email || !email.includes('@')) {
  console.error('Uso: ADMIN_PASSWORD=... node scripts/crear-admin.mjs <email>')
  process.exit(1)
}
if (password.length < 12) {
  console.error('✗ ADMIN_PASSWORD debe tener al menos 12 caracteres (no se creó nada).')
  process.exit(1)
}
if (!url) {
  console.error('✗ Falta DATABASE_URL_UNPOOLED en .env')
  process.exit(1)
}

const salt = randomBytes(16)
const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
const hash = `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`

const sql = neon(url)
const q = (s, p) => sql.query(s, p).then((r) => (Array.isArray(r) ? r : r.rows))
await sql.query(
  `insert into users (google_sub, email, nombre, rol, password_hash, terms_version, terms_aceptados_at)
   values (NULL, $1, 'Administrador', 'admin', $2, 'v1', now())
   on conflict (email) do update set
     rol = 'admin',
     google_sub = NULL,
     password_hash = excluded.password_hash,
     terms_version = 'v1',
     terms_aceptados_at = now()`,
  [email, hash],
)
const row = (await q('select id, email, rol from users where email = $1', [email]))[0]
console.log(`✓ admin listo: ${row.email} (rol ${row.rol}). Entra por /acceso.`)
