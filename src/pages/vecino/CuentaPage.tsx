import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, LogOut, Save, UserRound } from 'lucide-react'
import { useAuth } from '../../components/escucha/AuthContext'
import { formatearCedula, validarCedulaEcuador } from '../../lib/escucha/cedula'

export default function CuentaPage() {
  const navigate = useNavigate()
  const { sesion, actualizar, salir } = useAuth()
  const [nombre, setNombre] = useState(sesion?.nombre ?? '')
  const [cedula, setCedula] = useState(sesion?.cedula ?? '')
  const [cedulaError, setCedulaError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const validar = (): boolean => {
    const v = cedula.trim()
    if (!v) {
      setCedulaError(null)
      return true
    }
    const r = validarCedulaEcuador(v)
    if (!r.valid) {
      setCedulaError(r.error || 'Cédula inválida')
      return false
    }
    setCedulaError(null)
    return true
  }

  const guardar = () => {
    if (!validar()) {
      document.getElementById('cuenta-cedula')?.focus()
      return
    }
    actualizar({ nombre, cedula })
    setGuardado(true)
    window.setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#002693]/[0.07] text-[#002693]">
          <UserRound size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#111]">Mi cuenta</h1>
          <p className="text-[13px] text-[#111]/55">
            Sesión de vecino{sesion?.createdAt ? ` · desde ${new Date(sesion.createdAt).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>

      <section aria-label="Datos de sesión" className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cuenta-nombre" className="text-sm font-bold text-[#111]">
              Nombre
            </label>
            <input
              id="cuenta-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="¿Cómo te llamamos?"
              autoComplete="name"
              className="h-[52px] rounded-xl border border-black/15 bg-white px-4 text-[16px] outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cuenta-cedula" className="text-sm font-bold text-[#111]">
              Cédula <span className="font-normal text-[#111]/45">(vincula tus reportes)</span>
            </label>
            <input
              id="cuenta-cedula"
              value={cedula}
              onChange={(e) => {
                setCedula(formatearCedula(e.target.value))
                if (cedulaError) setCedulaError(null)
              }}
              onBlur={validar}
              placeholder="1100234567"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              aria-invalid={!!cedulaError}
              aria-describedby={cedulaError ? 'cuenta-cedula-error' : undefined}
              className={`h-[52px] rounded-xl border bg-white px-4 text-[16px] outline-none placeholder:text-[#111]/35 focus:ring-2 ${
                cedulaError
                  ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/20'
                  : 'border-black/15 focus:border-[#002693] focus:ring-[#002693]/20'
              }`}
            />
            {cedulaError && (
              <p id="cuenta-cedula-error" role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#ef4444]">
                <CircleAlert size={15} aria-hidden="true" /> {cedulaError}
              </p>
            )}
          </div>
          <button
            onClick={guardar}
            className="mt-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#002693] text-[15px] font-bold text-white active:scale-[0.98]"
          >
            <Save size={16} aria-hidden="true" /> Guardar cambios
          </button>
          <p aria-live="polite" className={`text-[13px] font-semibold text-[#0db954] ${guardado ? '' : 'invisible'}`}>
            Cambios guardados.
          </p>
        </div>
      </section>

      <section aria-label="Acerca de" className="mt-4 rounded-2xl border bg-white p-4">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#111]/50">
          Acerca de
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#111]/65">
          Escucha Loja es un canal directo entre vecinos y candidato: tus reportes alimentan
          el mapa, las estadísticas y la priorización de la ciudad. Tus datos personales
          nunca se publican. Demo local sin servidor.
        </p>
      </section>

      <button
        onClick={() => {
          salir()
          navigate('/')
        }}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#ef4444]/30 text-[15px] font-extrabold text-[#ef4444] active:scale-[0.99]"
      >
        <LogOut size={17} aria-hidden="true" /> Cerrar sesión
      </button>
    </main>
  )
}
