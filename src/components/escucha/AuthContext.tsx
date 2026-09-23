import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'
import type { Rol } from '../../lib/escucha/session'

export interface SessionUser {
  id: string
  email: string
  nombre: string | null
  rol: Rol
  celular: string | null
  onboardingRequired: boolean
}

interface AuthValue {
  /** Usuario Google (sesión httpOnly verificada contra Neon). Null = sin login. */
  user: SessionUser | null
  cargando: boolean
  googleConfigured: boolean
  entrarConGoogle: () => void
  salir: () => Promise<void>
  refrescar: () => Promise<void>
}

export const DESTINO: Record<Rol, string> = { vecino: '/vecino', admin: '/admin/mapa' }

const AuthCtx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [cargando, setCargando] = useState(true)
  const [googleConfigured, setGoogleConfigured] = useState(false)

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (!r.ok) {
        setUser(null)
        return
      }
      const d = (await r.json()) as { user: SessionUser | null }
      setUser(d.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const c = await fetch('/api/auth/config', { credentials: 'same-origin' })
        if (vivo && c.ok) {
          const d = (await c.json()) as { google?: boolean }
          setGoogleConfigured(d.google === true)
        }
      } catch {
        /* sin backend: login deshabilitado hasta configurar */
      }
      await refrescar()
      if (vivo) setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [refrescar])

  const entrarConGoogle = useCallback(() => {
    window.location.href = '/api/auth/google'
  }, [])

  const salir = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      /* igual se limpia local */
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, cargando, googleConfigured, entrarConGoogle, salir, refrescar }),
    [user, cargando, googleConfigured, entrarConGoogle, salir, refrescar],
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/**
 * Protege una ruta por rol (sesión Google contra Neon).
 * Sin login redirige a /ingresar; sin onboarding, a /bienvenida.
 */
export function RequireRol({ rol, children }: { rol: Rol | Rol[]; children: ReactNode }) {
  const { user, cargando } = useAuth()
  const { pathname } = useLocation()
  const roles = Array.isArray(rol) ? rol : [rol]
  if (cargando) return <LoadingScreen />
  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/ingresar" replace />
  }
  if (user.onboardingRequired && pathname !== '/bienvenida') {
    return <Navigate to="/bienvenida" replace />
  }
  return <>{children}</>
}
