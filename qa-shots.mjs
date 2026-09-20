import { chromium } from 'playwright-core'

const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300))
})

async function enterAs(roleLabel) {
  await page.goto('http://localhost:5199/ingresar', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.getByText(roleLabel, { exact: false }).first().click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(2500)
}

async function shotMap(name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(10000)
  await page.screenshot({ path: `/tmp/escucha-${name}.png` })
  console.log('saved', name)
}

// Sesión admin
await enterAs('Soy administrador')
await shotMap('admin-mapa', 'http://localhost:5199/admin/mapa')

// Sesión vecino: comunidad
await enterAs('Soy vecino')
await shotMap('comunidad', 'http://localhost:5199/vecino/comunidad')

// Landing (lite)
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)
await page.locator('#mapa').scrollIntoViewIfNeeded()
await page.waitForTimeout(9000)
await page.screenshot({ path: '/tmp/escucha-landing.png' })
console.log('saved landing')

await browser.close()
