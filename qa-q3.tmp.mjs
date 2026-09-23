import { chromium } from 'playwright-core'
import fs from 'node:fs'
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const browser = await chromium.launch({ executablePath: EXE })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const jwt = fs.readFileSync('/tmp/qa-jwt.txt', 'utf8').trim()
await ctx.addCookies([{ name: 'elj_session', value: jwt, domain: 'localhost', path: '/' }])
const page = await ctx.newPage()
await page.goto('http://localhost:3000/admin/mapa', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForFunction(() => !!window.__lojaMap, null, { timeout: 60000 })
await page.waitForTimeout(9000)
const out = await page.evaluate(() => {
  const m = window.__lojaMap
  const feats = m.querySourceFeatures('reports')
  return {
    nSrc: feats.length,
    pins: feats.slice(0, 12).map((f) => {
      const p = m.project(f.geometry.coordinates)
      return { xy: [Math.round(p.x), Math.round(p.y)], id: String(f.properties.id).slice(0, 8) }
    }),
  }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
