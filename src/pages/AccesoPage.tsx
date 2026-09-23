import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Logo from '../components/escucha/Logo'
import { useAuth } from '../components/escucha/AuthContext'

/**
 * Acceso administrativo sin Google (cuenta interna creada con
 * scripts/crear-admin.mjs). Sin enlaces hacia esta ruta en la app,
 * noindex + disallow en robots.
 */
export default function AccesoPage() {
  const { refrescar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Cuenta regresiva del rate-limit (5 intentos/min en el servidor).
  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const entrar = async () => {
    if (enviando || cooldown > 0) return
    setError(null)
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/auth/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = (await r.json()) as { ok?: boolean; error?: string }
      if (r.status === 429) {
        setCooldown(60)
        setError('Demasiados intentos. Espera un minuto antes de reintentar.')
        return
      }
      if (!r.ok || !d.ok) {
        setError(d.error || 'Credenciales inválidas.')
        return
      }
      await refrescar()
      window.location.href = '/admin/mapa'
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = enviando || cooldown > 0

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0b1230] px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      {/* Fondo campaña: halftone + resplandores */}
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#002693] opacity-80 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#FE4102]/25 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl bg-white p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Logo height={46} tile />
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#002693]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#002693]">
              <Lock size={12} aria-hidden="true" /> Acceso interno
            </p>
            <h1 className="mt-2 text-[26px] font-black tracking-tight text-[#111]">
              Gestión
            </h1>
            <p className="mt-1 text-sm text-[#111]/55">
              Solo personal autorizado.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3.5">
            <label htmlFor="acceso-email" className="flex flex-col gap-1.5 text-sm font-bold text-[#111]">
              Correo
              <span className="relative">
                <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111]/35" />
                <input
                  id="acceso-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void entrar()
                  }}
                  placeholder="cuenta interna"
                  inputMode="email"
                  autoComplete="username"
                  className="h-[52px] w-full rounded-xl border border-black/15 bg-white pl-11 pr-4 text-[16px] font-normal outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
                />
              </span>
            </label>

            <label htmlFor="acceso-password" className="flex flex-col gap-1.5 text-sm font-bold text-[#111]">
              Contraseña
              <span className="relative">
                <Lock size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111]/35" />
                <input
                  id="acceso-password"
                  type={ver ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void entrar()
                    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'))
                  }}
                  onKeyUp={(e) => {
                    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'))
                  }}
                  onBlur={() => setCapsLock(false)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-[52px] w-full rounded-xl border border-black/15 bg-white pl-11 pr-12 text-[16px] font-normal outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={ver}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#111]/45 hover:bg-black/5 active:scale-95"
                >
                  {ver ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </span>
            </label>
            {capsLock && (
              <p role="status" className="-mt-1 text-[12px] font-semibold text-amber-700">
                Bloq Mayús activado.
              </p>
            )}

            {error && (
              <p role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700">
                <AlertCircle size={15} aria-hidden="true" /> {error}
              </p>
            )}

            <button
              onClick={() => void entrar()}
              disabled={bloqueado}
              className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#002693] text-[16px] font-extrabold text-white transition-all hover:bg-[#0033c4] active:scale-[0.98] disabled:opacity-60"
            >
              {enviando ? 'Verificando…' : cooldown > 0 ? `Reintentar en ${cooldown}s` : 'Entrar'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
            Jesús Escucha · Interno
          </p>
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-white/60 hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
