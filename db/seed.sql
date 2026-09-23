-- seed.sql — datos de prueba (idempotente por emails fijos)
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/seed.sql

-- Usuarios demo (google_sub de prueba; en prod lo pone Google).
insert into users (google_sub, email, nombre, celular, celular_verificado, terms_version, terms_aceptados_at, rol)
values
  ('test-sub-admin-001', 'admin.demo@escucha-loja.ec', 'Admin Demo', '+593990000001', true, 'v1', now(), 'admin'),
  ('test-sub-vecino-001', 'vecino.demo@escucha-loja.ec', 'Vecina Demo', '+593990000002', true, 'v1', now(), 'vecino')
on conflict (email) do update set
  nombre = excluded.nombre, celular = excluded.celular, rol = excluded.rol;

-- Reportes demo: 8 casos urbanos con parroquia/barrio reales del catálogo SIL.
-- Coordenadas = centroides oficiales con jitter para no apilarse.
with v as (select id from users where email = 'vecino.demo@escucha-loja.ec')
insert into reportes
  (user_id, categoria_code, descripcion, lat, lng, geom, parroquia_id, barrio_id,
   gravedad, frecuencia, tiempo_problema, afecta_movilidad, afecta_salud,
   ya_reportado_municipio, direccion_principal, calle_secundaria, referencia, estado)
select
  v.id, x.categoria, x.descripcion, x.lat, x.lng,
  ST_SetSRID(ST_MakePoint(x.lng, x.lat), 4326)::geography,
  x.parroquia, x.barrio, x.gravedad, x.frecuencia, x.tiempo,
  x.mov, x.salud, x.yarep, x.dir, x.calle, x.ref, 'recibido'
from v cross join (values
  ('agua', 'Fuga de agua potable en vereda, lleva 3 semanas sin reparación.',
   -3.99061, -79.20341, 'el-sagrario', 'el-sagrario--juan-de-salinas',
   'Alta', 'Permanente', '> 6 meses', false, true, true,
   'Av. Universitaria', 'Azogues', 'Frente al parque'),
  ('agua', 'Corte de agua intermitente en la cuadra, sin aviso previo.',
   -3.98260, -79.19688, 'el-valle', 'el-valle--san-cayetano',
   'Crítica', 'Diario', '1-6 meses', false, true, false,
   'Calle Lourdes', 'Bolívar', ''),
  ('movilidad', 'Semáforo dañado, riesgo en hora pico.',
   -4.01494, -79.21269, 'punzara', 'punzara--daniel-alvarez',
   'Alta', 'Permanente', '1-4 semanas', true, false, true,
   'Av. Cuxibamba', 'Guayaquil', 'Junto al semáforo'),
  ('movilidad', 'Bache grande que ya dañó dos llantas esta semana.',
   -4.01321, -79.20624, 'punzara', 'punzara--tebaida',
   'Media', 'Diario', '1-6 meses', true, false, false,
   'Calle 18 de Noviembre', 'Mercadillo', ''),
  ('recoleccion', 'Contenedor desbordado, mal olor permanente.',
   -3.99964, -79.21247, 'sucre', 'sucre--miraflores',
   'Media', 'Semanal', '< 1 semana', false, true, false,
   'Cdla. Zamora', 'S/N', ''),
  ('movilidad', 'Construcción obstruye la acera, peatones van por la vía.',
   -4.00298, -79.20230, 'san-sebastian', 'san-sebastian--maximo-agustin-rodriguez',
   'Crítica', 'Semanal', '> 6 meses', true, false, true,
   'Barrio San Sebastián', 'Sucre', ''),
  ('agua', 'Presión muy baja en las mañanas, no sube al segundo piso.',
   -3.97091, -79.19620, 'el-valle', 'el-valle--jipiro',
   'Alta', 'Semanal', '1-4 semanas', false, true, false,
   'Barrio El Valle', 'Av. Orillas del Zamora', ''),
  ('movilidad', 'Falta frecuencia de bus en la noche hacia el norte.',
   -3.96106, -79.22709, 'carigan', 'carigan--la-banda',
   'Crítica', 'Permanente', '< 1 semana', true, false, true,
   'Av. Isidro Ayora', 'Av. 8 de Diciembre', 'Redondel')
) as x (categoria, descripcion, lat, lng, parroquia, barrio, gravedad,
        frecuencia, tiempo, mov, salud, yarep, dir, calle, ref)
-- Sin duplicar: salta si la vecina demo ya tiene estos 8 (por descripción).
where not exists (
  select 1 from reportes r
  where r.user_id = v.id and r.descripcion = x.descripcion
);
