import type { CategoriaIconKey } from '../../lib/escucha/geo'

/**
 * Sprites de pins (teardrop con halo blanco + icono de categoría) para el mapa.
 * Se rasterizan a canvas y se registran con map.addImage — MapLibre native,
 * sin dependencias nuevas. Si algo falla, LojaMap3D cae a círculos (fallback).
 */

// Markup interno SVG (paths de lucide, viewBox 24x24, stroke-based).
const ICON_MARKUP: Record<CategoriaIconKey, string> = {
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  building:
    '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 7h16"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M6 14h.01"/><path d="M10 14h.01"/><path d="M14 14h.01"/><path d="M18 14h.01"/><path d="M6 18h.01"/><path d="M10 18h.01"/><path d="M14 18h.01"/><path d="M18 18h.01"/><path d="M12 21v-3"/>',
}

export interface PinSpriteSpec {
  /** id final para map.addImage / icon-image, p.ej. "pin-agua" */
  id: string
  color: string
  icono: CategoriaIconKey
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('SVG de icono no cargó'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/** Círculo + triángulo hacia el tip: silueta de pin de mapa. */
function fillPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tipY: number,
  baseY: number,
  baseHalf: number,
  fill: string,
) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.moveTo(cx - baseHalf, baseY)
  ctx.lineTo(cx + baseHalf, baseY)
  ctx.lineTo(cx, tipY)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function rasterizePin(color: string): HTMLCanvasElement {
  // Coordenadas lógicas; escala x2 y se registra con pixelRatio 2.
  const w = 46
  const h = 58
  const S = 2
  const canvas = document.createElement('canvas')
  canvas.width = w * S
  canvas.height = h * S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible')
  ctx.scale(S, S)

  // Halo blanco con sombra (contraste sobre satelital).
  ctx.save()
  ctx.shadowColor = 'rgba(12,18,16,0.38)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 2.5
  fillPin(ctx, 23, 21, 19, 57, 33, 12.8, '#ffffff')
  ctx.restore()

  // Cuerpo con el color de categoría.
  fillPin(ctx, 23, 21, 17, 55, 32.5, 11, color)

  return canvas
}

/** Registra los sprites en el mapa. true = todo listo; false = usar fallback. */
export async function addCategoryPinSprites(
  map: { addImage: (id: string, image: ImageData, opts: { pixelRatio: number }) => void },
  specs: PinSpriteSpec[],
): Promise<boolean> {
  try {
    for (const spec of specs) {
      const canvas = rasterizePin(spec.color)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D no disponible')
      const iconBox = 18
      const img = await loadImage(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON_MARKUP[spec.icono]}</svg>`,
      )
      ctx.drawImage(img, 23 - iconBox / 2, 21 - iconBox / 2, iconBox, iconBox)
      // MapLibre no acepta HTMLCanvasElement en addImage: registramos los píxeles
      // como ImageData a resolución del dispositivo (pixelRatio 2).
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      map.addImage(spec.id, imageData, { pixelRatio: 2 })
    }
    return true
  } catch {
    return false
  }
}
