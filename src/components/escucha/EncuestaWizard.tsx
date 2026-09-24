import { useState, useRef, useEffect, lazy, Suspense, type ChangeEvent } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import {
  resolverUbicacion, nombreParroquia, nombreSector, opcionesSector,
  SECTOR_RURAL_OTRO,
} from "../../lib/escucha/store"
import { crearReporte, codigoCategoria } from "../../lib/escucha/repo"
import { PARROQUIAS, CANTON_BOUNDS } from "../../data/parroquias"
import { gravedadColor } from "../../lib/escucha/geo"
import type { CategoriaId, Gravedad, Frecuencia, TiempoProblema, MvpDenuncia } from "../../lib/escucha/types"
import {
  MAX_MEDIA_FILES, MAX_VIDEO_SECONDS, getVideoDuration,
  validateMediaFile, subirEvidencia, isMediaRemota, extraerFotogramasDeVideo, type MediaRemota,
} from "../../lib/escucha/media"
import { eliminarEvidencia } from "../../lib/escucha/repo"
import PageBanner from "./PageBanner"
import MediaThumb from "./MediaThumb"
import VideoRecorder from "./VideoRecorder"
import { useAuth } from "./AuthContext"
import {
  RiArrowLeftLine, RiArrowRightLine, RiSendPlaneLine, RiUploadCloudLine, RiCloseLine,
  RiMapPinLine, RiPinDistanceLine, RiCheckboxCircleLine, RiRoadMapLine, RiLeafLine, RiDropLine, RiBuildingLine,
  RiSearchLine, RiNavigationLine, RiErrorWarningLine, RiCheckboxCircleFill, RiCameraLine, RiVideoLine,
  RiArrowDownSLine, RiEditLine, RiCarLine, RiHeartPulseLine, RiHistoryLine
} from "react-icons/ri"
const ComplaintMap = lazy(() => import("./ComplaintMap"))

/** Modal de salida: sin borrador local, salir descarta lo no enviado. */
function ConfirmarSalida({
  completados,
  onSeguir,
  onSalir,
}: {
  completados: string[]
  onSeguir: () => void
  onSalir: () => void
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#002693]/[0.07] text-[#002693]" aria-hidden="true">
          <RiPinDistanceLine size={20} />
        </span>
        <h4 id="confirm-title" className="mt-3 text-lg font-black text-[#111]">
          ¿Salir del formulario?
        </h4>
        <p className="mt-1 text-sm text-gray-600">
          Llevas {completados.length} de 5 pasos. Si sales ahora, se perderá lo no enviado.
        </p>
        {completados.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Avance guardado">
            {completados.map((c) => (
              <li key={c} className="rounded-full bg-[#0db954]/10 px-2.5 py-1 text-[11px] font-bold text-green-800">
                ✓ {c}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onSeguir}
            className="min-h-[52px] w-full rounded-2xl bg-[#002693] font-extrabold text-white active:scale-[0.98]"
          >
            Seguir aquí
          </button>
          <button
            onClick={onSalir}
            className="min-h-[52px] w-full rounded-2xl border-2 border-black/10 font-bold text-[#111] hover:bg-gray-50 active:scale-[0.98]"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const categories = [
  { id: "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial" as CategoriaId, name: "Agua y Alcantarillado", icon: RiDropLine, description: "Fugas, alcantarillado sanitario y pluvial." },
  { id: "Recolección de Desechos y Saneamiento Ambiental" as CategoriaId, name: "Saneamiento ambiental", icon: RiLeafLine, description: "Desechos sólidos, limpieza y saneamiento ambiental." },
  { id: "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc." as CategoriaId, name: "Movilidad Urbana", icon: RiRoadMapLine, description: "Baches, señalización, aceras, semáforos, obstrucción de vías y permisos." },
  { id: "Servicios Ciudadanos: Trámites, Atención al Ciudadano y Servicios Administrativos" as CategoriaId, name: "Servicios ciudadanos", icon: RiBuildingLine, description: "Trámites, atención al ciudadano y servicios municipales." },
]


const TOTAL_STEPS = 5
const STEP_NAMES = ["Categoría", "Ubicación", "Evidencia", "Encuesta", "Revisar"]
const STEP_META = [
  { title: "¿Qué problema quieres reportar?", desc: "Elige la categoría que mejor describe la necesidad." },
  { title: "¿Dónde ocurre?", desc: "Arrastra el mapa, busca la dirección o usa tu ubicación." },
  { title: "Añade la evidencia", desc: `Hasta ${MAX_MEDIA_FILES} fotos o videos de ${MAX_VIDEO_SECONDS}s y el relato de tu caso.` },
  { title: "Cuéntanos más", desc: "Tres datos rápidos para priorizar tu reporte." },
  { title: "Revisa tu reporte", desc: "Confirma los datos y envíalo con tu cuenta." },
]

export default function EncuestaWizard({ onComplete, onCancel, inline = false }: { onComplete: (id?: string, denuncia?: MvpDenuncia) => void; onCancel: () => void; inline?: boolean }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    categoryId: "" as CategoriaId | "",
    direccionPrincipal: "",
    calleSecundaria: "",
    referencia: "",
    location: { lat: -3.9972, lng: -79.2044 },
    ubicacionConfirmada: false,
    /** ids del catálogo SIL; territorioManual=true si el usuario los eligió a mano. */
    parroquiaId: "",
    barrioId: "",
    territorioManual: false,
    gravedad: "Media" as Gravedad,
    frecuencia: "Semanal" as Frecuencia,
    tiempoProblema: "1-4 semanas" as TiempoProblema,
    afectaMovilidad: false,
    afectaSalud: false,
    yaReportado: false,
    descripcion: "",
    media: [] as MediaRemota[],
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isProcessingMedia, setIsProcessingMedia] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [editTerritorio, setEditTerritorio] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  /** URL de cada vídeo → fotogramas extraídos (0.5s, mitad, final−1s). Solo validación Vision; no se persisten. */
  const framesRef = useRef<{ videoUrl: string; frames: string[] }[]>([])
  const [progressFeedback, setProgressFeedback] = useState("")

  // Restaurar borrador (+ refs frescas para el listener global de Escape,
  // que si no vería el estado del primer render).
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  const stepRef = useRef(step)
  stepRef.current = step
  const showConfirmCloseRef = useRef(showConfirmClose)
  showConfirmCloseRef.current = showConfirmClose
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirmCloseRef.current) {
          setShowConfirmClose(false)
          return
        }
        const fd = formDataRef.current
        const st = stepRef.current
        const hasData = fd.categoryId || fd.descripcion || fd.media.length > 0
        if (hasData && st < TOTAL_STEPS) setShowConfirmClose(true)
        else handleRequestClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus trap
  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); (last as HTMLElement).focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); (first as HTMLElement).focus() }
      }
    }
    el.addEventListener("keydown", handler as any)
    first?.focus()
    return () => el.removeEventListener("keydown", handler as any)
  }, [step])

  const handleRequestClose = () => {
    const hasData = formData.categoryId || formData.descripcion || formData.media.length > 0
    if (hasData && step < TOTAL_STEPS) setShowConfirmClose(true)
    else { onCancel(); triggerRef.current?.focus() }
  }

  const handleCategory = (id: CategoriaId) => setFormData(p => ({ ...p, categoryId: id }))

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
      setProgressFeedback(`Paso ${step + 1} de ${TOTAL_STEPS}`)
      setTimeout(() => setProgressFeedback(""), 800)
    } else handleSubmit()
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    if (!formData.categoryId) { setSubmitError("Selecciona una categoría"); setStep(1); return }
    if (!formData.descripcion.trim()) { setSubmitError("Describe lo sucedido"); setStep(3); return }
    if (formData.media.length === 0) { setSubmitError("Adjunta al menos una evidencia"); setStep(3); return }
    if (!user) { setSubmitError("Tu sesión expiró. Vuelve a ingresar."); return }
    setIsSubmitting(true)
    setProgressFeedback("Guardando reporte...")
    try {
      // Territorio declarado o resuelto por punto (nunca vacío si hay ubicación).
      let parroquiaId = formData.parroquiaId
      let barrioId = formData.barrioId
      if (!parroquiaId) {
        const r = resolverUbicacion(formData.location.lat, formData.location.lng)
        parroquiaId = r.parroquia.id
        barrioId = r.barrio?.id ?? (r.cabecera && r.cabecera.parroquiaId === r.parroquia.id ? r.cabecera.id : SECTOR_RURAL_OTRO)
      }
      const creada = await crearReporte({
        categoria_code: codigoCategoria(formData.categoryId as CategoriaId),
        descripcion: formData.descripcion.trim(),
        lat: formData.location.lat,
        lng: formData.location.lng,
        parroquiaId,
        barrioId,
        gravedad: formData.gravedad,
        frecuencia: formData.frecuencia,
        tiempoProblema: formData.tiempoProblema,
        afectaMovilidad: formData.afectaMovilidad,
        afectaSalud: formData.afectaSalud,
        yaReportadoMunicipio: formData.yaReportado,
        direccionPrincipal: formData.direccionPrincipal,
        calleSecundaria: formData.calleSecundaria,
        referencia: formData.referencia,
        evidencia: formData.media,
        // Fotogramas extraídos del vídeo (validación Vision fail-open; el server los descarta).
        ...(framesRef.current.length ? { fotogramas: framesRef.current.flatMap(r => r.frames).slice(0, 3) } : {}),
      })
      setSnackbar({ show: true, msg: "¡Gracias por alzar tu voz! Tu reporte fue registrado.", type: "success" })
      setTimeout(() => { setSnackbar({ show: false, msg: "", type: "success" }); onComplete(creada.id, creada); triggerRef.current?.focus() }, 1800)
    } catch (e: any) {
      setSubmitError(e.message || "No se pudo registrar tu reporte")
      setSnackbar({ show: true, msg: e.message || "No se pudo registrar", type: "error" })
      setTimeout(() => setSnackbar({ show: false, msg: "", type: "error" }), 4000)
    } finally {
      setIsSubmitting(false); setProgressFeedback("")
    }
  }

  // ---------- Evidencia: se sube directo a la nube al adjuntar ----------

  const stageFiles = async (files: FileList | File[]) => {
    setUploadError(null)
    const arr = Array.from(files as FileList)
    if (arr.length === 0) return
    if (formData.media.length + arr.length > MAX_MEDIA_FILES) {
      setUploadError(`Máximo ${MAX_MEDIA_FILES} archivos por reporte`)
      return
    }
    setIsProcessingMedia(true)
    setProgressFeedback('Subiendo evidencia…')
    let firstError: string | null = null
    const staged: MediaRemota[] = []
    for (const f of arr) {
      const check = await validateMediaFile(f)
      if (!check.ok || !check.kind) { firstError = firstError || check.error || "Archivo no válido"; continue }
      try {
        let duration: number | undefined
        let frames: string[] = []
        if (check.kind === "video") {
          duration = await getVideoDuration(f)
          frames = await extraerFotogramasDeVideo(f, duration)
        }
        const subida = await subirEvidencia(f, check.kind, duration)
        staged.push(subida)
        if (frames.length) framesRef.current.push({ videoUrl: subida.url, frames })
      } catch (e) {
        firstError = firstError || (e instanceof Error ? e.message : "No se pudo subir el archivo")
      }
    }
    if (firstError) setUploadError(firstError)
    if (staged.length) setFormData(p => ({ ...p, media: [...p.media, ...staged].slice(0, MAX_MEDIA_FILES) }))
    setIsProcessingMedia(false)
    setProgressFeedback('')
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void stageFiles(e.target.files)
  }

  const removeMedia = (i: number) => {
    setFormData(p => {
      const item = p.media[i]
      if (item && isMediaRemota(item)) void eliminarEvidencia(item.url).catch(() => {})
      return { ...p, media: p.media.filter((_, idx) => idx !== i) }
    })
  }

  const handleRecordedVideo = async (blob: Blob) => {
    setShowRecorder(false)
    const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || "video/webm" })
    await stageFiles([file])
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true); setSearchResults([])
    try {
      const q = encodeURIComponent(searchQuery + ", Loja, Ecuador")
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&countrycodes=ec&viewbox=${CANTON_BOUNDS.w},${CANTON_BOUNDS.n},${CANTON_BOUNDS.e},${CANTON_BOUNDS.s}&bounded=1&addressdetails=1`, { headers: { Accept: "application/json" } })
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
      if (data.length === 0) setUploadError("Sin resultados para esa dirección")
    } catch { setUploadError("No se pudo buscar la dirección") } finally { setIsSearching(false) }
  }

  const handleSelectResult = (r: any) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setFormData(p => ({ ...p, location: { lat, lng }, ubicacionConfirmada: true, direccionPrincipal: r.display_name?.split(",")[0] || p.direccionPrincipal, ...sugerirTerritorio(p, lat, lng) }))
    setSearchResults([])
    setSearchQuery(r.display_name || "")
  }

  // Identifica la última petición de GPS: evita que reintentos viejos
  // pisen el estado si el usuario reintenta o cambia de paso.
  const geoIntentoRef = useRef(0)

  const handleUseLocation = () => {
    if (!navigator.geolocation) { setUploadError("Geolocalización no disponible en este dispositivo"); return }
    const intentoActual = ++geoIntentoRef.current
    const MAX_INTENTOS = 3
    const pedir = (n: number) => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (geoIntentoRef.current !== intentoActual) return
          const lat = pos.coords.latitude, lng = pos.coords.longitude
          setFormData(p => ({ ...p, location: { lat, lng }, ubicacionConfirmada: true, ...sugerirTerritorio(p, lat, lng) }))
        },
        (err) => {
          if (geoIntentoRef.current !== intentoActual) return
          if (err.code === err.PERMISSION_DENIED) {
            setUploadError("Permiso de ubicación denegado. Actívalo en los Ajustes de tu dispositivo para usar el GPS, o arrastra el mapa hasta el punto y pulsa Confirmar ubicación.")
            return
          }
          // POSITION_UNAVAILABLE (kCLErrorLocationUnknown en iOS) y TIMEOUT
          // suelen resolverse cuando el GPS calienta: reintentar en silencio.
          if (n < MAX_INTENTOS) {
            window.setTimeout(() => {
              if (geoIntentoRef.current === intentoActual) pedir(n + 1)
            }, 1500)
            return
          }
          // Agotados los intentos: el mapa con pin central sigue disponible.
          setUploadError("Sin señal GPS por ahora. Arrastra el mapa hasta el punto y pulsa Confirmar ubicación.")
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      )
    }
    pedir(1)
  }

  /**
   * Autosugerencia parroquia→barrio desde el punto del mapa (catálogo SIL).
   * No pisa la elección manual del usuario.
   */
  const sugerirTerritorio = (
    p: { parroquiaId: string; barrioId: string; territorioManual: boolean },
    lat: number, lng: number,
  ) => {
    if (p.territorioManual) return {}
    const r = resolverUbicacion(lat, lng)
    if (r.barrio) return { parroquiaId: r.parroquia.id, barrioId: r.barrio.id }
    const cabeceraAqui = r.cabecera && r.cabecera.parroquiaId === r.parroquia.id ? r.cabecera.id : SECTOR_RURAL_OTRO
    return { parroquiaId: r.parroquia.id, barrioId: cabeceraAqui }
  }

  const handleConfirmMapPoint = (lat: number, lng: number) => {
    setFormData(p => ({ ...p, location: { lat, lng }, ubicacionConfirmada: true, ...sugerirTerritorio(p, lat, lng) }))
  }

  const handleParroquiaChange = (parroquiaId: string) => {
    const opts = opcionesSector(parroquiaId)
    setFormData(p => ({
      ...p, parroquiaId, territorioManual: true,
      // Si solo hay una opción (cabecera única), se preselecciona.
      barrioId: opts.length === 1 ? opts[0].value : "",
    }))
  }

  const handleBarrioChange = (barrioId: string) => {
    setFormData(p => ({ ...p, barrioId, territorioManual: true }))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files) void stageFiles(e.dataTransfer.files)
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={
        inline
          ? 'min-h-dvh bg-[#f8fafc] pb-[env(safe-area-inset-bottom)]'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pb-[env(safe-area-inset-bottom)]'
      }
      onClick={inline ? undefined : handleRequestClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className={
          inline
            ? 'relative mx-auto flex w-full max-w-4xl flex-col bg-white sm:my-6 sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-black/5'
            : 'relative flex flex-col bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92dvh] overflow-hidden'
        }
        onClick={inline ? undefined : e => e.stopPropagation()}
      >
        {/* Cabecera editorial (banner compartido con /vecino y /admin) */}
        <PageBanner
          titleId="wizard-title"
          eyebrow={`Paso ${step} de ${TOTAL_STEPS} · ${STEP_NAMES[step - 1]}`}
          title={STEP_META[step - 1].title}
          desc={STEP_META[step - 1].desc}
          titleKey={step}
          progress={{ current: step, total: TOTAL_STEPS }}
          actions={
            <button onClick={handleRequestClose} aria-label="Cerrar formulario" className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white active:scale-95"><RiCloseLine className="text-xl" aria-hidden="true" /></button>
          }
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className={inline ? 'flex-1' : 'flex-1 overflow-y-auto'}
          >
          <div className="px-4 sm:px-6 py-2 flex flex-col gap-3">
            <div className="hidden sm:flex justify-between text-xs font-medium pt-3">
              {STEP_NAMES.map((label, i) => (
                <span key={label} className={`flex items-center gap-1 ${step >= i + 1 ? "text-[#002693] font-semibold" : "text-gray-400"}`} aria-current={step === i + 1 ? "step" : undefined}>
                  {step > i + 1 && <RiCheckboxCircleFill className="text-[#0db954]" aria-hidden="true" />} {label}
                </span>
              ))}
            </div>
            {progressFeedback && <p className="text-xs text-[#002693] font-medium" aria-live="polite">{progressFeedback}</p>}
          </div>

          {step === 1 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {categories.map((c, i) => {
                  const Icon = c.icon
                  const sel = formData.categoryId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCategory(c.id)}
                      aria-pressed={sel}
                      style={{ animationDelay: `${i * 70}ms` }}
                      className={`anim-rise group relative flex min-h-[168px] flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#002693] focus-visible:ring-offset-2 ${sel ? "border-[#002693] bg-[#002693] text-white shadow-[0_18px_36px_-18px_rgba(0,26,97,0.7)]" : "border-gray-200 bg-white hover:border-[#002693]/50"}`}
                    >
                      <span className={`grid h-11 w-11 place-items-center rounded-xl ${sel ? "bg-white/15 text-white" : "bg-[#002693]/[0.06] text-[#002693]"}`}><Icon className="text-[22px]" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[15px] font-extrabold leading-tight ${sel ? "text-white" : "text-gray-900"}`}>{c.name}</span>
                        <span className={`mt-1 block text-xs leading-snug ${sel ? "text-white/70" : "text-gray-500"}`}>{c.description}</span>
                      </span>
                      <span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full transition-all ${sel ? "bg-[#FE4102] text-white opacity-100 scale-100" : "bg-gray-100 text-transparent opacity-0 scale-75"}`} aria-hidden="true"><RiCheckboxCircleLine className="text-base" /></span>
                    </button>
                  )
                })}
              </div>
              {!formData.categoryId && <p id="cat-help" className="text-xs text-gray-400">Selecciona una categoría para continuar.</p>}
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={handleRequestClose} className="min-h-[52px] flex-1 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] active:scale-[0.98]">Cancelar</button>
                  <button disabled={!formData.categoryId} onClick={handleNext} aria-describedby={!formData.categoryId ? "cat-help" : undefined} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">Siguiente <RiArrowRightLine aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-4 sm:p-6 md:grid md:grid-cols-[1.15fr_.85fr] md:items-start md:gap-4 flex flex-col gap-4">
              {/* Buscador compacto (móvil: debajo del mapa; desktop: panel lateral) */}
              <div className="order-3 rounded-2xl border bg-white p-3 flex flex-col gap-2.5 md:order-none md:col-start-2 md:row-start-2">
                <label htmlFor="search-dir" className="text-sm font-bold text-[#002693] flex items-center gap-2"><RiSearchLine aria-hidden="true" /> Buscar dirección</label>
                <div className="flex gap-2">
                  <input
                    id="search-dir"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch() } }}
                    placeholder="Ej: Av. 8 de Diciembre, Loja"
                    className="flex-1 h-11 min-w-0 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none"
                    aria-describedby="search-help"
                  />
                  <button onClick={handleSearch} disabled={isSearching} className="min-h-[44px] px-4 rounded-xl bg-[#002693] text-white font-bold disabled:opacity-50 flex items-center gap-2 shrink-0">{isSearching ? "..." : "Buscar"}</button>
                </div>
                {searchResults.length > 0 && (
                  <ul className="border rounded-xl divide-y max-h-[180px] overflow-auto">
                    {searchResults.map((r: any) => (
                      <li key={r.place_id}><button onClick={() => handleSelectResult(r)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-start gap-2"><RiMapPinLine className="mt-0.5 text-gray-400 shrink-0" aria-hidden="true" /><span className="line-clamp-2">{r.display_name}</span></button></li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between gap-2">
                  <button onClick={handleUseLocation} className="min-h-[36px] inline-flex items-center gap-2 text-sm font-semibold text-[#002693] hover:underline w-fit"><RiNavigationLine aria-hidden="true" /> Usar mi ubicación</button>
                  <span id="search-help" className="text-[11px] text-gray-400">Dentro del cantón Loja</span>
                </div>
                {uploadError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><RiErrorWarningLine aria-hidden="true" /> {uploadError}</p>}
              </div>

              {/* Mapa: protagonista, pin central + arrastre + confirmación explícita */}
              <Suspense fallback={<div className="order-1 h-[300px] md:h-[460px] w-full animate-pulse rounded-2xl bg-gray-100 md:order-none md:col-start-1 md:row-start-1 md:row-span-3" />}>
                <div className="order-1 md:order-none md:col-start-1 md:row-start-1 md:row-span-3 md:sticky md:top-0">
                <ComplaintMap
                  center={[formData.location.lat, formData.location.lng]}
                  selectedPosition={formData.ubicacionConfirmada ? [formData.location.lat, formData.location.lng] : null}
                  zoom={16}
                  onConfirm={handleConfirmMapPoint}
                  onDeselect={() => setFormData(p => ({ ...p, ubicacionConfirmada: false }))}
                />
                </div>
              </Suspense>

              {/* Territorio: resumen siempre visible + edición bajo demanda */}
              <div className="order-2 rounded-2xl border bg-white p-3.5 flex flex-col gap-2.5 md:order-none md:col-start-2 md:row-start-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm">
                    <RiPinDistanceLine className="shrink-0 text-[#002693]" aria-hidden="true" />
                    {formData.parroquiaId ? (
                      <span className="truncate font-bold text-gray-900">
                        {[nombreParroquia(formData.parroquiaId), nombreSector(formData.parroquiaId, formData.barrioId)].filter(Boolean).join(" · ") || "Ubicación"}
                      </span>
                    ) : (
                      <span className="text-gray-400">Confirma el punto y sugerimos el sector…</span>
                    )}
                  </p>
                  {formData.parroquiaId ? (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${formData.territorioManual ? 'bg-[#002693]/10 text-[#002693]' : 'bg-green-50 text-green-700'}`}>
                      {formData.territorioManual ? 'elegido' : 'sugerido'}
                    </span>
                  ) : null}
                </div>
                {(editTerritorio || !formData.parroquiaId) && (
                  <div className="grid grid-cols-1 gap-2.5">
                    <label htmlFor="parroquia" className="flex flex-col gap-1 text-[13px] font-medium">Parroquia
                      <select id="parroquia" value={formData.parroquiaId} onChange={e => handleParroquiaChange(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none">
                        <option value="">Elige…</option>
                        <optgroup label="Urbanas">
                          {PARROQUIAS.filter(p => p.tipo === 'urbana').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </optgroup>
                        <optgroup label="Rurales">
                          {PARROQUIAS.filter(p => p.tipo === 'rural').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </optgroup>
                      </select>
                    </label>
                    <label htmlFor="barrio" className="flex flex-col gap-1 text-[13px] font-medium">{nombreParroquia(formData.parroquiaId) && PARROQUIAS.find(p => p.id === formData.parroquiaId)?.tipo === 'rural' ? 'Sector' : 'Barrio'}
                      <select id="barrio" value={formData.barrioId} onChange={e => handleBarrioChange(e.target.value)} disabled={!formData.parroquiaId} className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none disabled:opacity-50">
                        <option value="">{formData.parroquiaId ? 'Elige…' : 'Primero la parroquia…'}</option>
                        {opcionesSector(formData.parroquiaId).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                  </div>
                )}
                {formData.parroquiaId && (
                  <button onClick={() => setEditTerritorio(v => !v)} aria-expanded={editTerritorio} className="inline-flex min-h-[36px] items-center gap-1.5 self-start text-[13px] font-bold text-[#002693] hover:underline">
                    <RiEditLine aria-hidden="true" /> {editTerritorio ? 'Ocultar' : 'Corregir parroquia / barrio'}
                  </button>
                )}
              </div>

              {/* Dirección exacta (opcional, colapsable) */}
              <div className="order-4 rounded-2xl border bg-white md:order-none md:col-start-2 md:row-start-3">
                <button onClick={() => setShowAddress(v => !v)} aria-expanded={showAddress} className="flex min-h-[52px] w-full items-center justify-between gap-2 px-4 text-left">
                  <span className="text-sm font-bold text-gray-900">
                    Dirección exacta <span className="font-normal text-gray-400">(opcional)</span>
                  </span>
                  <RiArrowDownSLine aria-hidden="true" className={`shrink-0 text-lg text-gray-400 transition-transform ${showAddress ? 'rotate-180' : ''}`} />
                </button>
                {showAddress && (
                  <div className="grid grid-cols-1 gap-3 px-4 pb-4">
                    <label htmlFor="dir-principal" className="flex flex-col gap-1 text-[13px] font-medium">Dirección principal<input id="dir-principal" value={formData.direccionPrincipal} onChange={e => setFormData(p => ({ ...p, direccionPrincipal: e.target.value }))} placeholder="Av. Emiliano Ortega" autoComplete="street-address" className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                    <label htmlFor="dir-secundaria" className="flex flex-col gap-1 text-[13px] font-medium">Calle secundaria<input id="dir-secundaria" value={formData.calleSecundaria} onChange={e => setFormData(p => ({ ...p, calleSecundaria: e.target.value }))} placeholder="Juan José Peña" className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                    <label htmlFor="referencia" className="flex flex-col gap-1 text-[13px] font-medium">Referencia<input id="referencia" value={formData.referencia} onChange={e => setFormData(p => ({ ...p, referencia: e.target.value }))} placeholder="Frente al parque, casa verde..." className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                  </div>
                )}
              </div>

              <div className="order-5 sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur md:order-none md:col-span-full">
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="min-h-[52px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} disabled={!formData.ubicacionConfirmada} aria-describedby={!formData.ubicacionConfirmada ? "map-status" : undefined} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">Siguiente <RiArrowRightLine aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold">Evidencia visual * <span className="font-normal text-gray-500">({formData.media.length}/{MAX_MEDIA_FILES})</span></span>
                <input type="file" ref={fileInputRef} onChange={onFileInputChange} accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple className="hidden" aria-hidden="true" tabIndex={-1} />
                <input type="file" ref={photoInputRef} onChange={onFileInputChange} accept="image/*" capture="environment" className="hidden" aria-hidden="true" tabIndex={-1} />

                {!showRecorder ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => photoInputRef.current?.click()} disabled={isProcessingMedia || formData.media.length >= MAX_MEDIA_FILES} className="min-h-[52px] rounded-xl border-2 border-dashed border-gray-300 hover:border-[#002693] hover:bg-[#002693]/[0.03] disabled:opacity-40 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#002693] focus-visible:ring-2 focus-visible:ring-[#002693]">
                      <RiCameraLine className="text-lg" aria-hidden="true" /> Foto
                    </button>
                    <button onClick={() => { setUploadError(null); setShowRecorder(true) }} disabled={isProcessingMedia || formData.media.length >= MAX_MEDIA_FILES} className="min-h-[52px] rounded-xl border-2 border-dashed border-gray-300 hover:border-[#002693] hover:bg-[#002693]/[0.03] disabled:opacity-40 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#002693] focus-visible:ring-2 focus-visible:ring-[#002693]">
                      <RiVideoLine className="text-lg" aria-hidden="true" /> Video
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingMedia || formData.media.length >= MAX_MEDIA_FILES} className="min-h-[52px] rounded-xl border-2 border-dashed border-gray-300 hover:border-[#002693] hover:bg-[#002693]/[0.03] disabled:opacity-40 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#002693] focus-visible:ring-2 focus-visible:ring-[#002693]">
                      <RiUploadCloudLine className="text-lg" aria-hidden="true" /> Subir
                    </button>
                  </div>
                ) : (
                  <VideoRecorder onDone={handleRecordedVideo} onCancel={() => setShowRecorder(false)} />
                )}

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Arrastra archivos aquí"
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click() } }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`hidden sm:flex h-20 border-2 border-dashed rounded-xl bg-gray-50 flex-col items-center justify-center text-xs text-gray-500 ${dragOver ? "bg-[#002693]/5 border-[#002693]" : ""}`}
                >
                  {isProcessingMedia ? "Procesando archivos…" : "O arrastra fotos/videos aquí (máx 10s por video)"}
                </div>

                {uploadError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><RiErrorWarningLine aria-hidden="true" /> {uploadError}</p>}

                {formData.media.length > 0 && (
                  <div className="grid grid-cols-3 gap-3" role="list" aria-label="Evidencia adjunta">
                    {formData.media.map((ref, i) => (
                      <div key={`ev-${i}`} role="listitem" className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100">
                        <MediaThumb item={ref} alt={`Evidencia ${i + 1} de ${formData.media.length}`} className="h-full w-full object-cover" />
                        {ref.kind === "video" && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black text-white tabular-nums">
                            {ref.duration ? `${Math.round(ref.duration)}s` : "video"}
                          </span>
                        )}
                        <button onClick={() => removeMedia(i)} aria-label={`Eliminar evidencia ${i + 1}`} className="absolute top-1 right-1 min-w-[44px] min-h-[44px] p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white"><RiCloseLine aria-hidden="true" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label htmlFor="relato" className="flex flex-col gap-2 text-sm font-bold">Relato detallado *<textarea id="relato" value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} rows={5} maxLength={2000} required aria-required="true" aria-describedby="relato-count relato-help" placeholder="Describe qué pasa, desde cuándo, a quién afecta, qué solución esperas..." className="rounded-xl border border-gray-300 p-3.5 text-sm font-normal outline-none focus:border-[#002693] focus:ring-1 focus:ring-[#002693]" />
                <span id="relato-help" className="text-xs font-normal text-gray-500">Ej: Bajón de agua 3 semanas en la cuadra, afecta a 20 familias, pedimos cuadrilla.</span>
                <span id="relato-count" aria-live="polite" className="text-xs font-normal text-gray-400 text-right">{formData.descripcion.length} / 2000</span>
              </label>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] disabled:opacity-40 active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} disabled={isSubmitting || !formData.descripcion.trim() || formData.media.length === 0} aria-busy={isSubmitting} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">
                    Siguiente <RiArrowRightLine aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="rounded-2xl border bg-white p-4 sm:p-5">
                <h4 className="text-sm font-bold text-[#002693]">¿Qué tan grave es?</h4>
                <p className="mt-0.5 text-xs text-gray-500">Esto define con qué prioridad se atiende tu reporte.</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Gravedad del problema">
                  {(
                    [
                      { v: 'Baja', desc: 'Molesta, puede esperar' },
                      { v: 'Media', desc: 'Afecta el día a día' },
                      { v: 'Alta', desc: 'Urge atenderla' },
                      { v: 'Crítica', desc: 'Riesgo inmediato' },
                    ] as { v: Gravedad; desc: string }[]
                  ).map((op) => {
                    const activo = formData.gravedad === op.v
                    const color = gravedadColor(op.v)
                    return (
                      <button
                        key={op.v}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setFormData((p) => ({ ...p, gravedad: op.v }))}
                        style={activo ? { borderColor: color, background: `${color}12` } : undefined}
                        className={`min-h-[76px] rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98] ${
                          activo ? 'shadow-[0_10px_24px_-14px_rgba(0,0,0,0.5)]' : 'border-black/10 bg-white hover:border-black/25'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#111]">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                          {op.v}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{op.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 sm:p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-bold text-[#002693]">¿Cada cuánto pasa?</h4>
                  <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Frecuencia del problema">
                    {(['Una vez', 'Semanal', 'Diario', 'Permanente'] as Frecuencia[]).map((op) => {
                      const activo = formData.frecuencia === op
                      return (
                        <button
                          key={op}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => setFormData((p) => ({ ...p, frecuencia: op }))}
                          className={`min-h-[44px] rounded-full border-2 px-4 text-[13px] font-extrabold transition-all active:scale-[0.97] ${
                            activo
                              ? 'border-[#002693] bg-[#002693] text-white shadow-[0_10px_20px_-12px_rgba(0,38,147,0.7)]'
                              : 'border-black/10 bg-white text-[#111]/70 hover:border-[#002693]/40'
                          }`}
                        >
                          {op === 'Permanente' ? 'Siempre' : op}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#002693]">¿Desde cuándo?</h4>
                  <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Tiempo del problema">
                    {(['< 1 semana', '1-4 semanas', '1-6 meses', '> 6 meses'] as TiempoProblema[]).map((op) => {
                      const activo = formData.tiempoProblema === op
                      return (
                        <button
                          key={op}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => setFormData((p) => ({ ...p, tiempoProblema: op }))}
                          className={`min-h-[44px] rounded-full border-2 px-4 text-[13px] font-extrabold transition-all active:scale-[0.97] ${
                            activo
                              ? 'border-[#002693] bg-[#002693] text-white shadow-[0_10px_20px_-12px_rgba(0,38,147,0.7)]'
                              : 'border-black/10 bg-white text-[#111]/70 hover:border-[#002693]/40'
                          }`}
                        >
                          {op}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <fieldset className="rounded-2xl border bg-white p-4 sm:p-5">
                <legend className="px-2 text-sm font-bold text-[#002693]">¿A qué afecta?</legend>
                <div className="mt-1 grid grid-cols-1 gap-2.5" role="group" aria-label="Impacto del problema">
                  {[
                    { key: 'afectaMovilidad' as const, icon: RiCarLine, titulo: 'Afecta la movilidad', desc: 'Tránsito, buses o peatones' },
                    { key: 'afectaSalud' as const, icon: RiHeartPulseLine, titulo: 'Afecta salud y ambiente', desc: 'Basura, agua, humo o ruido' },
                    { key: 'yaReportado' as const, icon: RiHistoryLine, titulo: 'Ya lo reporté antes', desc: 'Sin respuesta hasta ahora' },
                  ].map((op) => {
                    const Icon = op.icon
                    const activo = formData[op.key]
                    return (
                      <button
                        key={op.key}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setFormData((p) => ({ ...p, [op.key]: !p[op.key] }))}
                        className={`flex min-h-[60px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.99] ${
                          activo
                            ? 'border-[#002693] bg-[#002693]/[0.05] shadow-[0_10px_24px_-14px_rgba(0,38,147,0.6)]'
                            : 'border-black/10 bg-white hover:border-[#002693]/40'
                        }`}
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${activo ? 'bg-[#002693] text-white' : 'bg-[#002693]/[0.07] text-[#002693]'}`}>
                          <Icon size={20} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-extrabold text-[#111]">{op.titulo}</span>
                          <span className="block truncate text-xs text-gray-500">{op.desc}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-sm font-black transition-all ${
                            activo ? 'border-[#002693] bg-[#002693] text-white' : 'border-black/15 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="min-h-[52px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">Revisar <RiArrowRightLine aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="rounded-2xl border bg-white p-4 sm:p-5 flex flex-col gap-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Categoría</p>
                    <p className="font-bold text-gray-900 mt-0.5">{selectedCategory?.name ?? "—"}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-gray-200 pt-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Ubicación</p>
                    <p className="font-bold text-gray-900 mt-0.5">
                      {[formData.direccionPrincipal, formData.calleSecundaria].filter(Boolean).join(" · ") || "Punto en el mapa"}
                    </p>
                    {(formData.parroquiaId || formData.barrioId) && (
                      <p className="text-[#002693] text-xs font-bold mt-0.5">
                        {[nombreParroquia(formData.parroquiaId), nombreSector(formData.parroquiaId, formData.barrioId)].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {formData.referencia && <p className="text-gray-500 text-xs mt-0.5">{formData.referencia}</p>}
                    <p className="text-gray-400 text-xs mt-0.5 tabular-nums">{formData.location.lat.toFixed(5)}, {formData.location.lng.toFixed(5)}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-gray-200 pt-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Evidencia ({formData.media.length})</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formData.descripcion ? "Con relato detallado" : "Sin relato"}</p>
                  </div>
                  <button onClick={() => setStep(3)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-gray-200 pt-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Valoración</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {[formData.gravedad, formData.frecuencia, formData.tiempoProblema].map(t => (
                        <span key={t} className="rounded-full bg-white border px-2.5 py-1 text-xs font-bold text-gray-700">{t}</span>
                      ))}
                    </p>
                    <p className="text-gray-500 text-xs mt-1.5">
                      {[formData.afectaMovilidad && "Afecta movilidad", formData.afectaSalud && "Afecta salud", formData.yaReportado && "Ya reportado antes"].filter(Boolean).join(" · ") || "Sin impacto marcado"}
                    </p>
                  </div>
                  <button onClick={() => setStep(4)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
                </div>
              </div>

              {/* Galería de evidencia en revisión */}
              {formData.media.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Evidencia</p>
                  <div className="grid grid-cols-3 gap-3">
                    {formData.media.map((ref, i) => (
                      <div key={`ev-${i}`} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100">
                        <MediaThumb item={ref} alt={`Evidencia ${i + 1}`} className="h-full w-full object-cover" />
                        {ref.kind === "video" && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black text-white tabular-nums">
                            {ref.duration ? `${Math.round(ref.duration)}s` : "video"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Relato</p>
                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{formData.descripcion}</p>
              </div>

              {/* Identidad verificada con Google */}
              <div className="rounded-2xl border border-[#0db954]/30 bg-[#0db954]/[0.06] p-4 sm:p-5 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#002693] text-lg font-black text-white" aria-hidden="true">
                  {((user?.nombre || user?.email) ?? 'V').charAt(0).toUpperCase()}
                </span>
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{user?.nombre || 'Vecino'}</p>
                  <p className="text-gray-500">{user?.email ?? ''} · identidad verificada</p>
                </div>
              </div>

              {submitError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><RiErrorWarningLine aria-hidden="true" /> {submitError}</p>}

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(4)} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] disabled:opacity-40 active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-[2] rounded-2xl bg-[#0db954] hover:bg-green-700 text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(13,185,84,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">
                    {isSubmitting ? "Guardando..." : <><RiSendPlaneLine aria-hidden="true" /> Enviar reporte</>}
                  </button>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        </AnimatePresence>

        {snackbar.show && (
          <div role={snackbar.type === "success" ? "status" : "alert"} aria-live={snackbar.type === "success" ? "polite" : "assertive"} aria-atomic="true" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium max-w-[90vw] ${snackbar.type === "success" ? "bg-[#0db954]" : "bg-red-600"}`}>{snackbar.msg}</div>
        )}

        {showConfirmClose && (
          <ConfirmarSalida
            completados={[
              formData.categoryId ? selectedCategory?.name ?? 'Categoría' : null,
              formData.ubicacionConfirmada ? 'Ubicación' : null,
              formData.media.length > 0 ? `Evidencia (${formData.media.length})` : null,
              formData.descripcion.trim() ? 'Relato' : null,
              step >= 4 ? 'Valoración' : null,
            ].filter((x): x is string => !!x)}
            onSeguir={() => setShowConfirmClose(false)}
            onSalir={() => { setShowConfirmClose(false); onCancel(); triggerRef.current?.focus() }}
          />
        )}
      </div>
    </div>
    </MotionConfig>
  )
}
