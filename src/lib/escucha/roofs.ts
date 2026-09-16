/**
 * Muestreo de color de techos desde los tiles satelitales.
 *
 * MapLibre no soporta texturas en fill-extrusion, pero sí colores por feature.
 * Trucazo: muestreamos el píxel del tile satelital (misma fuente que la base
 * visual) bajo el centroide de cada edificio → el volumen queda pintado con el
 * color real de su techo, opaco, y el gradiente vertical sombrea los muros.
 *
 * Los tiles se piden a z fija (17 ≈ 1.2 m/px), se cachean por z/x/y y el
 * muestreo es perezoso: solo edificios renderizados en el viewport actual.
 */

const TILE = 256
const SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3']

const tileCache = new Map<string, Promise<HTMLImageElement | null>>()
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D | null {
  if (ctx) return ctx
  if (typeof document === 'undefined') return null
  canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE
  ctx = canvas.getContext('2d', { willReadFrequently: true })
  return ctx
}

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const key = `${z}/${x}/${y}`
  const cached = tileCache.get(key)
  if (cached) return cached
  const sub = SUBDOMAINS[(x + y) % SUBDOMAINS.length]
  const url = `https://${sub}.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
  tileCache.set(key, promise)
  return promise
}

/** Punto → tile fraccional y píxel dentro del tile. */
function lngLatToPixel(lng: number, lat: number, z: number) {
  const n = 2 ** z
  const xf = ((lng + 180) / 360) * n
  const latRad = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const tx = Math.floor(xf)
  const ty = Math.floor(yf)
  const px = Math.max(0, Math.min(TILE - 1, Math.floor((xf - tx) * TILE)))
  const py = Math.max(0, Math.min(TILE - 1, Math.floor((yf - ty) * TILE)))
  return { tx, ty, px, py }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Pasteliza el color muestreado: el gradiente vertical de MapLibre oscurece
 * los muros según el color base, y un techo saturado los dejaba marrón-barro.
 * Desatura y aclara manteniendo el matiz del techo real.
 */
function softenRoofColor(r: number, g: number, b: number): string {
  const gray = (r + g + b) / 3
  const desat = 0.55 // conserva 55% de la saturación original
  let R = gray + (r - gray) * desat
  let G = gray + (g - gray) * desat
  let B = gray + (b - gray) * desat
  const warm = 0.4 // mezcla hacia un cálido claro
  R += (236 - R) * warm
  G += (231 - G) * warm
  B += (222 - B) * warm
  return rgbToHex(R, G, B)
}

export type RoofSample = { i: number; lng: number; lat: number }

/**
 * Muestrea el color de techo para cada muestra y entrega resultados por lotes.
 * onBatch puede llamarse varias veces (agrupa por tile para reutilizar el canvas).
 */
export async function sampleRoofColors(
  samples: RoofSample[],
  zoom: number,
  onBatch: (updates: Array<{ i: number; color: string }>) => void,
): Promise<void> {
  const context = getCtx()
  if (!context || samples.length === 0) return
  const z = Math.max(15, Math.min(17, Math.round(zoom)))

  // Agrupar por tile para dibujar una sola vez por tile.
  const byTile = new Map<string, Array<{ sample: RoofSample; px: number; py: number }>>()
  for (const sample of samples) {
    const { tx, ty, px, py } = lngLatToPixel(sample.lng, sample.lat, z)
    const key = `${tx}/${ty}`
    const list = byTile.get(key) || []
    list.push({ sample, px, py })
    byTile.set(key, list)
  }

  let lastKey = ''
  let batch: Array<{ i: number; color: string }> = []
  const flush = () => {
    if (batch.length) {
      onBatch(batch)
      batch = []
    }
  }

  for (const [key, entries] of byTile) {
    const [txs, tys] = key.split('/').map(Number)
    const img = await loadTile(z, txs, tys)
    if (!img) continue
    if (key !== lastKey) {
      context.drawImage(img, 0, 0, TILE, TILE, 0, 0, TILE, TILE)
      lastKey = key
    }
    try {
      for (const entry of entries) {
        const data = context.getImageData(entry.px, entry.py, 1, 1).data
        // Ignorar píxeles casi blancos (nubes) y casi negros (sombras extremas).
        const [r, g, b] = [data[0], data[1], data[2]]
        if (r > 235 && g > 235 && b > 235) continue
        if (r + g + b < 45) continue
        batch.push({ i: entry.sample.i, color: softenRoofColor(r, g, b) })
      }
    } catch {
      /* Canvas contaminado (CORS): se usa el color de fallback. */
    }
    if (batch.length >= 120) flush()
    // Ceder el hilo entre tiles para no bloquear el render.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  flush()
}
