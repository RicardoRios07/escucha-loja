import Logo from './Logo'

/** Pantalla de carga para Suspense de rutas (lazy). */
export default function LoadingScreen({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-white px-6"
      role="status"
      aria-live="polite"
      aria-label={mensaje}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse">
          <Logo height={52} tile />
        </span>
        <p className="text-sm font-bold tracking-wide text-[#002693]">{mensaje}</p>
        <div
          className="h-1.5 w-40 overflow-hidden rounded-full bg-[#002693]/10"
          aria-hidden="true"
        >
          <div className="h-full w-1/2 animate-[carga-barra_1.1s_ease-in-out_infinite] rounded-full bg-[#FE4102]" />
        </div>
      </div>
    </div>
  )
}
