#!/usr/bin/env node
/**
 * db/setup.mjs — crea la base de datos local si no existe.
 * No crea roles ni instala Postgres: usa el usuario de DATABASE_URL.
 *
 * Uso: node db/setup.mjs
 */
import { Client } from 'pg'
import { databaseUrl, loadEnv } from '../scripts/env.mjs'

loadEnv()

const raw = databaseUrl()
if (!raw) {
  console.error('✗ Falta DATABASE_URL en .env.local (ej. postgresql://localhost:5432/escucha)')
  process.exit(1)
}

let url
try {
  url = new URL(raw)
} catch {
  console.error('✗ DATABASE_URL no es una URL válida.')
  process.exit(1)
}

const nombre = decodeURIComponent(url.pathname.replace(/^\//, ''))
if (!nombre || !/^[A-Za-z0-9_]+$/.test(nombre)) {
  console.error('✗ El nombre de la base en DATABASE_URL debe ser simple (letras, números y _).')
  process.exit(1)
}

const mantenimiento = new URL(url)
mantenimiento.pathname = '/postgres'

const client = new Client({ connectionString: mantenimiento.toString() })
try {
  await client.connect()
  const existe = await client.query('select 1 from pg_database where datname = $1', [nombre])
  if (existe.rowCount === 0) {
    await client.query(`create database "${nombre}"`)
    console.log(`✓ base creada: ${nombre}`)
  } else {
    console.log(`• base existente: ${nombre}`)
  }
  console.log('Siguiente paso: node db/apply.mjs')
} finally {
  await client.end().catch(() => {})
}
