-- schema.sql — Escucha Loja (Neon Postgres + PostGIS)
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/schema.sql
-- Idempotente: puede correrse más de una vez.

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Categorías fijas (espejo de CATEGORIAS_VISUALES + CategoriaId del front).
create table if not exists categorias (
  code text primary key,
  label text not null,
  color text not null
);
insert into categorias (code, label, color) values
  ('agua',        'Agua y Alcantarillado', '#35C2FF'),
  ('recoleccion', 'Saneamiento ambiental', '#16a34a'),
  ('movilidad',   'Movilidad Urbana',      '#f59e0b'),
  ('servicios',   'Servicios ciudadanos',  '#8b5cf6')
on conflict (code) do update set label = excluded.label, color = excluded.color;

-- Usuarios: registro con Google; al primer login se exige celular + términos.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text unique not null,
  email citext unique not null,
  nombre text,
  celular text,
  celular_verificado boolean not null default false,
  terms_version text,
  terms_aceptados_at timestamptz,
  rol text not null default 'vecino' check (rol in ('vecino', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_email_idx on users (email);

-- Reportes ciudadanos (espejo de MvpDenuncia + territorio SIL declarado).
create table if not exists reportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  categoria_code text not null references categorias (code),
  descripcion text not null default '',
  lat double precision not null,
  lng double precision not null,
  geom geography(Point, 4326),
  parroquia_id text,
  barrio_id text,
  gravedad text not null default 'Media'
    check (gravedad in ('Baja', 'Media', 'Alta', 'Crítica')),
  frecuencia text not null default 'Semanal'
    check (frecuencia in ('Una vez', 'Semanal', 'Diario', 'Permanente')),
  tiempo_problema text not null default '1-4 semanas'
    check (tiempo_problema in ('< 1 semana', '1-4 semanas', '1-6 meses', '> 6 meses')),
  afecta_movilidad boolean not null default false,
  afecta_salud boolean not null default false,
  ya_reportado_municipio boolean not null default false,
  direccion_principal text not null default '',
  calle_secundaria text not null default '',
  referencia text not null default '',
  estado text not null default 'recibido'
    check (estado in ('recibido', 'en_revision', 'atendido', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reportes_geom_idx on reportes using gist (geom);
create index if not exists reportes_user_idx on reportes (user_id);
create index if not exists reportes_categoria_idx on reportes (categoria_code);
create index if not exists reportes_created_idx on reportes (created_at desc);
create index if not exists reportes_parroquia_idx on reportes (parroquia_id);

-- Evidencia (las URLs apuntarán a Vercel Blob en la fase de storage).
create table if not exists evidencias (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references reportes (id) on delete cascade,
  kind text not null check (kind in ('foto', 'video')),
  storage_url text not null,
  duracion_s integer,
  created_at timestamptz not null default now()
);
create index if not exists evidencias_reporte_idx on evidencias (reporte_id);

-- updated_at automático.
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_touch on users;
create trigger users_touch before update on users
  for each row execute function touch_updated_at();

drop trigger if exists reportes_touch on reportes;
create trigger reportes_touch before update on reportes
  for each row execute function touch_updated_at();
