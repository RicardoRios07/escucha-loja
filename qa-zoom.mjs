import { chromium } from 'playwright-core'

const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300))
})
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))

await page.goto('http://localhost:5199/ingresar', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)
await page.getByText('Soy administrador', { exact: false }).first().click()
await page.waitForTimeout(800)
await page.getByRole('button', { name: /continuar/i }).click()
await page.waitForTimeout(2500)
await page.goto('http://localhost:5199/admin/mapa', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(10000)

// Zoom bar sweep: usa los controles +/- del mapa
for (const [name, clicks] of [['z11', 3], ['z15', 5]]) {
  // reset: recarga y luego ajusta zoom con teclado sobre el canvas
  await page.goto('http://localhost:5199/admin/mapa', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(9000)
  await page.locator('.loja-map-canvas canvas').first().click({ position: { x: 700, y: 400 } })
  for (let i = 0; i < clicks; i++) {
    await page.keyboard.press(name === 'z11' ? '-' : '+')
    await page.waitForTimeout(900)
  }
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `/tmp/escucha-${name}.png` })
  console.log('saved', name)
}

await browser.close()
