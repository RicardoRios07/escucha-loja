import { ArrowRight, Map, Megaphone, TreePine, Truck, Droplets } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, IMG, type CategoryKey } from '../data/content'
import Logo from '../components/escucha/Logo'
import LojaMap3D, { type LojaReport } from '../components/escucha/LojaMap3D'
import { getBarrioAprox, getStats } from '../lib/escucha/store'
import { useReportesPublicos } from '../lib/escucha/repo'

const FILTER_ICONS = { agua: Droplets, movilidad: Truck, saneamiento: TreePine, servicios: Megaphone }

/** Formato es-EC: exacto hasta 999 y notación compacta desde 1.000 (1,2 mil). */
const nfFull = new Intl.NumberFormat('es-EC')
const nfCompact = new Intl.NumberFormat('es-EC', { notation: 'compact', maximumFractionDigits: 1, compactDisplay: 'long' })
const formatNum = (n: number) => n > 1000 ? nfCompact.format(n) : nfFull.format(n)

/** Mapea la etiqueta del store a las categorías de la landing. */
const LABEL_A_CATEGORIA: [RegExp, CategoryKey][] = [
  [/agua/i, 'agua'],
  [/movilidad/i, 'movilidad'],
  [/saneamiento|recolecci/i, 'saneamiento'],
  [/servicios/i, 'servicios'],
]

function categoriaDe(label: string): CategoryKey | null {
  for (const [re, key] of LABEL_A_CATEGORIA) if (re.test(label)) return key
  return null
}

const FAQS = [
  { q: '¿Qué es Jesús Escucha?', a: 'Es un canal directo con la ciudad: reportas lo que pasa en tu barrio con foto o video, ubicación y un relato breve, y nosotros lo escuchamos. Tu aporte suma al mapa y a la priorización de la ciudad.' },
  { q: '¿Mi reporte es anónimo?', a: 'Entras con tu cuenta de Google para validar que eres una persona real. Tu nombre y tu correo nunca se publican: en el mapa y los resúmenes solo aparecen el problema, el sector y la evidencia.' },
  { q: '¿Qué pasa con mi aporte después de enviarlo?', a: 'Aparece en el mapa de calor, alimenta las estadísticas por categoría y sector, y entra al análisis de priorización que revisamos cada semana para definir qué atender primero.' },
  { q: '¿Cuánto tiempo toma participar?', a: 'Tres pasos y menos de 2 minutos: eliges la categoría, ubicas el punto en el mapa y agregas evidencia con tu relato.' },
  { q: '¿Necesito instalar alguna aplicación?', a: 'No. Todo funciona en el navegador de tu celular: puedes tomar fotos o grabar video en el momento, sin descargas.' },
]

export default function HomePage() {
  const { datos: vivos, cargando } = useReportesPublicos()
  const reports = useMemo<LojaReport[]>(
    () => vivos.map((d) => ({
      lat: d.lat,
      lng: d.lng,
      categoria: d.categoriaLabel,
      barrio: getBarrioAprox(d.lat, d.lng),
      gravedad: d.encuesta.gravedad,
      descripcion: d.descripcion,
      createdAt: d.createdAt,
      thumb: d.evidencia[0],
    })),
    [vivos],
  )
  const stats = useMemo(() => getStats(vivos), [vivos])
  const conteoPorCategoria = useMemo(() => {
    const c: Record<CategoryKey, number> = { agua: 0, movilidad: 0, saneamiento: 0, servicios: 0 }
    for (const d of vivos) { const k = categoriaDe(d.categoriaLabel); if (k) c[k] += 1 }
    return c
  }, [vivos])
  const barrios = useMemo(() => new Set(vivos.map(d => getBarrioAprox(d.lat, d.lng))).size, [vivos])
  const criticas = stats.porGravedad['Crítica'] || 0
  const lider = useMemo(() => {
    const e = Object.entries(stats.porCategoria).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    return e ? { label: (e[0] as string).split(' ')[0], n: e[1] as number } : null
  }, [stats])

  return (
    <main className="campaign-page">
      <section id="inicio" className="campaign-hero">
        <img src={IMG.heroBackground} alt="" className="campaign-hero-background" aria-hidden="true" />
        <img src={IMG.cityTop} alt="Loja, Ecuador" className="campaign-hero-city" />
        <img src={IMG.candidateTop} alt="" className="campaign-hero-candidate" aria-hidden="true" />
        <div className="campaign-hero-copy">
          <div className="campaign-tag"><Megaphone size={16} /> {cargando && vivos.length === 0 ? 'Cargando aportes…' : vivos.length === 1 ? '1 aporte de vecinos' : `${formatNum(vivos.length)} aportes de vecinos`}</div>
          <h1>¿Qué necesita<br />{' '}<span>tu barrio?</span><br />{' '}Cuéntalo.</h1>
          <p>Tu opinión hace la diferencia. Comparte lo que ves, lo que falta y lo que podemos mejorar juntos.</p>
          <div className="campaign-actions">
            <Link to="/ingresar" className="campaign-button campaign-button-orange"><Megaphone size={17} /> Quiero reportar <ArrowRight size={17} /></Link>
            <a href="#mapa" className="campaign-button campaign-button-white"><Map size={17} /> Ver mapa de la ciudad</a>
          </div>
        </div>
        <p className="campaign-script campaign-script-top">La ciudad<br />también<br />es tuya</p>
      </section>

      <section className="campaign-middle">
        <div id="mapa" className="campaign-map-panel">
          <div className="campaign-count"><span /> {formatNum(vivos.length)} aportes registrados</div>
          <div className="campaign-map-image">
            <img src={IMG.map} alt="Mapa de Loja" className="campaign-map-skeleton" loading="lazy" decoding="async" aria-hidden="true" />
            <LojaMap3D
              reports={reports}
              mode="lite"
            />
          </div>
        </div>

        <div id="como-funciona" className="campaign-steps-panel">
          <div className="campaign-steps-body">
            <p className="campaign-eyebrow">Participar es simple</p>
            <h2>Tres pasos,<br /><em>menos de 2 minutos</em></h2>
            <div className="campaign-steps">
              {[['01', 'Elige', 'Agua, saneamiento, movilidad y servicios.'], ['02', 'Ubica', 'Punto en el mapa, una dirección breve.'], ['03', 'Evidencia', 'Foto y relato de lo que pasa.']].map(([number, title, text], index) => (
                <Fragment key={number}>
                  {index > 0 && <span className="campaign-step-arrow" aria-hidden="true"><ArrowRight size={16} /></span>}
                  <div className="campaign-step"><b>{number}</b><strong>{title}</strong><span>{text}</span></div>
                </Fragment>
              ))}
            </div>
            <Link to="/ingresar" className="campaign-button campaign-button-orange campaign-steps-cta">Empezar ahora <ArrowRight size={17} /></Link>
            <div className="campaign-steps-foot">
              <p className="campaign-script campaign-script-steps">Tu voz<br />también<br />construye<br />la ciudad.</p>
              <div className="campaign-phone-wrap"><img src={IMG.phone} alt="Aplicación Jesús Escucha" loading="lazy" decoding="async" /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="campaign-bottom">
        <article id="aportes" className="campaign-happening">
          <div><h2>Lo que está pasando<br /><span>en Loja</span></h2><div className="campaign-categories">{CATEGORIES.map((category) => { const Icon = FILTER_ICONS[category.key as CategoryKey]; return <button key={category.key} type="button"><i style={{ backgroundColor: category.color }}><Icon size={17} /></i><b>{category.label}</b><small>{conteoPorCategoria[category.key]} aportes</small></button> })}</div></div>
          <img src={IMG.cityTop} alt="Ciudad de Loja" loading="lazy" decoding="async" />
        </article>
      </section>

      <section className="campaign-stats" aria-label="Cifras de participación">
        <div><b>{formatNum(vivos.length)}</b><span>aportes de vecinos</span></div>
        <div><b>{formatNum(barrios)}</b><span>barrios alcanzados</span></div>
        <div><b>{lider ? formatNum(lider.n) : 0}</b><span>{lider ? `lidera ${lider.label}` : 'sin datos aún'}</span></div>
        <div><b>{formatNum(criticas)}</b><span>casos críticos</span></div>
      </section>

      <section className="campaign-faq" aria-label="Preguntas frecuentes">
        <h2>Preguntas <span>frecuentes</span></h2>
        {FAQS.map(f => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section id="participar" className="campaign-cta"><h2>Tu voz también construye la ciudad.</h2><Link to="/ingresar" className="campaign-button campaign-button-white">Alzar mi voz <ArrowRight size={17} /></Link></section>

      <footer className="campaign-footer" id="contacto">
        <div className="campaign-footer-logo"><Logo height={44} /></div>
        <p className="campaign-footer-tag">La ciudad tiene la palabra</p>
        <nav aria-label="Navegación de pie de página">
          <a href="#inicio">Inicio</a>
          <a href="#mapa">Mapa</a>
          <a href="#como-funciona">Cómo participar</a>
          <a href="#aportes">Aportes</a>
          <Link to="/ingresar">Participar</Link>
        </nav>
        <p className="campaign-footer-copy">© 2026 Jesús Escucha · Hecho en Loja</p>
        <p className="campaign-footer-powered">
          Impulsado por{' '}
          <a href="https://etherlab.dev" target="_blank" rel="noopener noreferrer">
            <svg width="12" height="12" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 8 L32 14.5 L32 25.5 L20 32 L8 25.5 L8 14.5 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
              <path d="M20 8 L20 32" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
              <path d="M8 14.5 L32 25.5" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
              <path d="M32 14.5 L8 25.5" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
              <circle cx="20" cy="20" r="4" fill="currentColor" />
            </svg>
            Etherlab
          </a>
        </p>
      </footer>
    </main>
  )
}