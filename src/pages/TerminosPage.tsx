import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/escucha/Logo'

/** Términos y condiciones v1 de Jesús Escucha. */
export default function TerminosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl bg-white px-5 py-10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col items-center text-center">
        <Logo height={48} tile />
        <h1 className="mt-4 text-[clamp(1.8rem,6vw,2.4rem)] font-black tracking-tight text-[#111]">
          Términos y condiciones
        </h1>
        <p className="mt-1 text-sm text-[#111]/50">Versión 1 · Jesús Escucha</p>
      </div>

      <div className="mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-[#111]/80">
        <section>
          <h2 className="font-extrabold text-[#111]">1. Qué es Jesús Escucha</h2>
          <p className="mt-1">
            Un canal ciudadano para reportar problemas de la ciudad (agua, saneamiento
            ambiental, movilidad urbana y servicios ciudadanos) con foto o video, ubicación y un relato breve.
            Los aportes alimentan un mapa público y un análisis de priorización.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">2. Responsable y encargado del tratamiento</h2>
          <p className="mt-1">
            Responsable del tratamiento: Campaña de Jesús Alejandro Cárdenas López,
            quien determina las finalidades descritas en estos términos.
            Encargado del tratamiento: ETHERLAB S.A.S., RUC 1191798608001,
            que opera la plataforma por cuenta del responsable.
            Para ejercer tus derechos escribe a info@etherlab.dev.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">3. Tu cuenta y base legal</h2>
          <p className="mt-1">
            Entras con tu cuenta de Google. La base legal del tratamiento de tus datos
            es tu consentimiento libre, expreso, informado e inequívoco, que otorgas al
            aceptar estos términos y la autorización de tratamiento de datos en la
            pantalla de bienvenida. Puedes revocar tu consentimiento en cualquier momento
            escribiendo a info@etherlab.dev.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">4. Datos que tratamos y finalidades</h2>
          <p className="mt-1">
            Tratamos tu nombre, correo, número celular, tus reportes y evidencia, y la
            fecha y versión de tu aceptación. Los usamos únicamente para: (a) contactarte
            sobre tus reportes por llamada, SMS o WhatsApp; (b) análisis agregado para
            priorización de problemas de la ciudad; (c) comunicación de la campaña.
            Cualquier finalidad distinta requerirá una nueva versión de estos términos
            y tu nueva aceptación.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">5. Lo que publicamos</h2>
          <p className="mt-1">
            En el mapa y los resúmenes solo aparecen el problema, el sector aproximado
            (parroquia/barrio) y la evidencia. Tu nombre, correo, cédula y celular
            nunca se publican.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">6. Tu evidencia</h2>
          <p className="mt-1">
            Al adjuntar fotos o videos declaras que son tuyos o que tienes derecho a
            compartirlos, y autorizas su publicación en el mapa de la campaña. No subas
            contenido con datos personales de terceros (placas legibles, rostros
            identificables) salvo que sea necesario para evidenciar el problema.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">7. Uso responsable</h2>
          <p className="mt-1">
            Reporta hechos reales. Los aportes falsos o con contenido ofensivo pueden
            ser descartados por el equipo de revisión. Esta plataforma está dirigida
            únicamente a personas mayores de edad.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">8. Conservación y transferencias</h2>
          <p className="mt-1">
            Conservamos tus datos mientras tu cuenta esté activa y los eliminamos cuando
            pidas la eliminación de tu cuenta. Usamos a Google únicamente para el inicio
            de sesión con tu cuenta; no cedemos tus datos a otros terceros.
          </p>
        </section>
        <section>
          <h2 className="font-extrabold text-[#111]">9. Tus derechos</h2>
          <p className="mt-1">
            Tienes derecho de acceso, actualización, rectificación, eliminación, revocación
            del consentimiento, portabilidad y oposición sobre tus datos personales, conforme
            a la Ley Orgánica de Protección de Datos Personales del Ecuador. Para ejercerlos,
            o para pedir la eliminación de tu cuenta y reportes asociados, escribe a
            info@etherlab.dev.
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
