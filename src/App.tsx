import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
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
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </AuthProvider>
  )
}
