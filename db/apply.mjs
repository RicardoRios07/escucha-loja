#!/usr/bin/env node
/**
 * db/apply.mjs — aplica db/schema.sql + db/seed.sql contra Neon.
 * Usa DATABASE_URL_UNPOOLED (o DATABASE_URL) del .env local.
 *
 * Uso: node db/apply.mjs [--solo-schema]
 */
import fs from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

// .env mínimo (sin dependencias): KEY=VAL por línea, sin comillas.
// .env.local gana sobre .env (convención Vite).
for (const f of ['.env', '.env.local']) {
  const p = path.resolve(f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (/^\s*#/.test(line)) continue
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    if (f === '.env' && process.env[m[1]]) continue // el entorno real manda
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) {
  console.error('✗ Falta DATABASE_URL_UNPOOLED (o DATABASE_URL) en .env')
  process.exit(1)
}

const sql = neon(url)
const run = async (file) => {
  const q = fs.readFileSync(path.resolve('db', file), 'utf8')
  // El driver HTTP no acepta multi-statement: se parte por ';' + línea vacía.
  // (Los bodies de funciones usan $$ y no contienen ';' suelto + newline... se
  //  respeta $$ como bloque.)
  const stmts = []
  let cur = '', inDollar = false
  for (const line of q.split('\n')) {
    if (line.includes('$$')) inDollar = !inDollar
    cur += line + '\n'
    if (!inDollar && line.trimEnd().endsWith(';')) { stmts.push(cur); cur = '' }
  }
  if (cur.trim()) stmts.push(cur)
  for (const s of stmts) {
    if (!s.trim() || s.trim().startsWith('--') && !s.includes('\n')) continue
    await sql.query(s)
  }
  console.log(`✓ ${file} (${stmts.length} statements)`)
}

await run('schema.sql')
// Migraciones versionadas, en orden (idempotentes por diseño).
const migraciones = fs.readdirSync(path.resolve('db'))
  .filter((f) => /^migrate-.*\.sql$/.test(f))
  .sort()
for (const m of migraciones) await run(m)
if (!process.argv.includes('--solo-schema')) await run('seed.sql')

const usersRows = await sql.query('select count(*)::int as n from users')
const reportesRows = await sql.query('select count(*)::int as n from reportes')
const rowsOf = (r) => (Array.isArray(r) ? r : r.rows || [])
console.log(`✓ verificación: ${rowsOf(usersRows)[0]?.n ?? '?'} users, ${rowsOf(reportesRows)[0]?.n ?? '?'} reportes`)
