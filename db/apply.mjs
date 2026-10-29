#!/usr/bin/env node
/**
 * db/apply.mjs — aplica db/schema.sql, migraciones y db/seed.sql contra el
 * PostgreSQL local configurado en DATABASE_URL.
 *
 * Uso: node db/apply.mjs [--solo-schema]
 */
import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'
import { databaseUrl, loadEnv } from '../scripts/env.mjs'

loadEnv()

const url = databaseUrl()
if (!url) {
  console.error('✗ Falta DATABASE_URL en .env.local (ej. postgresql://localhost:5432/escucha)')
  process.exit(1)
}

const pool = new Pool({ connectionString: url })

const run = async (file) => {
  const q = fs.readFileSync(path.resolve('db', file), 'utf8')
  await pool.query(q)
  console.log(`✓ ${file}`)
}

try {
  await run('schema.sql')
  // Migraciones versionadas, en orden (idempotentes por diseño).
  const migraciones = fs
    .readdirSync(path.resolve('db'))
    .filter((f) => /^migrate-.*\.sql$/.test(f))
    .sort()
  for (const m of migraciones) await run(m)
  if (!process.argv.includes('--solo-schema')) await run('seed.sql')

  const users = await pool.query('select count(*)::int as n from users')
  const reportes = await pool.query('select count(*)::int as n from reportes')
  console.log(
    `✓ verificación: ${users.rows[0]?.n ?? '?'} users, ${reportes.rows[0]?.n ?? '?'} reportes`,
  )
} finally {
  await pool.end()
}
