import { Link } from 'react-router-dom'

/** 404: mensaje claro + salida a la home. El noindex lo pone RouteHead. */
export default function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-16 text-center">
      <p className="text-[13px] font-black uppercase tracking-[0.2em] text-[#FE4102]">Error 404</p>
      <h1 className="mt-2 text-[clamp(1.8rem,7vw,2.4rem)] font-black tracking-tight text-[#111]">
        Esta página no existe
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#111]/60">
        El enlace está roto o la página se movió. La ciudad sigue aquí.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#002693] px-6 text-sm font-extrabold text-white active:scale-[0.98]"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
