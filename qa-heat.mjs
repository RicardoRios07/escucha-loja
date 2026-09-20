import { chromium } from 'playwright-core'

const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300))
})

await page.goto('http://localhost:5199/ingresar', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)
await page.getByText('Soy administrador', { exact: false }).first().click()
await page.waitForTimeout(800)
await page.getByRole('button', { name: /continuar/i }).click()
await page.waitForTimeout(2500)

await page.goto('http://localhost:5199/admin/mapa', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(10000)
await page.screenshot({ path: '/tmp/escucha-heat2.png' })
console.log('saved heat2')

await browser.close()
