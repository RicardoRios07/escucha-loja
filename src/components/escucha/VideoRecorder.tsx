import { useEffect, useRef, useState } from 'react'
import { Camera, CircleAlert, RotateCcw, Square, Video } from 'lucide-react'
import { MAX_VIDEO_SECONDS } from '../../lib/escucha/media'

interface Props {
  onDone: (blob: Blob) => void
  onCancel: () => void
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const cands = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4']
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* noop */
    }
  }
  return undefined
}

/** Grabadora in-app: previsualiza, graba hasta 10s con auto-stop y permite repetir. */
export default function VideoRecorder({ onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const [fase, setFase] = useState<'lista' | 'grabando' | 'vista'>('lista')
  const [segs, setSegs] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detenerTodo = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop()
      } catch {
        /* noop */
      }
    })
    streamRef.current = null
  }

  useEffect(() => {
    let vivo = true
    const arrancar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('sin-camara')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        })
        if (!vivo) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (vivo) setError('No se pudo abrir la cámara. Revisa los permisos o sube un video.')
      }
    }
    arrancar()
    return () => {
      vivo = false
      detenerTodo()
      if (preview) URL.revokeObjectURL(preview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grabar = () => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    try {
      const rec = new MediaRecorder(stream, pickMime() ? { mimeType: pickMime() } : undefined)
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
        const b = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        setBlob(b)
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(b)
        })
        setFase('vista')
      }
      recRef.current = rec
      rec.start(250)
      setSegs(0)
      setFase('grabando')
      const t0 = Date.now()
      timerRef.current = window.setInterval(() => {
        const s = (Date.now() - t0) / 1000
        setSegs(s)
        if (s >= MAX_VIDEO_SECONDS) {
          try {
            rec.stop()
          } catch {
            /* noop */
          }
        }
      }, 200)
    } catch {
      setError('Este dispositivo no permite grabar video desde el navegador.')
    }
  }

  const detener = () => {
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
  }

  const repetir = () => {
    setBlob(null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setSegs(0)
    setFase('lista')
  }

  const usar = () => {
    if (blob) onDone(blob)
  }

  const quedan = Math.max(0, MAX_VIDEO_SECONDS - segs)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-black p-3">
      <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
        {fase === 'vista' && preview ? (
          <video src={preview} className="h-full w-full object-cover" playsInline controls preload="metadata" aria-label="Vista previa del video grabado" />
        ) : (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay aria-label="Vista de cámara" />
        )}
        {fase === 'grabando' && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-white" role="timer" aria-live="off">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-sm font-black tabular-nums">{quedan.toFixed(0)}s</span>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-red-300">
          <CircleAlert size={15} aria-hidden="true" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        {fase === 'lista' && (
          <button
            onClick={grabar}
            disabled={!!error}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#FE4102] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/25" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Grabar (máx {MAX_VIDEO_SECONDS}s)
          </button>
        )}
        {fase === 'grabando' && (
          <button
            onClick={detener}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-white font-bold text-[#111] transition-transform active:scale-[0.98]"
          >
            <Square size={16} aria-hidden="true" /> Detener
          </button>
        )}
        {fase === 'vista' && (
          <>
            <button
              onClick={repetir}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 font-bold text-white transition-transform active:scale-[0.98]"
            >
              <RotateCcw size={16} aria-hidden="true" /> Repetir
            </button>
            <button
              onClick={usar}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#0db954] font-bold text-white transition-transform active:scale-[0.98]"
            >
              <Video size={16} aria-hidden="true" /> Usar video
            </button>
          </>
        )}
        <button
          onClick={onCancel}
          aria-label="Cerrar grabadora"
          className="grid min-h-[48px] min-w-[48px] place-items-center rounded-xl border border-white/25 text-white/80 transition-transform active:scale-[0.98]"
        >
          <Camera size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
