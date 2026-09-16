import { useMemo } from 'react'
import LojaMap3D, { type LojaReport } from '../../components/escucha/LojaMap3D'
import { ensureSeed, getBarrioAprox, getDenuncias } from '../../lib/escucha/store'

/** Tab Mapa: mapa 3D real de Loja (terreno DEM, edificios, heatmap de reportes). */
export default function MapaPage() {
  const reports = useMemo<LojaReport[]>(() => {
    try {
      ensureSeed()
    } catch {
      /* noop */
    }
    return getDenuncias().map((d) => ({
      lat: d.lat,
      lng: d.lng,
      categoria: d.categoriaLabel,
      barrio: getBarrioAprox(d.lat, d.lng),
      gravedad: d.encuesta.gravedad,
      descripcion: d.descripcion,
      direccion: d.encuesta.direccionPrincipal,
      createdAt: d.createdAt,
      thumb: d.evidencia[0],
    }))
  }, [])

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#111]">Mapa 3D</h1>
          <p className="mt-0.5 text-[13px] text-[#111]/55">
            {reports.length} aportes · terreno y edificios reales de Loja
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-[65vh] min-h-[420px] overflow-hidden rounded-2xl border">
        <LojaMap3D reports={reports} />
      </div>
    </main>
  )
}
