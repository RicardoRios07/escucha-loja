import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Download,
  MessageSquareText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Table2,
  TrendingUp,
  TriangleAlert,
  X,
} from 'lucide-react'
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
import { PanelCard, PanelPage } from '../../components/escucha/PanelPage'
import {
  exportToCSV,
  getBarrioAprox,
  getClusters,
  getDailySeries,
  getParroquiaAprox,
  getScoredDenuncias,
  getYaReportadoStats,
  nombreParroquia,
  nombreSector,
} from '../../lib/escucha/store'
import { useReportesAdmin } from '../../lib/escucha/repo'
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

  const { datos: todas, cargando, error } = useReportesAdmin()

  const datos = useMemo(() => {
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
  }, [todas, fCategoria, fParroquia, fGravedad, fRango, orden, busquedaDeb])

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

  const filtrosActivos = useMemo(() => {
    let n = 0
    if (fCategoria !== 'Todas') n++
    if (fParroquia !== 'Todas') n++
    if (fGravedad !== 'Todas') n++
    if (fRango !== 'todo') n++
    if (busquedaDeb.trim() !== '') n++
    return n
  }, [fCategoria, fParroquia, fGravedad, fRango, busquedaDeb])

  const limpiarFiltros = () => {
    setFCategoria('Todas')
    setFParroquia('Todas')
    setFGravedad('Todas')
    setFRango('todo')
    setBusqueda('')
    setPage(1)
  }

  const selCls = 'h-[42px] w-full cursor-pointer appearance-none rounded-xl border border-[#dfe7f5] bg-white px-3 pr-9 text-[13px] font-semibold text-[#1f2b4d] shadow-sm outline-none focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20'

  const kpis = [
    {
      label: 'Aportes',
      value: datos.total,
      chip: `${datos.ya.pct}% reincid.`,
      accent: 'text-[#002693]',
      icon: <MessageSquareText size={18} className="text-[#002693]" aria-hidden="true" />,
      color: 'bg-[#eef4ff]',
    },
    {
      label: 'Críticos',
      value: datos.criticas,
      chip: datos.total > 0 ? `${Math.round((datos.criticas / datos.total) * 100)}% del total` : '—',
      accent: 'text-[#ef4444]',
      icon: <TriangleAlert size={18} className="text-[#ef4444]" aria-hidden="true" />,
      color: 'bg-[#fff0f0]',
    },
    {
      label: 'Top categoría',
      value: datos.topCat ? (datos.topCat[0] as string).split(' ')[0] : '—',
      chip: datos.topCat ? `${datos.topCat[1]} casos` : 'sin datos',
      accent: 'text-[#002693]',
      icon: <Star size={18} className="text-[#f7b500]" aria-hidden="true" />,
      color: 'bg-[#fff7df]',
    },
    {
      label: 'Tendencia WoW',
      value: datos.wow === null ? '—' : `${datos.wow > 0 ? '+' : ''}${datos.wow}%`,
      chip: 'últimos 30d',
      accent:
        datos.wow === null ? 'text-[#002693]' : datos.wow > 0 ? 'text-[#0b8f4a]' : datos.wow < 0 ? 'text-[#ef4444]' : 'text-[#002693]',
      icon: <TrendingUp size={18} className="text-[#002693]" aria-hidden="true" />,
      color: 'bg-[#edf5ff]',
    },
  ] as const

  return (
    <PanelPage
      eyebrow="Panel · resumen"
      title="Resumen"
      subtitle="Vista ejecutiva del estado de los aportes ciudadanos: indicadores, categorías, tendencia y detalle filtrable."
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {cargando && todas.length === 0 ? (
        <p role="status" className="mb-4 rounded-2xl border bg-white p-4 text-sm font-semibold text-[#5d6f92]">
          Cargando reportes…
        </p>
      ) : null}
      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-[20px] border border-[#e2e9f6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}>
                {item.icon}
              </div>
              <span className="rounded-full bg-[#f5f7fb] px-2 py-0.5 text-[10px] font-black text-[#5a6987]">
                {item.chip}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#5d6f92]">{item.label}</p>
                <p className={`num mt-2 text-[clamp(2rem,2vw,2.8rem)] font-black leading-none tracking-[-0.05em] text-[#1d2a3d] ${item.accent}`}>
                  {item.value}
                </p>
              </div>
              <div className="h-10 w-14 overflow-hidden rounded-full bg-[#edf3ff] p-1">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-[#1f3dac] via-[#4d75ff] to-[#93b2ff]" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Filtros */}
      <PanelCard
        className="mt-5"
        icon={SlidersHorizontal}
        title="Filtros"
      >
        <div className="mt-3 flex flex-col gap-3">
          {/* Buscador */}
          <label className="relative block">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa0c4]" />
            <span className="sr-only">Buscar en reportes</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por texto, calle, referencia…"
              className="h-[44px] w-full rounded-xl border border-[#dfe7f5] bg-white pl-9 pr-10 text-[13px] shadow-sm outline-none placeholder:text-[#8aa0c4] focus:border-[#002693] focus:ring-2 focus:ring-[#002693]/20"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#8aa0c4] transition-colors hover:bg-[#edf3ff] hover:text-[#002693]"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </label>

          {/* Selects con etiqueta */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {(
              [
                { label: 'Categoría', value: fCategoria, onChange: (v: string) => { setFCategoria(v); setPage(1) }, options: datos.categorias },
                { label: 'Parroquia', value: fParroquia, onChange: (v: string) => { setFParroquia(v as typeof fParroquia); setPage(1) }, options: [...PARROQUIA_OPTS] },
                { label: 'Gravedad', value: fGravedad, onChange: (v: string) => { setFGravedad(v as typeof fGravedad); setPage(1) }, options: [...GRAVEDADES] },
              ] as const
            ).map((f) => (
              <label key={f.label} className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8aa0c4]">{f.label}</span>
                <div className="relative">
                  <select
                    aria-label={`Filtrar por ${f.label.toLowerCase()}`}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    className={selCls}
                  >
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8aa0c4]" />
                </div>
              </label>
            ))}
          </div>

          {/* Período segmentado + CSV */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8aa0c4]">Período</span>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-[#dfe7f5] bg-white p-1 shadow-sm" role="group" aria-label="Rango de fechas">
              {RANGOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setFRango(r.id); setPage(1) }}
                  aria-pressed={fRango === r.id}
                  className={`min-h-[38px] rounded-lg text-[12px] font-bold transition-colors ${fRango === r.id ? 'bg-[#002693] text-white' : 'text-[#5d6f92] hover:bg-[#edf3ff]'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              {(filtrosActivos > 0 || busquedaDeb.trim() !== '') && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#dfe7f5] bg-white px-3 text-[12px] font-bold text-[#002693] shadow-sm transition-colors hover:bg-[#edf3ff]"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Limpiar ({filtrosActivos})
                </button>
              )}
              <button
                onClick={descargarCSV}
                className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-2 rounded-full bg-[#002693] px-3.5 py-2 text-[12px] font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-none"
              >
                <Download size={13} aria-hidden="true" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Cards por categoría */}
      <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.entries(datos.porCat).map(([cat, n]) => (
          <button
            key={cat}
            onClick={() => { setFCategoria(fCategoria === cat ? 'Todas' : cat); setPage(1) }}
            aria-pressed={fCategoria === cat}
            className={`rounded-[22px] border border-[#e2e9f6] bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99] ${fCategoria === cat ? 'ring-2 ring-[#002693]' : ''}`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: categoriaColor(cat) }} aria-hidden="true" />
            <p className="mt-1.5 line-clamp-2 min-h-[2.4em] text-[13px] font-bold leading-snug text-[#1f2b4d]">{cat}</p>
            <p className="num mt-1 text-2xl font-black text-[#002693]">{n as number}</p>
          </button>
        ))}
        {Object.keys(datos.porCat).length === 0 && (
          <p className="col-span-full rounded-[22px] border border-dashed border-[#dfe7f5] bg-white p-6 text-center text-sm text-[#8aa0c4]">
            Aún no hay aportes para resumir.
          </p>
        )}
      </section>

      {/* Tendencia 30 días */}
      <PanelCard
        className="mt-5"
        icon={TrendingUp}
        title="Aportes por día"
        action={
          <span className="num rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[11px] font-black text-[#002693]">
            {datos.wow === null ? '30 días' : `${datos.wow > 0 ? '+' : ''}${datos.wow}% WoW`}
          </span>
        }
      >
        <div className="mt-3 h-[180px] rounded-2xl bg-[#f5f8ff] p-3">
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
      </PanelCard>

      {/* Tabla */}
      <PanelCard
        className="mt-5"
        icon={Table2}
        title="Detalle de aportes"
        action={
          <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-black text-[#002693]">
            {datos.ordenadas.length} resultados
          </span>
        }
      >
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#e5ebf7]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-[#f4f7fd] text-[#586d8c]">
                <tr className="text-[11px] uppercase tracking-[0.08em]">
                  <th className="p-3 font-black">Reporte</th>
                  <th className="p-3 font-black">Parroquia / Sector</th>
                  <th className="p-3 font-black">Gravedad</th>
                  <th className="p-3 font-black" aria-sort={orden.clave === 'score' ? (orden.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                    <button onClick={alternarOrden('score')} className="inline-flex min-h-[36px] items-center gap-1 font-black uppercase">
                      Score {orden.clave === 'score' ? (orden.dir === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th className="p-3 font-black" aria-sort={orden.clave === 'fecha' ? (orden.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                    <button onClick={alternarOrden('fecha')} className="inline-flex min-h-[36px] items-center gap-1 font-black uppercase">
                      Fecha {orden.clave === 'fecha' ? (orden.dir === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagina.map(({ d, score, sector, parroquia }) => (
                  <tr key={d.id} className="border-t border-[#edf1f8] align-top text-[#2e3e5f] hover:bg-[#f8fafd]">
                    <td className="max-w-[280px] p-3">
                      <button
                        onClick={() => setDetalle({ d, score, sector: parroquia ? `${parroquia} · ${sector}` : sector })}
                        className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left active:scale-[0.99]"
                        aria-label={`Ver detalle: ${d.categoriaLabel} en ${sector}`}
                      >
                        <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#eef2f9]">
                          {d.evidencia[0] ? (
                            <MediaThumb item={d.evidencia[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-[10px] text-[#8aa0c4]">—</span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold text-[#1f2b4d]">{d.categoriaLabel}</span>
                          <span className="line-clamp-2 block text-[12px] text-[#5d6f92]">{d.descripcion}</span>
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap p-3 font-semibold text-[#42557d]">
                      {sector}
                      {parroquia ? <span className="block text-[11px] font-normal text-[#8aa0c4]">{parroquia}</span> : null}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: gravedadColor(d.encuesta.gravedad) }}>
                        {d.encuesta.gravedad}
                      </span>
                    </td>
                    <td className="num whitespace-nowrap p-3 font-black text-[#002693]">{score}</td>
                    <td className="whitespace-nowrap p-3 tabular-nums text-[#5d6f92]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {pagina.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-[#8aa0c4]">
                      Sin resultados para estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#edf1f8] bg-[#f8fafd] p-3">
            <span className="text-xs font-semibold text-[#5d6f92]">
              {datos.ordenadas.length} aportes · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-h-[36px] rounded-full border border-[#dfe7f5] bg-white px-3 text-sm font-semibold text-[#1f2b4d] shadow-sm disabled:opacity-40">
                Anterior
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="min-h-[36px] rounded-full border border-[#dfe7f5] bg-white px-3 text-sm font-semibold text-[#1f2b4d] shadow-sm disabled:opacity-40">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PanelCard>
      {detalle && (
        <AdminDetalleModal
          denuncia={detalle.d}
          score={detalle.score}
          sector={detalle.sector}
          onClose={() => setDetalle(null)}
        />
      )}
    </PanelPage>
  )
}
