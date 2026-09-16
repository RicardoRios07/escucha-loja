import { useState, useRef, useEffect, lazy, Suspense, type ChangeEvent } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { validarCedulaEcuador, formatearCedula } from "../../lib/escucha/cedula"
import { addDenuncia } from "../../lib/escucha/store"
import { getBarrioAprox } from "../../lib/escucha/store"
import type { CategoriaId, Gravedad, Frecuencia, TiempoProblema } from "../../lib/escucha/types"
import {
  MAX_MEDIA_FILES, MAX_VIDEO_SECONDS, deleteMedia, getVideoDuration,
  putMedia, validateMediaFile, type MediaRef,
} from "../../lib/escucha/media"
import Logo from "./Logo"
import MediaThumb from "./MediaThumb"
import VideoRecorder from "./VideoRecorder"
import { useAuth } from "./AuthContext"
import {
  RiArrowLeftLine, RiArrowRightLine, RiSendPlaneLine, RiUploadCloudLine, RiCloseLine,
  RiMapPinLine, RiPinDistanceLine, RiCheckboxCircleLine, RiRoadMapLine, RiLeafLine, RiDropLine, RiBuildingLine,
  RiSearchLine, RiNavigationLine, RiErrorWarningLine, RiCheckboxCircleFill, RiCameraLine, RiVideoLine
} from "react-icons/ri"
const ComplaintMap = lazy(() => import("./ComplaintMap"))

const categories = [
  { id: "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial" as CategoriaId, name: "Agua y Alcantarillado", icon: RiDropLine, description: "Fugas, alcantarillado sanitario y pluvial." },
  { id: "Recolección de Desechos y Saneamiento Ambiental" as CategoriaId, name: "Recolección", icon: RiLeafLine, description: "Desechos sólidos y saneamiento ambiental." },
  { id: "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc." as CategoriaId, name: "Movilidad Urbana", icon: RiRoadMapLine, description: "Baches, señalización, aceras, semáforos." },
  { id: "Obstrucción de vías por construcciones, ornato, permisos de construcción" as CategoriaId, name: "Control Urbano", icon: RiBuildingLine, description: "Obstrucción de vías y permisos." },
]

const categoriaLabelMap: Record<string, string> = {
  "Agua Potable, Alcantarillado Sanitario, Alcantarillado Pluvial": "Agua y Alcantarillado",
  "Recolección de Desechos y Saneamiento Ambiental": "Recolección",
  "Movilidad Urbana: Bacheo de Calles, Frecuencias, Obstrucciones de aceras, etc.": "Movilidad Urbana",
  "Obstrucción de vías por construcciones, ornato, permisos de construcción": "Control Urbano",
}

const DRAFT_KEY = "escucha-loja-draft"
const TOTAL_STEPS = 5
const STEP_NAMES = ["Categoría", "Ubicación", "Encuesta", "Evidencia", "Revisar"]
const STEP_META = [
  { title: "¿Qué problema quieres reportar?", desc: "Elige la categoría que mejor describe la necesidad." },
  { title: "¿Dónde ocurre?", desc: "Busca la dirección o marca el punto en el mapa." },
  { title: "Cuéntanos más", desc: "Tres datos rápidos para priorizar." },
  { title: "Evidencia y relato", desc: `Añade hasta ${MAX_MEDIA_FILES} fotos o videos de ${MAX_VIDEO_SECONDS}s y describe tu caso.` },
  { title: "Revisa tu reporte", desc: "Confirma que todo esté bien antes de enviar." },
]

function maskCedula(c: string) {
  if (c.length < 5) return c
  return `${c.slice(0, 3)}…${c.slice(-2)}`
}

export default function EncuestaWizard({ onComplete, onCancel, inline = false }: { onComplete: (id?: string) => void; onCancel: () => void; inline?: boolean }) {
  const { sesion } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    categoryId: "" as CategoriaId | "",
    direccionPrincipal: "",
    calleSecundaria: "",
    referencia: "",
    location: { lat: -3.9972, lng: -79.2044 },
    ubicacionConfirmada: false,
    gravedad: "Media" as Gravedad,
    frecuencia: "Semanal" as Frecuencia,
    tiempoProblema: "1-4 semanas" as TiempoProblema,
    afectaMovilidad: false,
    afectaSalud: false,
    yaReportado: false,
    cedula: sesion?.cedula ?? "",
    nombre: sesion?.nombre ?? "",
    descripcion: "",
    media: [] as MediaRef[],
  })
  const [cedulaError, setCedulaError] = useState<string | null>(null)
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
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [progressFeedback, setProgressFeedback] = useState("")

  const progress = (step / TOTAL_STEPS) * 100

  // Restaurar borrador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d && d.categoryId) setFormData(p => ({ ...p, ...d, media: Array.isArray(d.media) ? d.media : [], ubicacionConfirmada: d.ubicacionConfirmada === true }))
      }
    } catch {}
    triggerRef.current = document.activeElement as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirmClose) setShowConfirmClose(false)
        else handleRequestClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // Guardar borrador (solo metadatos: las refs de medios son JSON serializable)
  useEffect(() => {
    const toSave = { ...formData }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave)) } catch {}
  }, [formData])

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

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {} }

  const handleRequestClose = () => {
    const hasData = formData.categoryId || formData.descripcion || formData.media.length > 0 || formData.cedula
    if (hasData && step < TOTAL_STEPS) setShowConfirmClose(true)
    else { clearDraft(); onCancel(); triggerRef.current?.focus() }
  }

  const handleCategory = (id: CategoriaId) => setFormData(p => ({ ...p, categoryId: id }))

  const handleNext = async () => {
    if (step === 3) {
      const v = validarCedulaEcuador(formData.cedula)
      if (!v.valid) { setCedulaError(v.error || "Cédula inválida"); document.getElementById("cedula")?.focus(); return }
      setCedulaError(null)
    }
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
      setProgressFeedback(`Paso ${step + 1} de ${TOTAL_STEPS}`)
      setTimeout(() => setProgressFeedback(""), 800)
    } else handleSubmit()
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const v = validarCedulaEcuador(formData.cedula)
    if (!v.valid) { setCedulaError(v.error || "Cédula inválida"); setStep(3); setTimeout(() => document.getElementById("cedula")?.focus(), 100); return }
    if (!formData.categoryId) { setSubmitError("Selecciona una categoría"); setStep(1); return }
    if (!formData.descripcion.trim()) { setSubmitError("Describe lo sucedido"); setStep(4); return }
    if (formData.media.length === 0) { setSubmitError("Adjunta al menos una evidencia"); setStep(4); return }
    setIsSubmitting(true)
    setProgressFeedback("Guardando aporte...")
    try {
      const id = `mvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      addDenuncia({
        id,
        createdAt: new Date().toISOString(),
        categoria: formData.categoryId as CategoriaId,
        categoriaLabel: categoriaLabelMap[formData.categoryId] || formData.categoryId,
        descripcion: formData.descripcion,
        lat: formData.location.lat,
        lng: formData.location.lng,
        evidencia: formData.media,
        encuesta: {
          gravedad: formData.gravedad,
          frecuencia: formData.frecuencia,
          tiempoProblema: formData.tiempoProblema,
          afectaMovilidad: formData.afectaMovilidad,
          afectaSalud: formData.afectaSalud,
          yaReportadoMunicipio: formData.yaReportado,
          direccionPrincipal: formData.direccionPrincipal,
          calleSecundaria: formData.calleSecundaria,
          referencia: formData.referencia,
        },
        cedula: formData.cedula,
        nombreCiudadano: formData.nombre || undefined,
      })
      clearDraft()
      setSnackbar({ show: true, msg: "¡Gracias por alzar tu voz! Tu aporte fue registrado.", type: "success" })
      setTimeout(() => { setSnackbar({ show: false, msg: "", type: "success" }); onComplete(id); triggerRef.current?.focus() }, 1800)
    } catch (e: any) {
      setSubmitError(e.message || "No se pudo registrar tu aporte")
      setSnackbar({ show: true, msg: e.message || "No se pudo registrar", type: "error" })
      setTimeout(() => setSnackbar({ show: false, msg: "", type: "error" }), 4000)
    } finally {
      setIsSubmitting(false); setProgressFeedback("")
    }
  }

  // ---------- Evidencia (foto o video ≤10s, máx 3, en IndexedDB) ----------

  const stageFiles = async (files: FileList | File[]) => {
    setUploadError(null)
    const arr = Array.from(files as FileList)
    if (arr.length === 0) return
    if (formData.media.length + arr.length > MAX_MEDIA_FILES) {
      setUploadError(`Máximo ${MAX_MEDIA_FILES} archivos por reporte`)
      return
    }
    setIsProcessingMedia(true)
    let firstError: string | null = null
    const staged: MediaRef[] = []
    for (const f of arr) {
      const check = await validateMediaFile(f)
      if (!check.ok || !check.kind) { firstError = firstError || check.error || "Archivo no válido"; continue }
      try {
        const duration = check.kind === "video" ? await getVideoDuration(f) : undefined
        const ref = await putMedia(f, check.kind, duration)
        staged.push(ref)
      } catch (e) {
        firstError = firstError || (e instanceof Error ? e.message : "No se pudo guardar el archivo")
      }
    }
    if (firstError) setUploadError(firstError)
    if (staged.length) setFormData(p => ({ ...p, media: [...p.media, ...staged].slice(0, MAX_MEDIA_FILES) }))
    setIsProcessingMedia(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void stageFiles(e.target.files)
  }

  const removeMedia = (i: number) => {
    setFormData(p => {
      const ref = p.media[i]
      if (ref) void deleteMedia(ref.id)
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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&countrycodes=ec&viewbox=-79.3,-3.9,-79.1,-4.1&bounded=1&addressdetails=1`, { headers: { Accept: "application/json" } })
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
      if (data.length === 0) setUploadError("Sin resultados para esa dirección")
    } catch { setUploadError("No se pudo buscar la dirección") } finally { setIsSearching(false) }
  }

  const handleSelectResult = (r: any) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setFormData(p => ({ ...p, location: { lat, lng }, ubicacionConfirmada: true, direccionPrincipal: r.display_name?.split(",")[0] || p.direccionPrincipal }))
    setSearchResults([])
    setSearchQuery(r.display_name || "")
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) { setUploadError("Geolocalización no disponible"); return }
    navigator.geolocation.getCurrentPosition(
      pos => setFormData(p => ({ ...p, location: { lat: pos.coords.latitude, lng: pos.coords.longitude }, ubicacionConfirmada: true })),
      () => setUploadError("No se pudo obtener tu ubicación")
    )
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
        {/* Cabecera editorial */}
        <header className="relative overflow-hidden bg-[#002693] text-white">
          <div className="halftone halftone-tiny pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#0635c4] opacity-70 blur-3xl" aria-hidden="true" />
          <div className="relative px-4 sm:px-6 pt-4 pb-6">
            <div className="flex items-center justify-between">
              <Logo height={30} />
              <button onClick={handleRequestClose} aria-label="Cerrar formulario" className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white active:scale-95"><RiCloseLine className="text-xl" aria-hidden="true" /></button>
            </div>
            <h2 id="wizard-title" className="sr-only">Formulario de reporte</h2>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/90" aria-live="polite">
              Paso {step} de {TOTAL_STEPS} · {STEP_NAMES[step - 1]}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-2 font-display text-[clamp(1.7rem,6vw,2.6rem)] leading-[1.02] tracking-tight"
              >
                {STEP_META[step - 1].title}
              </motion.p>
            </AnimatePresence>
            <p className="mt-1.5 text-sm text-white/70">{STEP_META[step - 1].desc}</p>
            <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`Paso ${step} de ${TOTAL_STEPS}`} aria-label="Progreso del reporte">
              {STEP_NAMES.map((label, i) => (
                <span
                  key={label}
                  aria-hidden="true"
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-[#FE4102]' : 'bg-white/20'}`}
                />
              ))}
            </div>
          </div>
        </header>

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
            <div className="p-4 sm:p-6 flex flex-col gap-5">

              <div className="rounded-xl border bg-white p-3 flex flex-col gap-3">
                <label htmlFor="search-dir" className="text-sm font-medium">Buscar dirección</label>
                <div className="flex gap-2">
                  <input
                    id="search-dir"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch() } }}
                    placeholder="Ej: Av. 8 de Diciembre y Cuxibamba, Loja"
                    className="flex-1 h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none"
                    aria-describedby="search-help"
                  />
                  <button onClick={handleSearch} disabled={isSearching} className="min-h-[44px] px-4 rounded-xl bg-[#002693] text-white font-bold disabled:opacity-50 flex items-center gap-2"><RiSearchLine aria-hidden="true" /> {isSearching ? "..." : "Buscar"}</button>
                </div>
                <p id="search-help" className="text-xs text-gray-500">Usa Nominatim para geocodificar dentro de Loja. También puedes mover el pin.</p>
                {searchResults.length > 0 && (
                  <ul className="border rounded-xl divide-y max-h-[180px] overflow-auto">
                    {searchResults.map((r: any) => (
                      <li key={r.place_id}><button onClick={() => handleSelectResult(r)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-start gap-2"><RiMapPinLine className="mt-0.5 text-gray-400 shrink-0" aria-hidden="true" /><span className="line-clamp-2">{r.display_name}</span></button></li>
                    ))}
                  </ul>
                )}
                <button onClick={handleUseLocation} className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-[#002693] hover:underline w-fit"><RiNavigationLine aria-hidden="true" /> Usar mi ubicación</button>
              </div>

              <div className="rounded-xl overflow-hidden border">
                <Suspense fallback={<div className="h-[320px] md:h-[380px] w-full animate-pulse bg-gray-100" />}>
                  <ComplaintMap center={[formData.location.lat, formData.location.lng]} selectedPosition={[formData.location.lat, formData.location.lng]} zoom={16} onConfirm={(lat, lng) => setFormData(p => ({ ...p, location: { lat, lng }, ubicacionConfirmada: true }))} onDeselect={() => setFormData(p => ({ ...p, ubicacionConfirmada: false }))} />
                </Suspense>
              </div>
              {formData.ubicacionConfirmada ? (
                <p className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0db954]/30 bg-[#0db954]/[0.07] px-3 py-2 text-xs font-bold text-[#0b7a3a]" role="status">
                  <RiMapPinLine aria-hidden="true" /> Punto confirmado · {getBarrioAprox(formData.location.lat, formData.location.lng)} · <span className="tabular-nums">{formData.location.lat.toFixed(5)}, {formData.location.lng.toFixed(5)}</span>
                </p>
              ) : (
                <p className="flex items-center justify-center gap-1.5 rounded-xl border border-[#eab308]/40 bg-[#eab308]/[0.08] px-3 py-2 text-xs font-bold text-[#8a6d00]" role="status">
                  <RiMapPinLine aria-hidden="true" /> Toca el mapa para ubicar tu caso
                </p>
              )}

              <div className="bg-white rounded-xl p-4 sm:p-5 border shadow-sm">
                <h4 className="font-bold text-[#002693] flex items-center gap-2 mb-3 text-sm"><RiPinDistanceLine aria-hidden="true" /> Detalles de ubicación</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label htmlFor="dir-principal" className="flex flex-col gap-1.5 text-sm font-medium">Dirección principal<input id="dir-principal" value={formData.direccionPrincipal} onChange={e => setFormData(p => ({ ...p, direccionPrincipal: e.target.value }))} placeholder="Av. Emiliano Ortega" autoComplete="street-address" className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                  <label htmlFor="dir-secundaria" className="flex flex-col gap-1.5 text-sm font-medium">Calle secundaria<input id="dir-secundaria" value={formData.calleSecundaria} onChange={e => setFormData(p => ({ ...p, calleSecundaria: e.target.value }))} placeholder="Juan José Peña" className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                  <label htmlFor="referencia" className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2">Referencia<input id="referencia" value={formData.referencia} onChange={e => setFormData(p => ({ ...p, referencia: e.target.value }))} placeholder="Frente al parque, casa verde..." className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                </div>
              </div>
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="min-h-[52px] flex-1 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} disabled={!formData.ubicacionConfirmada} aria-describedby={!formData.ubicacionConfirmada ? "geo-help" : undefined} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">Siguiente <RiArrowRightLine aria-hidden="true" /></button>
                </div>
                {!formData.ubicacionConfirmada && <p id="geo-help" className="pt-2 text-center text-xs font-medium text-[#8a6d00]">Confirma el punto tocando el mapa, buscando una dirección o usando tu ubicación.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="rounded-xl border bg-white p-4">
                <h4 className="text-sm font-bold text-[#002693]">Valoración del problema</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <label htmlFor="gravedad" className="flex flex-col gap-1.5 text-sm font-medium">Gravedad percibida
                    <select id="gravedad" value={formData.gravedad} onChange={e => setFormData(p => ({ ...p, gravedad: e.target.value as Gravedad }))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none">
                      <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
                    </select>
                  </label>
                  <label htmlFor="frecuencia" className="flex flex-col gap-1.5 text-sm font-medium">Frecuencia
                    <select id="frecuencia" value={formData.frecuencia} onChange={e => setFormData(p => ({ ...p, frecuencia: e.target.value as Frecuencia }))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none">
                      <option>Una vez</option><option>Semanal</option><option>Diario</option><option>Permanente</option>
                    </select>
                  </label>
                  <label htmlFor="tiempo" className="flex flex-col gap-1.5 text-sm font-medium">Tiempo así
                    <select id="tiempo" value={formData.tiempoProblema} onChange={e => setFormData(p => ({ ...p, tiempoProblema: e.target.value as TiempoProblema }))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none">
                      <option>{"< 1 semana"}</option><option>1-4 semanas</option><option>1-6 meses</option><option>{"> 6 meses"}</option>
                    </select>
                  </label>
                </div>
              </div>

              <fieldset className="rounded-xl border bg-white p-4">
                <legend className="px-2 text-sm font-bold text-[#002693]">Impacto</legend>
                <div className="flex flex-col gap-1 mt-1">
                  <label className="flex items-center gap-2.5 text-sm min-h-[44px] px-2 rounded-xl hover:bg-gray-50 cursor-pointer"><input type="checkbox" className="w-[18px] h-[18px] accent-[#002693]" checked={formData.afectaMovilidad} onChange={e => setFormData(p => ({ ...p, afectaMovilidad: e.target.checked }))} /> Afecta movilidad y tránsito</label>
                  <label className="flex items-center gap-2.5 text-sm min-h-[44px] px-2 rounded-xl hover:bg-gray-50 cursor-pointer"><input type="checkbox" className="w-[18px] h-[18px] accent-[#002693]" checked={formData.afectaSalud} onChange={e => setFormData(p => ({ ...p, afectaSalud: e.target.checked }))} /> Afecta salud y ambiente</label>
                  <label className="flex items-center gap-2.5 text-sm min-h-[44px] px-2 rounded-xl hover:bg-gray-50 cursor-pointer"><input type="checkbox" className="w-[18px] h-[18px] accent-[#002693]" checked={formData.yaReportado} onChange={e => setFormData(p => ({ ...p, yaReportado: e.target.checked }))} /> Ya lo reporté antes</label>
                </div>
              </fieldset>

              <div className="rounded-xl border bg-[#f8fafc] p-4 sm:p-5 flex flex-col gap-4">
                <h4 className="font-bold text-[#002693] text-sm">Participa con tu cédula</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label htmlFor="cedula" className="flex flex-col gap-1.5 text-sm font-medium">Cédula *<input id="cedula" value={formData.cedula} onChange={e => { const v = formatearCedula(e.target.value); setFormData(p => ({ ...p, cedula: v })); if (cedulaError) setCedulaError(null) }} onBlur={() => { if (formData.cedula.length === 10) { const v = validarCedulaEcuador(formData.cedula); if (!v.valid) setCedulaError(v.error || "Cédula inválida"); } }} placeholder="1100234567" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={10} aria-invalid={!!cedulaError} aria-describedby={cedulaError ? "cedula-error" : undefined} className={`h-11 rounded-xl border px-3.5 outline-none text-sm ${cedulaError ? "border-red-400 bg-red-50" : "border-gray-300 focus:border-[#002693] focus:ring-1 focus:ring-[#002693]"}`} /></label>
                  <label htmlFor="nombre" className="flex flex-col gap-1.5 text-sm font-medium">Nombre <span className="font-normal text-gray-400">(opcional)</span><input id="nombre" value={formData.nombre} onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre" autoComplete="name" className="h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:border-[#002693] focus:ring-1 focus:ring-[#002693] outline-none" /></label>
                </div>
                {cedulaError && <p id="cedula-error" role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><RiErrorWarningLine aria-hidden="true" /> {cedulaError}</p>}
                <p className="text-xs text-gray-500">Usamos la cédula solo para validar participación.</p>
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="min-h-[52px] flex-1 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">Siguiente <RiArrowRightLine aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
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
                      <div key={ref.id} role="listitem" className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100">
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
                  <button onClick={() => setStep(3)} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-1 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] disabled:opacity-40 active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleNext} disabled={isSubmitting || !formData.descripcion.trim() || formData.media.length === 0} aria-busy={isSubmitting} className="min-h-[52px] flex-[2] rounded-2xl bg-[#FE4102] text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(254,65,2,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">
                    Revisar <RiArrowRightLine aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <div className="rounded-xl border bg-[#f8fafc] p-4 flex flex-col gap-3 text-sm">
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
                    {formData.referencia && <p className="text-gray-500 text-xs mt-0.5">{formData.referencia}</p>}
                    <p className="text-gray-400 text-xs mt-0.5 tabular-nums">{formData.location.lat.toFixed(5)}, {formData.location.lng.toFixed(5)}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
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
                      {" · "}Cédula {maskCedula(formData.cedula)}
                    </p>
                  </div>
                  <button onClick={() => setStep(3)} className="min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar</button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Evidencia ({formData.media.length})</p>
                <div className="grid grid-cols-3 gap-3">
                  {formData.media.map((ref, i) => (
                    <div key={ref.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100">
                      <MediaThumb item={ref} alt={`Evidencia ${i + 1}`} className="h-full w-full object-cover" />
                      {ref.kind === "video" && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black text-white tabular-nums">
                          {ref.duration ? `${Math.round(ref.duration)}s` : "video"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(4)} className="mt-2 min-h-[36px] px-3 rounded-full border bg-white text-xs font-bold text-[#002693] hover:bg-gray-50">Editar evidencia y relato</button>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Relato</p>
                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{formData.descripcion}</p>
              </div>

              {submitError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><RiErrorWarningLine aria-hidden="true" /> {submitError}</p>}

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-1 border-t border-black/5 bg-white/90 px-4 sm:px-6 py-3 backdrop-blur">
                <div className="flex gap-3">
                  <button onClick={() => setStep(4)} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-1 rounded-2xl border font-bold text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#002693] disabled:opacity-40 active:scale-[0.98]"><RiArrowLeftLine aria-hidden="true" /> Anterior</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting} className="min-h-[52px] flex-[2] rounded-2xl bg-[#0db954] hover:bg-green-700 text-white font-extrabold shadow-[0_14px_28px_-12px_rgba(13,185,84,0.7)] disabled:opacity-40 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center justify-center gap-2 active:scale-[0.98]">
                    {isSubmitting ? "Guardando..." : <><RiSendPlaneLine aria-hidden="true" /> Enviar aporte</>}
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
            <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
              <h4 id="confirm-title" className="font-black text-[#002693]">¿Salir del formulario?</h4>
              <p className="text-sm text-gray-600 mt-1">Tu progreso se guardará como borrador y podrás retomarlo.</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowConfirmClose(false)} className="min-h-[44px] px-5 rounded-xl border font-semibold">Seguir aquí</button>
                <button onClick={() => { setShowConfirmClose(false); clearDraft(); onCancel(); triggerRef.current?.focus() }} className="min-h-[44px] px-5 rounded-xl bg-[#002693] text-white font-bold">Salir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </MotionConfig>
  )
}
