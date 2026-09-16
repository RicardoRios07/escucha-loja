import { useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import {
  IMG,
  MARKERS,
  CATEGORIES,
  CATEGORY_COLOR,
  type CategoryKey,
} from '../data/content'
import { Reveal, Sticker } from './Decor'

const FILTERS: { key: CategoryKey | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'agua', label: 'Agua' },
  { key: 'movilidad', label: 'Movilidad' },
  { key: 'seguridad', label: 'Seguridad' },
  { key: 'espacio', label: 'Espacio público' },
]

export default function MapSection() {
  const [filter, setFilter] = useState<CategoryKey | 'todos'>('todos')
  const [selected, setSelected] = useState<number | null>(null)

  const visible = useMemo(
    () => (filter === 'todos' ? MARKERS : MARKERS.filter((m) => m.category === filter)),
    [filter],
  )

  const categoryLabel = (key: CategoryKey) =>
    CATEGORIES.find((c) => c.key === key)?.label ?? key

  return (
    <section id="mapa" className="relative bg-white py-20 text-[#111111] lg:py-28">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        {/* ===== MAPA ===== */}
        <Reveal>
          <div className="relative">
            {/* sticker sobre el mapa */}
            <div className="anim-float absolute -top-6 left-6 z-20 -rotate-3" style={{ ['--rot' as string]: '-3deg' }}>
              <Sticker rotate={-3} className="px-5 py-3 text-2xl">
                <span className="display text-[22px]">Loja en el mapa</span>
              </Sticker>
            </div>

            <div className="relative overflow-hidden rounded-[26px] shadow-[0_30px_70px_-30px_rgba(0,26,97,0.45)] ring-1 ring-black/10">
              <img
                src={IMG.map}
                alt="Mapa de la ciudad de Loja con aportes de los vecinos"
                className="aspect-[3/2] w-full object-cover"
                style={{ filter: 'saturate(0.5) contrast(1.06) brightness(1.02)' }}
              />
              {/* halftone sutil sobre el mapa */}
              <div className="halftone halftone-blue halftone-tiny absolute inset-0 opacity-[0.07] mix-blend-multiply" />

              {/* marcadores */}
              {visible.map((m) => (
                <button
                  key={m.id}
                  className="marker-dot"
                  style={{
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    background: CATEGORY_COLOR[m.category],
                    color: CATEGORY_COLOR[m.category],
                    zIndex: selected === m.id ? 30 : 10,
                  }}
                  onClick={() => setSelected((s) => (s === m.id ? null : m.id))}
                  aria-label={`${categoryLabel(m.category)} en ${m.barrio}`}
                />
              ))}

              {/* tooltip del marcador */}
              {selected && (
                <div
                  className="absolute z-40 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-white p-3 shadow-[0_18px_40px_-12px_rgba(0,26,97,0.5)] ring-1 ring-black/10"
                  style={{
                    left: `${MARKERS.find((m) => m.id === selected)?.x ?? 50}%`,
                    top: `${MARKERS.find((m) => m.id === selected)?.y ?? 50}%`,
                  }}
                >
                  <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#002693]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: CATEGORY_COLOR[
                          MARKERS.find((m) => m.id === selected)?.category ?? 'agua'
                        ],
                      }}
                    />
                    {categoryLabel(
                      MARKERS.find((m) => m.id === selected)?.category ?? 'agua',
                    )}
                  </span>
                  <p className="text-sm font-extrabold text-[#111]">
                    {MARKERS.find((m) => m.id === selected)?.title}
                  </p>
                  <p className="text-xs text-[#111]/55">
                    Barrio {MARKERS.find((m) => m.id === selected)?.barrio}
                  </p>
                </div>
              )}

              {/* contador de aportes */}
              <div className="absolute bottom-4 right-4 z-20">
                <Sticker rotate={2}>
                  <span className="flex items-center gap-2 text-[#002693]">
                    <span className="num text-[26px] leading-none">{visible.length}</span>
                    <span className="text-[11px] font-extrabold leading-tight uppercase tracking-wide">
                      {filter === 'todos' ? 'aportes registrados' : 'aportes filtrados'}
                    </span>
                  </span>
                </Sticker>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ===== PANEL LATERAL ===== */}
        <Reveal delay={0.12}>
          <div className="relative">
            <p className="kicker-mono text-[#FE4102]">Loja en el mapa</p>
            <h2 className="display mt-4 text-[clamp(2.6rem,5vw,4rem)] text-[#002693]">
              Tu ciudad.
              <br />
              <span className="text-[#FE4102]">Tu voz.</span>
            </h2>
            <p className="mt-5 max-w-[400px] text-[16px] leading-relaxed text-[#111]/70">
              Mira qué está pasando en los distintos barrios y descubre dónde están las
              necesidades de la ciudad. Cada punto es un vecino que alzó la voz.
            </p>

            {/* filtros */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {FILTERS.map((f) => {
                const active = filter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key)
                      setSelected(null)
                    }}
                    className={`rounded-full border-2 px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-all ${
                      active
                        ? 'border-[#002693] bg-[#002693] text-white shadow-[2px_3px_0_rgba(0,0,0,0.18)]'
                        : 'border-[#002693]/20 bg-white text-[#002693] hover:border-[#002693]/50'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* leyenda con conteos */}
            <div className="mt-8 grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((c) => {
                const active = filter === c.key
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(filter === c.key ? 'todos' : c.key)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-[#002693] bg-[#002693]/[0.04]'
                        : 'border-black/10 bg-white hover:border-black/25'
                    }`}
                  >
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full"
                      style={{ background: `${c.color}1a` }}
                    >
                      <span className="text-[15px]">{c.emoji}</span>
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[12px] font-extrabold text-[#111]">
                        {c.label}
                      </span>
                      <span className="num block text-[13px] text-[#002693]">
                        {c.count} aportes
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#111]/45">
              <Layers size={15} className="text-[#FE4102]" />
              Filtra por problema · toca un punto para verlo
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}