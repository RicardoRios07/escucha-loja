// Servidor local de verificación: expone /api/analizar (handler real de
// api/analizar.ts) y sirve el build estatico de dist/ con fallback SPA.
// Uso: IA_SIN_AUTH=1 node --env-file=.env.local scripts/serve-ia.mjs
// (el handler exige sesión admin salvo IA_SIN_AUTH=1, solo para verificación local).
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

const { default: analizar } = await import('../api/analizar.ts')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }
  return res
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')

  if (pathname === '/api/analizar') {
    if (req.method !== 'POST') {
      wrapRes(res).status(405).json({ error: 'method-not-allowed' })
      return
    }
    try {
      await analizar(req, wrapRes(res))
    } catch (e) {
      wrapRes(res).status(500).json({ error: 'boom', detalle: String(e) })
    }
    return
  }

  const p = normalize(join(DIST, decodeURIComponent(pathname)))
  if (!p.startsWith(DIST)) {
    res.statusCode = 403
    res.end()
    return
  }
  try {
    const body = await readFile(p)
    res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream')
    res.end(body)
  } catch {
    const index = await readFile(join(DIST, 'index.html'))
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(index)
  }
})

const PORT = 8787
server.listen(PORT, () => {
  console.log(`IA local lista → http://localhost:${PORT}/admin/analisis`)
})

// Valida body en POST: deserializa acá para que readBody() no tire stack overwritten
server.on('clientError', (_err, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'))