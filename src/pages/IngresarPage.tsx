import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, LogOut } from 'lucide-react'
import Logo from '../components/escucha/Logo'
import LoadingScreen from '../components/escucha/LoadingScreen'
import { DESTINO, useAuth } from '../components/escucha/AuthContext'

export default function IngresarPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, cargando, googleConfigured, entrarConGoogle, salir } = useAuth()

  const continuar = () => {
    if (!user) return
    navigate(user.onboardingRequired ? '/bienvenida' : DESTINO[user.rol])
  }

  const errorOAuth = params.get('error')

  if (cargando) return <LoadingScreen />

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo height={52} tile />
          <h1 className="mt-4 text-[clamp(1.9rem,7vw,2.6rem)] font-black tracking-tight text-[#111]">
            ¿Cómo quieres entrar?
          </h1>
          <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-[#111]/60">
            Entra con tu cuenta de Google para participar.
          </p>
        </div>

        {errorOAuth && (
          <p role="alert" className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={16} aria-hidden="true" /> {errorOAuth}
          </p>
        )}

        {user ? (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-[#0db954]/30 bg-[#0db954]/[0.07] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#002693] text-lg font-black text-white" aria-hidden="true">
                {(user.nombre || user.email).charAt(0).toUpperCase()}
              </span>
              <p className="flex-1 text-sm text-[#111]/75">
                <strong className="block text-[#111]">{user.nombre || 'Vecino'}</strong>
                {user.email} · {user.rol === 'vecino' ? 'Vecino' : 'Administrador'}
              </p>
              <button
                onClick={() => {
                  void salir()
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[#002693] hover:bg-[#002693]/5"
              >
                <LogOut size={15} aria-hidden="true" /> Salir
              </button>
            </div>
            <button
              onClick={continuar}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FE4102] text-[16px] font-extrabold text-white shadow-[3px_4px_0_rgba(0,0,0,0.2)] transition-all hover:bg-[#ff5a1f] active:translate-y-[1px] active:scale-[0.98] active:shadow-none"
            >
              Continuar <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : googleConfigured ? (
          <button
            onClick={entrarConGoogle}
            className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-black/10 bg-white px-5 text-[16px] font-extrabold text-[#111] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.4)] transition-all hover:border-black/25 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c0 1.1-.7 2.7-2.1 3.8l-.1.1 3 2.4.2.1c1.9-1.8 3-4.4 3-8.6z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.1.1-3.1 2.4-.1.1C3.9 21.3 7.7 24 12 24z" />
              <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.1-2.4-.1.1C.7 9.3 0 10.6 0 12s.7 2.7 1.9 3.9l3.3-1.5z" />
              <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.7 0 3.9 2.7 1.9 6.1l3.3 2.6c.9-2.7 3.6-4 6.8-4z" />
            </svg>
            Continuar con Google
          </button>
        ) : (
          <p role="alert" className="mt-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <AlertCircle size={16} aria-hidden="true" /> El login aún no está configurado en este entorno.
          </p>
        )}

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
