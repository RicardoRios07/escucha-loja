import { IMG } from '../data/content'
import { Reveal, Tape } from './Decor'

export default function Testimonial() {
  return (
    <section className="relative bg-white py-20 text-[#111111] lg:py-24">
      <div className="absolute right-8 top-10 text-[#FE4102] opacity-40 select-none" aria-hidden="true">
        <span className="text-[90px] leading-none">✦</span>
      </div>

      <div className="mx-auto max-w-[1080px] px-5 lg:px-10">
        <Reveal>
          {/* recorte editorial con bordes imperfectos */}
          <div className="papercut relative -rotate-[0.8deg] border-2 border-black/10 bg-[#fffaf2] p-7 shadow-[0_40px_80px_-35px_rgba(0,26,97,0.4)] sm:p-12">
            <div className="grain absolute inset-0 rounded-[inherit]" />
            <Tape className="-top-4 left-1/2 -translate-x-1/2 rotate-1" />

            <div className="relative grid items-center gap-8 sm:grid-cols-[200px_1fr] sm:gap-10">
              {/* retrato halftone pequeño */}
              <div className="relative mx-auto w-full max-w-[200px] sm:mx-0">
                <div className="papercut-alt rotate-2 overflow-hidden border-[6px] border-white bg-white shadow-[0_20px_40px_-20px_rgba(0,26,97,0.5)]">
                  <img
                    src={IMG.portrait}
                    alt="Vecina del barrio El Valle"
                    className="aspect-[4/5] w-full object-cover"
                    style={{ filter: 'saturate(0.5) contrast(1.08)' }}
                  />
                  <div className="halftone halftone-blue absolute inset-0 opacity-25 mix-blend-multiply" />
                </div>
                <span className="tape -bottom-3 left-1/2 w-16 -translate-x-1/2 rotate-3" />
              </div>

              {/* contenido */}
              <div className="relative">
                <svg viewBox="0 0 60 44" className="h-9 w-12 text-[#FE4102]" aria-hidden="true" fill="currentColor">
                  <path d="M0 44V24C0 11 9 2 24 0l3 8c-8 2-12 7-13 13h10v23H0zm30 0V24C30 11 39 2 54 0l3 8c-8 2-12 7-13 13h10v23H30z" />
                </svg>

                <blockquote className="mt-1 text-[clamp(1.55rem,3.4vw,2.3rem)] font-bold leading-snug text-[#002693]">
                  “Me gusta esta iniciativa porque nos da la oportunidad de ser
                  escuchados.”
                </blockquote>

                <div className="mt-6 flex items-center gap-3">
                  <span className="inline-block h-[3px] w-12 rounded-full bg-[#FE4102]" />
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#111]/60">
                    Vecina del barrio El Valle
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}