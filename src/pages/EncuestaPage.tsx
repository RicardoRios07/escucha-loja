import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import EncuestaWizard from "../components/escucha/EncuestaWizard"
import Logo from "../components/escucha/Logo"
import { getBarrioAprox } from "../lib/escucha/store"
import { useReportesPublicos } from "../lib/escucha/repo"
import { categoriaColor } from "../lib/escucha/geo"
import type { MvpDenuncia } from "../lib/escucha/types"

export default function EncuestaPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [lastId, setLastId] = useState<string | null>(null)
  const [enviado, setEnviado] = useState<MvpDenuncia | null>(null)
  const { datos: publicos, recargar: recargarPublicos } = useReportesPublicos()
  const volver = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/vecino')
  }

  if (!open) {
    // Resumen del reporte recién enviado (categoría + sector) para reforzar el cierre.
    const count = publicos.length + (enviado && !publicos.some((x) => x.id === enviado.id) ? 1 : 0)
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f8fafc] p-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-xl"
          role="status"
          aria-live="polite"
        >
          {/* Cabecera editorial (mismo estilo del banner) */}
          <div className="relative overflow-hidden bg-[#002693] px-6 pt-7 pb-6 text-white">
            <div className="halftone halftone-tiny absolute inset-0 opacity-[0.16]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#0635c4] opacity-70 blur-3xl" aria-hidden="true" />
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.15 }}
              className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0db954] shadow-[0_12px_28px_-8px_rgba(13,185,84,0.85)] ring-4 ring-white/20"
            >
              <Check size={30} strokeWidth={3} aria-hidden="true" />
            </motion.div>
            <h2 className="relative mt-3 text-center font-display text-[1.7rem] leading-[1.02] tracking-tight">
              ¡Reporte enviado!
            </h2>
            <p className="relative mt-1 text-center text-sm text-white/70">
              Gracias por alzar tu voz. Tu reporte ya suma para priorizar tu sector.
            </p>
          </div>

          <div className="p-6 text-center">
            {enviado && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span
                  className="rounded-full px-2.5 py-1 text-[12px] font-black text-white"
                  style={{ background: categoriaColor(enviado.categoriaLabel) }}
                >
                  {enviado.categoriaLabel}
                </span>
                <span className="rounded-full border bg-white px-2.5 py-1 text-[12px] font-bold text-gray-600">
                  {getBarrioAprox(enviado.lat, enviado.lng)}
                </span>
              </div>
            )}

            <div className="mt-4 inline-flex items-center gap-2 bg-[#f8fafc] border rounded-full px-4 py-2 text-sm">
              <Logo height={20} tile />
              <span className="font-bold text-[#002693]">{count} reportes en total</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            </div>

            {lastId && (
              <button onClick={() => navigate(`/vecino/reporte/${lastId}`)} className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#002693] font-extrabold text-white active:scale-[0.99]">
                Ver mi reporte
              </button>
            )}
            <div className="flex gap-3 mt-3">
              <button onClick={() => navigate("/vecino/comunidad")} className="flex-1 min-h-[48px] rounded-2xl border font-bold hover:bg-gray-50 active:scale-[0.99]">Ver mapa</button>
              <button onClick={() => { setLastId(null); setEnviado(null); setOpen(true) }} className="flex-1 min-h-[48px] rounded-2xl border font-bold hover:bg-gray-50 active:scale-[0.99]">Enviar otro</button>
            </div>
            <button onClick={() => navigate("/vecino")} className="mt-3 text-sm underline text-gray-500">Volver al inicio</button>
          </div>
        </motion.div>
      </div>
    )
  }
  return <EncuestaWizard inline onComplete={(id, denuncia) => { recargarPublicos(); setLastId(id ?? null); setEnviado(denuncia ?? null); setOpen(false) }} onCancel={volver} />
}
