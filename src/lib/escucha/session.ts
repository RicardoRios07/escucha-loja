export type Rol = 'vecino' | 'admin'

export interface Sesion {
  rol: Rol
  nombre?: string
  cedula?: string
  createdAt: string // ISO
}

const KEY_SESION = 'mvp_sesion'

function safeParse<T>(v: string | null, fallback: T): T {
  if (!v) return fallback
  try {
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

export function getSesion(): Sesion | null {
  if (typeof window === 'undefined') return null
  const s = safeParse<Sesion | null>(localStorage.getItem(KEY_SESION), null)
  if (!s || (s.rol !== 'vecino' && s.rol !== 'admin')) return null
  return s
}

export function setSesion(s: Sesion) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_SESION, JSON.stringify(s))
}

export function clearSesion() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY_SESION)
}
