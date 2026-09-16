import { ArrowRight, Users } from 'lucide-react'
import { CATEGORIES, IMG } from '../data/content'
import { Brush, Reveal, Sticker } from './Decor'

export default function WhatIsHappening() {
  const total = CATEGORIES.reduce((acc, c) => acc + c.count, 0)
  return (
    <section
      id="aportes"
      className="relative overflow-hidden bg-white py-20 text-[#111111] lg:py-28"
    >
      <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
        {/* ===== Título ===== */}
        <Reveal>
          <div className="max-w-[720px]">
            <p className="kicker-mono text-[#FE4102]">Aportes de la comunidad</p>
            <h2 className="display mt-4 text-[clamp(2.7rem,6vw,5rem)] text-[#002693]">
              Lo que está pasando
              <br />
              <span className="relative inline-block text-[#FE4102]">
                en Loja
                <Brush className="absolute -bottom-3 left-0 w-full" />
              </span>
            </h2>
            <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-[#111]/65">
              Estas son las voces de los barrios: los temas que más repiten los vecinos y
              los puntos que la ciudad necesita atender primero.
            </p>
          </div>
        </Reveal>

        {/* ===== Tarjetas de categorías ===== */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.key} delay={0.07 * i}>
              <a
                href="#mapa"
                className={`group relative block overflow-hidden rounded-[20px] border-2 p-5 transition-all duration-300 hover:-translate-y-1.5 lg:p-6 ${
                  c.key === 'agua'
                    ? 'border-[#0DB954]/30 bg-[#0DB954]/[0.05] hover:shadow-[0_24px_50px_-24px_rgba(13,185,84,0.6)]'
                    : c.key === 'movilidad'
                      ? 'border-[#002693]/20 bg-[#002693]/[0.04] hover:shadow-[0_24px_50px_-24px_rgba(0,38,147,0.55)]'
                      : c.key === 'seguridad'
                        ? 'border-[#FE4102]/25 bg-[#FE4102]/[0.04] hover:shadow-[0_24px_50px_-24px_rgba(254,65,2,0.55)]'
                        : 'border-[#007BFF]/25 bg-[#007BFF]/[0.04] hover:shadow-[0_24px_50px_-24px_rgba(0,123,255,0.55)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-[16px] text-[24px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" style={{ background: `${c.color}14` }}>
                    {c.emoji}
                  </span>
                  <ArrowRight size={17} className="text-[#111]/30 transition-transform group-hover:translate-x-1 group-hover:text-[#FE4102]" />
                </div>
                <div className="mt-6">
                  <h3 className="display text-[22px] text-[#002693]">{c.label}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-[#111]/55">{c.description}</p>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="num text-[30px] leading-none text-[#FE4102]">{c.count}</span>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#111]/45">
                    aportes
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>

        {/* ===== Imagen inferior de Loja + total ===== */}
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <Reveal>
            <div className="flex items-center gap-5 rounded-[24px] bg-[#002693] p-7 text-white lg:p-9">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-white/10">
                <Users size={30} className="text-[#FE4102]" />
              </span>
              <div>
                <span className="num block text-[44px] leading-none text-white">{total}</span>
                <span className="mt-1 block text-[13px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  aportes suman la voz de la ciudad
                </span>
              </div>
            </div>
            <p className="mt-7 max-w-[460px] text-[16px] leading-relaxed text-[#111]/65">
              Cada aporte es parte de un diagnóstico colectivo. Cuando miles señalan lo
              mismo, la ciudad entera escucha — y empieza a cambiar.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative">
              <div className="papercut overflow-hidden border-[8px] border-white bg-white shadow-[0_30px_70px_-30px_rgba(0,26,97,0.5)]">
                <img
                  src={IMG.cityCorner}
                  alt="Ilustración azul de la ciudad de Loja"
                  className="w-full object-cover"
                  style={{ filter: 'saturate(0.4) brightness(1.1) contrast(1.06)' }}
                />
                <div className="halftone halftone-blue halftone-coarse absolute inset-0 opacity-20 mix-blend-multiply" />
                {/* línea naranja atravesando la imagen */}
                <svg viewBox="0 0 600 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path d="M-20 330 C 180 280, 320 380, 630 120" stroke="#FE4102" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.85" />
                </svg>
              </div>
              {/* sticker */}
              <div className="anim-float absolute -bottom-6 left-6 z-10 -rotate-3" style={{ ['--rot' as string]: '-3deg' }}>
                <Sticker rotate={-3} className="sticker-loja px-5 py-3">
                  <span className="display text-[18px] leading-none">Juntos por una mejor Loja</span>
                </Sticker>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}