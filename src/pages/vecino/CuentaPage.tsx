import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, Phone, ShieldCheck } from 'lucide-react'
import PageBanner from '../../components/escucha/PageBanner'
import { useAuth } from '../../components/escucha/AuthContext'
import { useMisReportes } from '../../lib/escucha/repo'

export default function CuentaPage() {
  const navigate = useNavigate()
  const { user, salir } = useAuth()
  const { datos: mios } = useMisReportes()

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-2xl lg:px-8">
      <PageBanner
        variant="compact"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Mi cuenta"
        title={`Hola${user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ', vecino'}`}
        desc="Sesión con tu cuenta de Google"
      />

      <div className="pb-6">
        <section aria-label="Datos de sesión" className="mt-4 rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#002693] text-xl font-black text-white" aria-hidden="true">
              {((user?.nombre || user?.email) ?? 'V').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-[#111]">{user?.nombre || 'Vecino'}</p>
              <p className="truncate text-[13px] text-[#111]/55">{user?.email}</p>
            </div>
          </div>
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <Mail size={16} className="shrink-0 text-[#002693]" aria-hidden="true" />
              <dd className="truncate text-[#111]/75">{user?.email}</dd>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={16} className="shrink-0 text-[#002693]" aria-hidden="true" />
              <dd className="text-[#111]/75">{user?.celular || 'Sin celular registrado'}</dd>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="shrink-0 text-[#002693]" aria-hidden="true" />
              <dd className="text-[#111]/75">
                {user?.rol === 'admin' ? 'Administrador' : 'Vecino'} · {mios.length} reportes
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-[#111]/45">
            Tus datos los gestiona tu cuenta de Google. Tu celular solo se usa para
            contactarte sobre tus reportes y nunca se publica.
          </p>
        </section>

        <section aria-label="Acerca de" className="mt-4 rounded-2xl border bg-white p-4">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#111]/50">
            Acerca de
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#111]/65">
            Jesús Escucha es un canal directo con la ciudad: tus reportes alimentan
            el mapa, las estadísticas y la priorización que revisamos cada semana.
            Tus datos personales nunca se publican.
          </p>
        </section>

        <button
          onClick={() => {
            void salir()
            navigate('/')
          }}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#ef4444]/30 text-[15px] font-extrabold text-[#ef4444] active:scale-[0.99]"
        >
          <LogOut size={17} aria-hidden="true" /> Cerrar sesión
        </button>
      </div>
    </main>
  )
}
