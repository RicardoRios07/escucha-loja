import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { clearSesion, getSesion, setSesion, type Rol, type Sesion } from '../../lib/escucha/session'

interface AuthValue {
  sesion: Sesion | null
  entrar: (rol: Rol, datos?: { nombre?: string; cedula?: string }) => void
  actualizar: (datos: { nombre?: string; cedula?: string }) => void
  salir: () => void
}

const AuthCtx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesionState] = useState<Sesion | null>(() => getSesion())

  const entrar = useCallback((rol: Rol, datos?: { nombre?: string; cedula?: string }) => {
    const s: Sesion = {
      rol,
      nombre: datos?.nombre?.trim() || undefined,
      cedula: datos?.cedula?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    setSesion(s)
    setSesionState(s)
  }, [])

  const salir = useCallback(() => {
    clearSesion()
    setSesionState(null)
  }, [])

  const actualizar = useCallback((datos: { nombre?: string; cedula?: string }) => {
    setSesionState((prev) => {
      if (!prev) return prev
      const next: Sesion = {
        ...prev,
        nombre: datos.nombre?.trim() || undefined,
        cedula: datos.cedula?.trim() || undefined,
      }
      setSesion(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ sesion, entrar, actualizar, salir }), [sesion, entrar, actualizar, salir])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/** Protege una ruta por rol (mock local). Sin sesión válida redirige a /ingresar. */
export function RequireRol({ rol, children }: { rol: Rol | Rol[]; children: ReactNode }) {
  const { sesion } = useAuth()
  const roles = Array.isArray(rol) ? rol : [rol]
  if (!sesion || !roles.includes(sesion.rol)) {
    return <Navigate to="/ingresar" replace />
  }
  return <>{children}</>
}
