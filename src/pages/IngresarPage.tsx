import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, LogOut, Megaphone, ShieldCheck } from 'lucide-react'
import Logo from '../components/escucha/Logo'
import { useAuth } from '../components/escucha/AuthContext'
import { formatearCedula, validarCedulaEcuador } from '../lib/escucha/cedula'
import type { Rol } from '../lib/escucha/session'

const DESTINO: Record<Rol, string> = { vecino: '/vecino', admin: '/admin/mapa' }

export default function IngresarPage() {
  const navigate = useNavigate()
  const { sesion, entrar, salir } = useAuth()
  const [rol, setRol] = useState<Rol | null>(sesion?.rol ?? null)
  const [nombre, setNombre] = useState(sesion?.nombre ?? '')
  const [cedula, setCedula] = useState(sesion?.cedula ?? '')
  const [cedulaError, setCedulaError] = useState<string | null>(null)

  const validarCedulaSiHay = (): boolean => {
    const v = cedula.trim()
    if (!v) {
      setCedulaError(null)
      return true
    }
    const r = validarCedulaEcuador(v)
    if (!r.valid) {
      setCedulaError(r.error || 'Cédula inválida')
      document.getElementById('ingresar-cedula')?.focus()
      return false
    }
    setCedulaError(null)
    return true
  }

  const continuar = () => {
    if (!rol) return
    if (rol === 'vecino' && !validarCedulaSiHay()) return
    entrar(rol, rol === 'vecino' ? { nombre, cedula } : undefined)
    navigate(DESTINO[rol])
  }

  const cardCls = (activo: boolean) =>
    `flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all min-h-[88px] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE4102] ${
      activo
        ? 'border-[#002693] bg-[#002693]/[0.04] shadow-[0_18px_36px_-18px_rgba(0,26,97,0.5)]'
        : 'border-black/10 bg-white hover:border-[#002693]/40'
    }`

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo height={52} tile />
          <h1 className="mt-4 text-[clamp(1.9rem,7vw,2.6rem)] font-black tracking-tight text-[#111]">
            ¿Cómo quieres entrar?
          </h1>
          <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-[#111]/60">
            Elige tu rol para continuar. Es una demo: no necesitas contraseña.
          </p>
        </div>

        {sesion && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#0db954]/30 bg-[#0db954]/[0.07] p-4">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0db954]" aria-hidden="true" />
            <p className="flex-1 text-sm text-[#111]/75">
              Sesión activa como <strong>{sesion.rol === 'vecino' ? 'Vecino' : 'Administrador'}</strong>
              {sesion.nombre ? ` · ${sesion.nombre}` : ''}
            </p>
            <button
              onClick={() => {
                salir()
                setRol(null)
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[#002693] hover:bg-[#002693]/5"
            >
              <LogOut size={15} aria-hidden="true" /> Cambiar
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3" role="group" aria-label="Elige tu rol">
          <button type="button" aria-pressed={rol === 'vecino'} onClick={() => setRol('vecino')} className={cardCls(rol === 'vecino')}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${rol === 'vecino' ? 'bg-[#002693] text-white' : 'bg-[#002693]/[0.07] text-[#002693]'}`}>
              <Megaphone size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[17px] font-extrabold text-[#111]">Soy vecino</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[#111]/55">
                Quiero reportar lo que pasa en mi barrio
              </span>
            </span>
          </button>

          <button type="button" aria-pressed={rol === 'admin'} onClick={() => setRol('admin')} className={cardCls(rol === 'admin')}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${rol === 'admin' ? 'bg-[#002693] text-white' : 'bg-[#002693]/[0.07] text-[#002693]'}`}>
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[17px] font-extrabold text-[#111]">Soy administrador</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[#111]/55">
                Quiero ver el mapa, los datos y el análisis
              </span>
            </span>
          </button>
        </div>

        {rol === 'vecino' && (
          <div className="mt-4 rounded-2xl border border-black/10 bg-[#fffaf2] p-5">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#002693]/70">
              Tus datos (opcional)
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ingresar-nombre" className="text-sm font-bold text-[#111]">
                  Nombre
                </label>
                <input
                  id="ingresar-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="¿Cómo te llamamos?"
                  autoComplete="name"
                  className="h-[52px] rounded-xl border border-black/15 bg-white px-4 text-[16px] outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ingresar-cedula" className="text-sm font-bold text-[#111]">
                  Cédula <span className="font-normal text-[#111]/45">(para ver tus reportes)</span>
                </label>
                <input
                  id="ingresar-cedula"
                  value={cedula}
                  onChange={(e) => {
                    setCedula(formatearCedula(e.target.value))
                    if (cedulaError) setCedulaError(null)
                  }}
                  onBlur={validarCedulaSiHay}
                  placeholder="1100234567"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  aria-invalid={!!cedulaError}
                  aria-describedby={cedulaError ? 'ingresar-cedula-error' : undefined}
                  className={`h-[52px] rounded-xl border bg-white px-4 text-[16px] outline-none placeholder:text-[#111]/35 focus:ring-2 ${
                    cedulaError
                      ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/20'
                      : 'border-black/15 focus:border-[#002693] focus:ring-[#002693]/20'
                  }`}
                />
                {cedulaError && (
                  <p id="ingresar-cedula-error" role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#ef4444]">
                    <AlertCircle size={15} aria-hidden="true" /> {cedulaError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={continuar}
          disabled={!rol}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FE4102] text-[16px] font-extrabold text-white shadow-[3px_4px_0_rgba(0,0,0,0.2)] transition-all hover:bg-[#ff5a1f] active:translate-y-[1px] active:scale-[0.98] active:shadow-none disabled:opacity-40 disabled:shadow-none"
        >
          Continuar <ArrowRight size={18} aria-hidden="true" />
        </button>

        <Link
          to="/"
          className="mx-auto mt-4 flex min-h-[44px] w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-[#002693]/70 hover:text-[#002693]"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Volver al inicio
        </Link>
      </div>
    </main>
  )
}
