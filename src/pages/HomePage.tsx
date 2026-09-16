import { ArrowRight, Map, MapPin, Megaphone, Shield, TreePine, Truck, Droplets } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES, IMG, type CategoryKey } from '../data/content'
import Logo from '../components/escucha/Logo'
import LojaMap3D, { type LojaReport } from '../components/escucha/LojaMap3D'
import { ensureSeed, getBarrioAprox, getDenuncias, getStats } from '../lib/escucha/store'
import type { MvpDenuncia } from '../lib/escucha/types'

const FILTER_ICONS = { agua: Droplets, movilidad: Truck, seguridad: Shield, espacio: TreePine }

/** Mapea la etiqueta del store a las categorías de la landing. */
const LABEL_A_CATEGORIA: [RegExp, CategoryKey][] = [
  [/agua/i, 'agua'],
  [/movilidad/i, 'movilidad'],
  [/recolecci/i, 'espacio'],
  [/control urbano/i, 'seguridad'],
]

function categoriaDe(label: string): CategoryKey | null {
  for (const [re, key] of LABEL_A_CATEGORIA) if (re.test(label)) return key
  return null
}

const VOCES = [
  { texto: 'Subí la foto del poste sin luz un lunes y a los días vi cuadrillas en el sector. Esto sí se siente distinto.', nombre: 'Rosa Elena Cabrera', barrio: 'Vecina de San Sebastián' },
  { texto: 'Reporté la fuga de mi cuadra con un video de 10 segundos. Por primera vez sentí que mi voz llegó a algún lado.', nombre: 'Carlos Armijos', barrio: 'Vecino de Punzara' },
]

const FAQS = [
  { q: '¿Qué es Escucha Loja?', a: 'Es un canal directo entre los vecinos y el candidato a la alcaldía: reportas lo que pasa en tu barrio con foto o video, ubicación y un relato breve, y tu aporte suma al mapa y a la priorización de la ciudad.' },
  { q: '¿Mi reporte es anónimo?', a: 'Pedimos tu cédula solo para validar que eres una persona real. Tu nombre y tu cédula nunca se publican: en el mapa y los resúmenes solo aparecen el problema, el sector y la evidencia.' },
  { q: '¿Qué pasa con mi aporte después de enviarlo?', a: 'Aparece en el mapa de calor, alimenta las estadísticas por categoría y sector, y entra al análisis de priorización que revisa el candidato.' },
  { q: '¿Cuánto tiempo toma participar?', a: 'Tres pasos y menos de 2 minutos: eliges la categoría, ubicas el punto en el mapa y agregas evidencia con tu relato.' },
  { q: '¿Necesito instalar alguna aplicación?', a: 'No. Todo funciona en el navegador de tu celular: puedes tomar fotos o grabar video en el momento, sin descargas.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [vivos, setVivos] = useState<MvpDenuncia[]>(() => {
    try { ensureSeed(); return getDenuncias() } catch { return [] }
  })
  useEffect(() => {
    const onStorage = () => { try { setVivos(getDenuncias()) } catch {} }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
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
    const c: Record<CategoryKey, number> = { agua: 0, movilidad: 0, seguridad: 0, espacio: 0 }
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
          <div className="campaign-tag"><Megaphone size={16} /> {vivos.length === 1 ? '1 aporte de vecinos' : `${vivos.length} aportes de vecinos`}</div>
          <h1>¿Qué necesita<br />{' '}<span>tu barrio?</span><br />{' '}Cuéntalo.</h1>
          <p>Tu opinión hace la diferencia. Comparte lo que ves, lo que falta y lo que podemos mejorar juntos.</p>
          <div className="campaign-actions">
            <Link to="/ingresar" className="campaign-button campaign-button-orange"><Megaphone size={17} /> Quiero participar <ArrowRight size={17} /></Link>
            <a href="#mapa" className="campaign-button campaign-button-white"><Map size={17} /> Ver mapa de la ciudad</a>
          </div>
        </div>
        <p className="campaign-script campaign-script-top">La ciudad<br />también<br />es tuya</p>
      </section>

      <section className="campaign-middle">
        <div id="mapa" className="campaign-map-panel">
          <div className="campaign-panel-label"><MapPin size={19} /> Loja en el mapa</div>
          <div className="campaign-count"><span /> {vivos.length} aportes registrados</div>
          <div className="campaign-map-image">
            <img src={IMG.map} alt="Mapa de Loja" className="campaign-map-skeleton" loading="lazy" decoding="async" aria-hidden="true" />
            <LojaMap3D
              reports={reports}
              mode="lite"
              showReportButton
              onReportLocation={() => navigate('/ingresar')}
            />
          </div>
        </div>

        <div id="como-funciona" className="campaign-steps-panel">
          <div>
            <p className="campaign-eyebrow">Participar es simple</p>
            <h2>Tres pasos,<br /><em>menos de 2 minutos</em></h2>
            <div className="campaign-steps">
              {[['01', 'Elige', 'Agua, recolección, movilidad o control urbano.'], ['02', 'Ubica', 'Punto en el mapa, una dirección breve.'], ['03', 'Evidencia', 'Foto y relato de lo que pasa.']].map(([number, title, text]) => (
                <div className="campaign-step" key={number}><b>{number}</b><strong>{title}</strong><span>{text}</span></div>
              ))}
            </div>
            <Link to="/ingresar" className="campaign-button campaign-button-orange">Empezar ahora <ArrowRight size={17} /></Link>
          </div>
          <div className="campaign-phone-wrap"><img src={IMG.phone} alt="Aplicación Escucha Loja" loading="lazy" decoding="async" /><p className="campaign-script">Tu voz<br />también<br />construye<br />la ciudad.</p></div>
        </div>
      </section>

      <section className="campaign-bottom">
        <article className="campaign-testimonial">
          <img src={IMG.portrait} alt="Vecino de Loja" loading="lazy" decoding="async" />
          <div><span className="campaign-quote">“</span><p>Me gusta esta iniciativa porque nos da la oportunidad de ser escuchados. Loja la hacemos todos.</p><strong>María Fernanda López</strong><small>Vecina del barrio El Valle</small></div>
        </article>
        <article id="aportes" className="campaign-happening">
          <div><h2>Lo que está pasando<br /><span>en Loja</span></h2><div className="campaign-categories">{CATEGORIES.map((category) => { const Icon = FILTER_ICONS[category.key as CategoryKey]; return <button key={category.key} type="button"><i style={{ backgroundColor: category.color }}><Icon size={17} /></i><b>{category.label}</b><small>{conteoPorCategoria[category.key]} aportes</small></button> })}</div></div>
          <img src={IMG.cityCorner} alt="Ciudad de Loja" loading="lazy" decoding="async" />
        </article>
      </section>

      <section className="campaign-stats" aria-label="Cifras de participación">
        <div><b>{vivos.length}</b><span>aportes de vecinos</span></div>
        <div><b>{barrios}</b><span>barrios alcanzados</span></div>
        <div><b>{lider ? lider.n : 0}</b><span>{lider ? `lidera ${lider.label}` : 'sin datos aún'}</span></div>
        <div><b>{criticas}</b><span>casos críticos</span></div>
      </section>

      <section className="campaign-voices" aria-label="Voces de vecinos">
        <h2>Voces que <span>ya se escuchan</span></h2>
        <div className="campaign-voices-grid">
          {VOCES.map(v => (
            <figure key={v.nombre}>
              <span className="campaign-quote">“</span>
              <blockquote>{v.texto}</blockquote>
              <figcaption><strong>{v.nombre}</strong><small>{v.barrio}</small></figcaption>
            </figure>
          ))}
        </div>
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
        <p className="campaign-footer-copy">© 2026 Escucha Loja · Hecho en Loja</p>
      </footer>
    </main>
  )
}