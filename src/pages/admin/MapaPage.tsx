import { useMemo } from 'react'
import LojaMap3D, { type LojaReport } from '../../components/escucha/LojaMap3D'
import { PanelPage } from '../../components/escucha/PanelPage'
import { getBarrioAprox } from '../../lib/escucha/store'
import { useReportesAdmin } from '../../lib/escucha/repo'

/** Tab Mapa: mapa real de Loja (terreno DEM, edificios, heatmap de reportes). */
export default function MapaPage() {
  const { datos: denuncias, cargando, error } = useReportesAdmin()
  const reports = useMemo<LojaReport[]>(
    () =>
      denuncias.map((d) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        categoria: d.categoriaLabel,
        barrio: getBarrioAprox(d.lat, d.lng),
        gravedad: d.encuesta.gravedad,
        descripcion: d.descripcion,
        direccion: d.encuesta.direccionPrincipal,
        createdAt: d.createdAt,
        thumb: d.evidencia[0],
      })),
    [denuncias],
  )

  return (
    <PanelPage
      eyebrow="Panel · territorio"
      title="Mapa"
      subtitle="Ubica cada reporte sobre el terreno y los edificios reales de Loja para visualizar las zonas con mayor acumulación de reportes."
    >
      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : (
        <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-[22px] border border-[#e2e9f6] bg-white p-3 shadow-sm">
          <div className="relative h-full w-full overflow-hidden rounded-[16px]">
            {cargando && denuncias.length === 0 ? (
              <p className="grid h-full place-items-center text-sm font-semibold text-[#5d6f92]" role="status">
                Cargando reportes…
              </p>
            ) : (
              <LojaMap3D reports={reports} detalleDestino="admin" />
            )}
          </div>
        </div>
      )}
    </PanelPage>
  )
}
