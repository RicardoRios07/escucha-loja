import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, MapPin, Share2, Trash2 } from 'lucide-react'
import MediaThumb from '../../components/escucha/MediaThumb'
import { getBarrioAprox } from '../../lib/escucha/store'
import { borrarReporte, useMisReportes, useReportesPublicos } from '../../lib/escucha/repo'
import { categoriaColor, gravedadColor } from '../../lib/escucha/geo'
import PageBanner from '../../components/escucha/PageBanner'

export default function ReporteDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [copiado, setCopiado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const { datos: mios, cargando: cargandoMios, recargar } = useMisReportes()
  const { datos: publicos, cargando: cargandoPublicos } = useReportesPublicos()
  const cargando = cargandoMios || cargandoPublicos
  const d = mios.find((x) => x.id === id) ?? publicos.find((x) => x.id === id)
  const esPropio = !!d && mios.some((x) => x.id === d.id)

  if (cargando && !d) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-10 text-center">
        <p className="text-lg font-black text-[#111]" role="status">Cargando reporte…</p>
      </main>
    )
  }

  if (!d) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-10 text-center">
        <p className="text-lg font-black text-[#111]">Reporte no encontrado</p>
        <p className="mt-1 text-sm text-[#111]/55">Pudo haber sido eliminado por su autor.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-[#002693] px-6 text-sm font-bold text-white active:scale-[0.98]"
        >
          Volver
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 lg:max-w-3xl lg:px-8">
      {/* Banner compacto con volver integrado */}
      <PageBanner
        variant="compact"
        className="rounded-2xl"
        hideLogoDesktop
        eyebrow="Detalle de reporte"
        title={d.categoriaLabel}
        desc={`${getBarrioAprox(d.lat, d.lng)} · ${new Date(d.createdAt).toLocaleDateString()}`}
        leading={
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        }
      />

      <div className="pt-4">
      {d.evidencia.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${d.evidencia.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {d.evidencia.map((item, i) => (
            <MediaThumb
              key={typeof item === 'string' ? `ev-${i}` : 'remoto' in item ? item.url : item.id}
              item={item}
              alt={`Evidencia ${i + 1} del reporte`}
              controles
              className="aspect-[4/3] w-full rounded-2xl border object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid aspect-[16/9] place-items-center rounded-2xl border border-dashed bg-white text-sm text-gray-400">
          Sin evidencia visual
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-black text-white"
          style={{ background: categoriaColor(d.categoriaLabel) }}
        >
          {d.categoriaLabel}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-black text-white"
          style={{ background: gravedadColor(d.encuesta.gravedad) }}
        >
          {d.encuesta.gravedad}
        </span>
      </div>

      <p className="mt-3 text-[15px] leading-relaxed text-[#111]/85">{d.descripcion}</p>

      <dl className="mt-4 flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-sm">
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[#FE4102]" aria-hidden="true" />
          <div>
            <dt className="sr-only">Ubicación</dt>
            <dd className="font-bold text-[#111]">
              {[d.encuesta.direccionPrincipal, d.encuesta.calleSecundaria].filter(Boolean).join(' · ') || getBarrioAprox(d.lat, d.lng)}
            </dd>
            {d.encuesta.referencia && <dd className="text-[13px] text-[#111]/55">{d.encuesta.referencia}</dd>}
            <dd className="text-[12px] tabular-nums text-[#111]/40">
              {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5 border-t border-black/5 pt-2.5">
          <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#FE4102]" aria-hidden="true" />
          <div>
            <dt className="sr-only">Fecha</dt>
            <dd className="font-semibold text-[#111]/75">
              {new Date(d.createdAt).toLocaleString()} · {d.encuesta.frecuencia} · {d.encuesta.tiempoProblema}
            </dd>
            <dd className="text-[12px] text-[#111]/45">
              {[d.encuesta.afectaMovilidad && 'Afecta movilidad', d.encuesta.afectaSalud && 'Afecta salud', d.encuesta.yaReportadoMunicipio && 'Ya reportado antes'].filter(Boolean).join(' · ') || 'Sin impacto marcado'}
            </dd>
          </div>
        </div>
      </dl>

      <Link
        to="/vecino/comunidad"
        className="mt-4 flex min-h-[52px] items-center justify-center rounded-full border-2 border-[#002693] text-[15px] font-extrabold text-[#002693] active:scale-[0.99]"
      >
        Ver qué pasa en mi ciudad
      </Link>

      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            const url = window.location.href
            try {
              if (navigator.share) {
                await navigator.share({ title: 'Reporte en Escucha Loja', text: d.descripcion, url })
              } else {
                throw new Error('sin-share')
              }
            } catch (e) {
              if (e instanceof Error && e.name === 'AbortError') return
              let copiadoOk = false
              try {
                await navigator.clipboard.writeText(url)
                copiadoOk = true
              } catch {
                try {
                  const ta = document.createElement('textarea')
                  ta.value = url
                  ta.style.position = 'fixed'
                  ta.style.opacity = '0'
                  document.body.appendChild(ta)
                  ta.select()
                  copiadoOk = document.execCommand('copy')
                  document.body.removeChild(ta)
                } catch {
                  /* sin portapapeles: no-op */
                }
              }
              if (copiadoOk) {
                setCopiado(true)
                window.setTimeout(() => setCopiado(false), 2500)
              }
            }
          }}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border bg-white text-sm font-bold text-[#002693] active:scale-[0.98]"
        >
          {copiado ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          {copiado ? 'Enlace copiado' : 'Compartir'}
        </button>
        {esPropio && (
          <button
            onClick={async () => {
              if (!window.confirm('¿Eliminar este reporte? Se borrará de tu cuenta con su evidencia.')) return
              setBorrando(true)
              try {
                await borrarReporte(d.id)
                recargar()
                navigate('/vecino/mis-reportes')
              } catch {
                setBorrando(false)
              }
            }}
            disabled={borrando}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#ef4444]/30 bg-white text-sm font-bold text-[#ef4444] active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" /> {borrando ? 'Eliminando…' : 'Eliminar'}
          </button>
        )}
      </div>
      </div>
    </main>
  )
}
