import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Phone } from 'lucide-react'
import Logo from '../components/escucha/Logo'
import LoadingScreen from '../components/escucha/LoadingScreen'
import { DESTINO, useAuth } from '../components/escucha/AuthContext'

/** Primer login con Google: pide celular + aceptación de términos. */
export default function BienvenidaPage() {
  const navigate = useNavigate()
  const { user, cargando, refrescar } = useAuth()
  const [celular, setCelular] = useState('')
  const [terms, setTerms] = useState(false)
  const [datos, setDatos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <LoadingScreen />
  if (!user) return <Navigate to="/ingresar" replace />
  if (!user.onboardingRequired) return <Navigate to={DESTINO[user.rol]} replace />

  const guardar = async () => {
    setError(null)
    const limpio = celular.replace(/[\s-]/g, '')
    if (!/^(09\d{8}|\+5939\d{8})$/.test(limpio)) {
      setError('Celular inválido: usa 10 dígitos empezando con 09 (ej. 0991234567).')
      return
    }
    if (!terms || !datos) {
      setError('Debes aceptar los términos y autorizar el tratamiento de tus datos para participar.')
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/auth/onboarding', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular: limpio, terms: true, datos: true }),
      })
      const d = (await r.json()) as { user?: unknown; error?: string }
      if (!r.ok) {
        setError(d.error || 'No se pudo guardar. Intenta de nuevo.')
        return
      }
      await refrescar()
      navigate(DESTINO[user.rol])
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo height={52} tile />
          <h1 className="mt-4 text-[clamp(1.9rem,7vw,2.6rem)] font-black tracking-tight text-[#111]">
            ¡Hola{user.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-[#111]/60">
            Entraste con <strong>{user.email}</strong>. Para contactarte sobre tus
            reportes necesitamos tu celular y que aceptes los términos.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/10 p-5">
          <label htmlFor="bienvenida-celular" className="flex flex-col gap-1.5 text-sm font-bold text-[#111]">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={15} className="text-[#002693]" aria-hidden="true" /> Número celular *
            </span>
            <input
              id="bienvenida-celular"
              value={celular}
              onChange={(e) => {
                setCelular(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))
                if (error) setError(null)
              }}
              placeholder="0991234567"
              inputMode="tel"
              autoComplete="tel"
              className="h-[52px] rounded-xl border border-black/15 bg-white px-4 text-[16px] font-normal outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
            />
          </label>

          <label htmlFor="bienvenida-terms" className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#fffaf2] p-3.5 text-sm leading-snug text-[#111]/75">
            <input
              id="bienvenida-terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked)
                if (error) setError(null)
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#002693]"
            />
            <span>
              Declaro que soy mayor de edad y acepto los{' '}
              <Link to="/terminos" target="_blank" rel="noreferrer" className="font-bold text-[#002693] underline">
                términos y condiciones
              </Link>{' '}
              de Escucha Loja. *
            </span>
          </label>

          <label htmlFor="bienvenida-datos" className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#fffaf2] p-3.5 text-sm leading-snug text-[#111]/75">
            <input
              id="bienvenida-datos"
              type="checkbox"
              checked={datos}
              onChange={(e) => {
                setDatos(e.target.checked)
                if (error) setError(null)
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#002693]"
            />
            <span>
              Autorizo expresamente a la Campaña de Jesús Alejandro Cárdenas López el
              tratamiento de mis datos personales para contactarme sobre mis reportes
              por llamada, SMS o WhatsApp, análisis agregado y comunicación de la campaña,
              según los{' '}
              <Link to="/terminos" target="_blank" rel="noreferrer" className="font-bold text-[#002693] underline">
                términos y condiciones
              </Link>
              . Puedo revocar esta autorización en info@etherlab.dev. *
            </span>
          </label>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700">
              <AlertCircle size={15} aria-hidden="true" /> {error}
            </p>
          )}

          <button
            onClick={guardar}
            disabled={enviando}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FE4102] text-[16px] font-extrabold text-white shadow-[3px_4px_0_rgba(0,0,0,0.2)] transition-all hover:bg-[#ff5a1f] active:translate-y-[1px] active:scale-[0.98] active:shadow-none disabled:opacity-50 disabled:shadow-none"
          >
            {enviando ? 'Guardando…' : <>Empezar a participar <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </main>
  )
}
