import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import MediaThumb from '../../components/escucha/MediaThumb'
import AdminDetalleModal from '../../components/escucha/AdminDetalleModal'
import {
  ensureSeed,
  exportToCSV,
  getBarrioAprox,
  getClusters,
  getDailySeries,
  getDenuncias,
  getParroquiaAprox,
  getScoredDenuncias,
  getYaReportadoStats,
  nombreParroquia,
  nombreSector,
} from '../../lib/escucha/store'
import { PARROQUIAS } from '../../data/parroquias'
import { categoriaColor, gravedadColor } from '../../lib/escucha/geo'
import type { MvpDenuncia } from '../../lib/escucha/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

function norm(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const PARROQUIA_OPTS = ['Todas', ...PARROQUIAS.map((p) => p.nombre)] as const
const GRAVEDADES = ['Todas', 'Baja', 'Media', 'Alta', 'Crítica'] as const
const RANGOS = [
  { id: '7', label: '7d', dias: 7 },
  { id: '30', label: '30d', dias: 30 },
  { id: '90', label: '90d', dias: 90 },
  { id: 'todo', label: 'Todo', dias: 0 },
] as const

type Orden = { clave: 'fecha' | 'score'; dir: 'asc' | 'desc' }

function csvExtendido(
  rows: { score: number; sector: string; parroquia: string; d: Parameters<typeof exportToCSV>[0][number] }[],
): string {
  const base = exportToCSV(rows.map((r) => r.d) as Parameters<typeof exportToCSV>[0])
  const lineas = base.split('\n')
  const head = `${lineas[0]},parroquia,sector,score`
  const body = lineas.slice(1).map((l, i) => `${l},"${rows[i]?.parroquia ?? ''}","${rows[i]?.sector ?? ''}",${rows[i]?.score ?? 0}`)
  return [head, ...body].join('\n')
}

/** Tab Resumen: KPIs + filtros + cards por categoría + tabla ordenable + CSV. */
export default function ResumenPage() {
  const [fCategoria, setFCategoria] = useState('Todas')
  const [fParroquia, setFParroquia] = useState<(typeof PARROQUIA_OPTS)[number]>('Todas')
  const [fGravedad, setFGravedad] = useState<(typeof GRAVEDADES)[number]>('Todas')
  const [fRango, setFRango] = useState<(typeof RANGOS)[number]['id']>('todo')
  const [orden, setOrden] = useState<Orden>({ clave: 'score', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDeb, setBusquedaDeb] = useState('')
  const [detalle, setDetalle] = useState<{ d: MvpDenuncia; score: number; sector: string } | null>(null)
  const perPage = 8

  useEffect(() => {
    const t = window.setTimeout(() => {
      setBusquedaDeb(busqueda)
      setPage(1)
    }, 250)
    return () => window.clearTimeout(t)
  }, [busqueda])

  const datos = useMemo(() => {
    try {
      ensureSeed()
    } catch {
      /* noop */
    }
    const todas = getDenuncias()
    const clusters = getClusters(todas)
    const scored = getScoredDenuncias(todas, clusters)
    const conSector = scored.map((d) => ({
      d,
      score: (d as { _score?: number })._score ?? 0,
      // Territorio declarado en el wizard o resuelto por punto (catálogo SIL).
      parroquia: d.parroquiaId ? nombreParroquia(d.parroquiaId) : getParroquiaAprox(d.lat, d.lng),
      sector: d.barrioId && d.parroquiaId
        ? nombreSector(d.parroquiaId, d.barrioId)
        : getBarrioAprox(d.lat, d.lng),
    }))

    const dias = RANGOS.find((r) => r.id === fRango)?.dias ?? 0
    const corte = dias > 0 ? Date.now() - dias * 86400000 : 0
    const q = norm(busquedaDeb.trim())
    const filtradas = conSector.filter(
      ({ d, sector, parroquia }) =>
        (fCategoria === 'Todas' || d.categoriaLabel === fCategoria) &&
        (fParroquia === 'Todas' || parroquia === fParroquia) &&
        (fGravedad === 'Todas' || d.encuesta.gravedad === fGravedad) &&
        (corte === 0 || new Date(d.createdAt).getTime() >= corte) &&
        (q === '' ||
          norm(d.descripcion).includes(q) ||
          norm(parroquia).includes(q) ||
          norm(sector).includes(q) ||
          norm(d.encuesta.direccionPrincipal).includes(q) ||
          norm(d.encuesta.calleSecundaria).includes(q) ||
          norm(d.encuesta.referencia).includes(q)),
    )
    const ordenadas = [...filtradas].sort((a, b) =>
      orden.clave === 'score'
        ? orden.dir === 'desc'
          ? b.score - a.score
          : a.score - b.score
        : orden.dir === 'desc'
          ? b.d.createdAt.localeCompare(a.d.createdAt)
          : a.d.createdAt.localeCompare(b.d.createdAt),
    )

    // KPIs sobre el total (no filtrado) + WoW de 30d
    const total = todas.length
    const criticas = todas.filter((d) => d.encuesta.gravedad === 'Crítica').length
    const porCat: Record<string, number> = {}
    for (const d of todas) porCat[d.categoriaLabel] = (porCat[d.categoriaLabel] || 0) + 1
    const topCat = Object.entries(porCat).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    const serie = getDailySeries(todas, 30)
    const wow = serie.wow
    const ya = getYaReportadoStats(todas)
    const categorias = ['Todas', ...Object.keys(porCat)]

    return { total, criticas, porCat, topCat, wow, ya, categorias, ordenadas, serie }
  }, [fCategoria, fParroquia, fGravedad, fRango, orden, busquedaDeb])

  const totalPages = Math.max(1, Math.ceil(datos.ordenadas.length / perPage))
  const pagina = datos.ordenadas.slice((page - 1) * perPage, page * perPage)
  const sinMovimiento =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const alternarOrden = (clave: Orden['clave']) => () => {
    setOrden((o) => (o.clave === clave ? { clave, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { clave, dir: 'desc' }))
  }

  const descargarCSV = () => {
    const csv = csvExtendido(datos.ordenadas)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escucha-loja-aportes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selCls = 'min-h-[44px] rounded-xl border bg-white px-3 text-[13px] font-semibold text-[#111]'

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-6 lg:px-10">
      <h1 className="text-xl font-black tracking-tight text-[#111]">Resumen</h1>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">Aportes</p>
          <p className="num mt-1 text-3xl font-black text-[#002693]">{datos.total}</p>
          <p className="mt-0.5 text-[12px] text-[#111]/45">{datos.ya.pct}% reincidentes</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">Críticos</p>
          <p className="num mt-1 text-3xl font-black text-[#ef4444]">{datos.criticas}</p>
          <p className="mt-0.5 text-[12px] text-[#111]/45">gravedad máxima</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">Top categoría</p>
          <p className="mt-1 truncate text-lg font-black text-[#002693]">
            {datos.topCat ? datos.topCat[0].split(' ')[0] : '—'}
          </p>
          <p className="mt-0.5 text-[12px] text-[#111]/45">
            {datos.topCat ? `${datos.topCat[1]} casos` : 'sin datos'}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#111]/45">Tendencia WoW</p>
          <p className="num mt-1 text-3xl font-black text-[#002693]">
            {datos.wow === null ? '—' : `${datos.wow > 0 ? '+' : ''}${datos.wow}%`}
          </p>
          <p className="mt-0.5 text-[12px] text-[#111]/45">vs semana previa</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtros del resumen">
        <label className="relative min-h-[44px] flex-1 basis-48 items-center">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#111]/40" />
          <span className="sr-only">Buscar en reportes</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por texto, calle, referencia…"
            className="h-[44px] w-full rounded-xl border bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-[#111]/35 focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
          />
        </label>
        <select aria-label="Filtrar por categoría" value={fCategoria} onChange={(e) => { setFCategoria(e.target.value); setPage(1) }} className={selCls}>
          {datos.categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Filtrar por parroquia" value={fParroquia} onChange={(e) => { setFParroquia(e.target.value as typeof fParroquia); setPage(1) }} className={selCls}>
          {PARROQUIA_OPTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Filtrar por gravedad" value={fGravedad} onChange={(e) => { setFGravedad(e.target.value as typeof fGravedad); setPage(1) }} className={selCls}>
          {GRAVEDADES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-xl border bg-white p-1" role="group" aria-label="Rango de fechas">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              onClick={() => { setFRango(r.id); setPage(1) }}
              aria-pressed={fRango === r.id}
              className={`min-h-[36px] rounded-lg px-3 text-[12px] font-bold ${fRango === r.id ? 'bg-[#002693] text-white' : 'text-[#111]/60'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={descargarCSV}
          className="ml-auto inline-flex min-h-[44px] items-center rounded-xl border bg-white px-4 text-[13px] font-bold text-[#002693] active:scale-[0.98]"
        >
          Exportar CSV
        </button>
      </div>

      {/* Cards por categoría */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(datos.porCat).map(([cat, n]) => (
          <button
            key={cat}
            onClick={() => { setFCategoria(fCategoria === cat ? 'Todas' : cat); setPage(1) }}
            aria-pressed={fCategoria === cat}
            className={`rounded-2xl border bg-white p-4 text-left transition-transform active:scale-[0.99] ${fCategoria === cat ? 'ring-2 ring-[#002693]' : ''}`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: categoriaColor(cat) }} aria-hidden="true" />
            <p className="mt-1.5 line-clamp-2 min-h-[2.4em] text-[13px] font-bold leading-snug text-[#111]">{cat}</p>
            <p className="num text-2xl font-black text-[#002693]">{n as number}</p>
          </button>
        ))}
        {Object.keys(datos.porCat).length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-[#111]/50">
            Aún no hay aportes para resumir.
          </p>
        )}
      </div>

      {/* Tendencia 30 días */}
      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#111]/50">
            Aportes por día · 30 días
          </h2>
          <span className="num text-[13px] font-black text-[#002693]">
            {datos.wow === null ? '' : `${datos.wow > 0 ? '+' : ''}${datos.wow}% WoW`}
          </span>
        </div>
        <div className="mt-2 h-[140px]">
          <Line
            data={{
              labels: datos.serie.labels,
              datasets: [
                {
                  label: 'Aportes',
                  data: datos.serie.values,
                  borderColor: '#002693',
                  backgroundColor: 'rgba(0,38,147,0.12)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 2,
                  pointBackgroundColor: '#002693',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: sinMovimiento ? false : undefined,
              plugins: { legend: { display: false }, tooltip: { enabled: true } },
              scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
              },
            }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-[#111]/50">
                <th className="p-3 font-extrabold">Reporte</th>
                <th className="p-3 font-extrabold">Parroquia / Sector</th>
                <th className="p-3 font-extrabold">Gravedad</th>
                <th className="p-3 font-extrabold" aria-sort={orden.clave === 'score' ? (orden.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                  <button onClick={alternarOrden('score')} className="inline-flex min-h-[36px] items-center gap-1 font-extrabold uppercase">
                    Score {orden.clave === 'score' ? (orden.dir === 'desc' ? '↓' : '↑') : ''}
                  </button>
                </th>
                <th className="p-3 font-extrabold" aria-sort={orden.clave === 'fecha' ? (orden.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                  <button onClick={alternarOrden('fecha')} className="inline-flex min-h-[36px] items-center gap-1 font-extrabold uppercase">
                    Fecha {orden.clave === 'fecha' ? (orden.dir === 'desc' ? '↓' : '↑') : ''}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagina.map(({ d, score, sector, parroquia }) => (
                <tr key={d.id} className="align-top hover:bg-gray-50/60">
                  <td className="max-w-[280px] p-3">
                    <button
                      onClick={() => setDetalle({ d, score, sector: parroquia ? `${parroquia} · ${sector}` : sector })}
                      className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left active:scale-[0.99]"
                      aria-label={`Ver detalle: ${d.categoriaLabel} en ${sector}`}
                    >
                      <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {d.evidencia[0] ? (
                          <MediaThumb item={d.evidencia[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[10px] text-gray-400">—</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-[#111]">{d.categoriaLabel}</span>
                        <span className="line-clamp-2 block text-[12px] text-[#111]/55">{d.descripcion}</span>
                      </span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap p-3 font-semibold text-[#111]/70">
                    {sector}
                    {parroquia ? <span className="block text-[11px] font-normal text-[#111]/45">{parroquia}</span> : null}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: gravedadColor(d.encuesta.gravedad) }}>
                      {d.encuesta.gravedad}
                    </span>
                  </td>
                  <td className="num whitespace-nowrap p-3 font-black text-[#002693]">{score}</td>
                  <td className="whitespace-nowrap p-3 tabular-nums text-[#111]/60">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {pagina.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-[#111]/45">
                    Sin resultados para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t bg-gray-50/50 p-3">
          <span className="text-xs text-gray-500">
            {datos.ordenadas.length} aportes · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-h-[36px] rounded-full border bg-white px-3 text-sm font-semibold disabled:opacity-40">
              Anterior
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="min-h-[36px] rounded-full border bg-white px-3 text-sm font-semibold disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      </div>
      {detalle && (
        <AdminDetalleModal
          denuncia={detalle.d}
          score={detalle.score}
          sector={detalle.sector}
          onClose={() => setDetalle(null)}
        />
      )}
    </main>
  )
}
