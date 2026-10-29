#!/usr/bin/env node
/**
 * scripts/local-server.mjs — servidor 100% local: API + Vite (dev) o dist.
 *
 *   node scripts/local-server.mjs          # desarrollo con HMR en :5173
 *   node scripts/local-server.mjs --prod   # sirve dist/ (requiere npm run build)
 *
 * No usa Vercel, Neon ni Blob. Postgres se lee de DATABASE_URL y la evidencia
 * se guarda en uploads/ (o EVIDENCIA_DIR).
 */
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './env.mjs'

loadEnv()

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROD = process.argv.includes('--prod')
const PORT = Number(process.env.PORT || 5173)
const DIST = join(ROOT, 'dist')
const UPLOADS = process.env.EVIDENCIA_DIR || join(ROOT, 'uploads')

process.env.EVIDENCIA_DIR = UPLOADS

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.3gp': 'video/3gpp',
  '.pmtiles': 'application/octet-stream',
  '.geojson': 'application/geo+json',
  '.txt': 'text/plain; charset=utf-8',
}

const MAX_JSON = 2 * 1024 * 1024
const MAX_UPLOAD = 25 * 1024 * 1024

const RUTAS = [
  { re: /^\/api\/auth\/google$/, metodos: ['GET'], file: '/api/auth/google.ts' },
  { re: /^\/api\/auth\/google\/callback$/, metodos: ['GET'], file: '/api/auth/google/callback.ts' },
  { re: /^\/api\/auth\/logout$/, metodos: ['POST'], file: '/api/auth/logout.ts' },
  { re: /^\/api\/auth\/estado$/, metodos: ['GET'], file: '/api/auth/estado.ts' },
  { re: /^\/api\/auth\/onboarding$/, metodos: ['POST'], file: '/api/auth/onboarding.ts' },
  { re: /^\/api\/auth\/admin\/login$/, metodos: ['POST'], file: '/api/auth/admin/login.ts' },
  { re: /^\/api\/evidencia\/upload$/, metodos: ['POST'], file: '/api/evidencia/upload.ts', body: 'raw' },
  { re: /^\/api\/evidencia\/delete$/, metodos: ['POST'], file: '/api/evidencia/delete.ts', body: 'json' },
  { re: /^\/api\/reportes$/, metodos: ['GET', 'POST'], file: '/api/reportes.ts', body: 'json' },
  { re: /^\/api\/reportes\/([^/]+)$/, metodos: ['DELETE'], file: '/api/reportes/[id].ts', body: 'json' },
  { re: /^\/api\/admin\/reportes$/, metodos: ['GET'], file: '/api/admin/reportes.ts' },
  { re: /^\/api\/admin\/analisis$/, metodos: ['GET', 'POST'], file: '/api/admin/analisis.ts', body: 'json' },
  { re: /^\/api\/analizar$/, metodos: ['POST'], file: '/api/analizar.ts', rawRequest: true },
]

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    if (res.writableEnded) return
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }
  res.redirect = (code, url) => {
    if (res.writableEnded) return
    res.statusCode = code
    res.setHeader('Location', url)
    res.end()
  }
  return res
}

function parseQuery(searchParams) {
  const query = {}
  for (const [k, v] of searchParams) {
    const prev = query[k]
    if (prev === undefined) query[k] = v
    else if (Array.isArray(prev)) prev.push(v)
    else query[k] = [prev, v]
  }
  return query
}

function leerCuerpo(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0
    let excedido = false
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > max) {
        excedido = true
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (excedido) reject(new Error('body-too-large'))
      else resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

async function servirArchivoEvidencia(req, res, pathname) {
  const nombre = pathname.slice('/api/evidencia/archivo/'.length)
  if (!/^[a-f0-9-]{36}\.(jpe?g|png|webp|mp4|webm|mov|m4v|3gp)$/i.test(nombre)) {
    res.statusCode = 400
    res.end('Archivo inválido')
    return true
  }
  const full = join(UPLOADS, nombre)
  let info
  try {
    info = await stat(full)
  } catch {
    res.statusCode = 404
    res.end('No encontrado')
    return true
  }
  const mime = MIME[extname(nombre).toLowerCase()] ?? 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

  const range = req.headers.range
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (m) {
      const inicio = m[1] ? Number(m[1]) : 0
      const fin = m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1
      if (inicio <= fin && inicio < info.size) {
        res.statusCode = 206
        res.setHeader('Content-Range', `bytes ${inicio}-${fin}/${info.size}`)
        res.setHeader('Content-Length', String(fin - inicio + 1))
        createReadStream(full, { start: inicio, end: fin }).pipe(res)
        return true
      }
    }
  }

  res.setHeader('Content-Length', String(info.size))
  createReadStream(full).pipe(res)
  return true
}

async function servirDist(req, res, pathname) {
  if (!PROD) return false
  const pedido = decodeURIComponent(pathname)
  let full = normalize(join(DIST, pedido))
  if (!full.startsWith(DIST)) {
    res.statusCode = 403
    res.end()
    return true
  }
  try {
    const info = await stat(full)
    if (info.isDirectory()) full = join(full, 'index.html')
    const body = await readFile(full)
    res.setHeader('Content-Type', MIME[extname(full).toLowerCase()] ?? 'application/octet-stream')
    res.end(body)
    return true
  } catch {
    // Fallback SPA solo para navegación.
    const accept = String(req.headers.accept || '')
    if (accept.includes('text/html')) {
      try {
        const body = await readFile(join(DIST, 'index.html'))
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(body)
        return true
      } catch {
        res.statusCode = 500
        res.end('Falta dist/. Ejecuta: npm run build')
        return true
      }
    }
    return false
  }
}

let vite = null
let server = null

async function handler(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const { pathname } = url

  if (pathname.startsWith('/api/evidencia/archivo/')) {
    await servirArchivoEvidencia(req, res, pathname)
    return
  }

  if (pathname.startsWith('/api/')) {
    const ruta = RUTAS.find((r) => r.re.test(pathname))
    if (!ruta) {
      wrapRes(res).status(404).json({ error: 'Endpoint no encontrado' })
      return
    }
    const metodos = ruta.metodos
    if (!metodos.includes((req.method || 'GET').toUpperCase())) {
      res.setHeader('Allow', metodos.join(', '))
      wrapRes(res).status(405).json({ error: 'Método no permitido' })
      return
    }

    const mod = await vite.ssrLoadModule(ruta.file)
    const fn = mod.default
    if (typeof fn !== 'function') throw new Error(`Handler inválido: ${ruta.file}`)

    if (ruta.rawRequest) {
      await fn(req, wrapRes(res))
      return
    }

    let body
    if (ruta.body === 'raw') {
      try {
        body = await leerCuerpo(req, MAX_UPLOAD)
      } catch (e) {
        wrapRes(res).status(413).json({ error: 'Archivo demasiado grande (máx 25 MB).' })
        return
      }
    } else if (ruta.body === 'json' || (req.method || '').toUpperCase() !== 'GET') {
      try {
        const raw = await leerCuerpo(req, MAX_JSON)
        if (raw.length > 0) body = JSON.parse(raw.toString('utf8'))
      } catch (e) {
        const status = e instanceof Error && e.message === 'body-too-large' ? 413 : 400
        wrapRes(res).status(status).json({ error: 'Cuerpo de la solicitud inválido.' })
        return
      }
    }

    const query = parseQuery(url.searchParams)
    const m = ruta.re.exec(pathname)
    if (m?.[1]) query.id = decodeURIComponent(m[1])

    const apiReq = { method: req.method, headers: req.headers, query, body }
    await fn(apiReq, wrapRes(res))
    return
  }

  if (!PROD) {
    vite.middlewares(req, res, () => {
      res.statusCode = 404
      res.end('No encontrado')
    })
    return
  }

  if (await servirDist(req, res, pathname)) return
  res.statusCode = 404
  res.end('No encontrado')
}

const { createServer: createViteServer } = await import('vite')

server = createServer((req, res) => {
  handler(req, res).catch((e) => {
    console.error('[local-server]', e)
    if (!res.writableEnded) {
      wrapRes(res).status(500).json({ error: 'Error interno' })
    }
  })
})

vite = await createViteServer({
  root: ROOT,
  appType: 'spa',
  server: {
    middlewareMode: true,
    hmr: PROD ? false : { server },
  },
})

server.listen(PORT, () => {
  console.log(`\n  Escucha Loja local → http://localhost:${PORT}`)
  console.log(`  modo: ${PROD ? 'dist (producción)' : 'Vite (desarrollo)'}`)
  console.log(`  evidencia: ${UPLOADS}\n`)
})
