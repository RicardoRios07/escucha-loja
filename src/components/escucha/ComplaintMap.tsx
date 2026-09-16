import { useEffect, useRef, useState } from "react"
import { Map, MapControls, useMap, describeGeolocationError } from "../ui/map"
import { Card } from "../ui/card"
import { RiMapPinLine, RiCrosshairLine, RiAlertLine, RiCheckLine } from "react-icons/ri"

interface ComplaintMapProps {
  /** Último punto conocido [lat, lng]; centro inicial del mapa. */
  center: [number, number]
  zoom?: number
  /** Punto confirmado (fuente de verdad del wizard). Null = sin confirmar. */
  selectedPosition?: [number, number] | null
  /** Confirmación explícita: botón, GPS en 1 toque o búsqueda. */
  onConfirm: (lat: number, lng: number) => void
  /** El punto confirmado dejó de estar bajo el pin (el usuario arrastró el mapa). */
  onDeselect: () => void
}

const LOJA_BOUNDS: [[number, number], [number, number]] = [
  [-79.29, -4.08],
  [-79.12, -3.91],
]

function isInsideLoja(lng: number, lat: number): boolean {
  return lng >= LOJA_BOUNDS[0][0] && lng <= LOJA_BOUNDS[1][0] && lat >= LOJA_BOUNDS[0][1] && lat <= LOJA_BOUNDS[1][1]
}

/** Distancia aproximada en grados (suficiente para comparar puntos casi idénticos). */
function cerca(a: [number, number] | null, b: [number, number] | null, eps = 1e-5): boolean {
  if (!a || !b) return false
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps
}

/**
 * Sincroniza el centro del mapa con el estado del wizard:
 * - estado en vivo del centro (para el pill de coords),
 * - flyTo cuando cambia el punto confirmado externo (búsqueda / borrador),
 * - detección de GPS al entrar (1 toque para confirmar, sin auto-confirmar),
 * - aviso de deselect cuando el punto confirmado sale del centro.
 */
function MapSync({
  selectedPosition,
  onCenterState,
  onDeselect,
  onDetectada,
}: {
  selectedPosition: [number, number] | null
  onCenterState: (p: { lat: number; lng: number }) => void
  onDeselect: () => void
  onDetectada: (p: { lat: number; lng: number } | null) => void
}) {
  const { map, isLoaded } = useMap()
  const centerCb = useRef(onCenterState)
  centerCb.current = onCenterState
  const deselectCb = useRef(onDeselect)
  deselectCb.current = onDeselect
  const selectedRef = useRef(selectedPosition)
  selectedRef.current = selectedPosition
  const lastEmittedRef = useRef<"confirm" | "no" | null>(null)
  const lastPushRef = useRef(0)

  // Estado inicial del centro + listeners de movimiento (throttle suave).
  useEffect(() => {
    if (!map || !isLoaded) return
    const c = map.getCenter()
    centerCb.current({ lat: c.lat, lng: c.lng })
    lastEmittedRef.current = cerca([c.lat, c.lng], selectedRef.current) ? "confirm" : "no"
    let raf = 0
    const push = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const now = performance.now()
        if (now - lastPushRef.current < 90) return
        lastPushRef.current = now
        const cc = map.getCenter()
        centerCb.current({ lat: cc.lat, lng: cc.lng })
      })
    }
    const onMoveEnd = () => {
      const cc = map.getCenter()
      centerCb.current({ lat: cc.lat, lng: cc.lng })
      const isConfirmed = cerca([cc.lat, cc.lng], selectedRef.current)
      if (lastEmittedRef.current === "confirm" && !isConfirmed) deselectCb.current()
      lastEmittedRef.current = isConfirmed ? "confirm" : "no"
    }
    map.on("move", push)
    map.on("moveend", onMoveEnd)
    return () => {
      cancelAnimationFrame(raf)
      map.off("move", push)
      map.off("moveend", onMoveEnd)
    }
  }, [map, isLoaded])

  // FlyTo cuando el punto confirmado cambia externamente (búsqueda, borrador).
  useEffect(() => {
    if (!map || !isLoaded || !selectedPosition) return
    const c = map.getCenter()
    if (cerca([c.lat, c.lng], selectedPosition)) return
    map.flyTo({ center: [selectedPosition[1], selectedPosition[0]], zoom: Math.max(map.getZoom(), 16), duration: 600 })
  }, [map, isLoaded, selectedPosition])

  // Detección de GPS al entrar: vuela al punto y lo deja listo para confirmar
  // en 1 toque. Silencioso si falla o está fuera de Loja. Solo si no hay
  // punto confirmado previo (borrador restaurado).
  const gpsTriedRef = useRef(false)
  useEffect(() => {
    if (!map || !isLoaded || gpsTriedRef.current || selectedPosition) return
    gpsTriedRef.current = true
    if (!("geolocation" in navigator)) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (!isInsideLoja(lng, lat)) return
        onDetectada({ lat, lng })
        map.flyTo({ center: [lng, lat], zoom: 16, duration: 900 })
      },
      () => {
        /* silencioso: el usuario puede usar "Usar mi ubicación" manualmente */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, selectedPosition])

  return null
}

/** Botón de confirmación: lee el centro real del mapa al pulsar. */
function ConfirmButton({ onConfirm }: { onConfirm: (lat: number, lng: number) => void }) {
  const { map } = useMap()
  const cb = useRef(onConfirm)
  cb.current = onConfirm
  return (
    <button
      type="button"
      onClick={() => {
        const c = map?.getCenter()
        if (!c) return
        cb.current(c.lat, c.lng)
      }}
      className="absolute bottom-4 left-1/2 z-10 min-h-[48px] -translate-x-1/2 rounded-full bg-[#FE4102] px-6 text-sm font-extrabold text-white shadow-[0_14px_28px_-10px_rgba(254,65,2,0.8)] ring-4 ring-white/70 active:scale-[0.98]"
    >
      Confirmar ubicación
    </button>
  )
}

/**
 * Selector de ubicación para el wizard (paso 2). Modo pin central: el pin
 * queda fijo al centro y el usuario arrastra el mapa; confirmación explícita
 * con botón (o GPS detectado en 1 toque). Es la única superficie que muestra
 * el estado geo — el wizard no duplica hints.
 */
export default function ComplaintMap({ center, zoom = 16, selectedPosition = null, onConfirm, onDeselect }: ComplaintMapProps) {
  const [centerState, setCenterState] = useState<{ lat: number; lng: number } | null>(null)
  const [detectada, setDetectada] = useState<{ lat: number; lng: number } | null>(null)
  const [locateError, setLocateError] = useState<string | null>(null)

  const confirmado = cerca(centerState ? [centerState.lat, centerState.lng] : null, selectedPosition)

  const handleLocateError = (err: { code: number; message: string }) => {
    setLocateError(err.message || describeGeolocationError(err.code))
    window.setTimeout(() => setLocateError(null), 6000)
  }

  // center prop es [lat, lng] -> maplibre usa [lng, lat]
  const mapCenter: [number, number] = center ? [center[1], center[0]] : [-79.2042, -3.9931]

  return (
    <Card className="overflow-hidden p-0 rounded-2xl border border-gray-200 shadow-sm">
      <div className="relative h-[320px] md:h-[380px] w-full">
        <Map center={mapCenter} zoom={zoom} maxBounds={LOJA_BOUNDS} className="h-full w-full">
          <MapSync
            selectedPosition={selectedPosition}
            onCenterState={setCenterState}
            onDeselect={onDeselect}
            onDetectada={setDetectada}
          />
          <MapControls position="bottom-right" showZoom showLocate onLocateError={handleLocateError} />

          {/* Pin central fijo (el usuario arrastra el mapa, no el pin) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5]" style={{ transform: "translate(-50%, -100%)" }}>
            <div className="relative flex flex-col items-center">
              <div className={`absolute -top-1 h-14 w-14 rounded-full bg-[#FE4102]/15 ${confirmado ? "opacity-0" : "animate-pulse"}`} aria-hidden="true" />
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#FE4102] shadow-[0_10px_24px_-6px_rgba(254,65,2,0.75)] ring-4 ring-white">
                <RiMapPinLine className="text-xl text-white" aria-hidden="true" />
              </div>
              <div className="-mt-1 h-3 w-3 rotate-45 bg-[#FE4102]" aria-hidden="true" />
            </div>
          </div>

          {/* Banner GPS detectado: confirmación en 1 toque */}
          {detectada && !confirmado && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#002693]/15 bg-white/95 py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur">
              <RiMapPinLine className="text-[#002693]" aria-hidden="true" />
              <span className="text-xs font-bold text-[#111]">Ubicación detectada</span>
              <button
                type="button"
                onClick={() => {
                  onConfirm(detectada.lat, detectada.lng)
                  setDetectada(null)
                }}
                className="min-h-[36px] rounded-full bg-[#002693] px-3.5 text-xs font-extrabold text-white active:scale-[0.98]"
              >
                Usar esta ubicación
              </button>
            </div>
          )}

          {/* Estado: hint de arrastre / confirmado / error de GPS */}
          <div
            role={locateError ? "alert" : "status"}
            className={`pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur ${
              locateError
                ? "bg-red-50/95 text-red-700 border border-red-200"
                : confirmado
                  ? "bg-[#0db954]/95 text-white"
                  : "bg-white/95 text-gray-700"
            }`}
          >
            {locateError ? (
              <RiAlertLine className="shrink-0 text-red-600" aria-hidden="true" />
            ) : confirmado ? (
              <RiCheckLine className="shrink-0" aria-hidden="true" />
            ) : (
              <RiCrosshairLine className="shrink-0 text-[#002693]" aria-hidden="true" />
            )}
            <span className="truncate">
              {locateError ?? (confirmado ? "Punto confirmado" : "Arrastra el mapa para ubicar el punto")}
            </span>
          </div>

          {/* Coords pill (secundario) */}
          {centerState && !confirmado && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-[#002693]/85 px-2.5 py-1 text-[10px] font-mono font-semibold text-white shadow-md">
              {centerState.lat.toFixed(5)}, {centerState.lng.toFixed(5)}
            </div>
          )}

          {!confirmado && <ConfirmButton onConfirm={onConfirm} />}
        </Map>
      </div>
    </Card>
  )
}
