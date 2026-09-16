import { ArrowRight, Camera, LocateFixed, Pickaxe } from 'lucide-react'
import { IMG } from '../data/content'
import { Brush, DoodleArrow, Reveal, Tape } from './Decor'

const STEPS = [
  {
    n: '01',
    icon: Pickaxe,
    title: 'ELIGE',
    text: 'Agua, recolección, movilidad o control urbano.',
  },
  {
    n: '02',
    icon: LocateFixed,
    title: 'UBICA',
    text: 'Marca el punto exacto en el mapa.',
  },
  {
    n: '03',
    icon: Camera,
    title: 'EVIDENCIA',
    text: 'Agrega una foto y cuenta brevemente qué sucede.',
  },
]

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden bg-[#002693] py-20 text-white lg:py-28"
    >
      {/* textura de puntos sobre el azul */}
      <div className="halftone halftone-tang halftone-tiny absolute inset-0 opacity-20" />
      <div className="absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#0a3fd8] opacity-60 blur-3xl" />
      <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#001a61] opacity-70 blur-3xl" />

      {/* línea fina */}
      <svg viewBox="0 0 1200 900" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M0 120 H 1200" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <path d="M1200 700 L 0 700" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        <circle cx="88%" cy="82%" r="70" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <circle cx="90%" cy="84%" r="42" fill="none" stroke="rgba(254,65,2,0.7)" strokeWidth="2" />
      </svg>

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        {/* ===== PASOS ===== */}
        <div>
          <Reveal>
            <p className="kicker-mono text-[#FE4102]">Participa ya</p>
            <h2 className="display mt-5 text-[clamp(2.7rem,5.6vw,4.6rem)]">
              Tres pasos,
              <br />
              <span className="italic-strong text-[#FE4102]">
                menos de 2 minutos.
              </span>
            </h2>
          </Reveal>

          <div className="mt-10 space-y-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={0.08 * i}>
                <div
                  className={`group flex items-center gap-5 rounded-[18px] bg-white p-5 shadow-[var(--shadow-pop)] transition-transform duration-300 hover:-translate-y-1 ${
                    i === 1 ? 'rotate-[0.6deg]' : i === 2 ? '-rotate-[0.6deg]' : ''
                  }`}
                >
                  <span className="num shrink-0 text-[46px] leading-none text-[#FE4102] drop-shadow-sm">
                    {step.n}
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#002693] text-white transition-transform group-hover:scale-110">
                    <step.icon size={19} />
                  </span>
                  <span className="leading-tight">
                    <span className="display block text-[20px] text-[#002693]">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[14px] font-medium text-[#111]/65">
                      {step.text}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <a
              href="#participar"
              className="btn-tang mt-9 bg-[#FE4102]"
            >
              Empezar ahora
              <ArrowRight size={17} />
            </a>
          </Reveal>
        </div>

        {/* ===== CELULAR ===== */}
        <div className="relative z-10 mx-auto w-full max-w-[440px] lg:-mr-8 lg:mt-6">
          <Reveal delay={0.15}>
            <div className="relative flex items-end justify-center">
              <DoodleArrow
                direction="left"
                className="doodle-svg absolute -left-8 top-16 z-20 hidden w-20 lg:block"
              />
              <div
                className="anim-float relative z-10 w-[78%]"
                style={{ ['--rot' as string]: '4deg' }}
              >
                <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-2" />
                <img
                  src={IMG.phone}
                  alt="Pantalla de la app Escucha Loja para reportar en el mapa"
                  className="w-full rounded-[30px] object-cover shadow-[0_50px_90px_-35px_rgba(0,0,0,0.6)]"
                  style={{ transform: 'rotate(5deg)' }}
                />
              </div>

              {/* sticker frase manuscrita */}
              <div className="anim-float absolute -right-4 bottom-10 z-20 hidden -rotate-6 sm:block" style={{ ['--rot' as string]: '-6deg' }}>
                <span className="sticker inline-block rounded-[12px] px-5 py-4 shadow-[var(--shadow-sticker)]">
                  <span className="script block text-[24px] leading-[0.95] text-[#002693]">
                    Tu voz también
                    <br />
                    construye la ciudad.
                  </span>
                </span>
              </div>

              {/* trazos alrededor */}
              <Brush className="absolute -right-6 top-6 z-0 w-28 -rotate-6 opacity-90" />
              <span className="absolute -left-2 top-2 h-4 w-4 rounded-full border-2 border-white/80" />
              <span className="absolute bottom-2 left-4 z-0 text-[26px] text-[#FE4102]">
                ✦
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}