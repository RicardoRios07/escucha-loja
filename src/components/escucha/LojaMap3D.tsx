import { useEffect, useMemo, useRef, useState } from 'react'
// maplibre-gl se importa solo como tipos aquí: el módulo real se carga diferido
// (import dinámico) cuando el mapa entra al viewport — ~1MB fuera del camino crítico.
import type * as maplibregl from 'maplibre-gl'
import type { LucideIcon } from 'lucide-react'
import { Building2, Car, ChevronDown, Droplets, Trash2 } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol as PmtilesProtocol } from 'pmtiles'
import { CATEGORIAS_VISUALES, categoriaVisual, gravedadColor } from '../../lib/escucha/geo'
import { resolverUbicacion } from '../../lib/escucha/store'
import { PARROQUIAS, PARROQUIA_POR_ID, CANTON_BOUNDS_LL } from '../../data/parroquias'
import type { CategoriaIconKey } from '../../lib/escucha/geo'
import type { MediaItem } from '../../lib/escucha/media'
import { getObjectUrlForRef, isMediaRef, isMediaRemota } from '../../lib/escucha/media'
import { sampleRoofColors } from '../../lib/escucha/roofs'
import { addCategoryPinSprites } from './mapSprites'

type MapLibreModule = typeof import('maplibre-gl')
/** Módulo runtime (asignado tras el import dinámico); los handlers lo usan con guard. */
let maplibreMod: MapLibreModule | null = null
let pmtilesProtocol: PmtilesProtocol | null = null

function ensurePmtilesProtocol(maplibre: MapLibreModule) {
  if (!pmtilesProtocol) {
    pmtilesProtocol = new PmtilesProtocol()
    maplibre.addProtocol('pmtiles', pmtilesProtocol.tile)
  }
}

/**
 * Heurística de dispositivo débil: terreno plano al inicio + DPR capado +
 * muestreo reducido. Los techos muestreados se conservan (son baratos).
 */
const WEAK_DEVICE: boolean = (() => {
  try {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
    const cores = navigator.hardwareConcurrency || 8
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
    const small = Math.min(window.screen.width, window.screen.height) < 500
    return cores <= 4 && (mem <= 4 || small)
  } catch {
    return false
  }
})()
const SAMPLE_CAP = WEAK_DEVICE ? 300 : 700

/**
 * Mapa 3D real de Loja (importado de Campaña 2, adaptado al store local).
 * Terreno DEM con elevación real, edificios en extrusión 3D, heatmap con
 * rampa verde→azul→naranja, pins con icono por categoría y burbujas de
 * cluster. Modo "full" (Mapa/Comunidad) incluye panel de filtros; modo
 * "lite" (landing) muestra solo heat + pins.
 */

export type LojaReport = {
  lat: number
  lng: number
  categoria: string
  barrio?: string
  count?: number
  gravedad?: string
  descripcion?: string
  direccion?: string
  createdAt?: string
  /** Primera evidencia (foto/video) para el popup de detalle. */
  thumb?: MediaItem
}

type PinProps = {
  id: string
  count: number
  intensity: number
  categoria: string
  spriteId: string
  spriteKey: string
  barrio: string
  gravedad: string
  descripcion: string
  direccion: string
  createdAt: string
  /** 'foto' | 'video' | '' */
  mediaKind: string
}

type ReportFeature = {
  type: 'Feature'
  properties: PinProps
  geometry: { type: 'Point'; coordinates: [number, number] }
}

type ClusterInputFeature = {
  type: 'Feature'
  properties: { count: number }
  geometry: { type: 'Point'; coordinates: [number, number] }
}

const LOJA_CENTER: [number, number] = [-79.2042, -3.9931]
/** Cobertura cantonal (ciudad + 13 parroquias rurales). */
const LOJA_BOUNDS: [[number, number], [number, number]] = CANTON_BOUNDS_LL
/**
 * Leash del mapa: caja centrada en la CIUDAD que contiene al cantón.
 * Cuando el viewport supera al maxBounds, MapLibre centra en su centroide —
 * con el bbox cantonal la vista derivaba al sur; así la ciudad queda centrada.
 */
const CITY_CENTERED_BOUNDS: [[number, number], [number, number]] = [
  [LOJA_CENTER[0] - 0.38, LOJA_CENTER[1] - 0.56],
  [LOJA_CENTER[0] + 0.38, LOJA_CENTER[1] + 0.56],
]
const TERRAIN_PITCH = 52
const SAFE_MAX_PITCH = 68

const CHIP_ICONS: Record<CategoriaIconKey, LucideIcon> = {
  droplet: Droplets,
  trash: Trash2,
  car: Car,
  building: Building2,
}

/** Base satelital (tiles satelitales de Google, sin nubes sobre Loja) + glyphs para labels/clusters. */
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  // Glyphs de OpenFreeMap: necesarios para los textos de labels y clusters.
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster',
      // Endpoint no documentado de Google Maps (lyrs=s = solo satélite, sin
      // labels). Esri World Imagery tenía nubes sobre la mancha urbana de Loja;
      // esta fuente está limpia hasta z19 (imagen nativa a nivel de techos).
      tiles: [
        'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imágenes satelitales © Google',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
}

function isValidLngLat(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

function isInsideLoja(lng: number, lat: number): boolean {
  return lng >= LOJA_BOUNDS[0][0] && lng <= LOJA_BOUNDS[1][0] && lat >= LOJA_BOUNDS[0][1] && lat <= LOJA_BOUNDS[1][1]
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return '&#39;'
    }
  })
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const hh = `${fecha.getHours()}`.padStart(2, '0')
  const mm = `${fecha.getMinutes()}`.padStart(2, '0')
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()} · ${hh}:${mm}`
}

/** Agrupa reportes por celda (4 decimales) + categoría, respeta filtros y foco parroquial, normaliza intensidad 0..1. */
function buildPins(
  reports: LojaReport[],
  excluded: Set<string>,
  focusParroquia: string | null,
): { features: ReportFeature[]; mediaById: Map<string, MediaItem> } {
  const grouped = new Map<string, ReportFeature>()
  const mediaById = new Map<string, MediaItem>()
  reports.forEach((report) => {
    const lat = Number(report.lat)
    const lng = Number(report.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!isInsideLoja(lng, lat)) return
    const vis = categoriaVisual(report.categoria)
    if (excluded.has(vis.key)) return
    if (focusParroquia && resolverUbicacion(lat, lng).parroquia.id !== focusParroquia) return
    const categoria = report.categoria || 'Reporte ciudadano'
    const key = `${lat.toFixed(4)}:${lng.toFixed(4)}:${vis.key}`
    const count = Math.max(1, Number(report.count) || 1)
    if (report.thumb) mediaById.set(key, report.thumb)
    const current = grouped.get(key)
    if (current) {
      current.properties.count += count
      return
    }
    grouped.set(key, {
      type: 'Feature',
      properties: {
        id: key,
        count,
        intensity: 0,
        categoria,
        spriteId: `pin-${vis.key}`,
        spriteKey: vis.key,
        barrio: report.barrio || 'Loja',
        gravedad: report.gravedad || '',
        descripcion: truncate(report.descripcion || '', 160),
        direccion: truncate(report.direccion || '', 90),
        createdAt: report.createdAt || '',
        mediaKind: !report.thumb
          ? ''
          : isMediaRef(report.thumb)
            ? report.thumb.kind
            : isMediaRemota(report.thumb)
              ? report.thumb.kind
              : 'foto',
      },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    })
  })
  const features = [...grouped.values()]
  const maxCount = Math.max(1, ...features.map((feature) => feature.properties.count))
  features.forEach((feature) => {
    feature.properties.intensity = feature.properties.count / maxCount
  })
  return { features, mediaById }
}

/** Input del source de clusters: una feature por celda (sin separar por categoría). */
function buildClusterInput(reports: LojaReport[], excluded: Set<string>, focusParroquia: string | null): ClusterInputFeature[] {
  const grouped = new Map<string, ClusterInputFeature>()
  reports.forEach((report) => {
    const lat = Number(report.lat)
    const lng = Number(report.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!isInsideLoja(lng, lat)) return
    if (excluded.has(categoriaVisual(report.categoria).key)) return
    if (focusParroquia && resolverUbicacion(lat, lng).parroquia.id !== focusParroquia) return
    const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`
    const count = Math.max(1, Number(report.count) || 1)
    const current = grouped.get(key)
    if (current) {
      current.properties.count += count
      return
    }
    grouped.set(key, {
      type: 'Feature',
      properties: { count },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    })
  })
  return [...grouped.values()]
}

type LojaMap3DProps = {
  reports: LojaReport[]
  /** Compacto para incrustar dentro de un contenedor con altura (landing, comunidad, admin). */
  embedded?: boolean
  /** full: clusters + panel de filtros. lite: solo heat + pins (landing). */
  mode?: 'full' | 'lite'
  className?: string
}

export default function LojaMap3D({
  reports,
  embedded = true,
  mode = 'full',
  className = '',
}: LojaMap3DProps) {
  const lite = mode === 'lite'
  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const cardPopupRef = useRef<maplibregl.Popup | null>(null)
  const locationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const terrainOnRef = useRef(!WEAK_DEVICE)
  const terrainBusyRef = useRef(false)
  const spritesOkRef = useRef(false)

  // Muestreo de color de techos (roofs.ts) → feature-state, sin re-serializar.
  const sampledRoofsRef = useRef<Set<number>>(new Set())
  const samplingBusyRef = useRef(false)
  // Carga diferida: el mapa (módulo + datos) solo inicializa cerca del viewport.
  const [inView, setInView] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Modo del mapa: 3D = terreno + edificios + volúmenes ML; 2D = plano sin volúmenes.
  const [dim, setDim] = useState<'2d' | '3d'>(WEAK_DEVICE ? '2d' : '3d')
  const dimRef = useRef(dim)
  dimRef.current = dim
  const [busy, setBusy] = useState<null | 'location'>(null)
  const [toast, setToast] = useState('')
  // Filtros colapsados por defecto en móvil, abiertos en desktop.
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  )
  const [filtros, setFiltros] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORIAS_VISUALES.map((c) => [c.key, true])),
  )
  /** Foco parroquial: click en una parroquia filtra reportes y vuela a su bbox. */
  const [focusParroquia, setFocusParroquia] = useState<string | null>(null)

  const excluded = useMemo(
    () => new Set(CATEGORIAS_VISUALES.filter((c) => !filtros[c.key]).map((c) => c.key)),
    [filtros],
  )
  const pins = useMemo(() => buildPins(reports, excluded, focusParroquia), [reports, excluded, focusParroquia])
  const clusterFeatures = useMemo(() => buildClusterInput(reports, excluded, focusParroquia), [reports, excluded, focusParroquia])
  const totalAportes = useMemo(
    () => reports.reduce((total, report) => total + Math.max(1, Math.round(report.count || 1)), 0),
    [reports],
  )

  const pinFeaturesRef = useRef(pins.features)
  pinFeaturesRef.current = pins.features
  const clusterFeaturesRef = useRef(clusterFeatures)
  clusterFeaturesRef.current = clusterFeatures
  const mediaByIdRef = useRef(pins.mediaById)
  mediaByIdRef.current = pins.mediaById

  const setPopupLayout = (open: boolean) =>
    wrapRef.current?.classList.toggle('loja-map-popup-open', open)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? '' : current)), 4000)
  }

  /**
   * Colorea con el píxel satelital los edificios visibles que aún no tengan
   * color. Escribe feature-state por edificio: incremental, sin re-serializar
   * los 65k volúmenes (el setData completo era la fuente del lag).
   */
  const sampleViewportRoofs = () => {
    const map = mapRef.current
    if (!map || samplingBusyRef.current || document.hidden) return
    let rendered: Array<maplibregl.MapGeoJSONFeature | undefined> = []
    try {
      rendered = map.queryRenderedFeatures({ layers: ['buildings-3d'] })
    } catch {
      return
    }
    const zoom = map.getZoom()
    if (zoom < 14) return
    const samples: Array<{ i: number; lng: number; lat: number }> = []
    for (const feature of rendered) {
      const i = Number(feature.properties?.i)
      if (!Number.isFinite(i) || sampledRoofsRef.current.has(i)) continue
      const cx = Number(feature.properties?.cx)
      const cy = Number(feature.properties?.cy)
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
      samples.push({ i, lng: cx, lat: cy })
      if (samples.length >= SAMPLE_CAP) break
    }
    if (!samples.length) return
    samplingBusyRef.current = true
    void sampleRoofColors(samples, zoom, (updates) => {
      for (const { i, color } of updates) {
        try {
          map.setFeatureState({ source: 'buildings', sourceLayer: 'buildings', id: i }, { roof: color })
        } catch {
          /* source aún no lista */
        }
        sampledRoofsRef.current.add(i)
      }
    }).finally(() => {
      samplingBusyRef.current = false
      // Continúa con los edificios restantes del viewport en la siguiente pasada.
      sampleViewportRoofs()
    })
  }

  const openReportPopup = (feature: ReportFeature, lngLat: [number, number]) => {
    const map = mapRef.current
    const cardPopup = cardPopupRef.current
    if (!map || !cardPopup) return

    const props = feature.properties
    const vis = categoriaVisual(props.categoria)
    const title = props.descripcion ? esc(truncate(props.descripcion, 48)) : esc(vis.label)
    const desc = props.descripcion && props.descripcion.length > 48 ? esc(truncate(props.descripcion, 160)) : ''
    const chips = [
      `<span class="loja-map-card-chip" style="background:${vis.color}">${esc(vis.label)}</span>`,
      props.gravedad ? `<span class="loja-map-card-chip" style="background:${gravedadColor(props.gravedad)}">${esc(props.gravedad)}</span>` : '',
    ].join('')
    const photoInner =
      props.mediaKind === 'foto'
        ? '<span class="loja-map-card-photo-loading">…</span>'
        : props.mediaKind === 'video'
          ? '<span class="loja-map-card-photo-empty">Video adjunto</span>'
          : '<span class="loja-map-card-photo-empty">Sin foto</span>'
    const address = props.direccion || props.barrio
    const date = props.createdAt ? fmtFecha(props.createdAt) : ''
    const meta = [
      address ? `<div class="loja-map-card-meta">${esc(address)}</div>` : '',
      desc ? `<div class="loja-map-card-desc">${desc}</div>` : '',
      date ? `<div class="loja-map-card-date">${esc(date)}</div>` : '',
    ].join('')

    cardPopup
      .setLngLat(lngLat)
      .setHTML(
        `<div class="loja-map-card">` +
          `<div class="loja-map-card-photo" data-kind="${props.mediaKind || 'none'}">${photoInner}</div>` +
          `<div class="loja-map-card-body">` +
            `<div class="loja-map-card-chips">${chips}</div>` +
            `<div class="loja-map-card-title">${title}</div>` +
            meta +
            `<div class="loja-map-card-count">${props.count} ${props.count === 1 ? 'reporte' : 'reportes'} en este punto</div>` +
          `</div>` +
        `</div>`,
      )
      .addTo(map)

    // Resolve la evidencia (IndexedDB/dataURL) después de montar el popup.
    const media = mediaByIdRef.current.get(props.id)
    const photoEl = cardPopup.getElement()?.querySelector<HTMLElement>('.loja-map-card-photo')
    if (!media || !photoEl) return
    const putImage = (url: string) => {
      const alive = cardPopup.getElement()?.querySelector('.loja-map-card-photo')
      if (!alive) return
      alive.innerHTML = `<img src="${url}" alt="Evidencia del reporte"/>`
    }
    if (typeof media === 'string') {
      putImage(media)
    } else if (isMediaRemota(media)) {
      if (media.kind === 'foto') putImage(media.url)
    } else if (media.kind === 'foto') {
      getObjectUrlForRef(media).then((url) => {
        if (url) putImage(url)
      })
    }
  }

  // Carga diferida: el módulo de maplibre (~1MB) y el mapa solo inicializan
  // cuando la sección está cerca del viewport.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let mapInstance: maplibregl.Map | null = null

    void (async () => {
      // Import diferido: saca maplibre del camino crítico de la página.
      const maplibregl = await import('maplibre-gl')
      if (cancelled || !container.isConnected) return
      // El worker inline falla en este setup (Vite dev + Electron/CSP): worker vía CDN.
      if (!maplibregl.getWorkerUrl()) {
        maplibregl.setWorkerUrl(`https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs`)
      }
      maplibreMod = maplibregl
      ensurePmtilesProtocol(maplibregl)

      const map = new maplibregl.Map({
        container,
        style: SATELLITE_STYLE,
        center: LOJA_CENTER,
        // Sin `bounds` inicial: la cámara arranca en la ciudad (zoom 13.5);
        // maxBounds permite abrir hasta la vista cantonal.
        maxBounds: CITY_CENTERED_BOUNDS,
        zoom: 13.5,
        minZoom: 10,
        maxZoom: 18,
        pitch: TERRAIN_PITCH,
        bearing: -12,
        canvasContextAttributes: { antialias: true },
        maxPitch: SAFE_MAX_PITCH,
        renderWorldCopies: false,
        // DPR capado: en un teléfono DPR 3 el canvas renderiza 9× píxeles.
        pixelRatio: WEAK_DEVICE ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2),
        fadeDuration: WEAK_DEVICE ? 0 : 300,
      })
      mapRef.current = map
      mapInstance = map
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    // Único popup del mapa: la tarjeta de detalle del reporte.
    const cardPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 24,
      maxWidth: '340px',
    })
    cardPopupRef.current = cardPopup
    cardPopup.on('open', () => setPopupLayout(true))
    cardPopup.on('close', () => setPopupLayout(false))

    map.on('load', async () => {
      setMapLoaded(true)
      // Terreno con elevación real + cielo/luz (opcional según versión del estilo).
      // En dispositivo débil arranca plano (el toggle lo activa si el usuario quiere).
      try {
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15,
        })
        if (!WEAK_DEVICE) map.setTerrain({ source: 'terrain-dem', exaggeration: 1.3 })
      } catch {
        /* El mapa sigue plano si el DEM no carga. */
      }
      try {
        map.setSky({
          'sky-color': '#bcd7e6',
          'sky-horizon-blend': 0.55,
          'horizon-color': '#e9e3d4',
          'horizon-fog-blend': 0.5,
          'fog-color': '#e9e3d4',
          'fog-ground-blend': 0.35,
        })
        map.setLight({ anchor: 'viewport', color: '#fff6e8', intensity: 0.55, position: [1.4, 90, 55] })
      } catch {
        /* opcional */
      }

      // Vector tiles (para edificios 3D y etiquetas) sobre la base satelital.
      try {
        map.addSource('openmaptiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
      } catch {
        /* opcional */
      }

      // Edificios en 3D: tiles vectoriales (PMTiles, solo lo visible) con las
      // huellas horneadas (OSM + ML). Opacos, coloreados con el píxel satelital
      // de su techo vía feature-state (ver roofs.ts) — sin re-serializar nada.
      try {
        map.addSource('buildings', {
          type: 'vector',
          url: `pmtiles://${import.meta.env.BASE_URL}data/loja-buildings.pmtiles`,
          promoteId: { buildings: 'i' },
        })
        map.addLayer({
          id: 'buildings-3d',
          type: 'fill-extrusion',
          source: 'buildings',
          'source-layer': 'buildings',
          minzoom: 13,
          paint: {
            'fill-extrusion-height': ['coalesce', ['get', 'h'], 4],
            'fill-extrusion-base': 0,
            'fill-extrusion-color': ['coalesce', ['feature-state', 'roof'], '#cfc9bd'],
            'fill-extrusion-opacity': 1,
            'fill-extrusion-vertical-gradient': true,
          },
        })
        // En modo 2D los volúmenes ML no se muestran (solo en 3D).
        if (dimRef.current === '2d') {
          map.setFilter('buildings-3d', ['!=', ['get', 'ml'], 1])
        }
        // Nombres de barrios/sectores para orientarse sobre el satélite.
        // Dos niveles por rank (evita duplicar las etiquetas SIL propias):
        // overview = solo ciudades (Loja 6, Zamora 7); detalle = resto.
        map.addLayer({
          id: 'place-labels-3d',
          type: 'symbol',
          source: 'openmaptiles',
          'source-layer': 'place',
          minzoom: 11,
          maxzoom: 13.5,
          filter: [
            'all',
            ['has', 'name'],
            ['!=', ['get', 'class'], 'ocean'],
            ['<=', ['coalesce', ['get', 'rank'], 20], 7],
          ],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 13.5, 14],
            'text-anchor': 'center',
            'text-max-width': 8,
            'symbol-sort-key': ['coalesce', ['get', 'rank'], 20],
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.6 },
        })
        map.addLayer({
          id: 'place-detail-3d',
          type: 'symbol',
          source: 'openmaptiles',
          'source-layer': 'place',
          minzoom: 13.5,
          filter: ['all', ['has', 'name'], ['!=', ['get', 'class'], 'ocean']],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 13.5, 11, 16, 14],
            'text-anchor': 'center',
            'text-max-width': 8,
            'symbol-sort-key': ['coalesce', ['get', 'rank'], 20],
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.6 },
        })
        map.addLayer({
          id: 'poi-labels-3d',
          type: 'symbol',
          source: 'openmaptiles',
          'source-layer': 'poi',
          minzoom: 15,
          filter: ['all', ['has', 'name'], ['<=', ['coalesce', ['get', 'rank'], 20], 14]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 10.5,
            'text-anchor': 'bottom',
            'text-offset': [0, -0.3],
            'text-max-width': 8,
            'symbol-sort-key': ['coalesce', ['get', 'rank'], 20],
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.4 },
        })

        // Límites oficiales SIL (PMTiles propio): 13 parroquias rurales +
        // 6 urbanas + 63 barrios + cabeceras. Debajo de los reportes.
        map.addSource('territorio', {
          type: 'vector',
          url: `pmtiles://${import.meta.env.BASE_URL}data/loja-territorio.pmtiles`,
        })
        map.addLayer({
          id: 'parroquias-rurales-line',
          type: 'line',
          source: 'territorio',
          'source-layer': 'rurales',
          minzoom: 8,
          paint: {
            'line-color': '#ffffff',
            'line-opacity': 0.55,
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.6, 16, 2.5],
          },
        })
        map.addLayer({
          id: 'parroquias-urbanas-line',
          type: 'line',
          source: 'territorio',
          'source-layer': 'urbanas',
          minzoom: 10,
          paint: {
            'line-color': '#ffd166',
            'line-opacity': 0.7,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 1.8],
            'line-dasharray': [3, 1.6],
          },
        })
        // Hit areas invisibles para click (las líneas son difíciles de tocar).
        for (const [hitId, layer] of [['parroquias-rurales-hit', 'rurales'], ['parroquias-urbanas-hit', 'urbanas']] as const) {
          map.addLayer({
            id: hitId,
            type: 'fill',
            source: 'territorio',
            'source-layer': layer,
            paint: { 'fill-color': '#ffffff', 'fill-opacity': 0 },
          })
        }
        // Etiquetas desde centroides puntuales (los símbolos sobre polígonos se
        // duplican cuando el polígono cruza bordes de tile; los puntos, nunca).
        map.addLayer({
          id: 'parroquias-rurales-label',
          type: 'symbol',
          source: 'territorio',
          'source-layer': 'centroides',
          minzoom: 8,
          maxzoom: 13,
          filter: ['==', ['get', 'tipo'], 'rural'],
          layout: {
            'text-field': ['get', 'nombre'],
            'text-font': ['Noto Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 12, 14],
            'text-anchor': 'center',
            'text-max-width': 8,
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.08,
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,20,60,0.8)', 'text-halo-width': 1.6 },
        })
        map.addLayer({
          id: 'parroquias-urbanas-label',
          type: 'symbol',
          source: 'territorio',
          'source-layer': 'centroides',
          minzoom: 11.5,
          maxzoom: 14.5,
          filter: ['==', ['get', 'tipo'], 'urbana'],
          layout: {
            'text-field': ['get', 'nombre'],
            'text-font': ['Noto Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 12, 14, 15],
            'text-anchor': 'center',
            'text-max-width': 8,
            'text-letter-spacing': 0.06,
          },
          paint: { 'text-color': '#ffe9a8', 'text-halo-color': 'rgba(0,20,60,0.85)', 'text-halo-width': 1.6 },
        })
        map.addLayer({
          id: 'cabeceras-label',
          type: 'symbol',
          source: 'territorio',
          'source-layer': 'centroides',
          minzoom: 10.5,
          maxzoom: 13.5,
          filter: ['==', ['get', 'tipo'], 'cabecera'],
          layout: {
            'text-field': ['get', 'nombre'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.9],
            'text-max-width': 8,
          },
          paint: { 'text-color': '#ffe9a8', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.5 },
        })
        map.addLayer({
          id: 'barrios-line',
          type: 'line',
          source: 'territorio',
          'source-layer': 'barrios',
          minzoom: 13.5,
          paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 1 },
        })
        map.addLayer({
          id: 'barrios-label',
          type: 'symbol',
          source: 'territorio',
          'source-layer': 'centroides',
          minzoom: 14.5,
          filter: ['==', ['get', 'tipo'], 'barrio'],
          layout: {
            'text-field': ['get', 'nombre'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 10.5,
            'text-anchor': 'center',
            'text-max-width': 7,
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.4 },
        })

        // Click en parroquia: foco (filtra reportes) + vuelo a su bbox.
        const focusByNombre = (nombre: unknown) => {
          if (typeof nombre !== 'string') return
          const p = PARROQUIAS.find((x) => x.nombre === nombre)
          if (!p) return
          setFocusParroquia(p.id)
          map.flyTo({
            center: [p.centro[1], p.centro[0]],
            zoom: p.tipo === 'rural' ? 12 : 14,
            duration: 900,
          })
        }
        for (const hitId of ['parroquias-rurales-hit', 'parroquias-urbanas-hit'] as const) {
          map.on('mouseenter', hitId, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', hitId, () => {
            map.getCanvas().style.cursor = ''
          })
          map.on('click', hitId, (event) => {
            focusByNombre(event.features?.[0]?.properties?.nombre)
          })
        }
      } catch {
        /* Estilo sin capa de edificios: el mapa sigue funcionando. */
      }

      // Sprites de pins (teardrop + icono por categoría). Si fallan, círculos.
      spritesOkRef.current = await addCategoryPinSprites(
        map,
        CATEGORIAS_VISUALES.map((c) => ({ id: `pin-${c.key}`, color: c.color, icono: c.icono })),
      )

      // Reportes: heatmap + pins (+ clusters en modo full), siempre sobre los edificios.
      try {
        map.addSource('reports', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: pinFeaturesRef.current },
        })
        map.addLayer({
          id: 'reports-heat',
          type: 'heatmap',
          source: 'reports',
          maxzoom: 17,
          paint: {
            'heatmap-weight': ['get', 'intensity'],
            // Kernel amplio + intensidad alta: con pocos reportes dispersos cada
            // punto forma su mancha (verde→azul); donde se solapan, núcleo naranja.
            // Paradas bajas para la vista cantonal (z10).
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 2.2, 16, 5],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 16, 48],
            'heatmap-opacity': 0.75,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(13,185,84,0)',
              0.2,
              'rgba(13,185,84,0.8)',
              0.45,
              'rgba(0,38,147,0.9)',
              0.7,
              'rgba(254,100,15,0.95)',
              1,
              'rgba(254,65,2,0.95)',
            ],
          },
        })

        if (spritesOkRef.current) {
          map.addLayer({
            id: 'reports-pins',
            type: 'symbol',
            source: 'reports',
            minzoom: 11,
            layout: {
              'icon-image': ['get', 'spriteId'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 17, 1.1],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        } else {
          map.addLayer({
            id: 'reports-pins-fallback',
            type: 'circle',
            source: 'reports',
            minzoom: 11,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 6, 1, 15],
              'circle-color': [
                'match',
                ['get', 'spriteKey'],
                'agua', '#35C2FF',
                'recoleccion', '#16a34a',
                'movilidad', '#f59e0b',
                'servicios', '#8b5cf6',
                '#8b5cf6',
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
          })
        }

        for (const layerId of spritesOkRef.current ? ['reports-pins'] : ['reports-pins-fallback']) {
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = ''
          })
          map.on('click', layerId, (event) => {
            const feature = event.features?.[0] as unknown as ReportFeature | undefined
            if (!feature?.properties || !feature.geometry) return
            const coords = (feature.geometry as { coordinates?: [number, number] }).coordinates
            if (!coords || !isValidLngLat(Number(coords[0]), Number(coords[1]))) return
            openReportPopup(feature, [Number(coords[0]), Number(coords[1])])
          })
        }

        if (!lite) {
          // Burbujas de cluster (solo cuando hay más de 1 reporte en la zona).
          map.addSource('reports-clusters', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: clusterFeaturesRef.current },
            cluster: true,
            clusterRadius: 42,
            clusterMaxZoom: 15,
            clusterProperties: { reportes: ['+', ['get', 'count']] },
          })
          map.addLayer({
            id: 'cluster-bubbles',
            type: 'circle',
            source: 'reports-clusters',
            maxzoom: 15.5,
            // coalesce: las features hoja no tienen 'reportes' (null) y no deben pintar burbuja.
            filter: ['>', ['coalesce', ['get', 'reportes'], 0], 1],
            paint: {
              'circle-color': '#002693',
              'circle-opacity': 0.92,
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
              'circle-radius': ['interpolate', ['linear'], ['get', 'reportes'], 2, 17, 40, 30],
            },
          })
          map.addLayer({
            id: 'cluster-counts',
            type: 'symbol',
            source: 'reports-clusters',
            maxzoom: 15.5,
            filter: ['>', ['coalesce', ['get', 'reportes'], 0], 1],
            layout: {
              'text-field': ['get', 'reportes'],
              'text-size': 12.5,
              'text-font': ['Noto Sans Bold'],
            },
            paint: { 'text-color': '#ffffff' },
          })
          map.on('mouseenter', 'cluster-bubbles', () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'cluster-bubbles', () => {
            map.getCanvas().style.cursor = ''
          })
          map.on('click', 'cluster-bubbles', (event) => {
            const feature = event.features?.[0]
            const coords = (feature?.geometry as { coordinates?: [number, number] } | undefined)?.coordinates
            if (!coords) return
            map.easeTo({
              center: [Number(coords[0]), Number(coords[1])],
              zoom: Math.min(map.getZoom() + 2, 15.5),
              duration: 600,
            })
          })
        }
      } catch {
        /* Sin capa de reportes (no debería ocurrir). */
      }

      // Muestreo perezoso del color de techo según el viewport (idle = tiles
      // listos tras la carga; moveend = tras cada paneo/zoom).
      map.on('moveend', () => sampleViewportRoofs())
      map.on('idle', () => sampleViewportRoofs())
    })

    })()

    return () => {
      cancelled = true
      locationMarkerRef.current = null
      cardPopupRef.current = null
      mapRef.current = null
      mapInstance?.remove()
    }
    // openReportPopup se usa dentro vía closure estable (refs), lite/inView no cambian tras montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  // Actualiza los datos cuando cambian reportes o filtros.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const pinsSource = map.getSource('reports') as maplibregl.GeoJSONSource | null
      if (pinsSource) pinsSource.setData({ type: 'FeatureCollection', features: pinFeaturesRef.current })
      const clusterSource = map.getSource('reports-clusters') as maplibregl.GeoJSONSource | null
      if (clusterSource) {
        clusterSource.setData({ type: 'FeatureCollection', features: clusterFeaturesRef.current })
      }
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [pins.features, clusterFeatures])

  const handleUseLocation = () => {
    const map = mapRef.current
    const maplibre = maplibreMod
    if (!map || !maplibre) return
    if (!('geolocation' in navigator)) {
      showToast('Tu navegador no permite obtener la ubicación')
      return
    }
    setBusy('location')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(null)
        const lat = Number(position.coords.latitude)
        const lng = Number(position.coords.longitude)
        if (!isValidLngLat(lng, lat)) {
          showToast('La ubicación recibida no es válida')
          return
        }
        if (!isInsideLoja(lng, lat)) {
          showToast('Tu ubicación está fuera de Loja')
          return
        }
        cardPopupRef.current?.remove()
        locationMarkerRef.current?.remove()
        const marker = new maplibre.Marker({ color: '#FE4102' }).setLngLat([lng, lat]).addTo(map)
        locationMarkerRef.current = marker
        map.flyTo({ center: [lng, lat], zoom: 18, pitch: TERRAIN_PITCH, duration: 1200 })
      },
      (error) => {
        setBusy(null)
        showToast(
          error.code === error.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado'
            : 'No se pudo obtener tu ubicación',
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  const handleDimChange = (next: '2d' | '3d') => {
    if (next === dimRef.current) return
    const map = mapRef.current
    // Bloqueado durante una transición en curso para no desincronizar estado y terreno.
    if (!map || terrainBusyRef.current || map.isMoving()) return
    setDim(next)
    dimRef.current = next
    terrainBusyRef.current = true
    map.stop()
    const finishTransition = (terrainEnabled: boolean) => {
      map.resize()
      terrainOnRef.current = terrainEnabled
      terrainBusyRef.current = false
    }

    // Volúmenes ML: solo visibles en modo 3D.
    try {
      if (map.getLayer('buildings-3d')) {
        map.setFilter('buildings-3d', next === '3d' ? null : ['!=', ['get', 'ml'], 1])
      }
    } catch {
      /* capa aún no creada */
    }

    if (next === '2d') {
      // Primero nivelamos la cámara para no dejarla bajo el terreno al retirarlo.
      map.easeTo({ pitch: 0, duration: 450 })
      map.once('moveend', () => {
        try {
          map.setTerrain(null)
          finishTransition(false)
        } catch {
          map.jumpTo({ center: LOJA_CENTER, zoom: 13, pitch: 0, bearing: -12 })
          map.setTerrain(null)
          finishTransition(false)
        }
      })
      return
    }

    try {
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.3 })
      map.resize()
      map.easeTo({ pitch: TERRAIN_PITCH, duration: 650 })
      map.once('moveend', () => finishTransition(true))
    } catch {
      map.setTerrain(null)
      finishTransition(false)
    }
  }

  const toggleChip = (key: string) => {
    setFiltros((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div
      ref={wrapRef}
      className={`loja-map-page${embedded ? ' loja-map-embedded' : ''}${className ? ` ${className}` : ''}`}
    >
      <div ref={containerRef} className="loja-map-canvas" />
      {(!inView || !mapLoaded) && (
        <div className="loja-map-loading-veil" aria-hidden="true">
          <span>Cargando mapa…</span>
        </div>
      )}
      <div className="loja-map-hud">
        <div className="loja-map-top-row">
          {!lite && <div className="loja-map-status-pill">{totalAportes} aportes registrados</div>}
          {focusParroquia && (
            <button
              type="button"
              className="loja-map-status-pill"
              onClick={() => setFocusParroquia(null)}
              title="Quitar filtro de parroquia"
              aria-label={`Quitar filtro: ${PARROQUIA_POR_ID[focusParroquia]?.nombre ?? 'parroquia'}`}
            >
              {PARROQUIA_POR_ID[focusParroquia]?.nombre ?? 'Parroquia'}&nbsp;×
            </button>
          )}
          <div className="loja-map-toggles">
            <button className="loja-map-toggle" type="button" disabled={busy === 'location'} onClick={handleUseLocation}>
              Usar ubicación actual
            </button>
            <div className="loja-map-dim" role="group" aria-label="Modo del mapa (2D plano o 3D con terreno)">
              <button
                type="button"
                className="loja-map-toggle"
                aria-pressed={dim === '2d'}
                onClick={() => handleDimChange('2d')}
              >
                2D
              </button>
              <button
                type="button"
                className="loja-map-toggle"
                aria-pressed={dim === '3d'}
                onClick={() => handleDimChange('3d')}
              >
                3D
              </button>
            </div>
          </div>
        </div>

        {lite ? (
          <div className="loja-map-legend loja-map-legend-mini">
            <div className="loja-map-legend-head">Intensidad de reportes</div>
            <div className="loja-map-legend-bar" />
            <div className="loja-map-legend-scale"><span>Baja</span><span>Alta</span></div>
          </div>
        ) : (
          <div className="loja-map-filters">
            <button
              type="button"
              className="loja-map-filters-head"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span>Filtrar por categoría</span>
              <ChevronDown size={16} className={filtersOpen ? 'loja-map-filters-chevron' : 'loja-map-filters-chevron loja-map-filters-chevron-closed'} aria-hidden="true" />
            </button>
            {filtersOpen && (
              <>
                <div className="loja-map-chips">
                  {CATEGORIAS_VISUALES.map((categoria) => {
                    const Icon = CHIP_ICONS[categoria.icono]
                    const active = filtros[categoria.key]
                    return (
                      <button
                        key={categoria.key}
                        type="button"
                        className="loja-map-chip"
                        aria-pressed={active}
                        onClick={() => toggleChip(categoria.key)}
                      >
                        <i style={{ backgroundColor: categoria.color }} aria-hidden="true"><Icon size={11} /></i>
                        <span>{categoria.label}</span>
                        <b
                          className="loja-map-chip-dot"
                          style={{ backgroundColor: active ? categoria.color : 'transparent', borderColor: categoria.color }}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
                <div className="loja-map-intensity">
                  <div className="loja-map-legend-head">Intensidad de reportes</div>
                  <div className="loja-map-legend-bar" />
                  <div className="loja-map-legend-scale"><span>Baja</span><span>Alta</span></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {toast && <div className="loja-map-toast" role="status">{toast}</div>}
    </div>
  )
}
