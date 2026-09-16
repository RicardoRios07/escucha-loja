import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import EncuestaWizard from "../components/escucha/EncuestaWizard"
import Logo from "../components/escucha/Logo"
import { getDenuncias } from "../lib/escucha/store"

export default function EncuestaPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [count, setCount] = useState(0)
  const [lastId, setLastId] = useState<string | null>(null)
  const volver = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/vecino')
  }
  useEffect(() => { if (!open) { try { setCount(getDenuncias().length) } catch { /* noop */ } } }, [open])
  if (!open) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white rounded-2xl border shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-emerald-600 text-2xl">✓</div>
          <h2 className="text-xl font-black text-[#002693] mt-4">¡Gracias por tu voz!</h2>
          <p className="text-sm text-gray-600 mt-2">Tu aporte fue registrado. Ya suma junto a otros vecinos para priorizar tu sector.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-[#f8fafc] border rounded-full px-4 py-2 text-sm">
            <Logo height={20} tile />
            <span className="font-bold text-[#002693]">{count} aportes en total</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          {lastId && (
            <button onClick={() => navigate(`/vecino/reporte/${lastId}`)} className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#002693] font-bold text-white active:scale-[0.99]">Ver mi reporte</button>
          )}
          <div className="flex gap-3 mt-3">
            <button onClick={() => navigate("/vecino/comunidad")} className="flex-1 h-11 rounded-xl border font-bold hover:bg-gray-50">Ver mapa</button>
            <button onClick={() => { setLastId(null); setOpen(true) }} className="flex-1 h-11 rounded-xl border font-bold hover:bg-gray-50">Enviar otro</button>
          </div>
          <button onClick={() => navigate("/vecino")} className="mt-3 text-sm underline text-gray-500">Volver al inicio</button>
        </div>
      </div>
    )
  }
  return <EncuestaWizard inline onComplete={(id) => { setLastId(id ?? null); setOpen(false) }} onCancel={volver} />
}
