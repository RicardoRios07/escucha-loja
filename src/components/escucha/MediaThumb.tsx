import { Film } from 'lucide-react'
import { isMediaRef, useMediaUrl, type MediaItem } from '../../lib/escucha/media'

interface Props {
  item: MediaItem
  alt: string
  className?: string
  /** Si es video: mostrar controles (detalle) o solo preview silenciado (listas). */
  controles?: boolean
}

/** Miniatura de evidencia: resuelve dataURL heredado o blob de IndexedDB. */
export default function MediaThumb({ item, alt, className, controles = false }: Props) {
  const url = useMediaUrl(item)
  const esVideo = isMediaRef(item) && item.kind === 'video'

  if (!url) {
    return (
      <div className={`grid place-items-center bg-gray-100 ${className ?? ''}`} aria-label="Cargando evidencia">
        <span className="h-6 w-6 animate-pulse rounded-full bg-gray-300" aria-hidden="true" />
      </div>
    )
  }

  if (esVideo) {
    return (
      <div className={`relative overflow-hidden bg-black ${className ?? ''}`}>
        <video
          src={url}
          className="h-full w-full object-cover"
          playsInline
          preload="metadata"
          muted={!controles}
          controls={controles}
          aria-label={alt}
        />
        {!controles && (
          <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white" aria-hidden="true">
            <Film size={14} />
          </span>
        )}
      </div>
    )
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />
}
