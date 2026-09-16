import { ArrowRight, Megaphone } from 'lucide-react'
import { Brush, DoodleArrow, Reveal } from './Decor'

export default function FinalCTA() {
  return (
    <section
      id="participar"
      className="relative overflow-hidden bg-[#FE4102] py-24 text-[#002693] lg:py-32"
    >
      {/* textura + acentos sobre el naranja */}
      <div className="halftone halftone-tang halftone-tiny absolute inset-0 opacity-30" />
      <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full bg-[#ff6a36] opacity-60 blur-3xl" />
      <span className="absolute left-10 top-12 text-5xl opacity-60">✺</span>
      <span className="absolute bottom-14 right-12 text-4xl opacity-60">✷</span>

      <div className="relative mx-auto max-w-[1280px] px-5 text-center lg:px-10">
        <Reveal>
          <DoodleArrow direction="up" className="doodle-svg mx-auto w-14" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="display mx-auto mt-4 max-w-[820px] text-[clamp(3rem,8vw,6.6rem)]">
            Tu barrio tiene
            <br />
            algo que decir.
          </h2>
        </Reveal>

        <Reveal delay={0.18}>
          <p className="mx-auto mt-6 max-w-[460px] text-[18px] font-medium leading-relaxed text-[#002693]/85">
            Cuéntanos qué está pasando cerca de ti. Un solo aporte puede cambiar una
            calle, un parque, una cuadra entera.
          </p>
        </Reveal>

        <Reveal delay={0.26}>
          <div className="relative mt-10 inline-flex items-center gap-4">
            <a href="#inicio" className="btn-tang-on-tang">
              Alzar mi voz
              <ArrowRight size={18} />
            </a>
            <Brush className="absolute -bottom-5 -right-10 w-24 -rotate-6 opacity-80" />
          </div>
        </Reveal>

        <Reveal delay={0.34}>
          <p className="mt-14 inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#002693]/70">
            <Megaphone size={14} />
            Gratis · Anónimo si quieres · 2 minutos
          </p>
        </Reveal>
      </div>
    </section>
  )
}