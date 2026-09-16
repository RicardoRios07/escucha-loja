import { Outlet } from 'react-router-dom'
import TabBar from '../../components/escucha/TabBar'

/** Shell del ciudadano: contenido + tab bar inferior (mobile-first). */
export default function VecinoShell() {
  return (
    <div className="min-h-dvh bg-[#f8fafc] pb-[calc(88px+env(safe-area-inset-bottom))]">
      <Outlet />
      <TabBar />
    </div>
  )
}
