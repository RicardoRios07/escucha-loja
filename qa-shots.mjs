/**
 * qa-shots.mjs — screenshots de QA con sesión real (cookie elj_session firmada).
 * Requiere .env con SESSION_SECRET + DATABASE_URL* (solo local, nunca se commitea).
 * Uso: QA_BASE=http://localhost:3000 node qa-shots.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright-core'
import * as jose from 'jose'
import { neon } from '@neondatabase/serverless'

const BASE = process.env.QA_BASE || 'http://localhost:3000'
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

for (const f of ['.env', '.env.local']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (/^\s*#/.test(line)) continue
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

async function jwtPara(email) {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
  const q = (s, p) => sql.query(s, p).then((r) => (Array.isArray(r) ? r : r.rows))
  const rows = await q('select id from users where email = $1', [email])
  if (!rows[0]) throw new Error(`sin usuario seed: ${email} (corre node db/apply.mjs)`)
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
  return new jose.SignJWT({ sub: rows[0].id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

const browser = await chromium.launch({ executablePath: EXE })

async function shotComo(email, name, url) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const token = await jwtPara(email)
  const { hostname } = new URL(BASE)
  await ctx.addCookies([{ name: 'elj_session', value: token, domain: hostname, path: '/' }])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${name}] pageerror:`, String(e).slice(0, 160)))
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(10000)
  await page.screenshot({ path: `/tmp/escucha-${name}.png` })
  console.log('saved', name, page.url())
  await ctx.close()
}

// Sesión admin
await shotComo('admin.demo@escucha-loja.ec', 'admin-mapa', '/admin/mapa')

// Sesión vecina
await shotComo('vecino.demo@escucha-loja.ec', 'comunidad', '/vecino/comunidad')

await browser.close()
