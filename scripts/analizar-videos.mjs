// scripts/analizar-videos.mjs — verificación de vídeos cortos (máx 10 s) con Google Vision.
//
// Flujo (guía: vídeos):
//   1. fluent-ffmpeg extrae EXACTAMENTE 3 fotogramas clave:
//        inicio  → t = 0.5 s
//        mitad   → t = duración / 2
//        final   → t = duración − 1 s
//   2. Cada fotograma se envía a Google Cloud Vision (SAFE_SEARCH_DETECTION).
//   3. Si ALGUNO de los 3 arroja adult / violence (gore) / medical (sangre) con
//      LIKELY o VERY_LIKELY → el vídeo es RECHAZADO al instante y se detiene la
//      revisión de los fotogramas restantes (no se envían más).
//   4. Si ningún fotograma dispara riesgo → vídeo APROBADO como contenido seguro.
//
// Fail-open (igual que _vision.ts): si ffmpeg, la descarga o Vision fallan/expiran,
// solo se loguea y el vídeo pasa (sin key → SafeSearch no se puede evaluar, pasa).
//
// Uso: node --env-file=.env.local scripts/analizar-videos.mjs <ruta-o-url>
// Exit: 0 = aprobado · 1 = rechazado (fotograma IA/gore) · 2 = error de uso

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ffmpeg = require('fluent-ffmpeg')

// ---------- Config (equivale a las constantes de api/_vision.ts) ----------
const KEY = process.env.GOOGLE_VISION_API_KEY || process.env.VISION_API_KEY
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate'
const VISION_TIMEOUT_MS = 15000
const MAX_SEGUNDOS = 10
const DIR_TMP = '/tmp'

const GRADO = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']
const NOMBRES = ['inicio', 'mitad', 'final']
const CATS = ['adult', 'violence', 'medical']

function esRiesgoso(grado) {
  return grado === 'LIKELY' || grado === 'VERY_LIKELY'
}

function nombreDe(origen) {
  try {
    return String(new URL(origen).pathname.split('/').pop() || origen)
  } catch {
    return String(origen).split('/').pop() || origen
  }
}

// ---------- utilidades ffmpeg ----------
function duracionDe(origen) {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(origen, (err, m) => {
      if (err) return rej(new Error(`ffprobe: ${err.message}`))
      const d = m?.format?.duration
      if (typeof d !== 'number' || !Number.isFinite(d)) return rej(new Error('ffprobe sin duración.'))
      res(d)
    })
  })
}

/** Extrae un fotograma en el instante `t` a un PNG temporal; resuelve la ruta. */
function fotogramaEn(origen, t, id) {
  const salida = `${DIR_TMP}/frame-${process.pid}-${id}.png`
  return new Promise((res, rej) => {
    ffmpeg(origen)
      .seekInput(t)
      .frames(1)
      .output(salida)
      .on('end', () => res(salida))
      .on('error', (e) => rej(new Error(`ffmpeg: ${e.message}`)))
      .run()
  })
}

// ---------- capa Google Vision (REST, "imagen por imagen" como la guía) ----------
async function safeSearchDePng(ruta) {
  const { readFile } = await import('node:fs/promises')
  const b64 = (await readFile(ruta)).toString('base64')
  const res = await fetch(`${VISION_URL}?key=${encodeURIComponent(KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: b64 },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        },
      ],
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  })
  if (!res.ok) {
    if (res.status === 403) return null // fail-open: key sin permiso
    throw new Error(`Google Vision respondió ${res.status}`)
  }
  const data = await res.json()
  return data?.responses?.[0]?.safeSearchAnnotation ?? null
}

// ---------- flujo principal ----------
async function main() {
  const origen = process.argv[2]
  if (!origen) {
    console.error('Uso: node --env-file=.env.local scripts/analizar-videos.mjs <ruta-o-url>')
    return 2
  }

  // 1) Duración por ffprobe (rechazo duro si supera 10 s).
  let dur = 0
  try {
    dur = await duracionDe(origen)
  } catch (e) {
    console.error(`[ffprobe] ${e.message} → fail-open (no se puede acotar duración, pasa).`)
    return 0
  }
  if (dur > MAX_SEGUNDOS) {
    console.log(
      `RECHAZADO: "${nombreDe(origen)}" dura ${dur.toFixed(1)}s (máx ${MAX_SEGUNDOS}s permitidos).`,
    )
    return 1
  }
  if (!KEY) {
    console.log(`APROBADO: "${nombreDe(origen)}" (${dur.toFixed(1)}s) — sin GOOGLE_VISION_API_KEY, no se evalúa SafeSearch.`)
    return 0
  }

  // 2) Tres instantes exactos.
  const momentos = [0.5, dur / 2, Math.max(0, dur - 1)]

  // 3) Analizar fotograma a fotograma; detener al primer rechazo.
  for (let i = 0; i < momentos.length; i++) {
    let png = null
    try {
      png = await fotogramaEn(origen, momentos[i], i)
      const ss = await safeSearchDePng(png)
      const resumen = []
      let riesgo = null
      for (const c of CATS) {
        const g = ss?.[c] ?? 'UNKNOWN'
        resumen.push(`${c}=${g}`)
        if (esRiesgoso(g)) riesgo = c
      }
      console.log(`  ${NOMBRES[i]} t=${momentos[i].toFixed(2)}s → ${resumen.join(' ')}`)
      if (riesgo) {
        console.log(
          `RECHAZADO: "${nombreDe(origen)}" — el fotograma de ${NOMBRES[i]} tiene contenido ${riesgo} no permitido.`,
        )
        return 1
      }
    } catch (e) {
      console.error(`[frame ${NOMBRES[i]}] ${e.message} → fail-open.`)
    } finally {
      if (png) await import('node:fs/promises').then(({ rm }) => rm(png, { force: true })).catch(() => {})
    }
  }

  console.log(
    `APROBADO: "${nombreDe(origen)}" (${dur.toFixed(1)}s, 3 fotogramas analizados, sin contenido no permitido).`,
  )
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`Error: ${e.message}`)
    process.exit(2)
  })
