import { ArrowRight, MapPinned, Sparkles } from 'lucide-react'
import { IMG } from '../data/content'
import { Brush, BrushTag, DoodleArrow, Reveal } from './Decor'

export default function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[#002693] text-white">
      {/* textura de tinta: halftone + manchas + formas geométricas */}
      <div className="halftone halftone-tiny absolute inset-0 opacity-[0.16]" />
      <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#0635c4] opacity-70 blur-3xl" />
      <div className="absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-[#001a61] opacity-80 blur-2xl" />

      {/* trazos y formas decorativas */}
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="86%" cy="18%" r="90" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
        <circle cx="75%" cy="70%" r="14" fill="#FE4102" opacity="0.9" />
        <rect x="12%" y="82%" width="70" height="70" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" transform="rotate(14 120 650)" />
        <path d="M0 736 H 1200" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <path d="M840 96 L 936 64" stroke="#FE4102" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
        <path d="M144 240 L 264 304" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 10" />
      </svg>

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-20 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-10 lg:pb-28 lg:pt-40">
        {/* ===== IZQUIERDA ===== */}
        <div className="relative z-10">
          <Reveal>
            <BrushTag>10 aportes de vecinos</BrushTag>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="display mt-6 text-[clamp(3.4rem,8.5vw,7.4rem)]">
              ¿Qué necesita tu
              <br />
              <span className="relative inline-block text-[#FE4102]">
                barrio?
                <Brush className="absolute -bottom-2 left-0 w-full" />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="italic-strong mt-4 text-[clamp(1.9rem,4.4vw,3.2rem)] text-white/95" style={{ transform: 'skew(-4deg) rotate(-1.5deg)' }}>
              Cuéntalo.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-white/85">
              Tu opinión hace la diferencia. Comparte lo que ves, lo que falta y lo que
              podemos mejorar <span className="font-bold text-[#FE4102]">juntos</span>.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#participar" className="btn-tang">
                Quiero participar
                <ArrowRight size={17} />
              </a>
              <a href="#mapa" className="btn-ghost">
                <MapPinned size={16} />
                Ver mapa de la ciudad
              </a>
            </div>
          </Reveal>

          {/* línea fina + prueba social */}
          <Reveal delay={0.38}>
            <div className="mt-12 flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
              <span className="h-px w-14 bg-white/40" />
              <span>Loja · El Valle · Punzara · La Tebaida</span>
            </div>
          </Reveal>
        </div>

        {/* ===== DERECHA: retrato halftone + Loja ===== */}
        <div className="relative z-10 mx-auto w-full max-w-[460px]">
          <Reveal delay={0.2}>
            <div className="relative">
              {/* ciudad detrás */}
              <img
                src={IMG.cityTop}
                alt="Paisaje azul de Loja"
                className="absolute -top-8 left-1/2 w-[118%] -translate-x-1/2 rounded-2xl object-cover opacity-90 [mask-image:linear-gradient(180deg,#000_0%,transparent_86%)]"
                style={{ filter: 'saturate(0.4) brightness(1.12) contrast(1.05)' }}
              />

              {/* marco irregular + retrato recortado */}
              <div className="papercut relative mx-auto w-[82%] border-[9px] border-white bg-white shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)]">
                <img
                  src={IMG.portrait}
                  alt="Vecina de Loja levantando la mano"
                  className="papercut w-full object-cover"
                  style={{ filter: 'saturate(0.55) contrast(1.05)' }}
                />
                {/* halftone encima del retrato */}
                <div className="halftone halftone-blue halftone-coarse absolute inset-0 opacity-[0.22] mix-blend-multiply" />
              </div>

              {/* sticker manuscrito */}
              <div className="anim-float absolute -left-6 top-24 z-10 hidden -rotate-6 sm:block" style={{ ['--rot' as string]: '-6deg' }}>
                <span className="sticker rounded-full px-5 py-3 text-center">
                  <span className="script block text-[22px] leading-none text-[#002693]">
                    Tu voz también
                    <br />
                    construye la ciudad
                  </span>
                </span>
              </div>

              {/* acentos naranjas alrededor */}
              <div className="anim-wiggle absolute -right-3 top-1/3 z-10" style={{ ['--rot' as string]: '10deg' }}>
                <Brush className="w-24 -rotate-12" />
              </div>

              <DoodleArrow className="doodle-svg absolute -right-10 bottom-24 z-10 hidden w-24 -scale-x-100 md:block" direction="right" />
              <Sparkles size={26} className="anim-float absolute right-4 -top-5 z-10 text-[#FE4102]" />
              <span className="absolute -bottom-5 right-8 h-5 w-5 rounded-[7px] border-2 border-[#FE4102] bg-transparent" />
            </div>
          </Reveal>
        </div>
      </div>

      {/* franja inferior: ondulación azul más oscura hacia el mapa */}
      <div className="relative h-16 bg-[linear-gradient(180deg,#002693_0%,#001a61_120%)]">
        <div className="halftone halftone-blue absolute inset-0 opacity-[0.18]" />
      </div>
    </section>
  )
}