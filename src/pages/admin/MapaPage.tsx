import { useMemo } from 'react'
import LojaMap3D, { type LojaReport } from '../../components/escucha/LojaMap3D'
import { PanelPage } from '../../components/escucha/PanelPage'
import { ensureSeed, getBarrioAprox, getDenuncias } from '../../lib/escucha/store'

/** Tab Mapa: mapa real de Loja (terreno DEM, edificios, heatmap de reportes). */
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
    <PanelPage
      eyebrow="Panel · territorio"
      title="Mapa"
      subtitle="Ubica cada aporte sobre el terreno y los edificios reales de Loja para visualizar las zonas con mayor acumulación de reportes."
    >
      <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-[22px] border border-[#e2e9f6] bg-white p-3 shadow-sm">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          <LojaMap3D reports={reports} />
        </div>
      </div>
    </PanelPage>
  )
}
