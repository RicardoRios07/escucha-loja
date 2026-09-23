import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/escucha/Logo'

/** Términos y condiciones v1 de Escucha Loja. */
export default function TerminosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl bg-white px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col items-center text-center">
        <Logo height={48} tile />
        <h1 className="mt-4 text-[clamp(1.8rem,6vw,2.4rem)] font-black tracking-tight text-[#111]">
          Términos y condiciones
        </h1>
        <p className="mt-1 text-sm text-[#111]/50">Versión 1 · Escucha Loja</p>
      </div>

      <div className="mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-[#111]/80">
        <section>
          <h2 className="font-extrabold text-[#111]">1. Qué es Escucha Loja</h2>
          <p className="mt-1">
            Un canal ciudadano para reportar problemas de la ciudad (agua, saneamiento
            ambiental, movilidad urbana y servicios ciudadanos) con foto o video, ubicación y un relato breve.
            Los aportes alimentan un mapa público y un análisis de priorización.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">2. Tu cuenta</h2>
          <p className="mt-1">
            Entras con tu cuenta de Google. Guardamos tu nombre, correo, número celular
            y la fecha en que aceptaste estos términos. Usamos tu celular solo para
            contactarte sobre tus reportes. Nunca lo publicamos.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">3. Lo que publicamos</h2>
          <p className="mt-1">
            En el mapa y los resúmenes solo aparecen el problema, el sector aproximado
            (parroquia/barrio) y la evidencia. Tu nombre, correo, cédula y celular
            nunca se publican.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">4. Tu evidencia</h2>
          <p className="mt-1">
            Al adjuntar fotos o videos declaras que son tuyos o que tienes derecho a
            compartirlos, y autorizas su publicación en el mapa de la campaña. No subas
            contenido con datos personales de terceros (placas legibles, rostros
            identificables) salvo que sea necesario para evidenciar el problema.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">5. Uso responsable</h2>
          <p className="mt-1">
            Reporta hechos reales. Los aportes falsos o con contenido ofensivo pueden
            ser descartados por el equipo de revisión.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">6. Tus derechos</h2>
          <p className="mt-1">
            Puedes pedir la eliminación de tus datos y reportes en cualquier momento
            escribiendo al equipo de la campaña. Al eliminar tu cuenta se borran tu
            perfil y tus reportes asociados.
          </p>
        </section>
      </div>

      <Link
        to="/bienvenida"
        className="mx-auto mt-8 flex min-h-[44px] w-fit items-center gap-1.5 rounded-full px-4 text-sm font-bold text-[#002693]/70 hover:text-[#002693]"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Volver
      </Link>
    </main>
  )
}
