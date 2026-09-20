import { idbStore, STORE_IA } from './media'
import type { LecturaUnificada } from './analisis'
import type { MvpDenuncia } from './types'

/**
 * Cache de la lectura única de IA en IndexedDB (store 'ia', un solo slot 'snapshot')
 * + fingerprint de los datos para decidir cuándo re-llamar (y no gastar).
 */

export interface IASnapshot {
  id: 'snapshot'
  version: number
  timestamp: number
  aportesCount: number
  fingerprint: string
  resultado: LecturaUnificada
}

/** Versión del esquema de lectura. Si cambia la forma, los snapshots viejos se invalidan y se regeneran. */
export const IA_SCHEMA_VERSION = 2

/** Cooldown mínimo entre llamadas a la IA (1 hora). */
export const IA_COOLDOWN_MS = 60 * 60 * 1000

/** True si el snapshot almacenado corresponde al esquema actual de lectura única. */
export function esLecturaValida(snap: IASnapshot | null): snap is IASnapshot {
  if (!snap) return false
  if (snap.version !== IA_SCHEMA_VERSION) return false
  const r = snap.resultado
  return (
    r?.origen !== undefined &&
    Array.isArray(r?.queEstaPasando) &&
    typeof r?.observacionPrincipal === 'string' &&
    Array.isArray(r?.recomendaciones)
  )
}

/**
 * Huella estable de las denuncias (id:createdAt:lat:lng:categoria).
 * Detecta agregar, editar y eliminar; cambia cuando los datos reales cambian.
 */
export function fingerprintDenuncias(denuncias: MvpDenuncia[]): string {
  const partes = denuncias
    .map((d) => `${d.id}:${d.createdAt}:${d.lat}:${d.lng}:${d.categoria}`)
    .sort()
    .join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < partes.length; i++) {
    hash ^= partes.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return `fp_${hash.toString(16).padStart(8, '0')}_${denuncias.length}`
}

// Fallback en memoria si IndexedDB no está disponible (modo privado, etc.).
let memSnap: IASnapshot | null = null

export async function cargaSnapshotIA(): Promise<IASnapshot | null> {
  try {
    const snap = await idbStore<IASnapshot | undefined>(STORE_IA, 'readonly', (s) => s.get('snapshot'))
    if (!esLecturaValida(snap ?? null)) {
      memSnap = null
      return null
    }
    memSnap = snap as IASnapshot
    return snap as IASnapshot
  } catch {
    return memSnap
  }
}

export async function guardaSnapshotIA(s: IASnapshot): Promise<void> {
  memSnap = s
  try {
    await idbStore(STORE_IA, 'readwrite', (st) => st.put(s))
  } catch {
    /* la memoria ya guardó el fallback */
  }
}

/**
 * Regla de costo para re-llamar a la IA:
 * - sin snapshot → true (primera vez, y queda cacheado).
 * - esquema de lectura viejo → true (se regenera con el formato unificado).
 * - fingerprint igual → false (CACHE HIT: no se gasta nada aunque sea viejo).
 * - cambió y ya pasó el cooldown de 1 h → true.
 */
export function debeActualizarIA(fpActual: string, snap: IASnapshot | null): boolean {
  if (!snap) return true
  if (snap.version !== IA_SCHEMA_VERSION) return true
  if (snap.fingerprint === fpActual) return false
  return Date.now() - snap.timestamp >= IA_COOLDOWN_MS
}