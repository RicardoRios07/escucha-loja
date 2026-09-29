import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoadingScreen from './components/escucha/LoadingScreen'
import { AuthProvider, RequireRol } from './components/escucha/AuthContext'

const IngresarPage = lazy(() => import('./pages/IngresarPage'))
const AccesoPage = lazy(() => import('./pages/AccesoPage'))
const BienvenidaPage = lazy(() => import('./pages/BienvenidaPage'))
const TerminosPage = lazy(() => import('./pages/TerminosPage'))
const EncuestaPage = lazy(() => import('./pages/EncuestaPage'))
const AdminShell = lazy(() => import('./pages/admin/AdminShell'))
const MapaPage = lazy(() => import('./pages/admin/MapaPage'))
const ResumenPage = lazy(() => import('./pages/admin/ResumenPage'))
const AnalisisPage = lazy(() => import('./pages/admin/AnalisisPage'))
const VecinoShell = lazy(() => import('./pages/vecino/VecinoShell'))
const VecinoHome = lazy(() => import('./pages/vecino/VecinoHome'))
const MisReportesPage = lazy(() => import('./pages/vecino/MisReportesPage'))
const ReporteDetallePage = lazy(() => import('./pages/vecino/ReporteDetallePage'))
const ComunidadPage = lazy(() => import('./pages/vecino/ComunidadPage'))
const CuentaPage = lazy(() => import('./pages/vecino/CuentaPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/**
 * Head dinámico por ruta (la SPA sirve un solo index.html).
 * /terminos recibe título/meta/canonical propios; las rutas
 * desconocidas (404) se marcan noindex para no indexar basura.
 */
const HOME_HEAD = {
  title: 'Jesús Escucha Loja - La ciudad tiene la palabra',
  description:
    'Jesús Escucha: canal ciudadano para reportar con foto o video lo que pasa en tu barrio — agua, saneamiento, movilidad y servicios — y sumar al mapa de la ciudad.',
  canonical: 'https://jesusescucha.com/',
  robots: 'index, follow',
}

const HEAD_POR_RUTA: Record<string, typeof HOME_HEAD> = {
  '/terminos': {
    title: 'Términos y condiciones · Jesús Escucha Loja',
    description:
      'Términos y condiciones de Jesús Escucha: qué datos tratamos, qué se publica en el mapa y tus derechos según la ley ecuatoriana.',
    canonical: 'https://jesusescucha.com/terminos',
    robots: 'index, follow',
  },
}

const RUTAS_EXACTAS = ['/', '/ingresar', '/acceso', '/bienvenida', '/terminos', '/encuesta', '/panel']
const RUTAS_PREFIJO = ['/vecino', '/admin']

function setMetaPorNombre(nombre: string, contenido: string) {
  let etiqueta = document.head.querySelector<HTMLMetaElement>(`meta[name="${nombre}"]`)
  if (!etiqueta) {
    etiqueta = document.createElement('meta')
    etiqueta.setAttribute('name', nombre)
    document.head.appendChild(etiqueta)
  }
  etiqueta.setAttribute('content', contenido)
}

function setCanonical(href: string) {
  let enlace = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!enlace) {
    enlace = document.createElement('link')
    enlace.setAttribute('rel', 'canonical')
    document.head.appendChild(enlace)
  }
  enlace.setAttribute('href', href)
}

function RouteHead() {
  const { pathname } = useLocation()
  useEffect(() => {
    const conocida =
      RUTAS_EXACTAS.includes(pathname) || RUTAS_PREFIJO.some((r) => pathname === r || pathname.startsWith(`${r}/`))
    const head = conocida
      ? (HEAD_POR_RUTA[pathname] ?? HOME_HEAD)
      : {
          title: 'Página no encontrada · Jesús Escucha',
          description: HOME_HEAD.description,
          canonical: HOME_HEAD.canonical,
          robots: 'noindex, nofollow',
        }
    document.title = head.title
    setMetaPorNombre('description', head.description)
    setMetaPorNombre('robots', head.robots)
    setCanonical(head.canonical)
  }, [pathname])
  return null
}

// Las páginas del flujo ciudadano traen su propia navegación;
// la Navbar global de campaña solo se muestra en la landing.
const SIN_NAV_CAMPAIGN = ['/ingresar', '/acceso', '/bienvenida', '/encuesta', '/panel', '/vecino', '/admin']

export default function App() {
  const { pathname } = useLocation()
  const showCampaignNav = !SIN_NAV_CAMPAIGN.some((r) => pathname === r || pathname.startsWith(`${r}/`))

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-white text-[#111111] selection:bg-[#FE4102] selection:text-white">
        <ScrollToTop />
        <RouteHead />
        {showCampaignNav && <Navbar />}
        <main className="flex-1">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ingresar" element={<IngresarPage />} />
              {/* Acceso interno: sin enlaces hacia aquí en la app */}
              <Route path="/acceso" element={<AccesoPage />} />
              <Route path="/bienvenida" element={<BienvenidaPage />} />
              <Route path="/terminos" element={<TerminosPage />} />
              <Route
                path="/encuesta"
                element={
                  <RequireRol rol="vecino">
                    <EncuestaPage />
                  </RequireRol>
                }
              />
              <Route
                path="/vecino"
                element={
                  <RequireRol rol="vecino">
                    <VecinoShell />
                  </RequireRol>
                }
              >
                <Route index element={<VecinoHome />} />
                <Route path="mis-reportes" element={<MisReportesPage />} />
                <Route path="reporte/:id" element={<ReporteDetallePage />} />
                <Route path="comunidad" element={<ComunidadPage />} />
                <Route path="cuenta" element={<CuentaPage />} />
              </Route>
              <Route
                path="/admin"
                element={
                  <RequireRol rol="admin">
                    <AdminShell />
                  </RequireRol>
                }
              >
                <Route index element={<Navigate to="/admin/mapa" replace />} />
                <Route path="mapa" element={<MapaPage />} />
                <Route path="resumen" element={<ResumenPage />} />
                <Route path="analisis" element={<AnalisisPage />} />
              </Route>
              <Route path="/panel" element={<Navigate to="/admin/mapa" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Analytics />
      </div>
    </AuthProvider>
  )
}
