import { useEffect, useRef } from 'react'
import { CalendarDays, MapPin, X } from 'lucide-react'
import MediaThumb from './MediaThumb'
import { getBarrioAprox } from '../../lib/escucha/store'
import { categoriaColor, gravedadColor } from '../../lib/escucha/geo'
import type { MvpDenuncia } from '../../lib/escucha/types'

function maskCedula(c: string) {
  if (!c || c.length < 5) return '••••'
  return `${c.slice(0, 3)}…${c.slice(-2)}`
}

interface Props {
  denuncia: MvpDenuncia
  score: number
  sector: string
  onClose: () => void
}

/** Detalle completo de un reporte para el panel admin (modal). */
export default function AdminDetalleModal({ denuncia: d, score, sector, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocus.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[env(safe-area-inset-bottom)] sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del reporte en ${sector}`}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/95 px-4 py-3 backdrop-blur">
          <p className="text-sm font-black text-[#111]">
            {sector} · <span className="num text-[#002693]">Score {score}</span>
          </p>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-gray-100 active:scale-95"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          {d.evidencia.length > 0 ? (
            <div className={`grid gap-2 ${d.evidencia.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {d.evidencia.map((item, i) => (
                <MediaThumb
                  key={typeof item === 'string' ? `ev-${i}` : item.id}
                  item={item}
                  alt={`Evidencia ${i + 1} del reporte`}
                  controles
                  className="aspect-[4/3] w-full rounded-xl border object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="grid aspect-[16/9] place-items-center rounded-xl border border-dashed bg-gray-50 text-sm text-gray-400">
              Sin evidencia visual
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[12px] font-black text-white" style={{ background: categoriaColor(d.categoriaLabel) }}>
              {d.categoriaLabel}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[12px] font-black text-white" style={{ background: gravedadColor(d.encuesta.gravedad) }}>
              {d.encuesta.gravedad}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-bold text-gray-600">
              {d.encuesta.frecuencia} · {d.encuesta.tiempoProblema}
            </span>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-[#111]/85">{d.descripcion}</p>

          <dl className="mt-4 flex flex-col gap-2.5 rounded-2xl border bg-[#f8fafc] p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#FE4102]" aria-hidden="true" />
              <div>
                <dt className="sr-only">Ubicación</dt>
                <dd className="font-bold text-[#111]">
                  {[d.encuesta.direccionPrincipal, d.encuesta.calleSecundaria].filter(Boolean).join(' · ') || sector}
                </dd>
                {d.encuesta.referencia && <dd className="text-[13px] text-[#111]/55">{d.encuesta.referencia}</dd>}
                <dd className="text-[12px] tabular-nums text-[#111]/40">
                  {d.lat.toFixed(5)}, {d.lng.toFixed(5)} · {getBarrioAprox(d.lat, d.lng)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5 border-t border-black/5 pt-2.5">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#FE4102]" aria-hidden="true" />
              <div>
                <dt className="sr-only">Fecha e impacto</dt>
                <dd className="font-semibold text-[#111]/75">{new Date(d.createdAt).toLocaleString()}</dd>
                <dd className="text-[12px] text-[#111]/45">
                  {[d.encuesta.afectaMovilidad && 'Afecta movilidad', d.encuesta.afectaSalud && 'Afecta salud', d.encuesta.yaReportadoMunicipio && 'Ya reportado antes'].filter(Boolean).join(' · ') || 'Sin impacto marcado'}
                  {' · '}Cédula {maskCedula(d.cedula)}
                  {d.nombreCiudadano ? ` · ${d.nombreCiudadano}` : ''}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
