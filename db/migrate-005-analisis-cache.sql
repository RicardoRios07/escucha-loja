-- migrate-005-analisis-cache.sql — caché del análisis IA en Neon
-- (antes vivía en IndexedDB del navegador). Un solo slot global.
-- Idempotente.
create table if not exists analisis_cache (
  id text primary key default 'snapshot',
  version int not null,
  fingerprint text not null,
  aportes_count int not null,
  resultado jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
