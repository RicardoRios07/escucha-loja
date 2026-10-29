/**
 * Carga .env y .env.local sin dependencias externas.
 * Convención del proyecto: .env.local gana (igual que Vite).
 */
import fs from 'node:fs'
import path from 'node:path'

export function loadEnv() {
  for (const f of ['.env', '.env.local']) {
    const p = path.resolve(f)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (/^\s*#/.test(line)) continue
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!m) continue
      if (f === '.env' && process.env[m[1]]) continue
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

export function databaseUrl() {
  return process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
}
