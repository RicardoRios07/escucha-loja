/**
 * copia-worker-maplibre.mjs — copia el worker de MapLibre (y su módulo
 * compartido) a la carpeta pública para servirlo desde nuestro dominio.
 *
 * Por qué: MapLibre necesita un worker para el render. El asset ?url de Vite
 * no sirve (emite el worker sin `maplibre-gl-shared.mjs` y el mapa no arranca),
 * así que se copian los dos archivos juntos a la raíz del publicDir, donde el
 * import relativo del worker resuelve contra /maplibre-gl-shared.mjs.
 *
 * Corre en prebuild: mantiene los archivos alineados con la versión instalada.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const origen = join(raiz, 'node_modules', 'maplibre-gl', 'dist')
const destino = join(raiz, 'brading')

const archivos = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

mkdirSync(destino, { recursive: true })
for (const archivo of archivos) {
  copyFileSync(join(origen, archivo), join(destino, archivo))
}
console.log(`worker de maplibre copiado a public/: ${archivos.join(', ')}`)
