-- migrate-002-taxonomia.sql — nueva taxonomía de 4 categorías (2026-09)
-- 1) Control Urbano se fusiona en Movilidad Urbana.
-- 2) Recolección pasa a llamarse Saneamiento ambiental (mismo code).
-- 3) Nueva categoría Servicios ciudadanos (atención municipal).
-- Idempotente: puede correrse más de una vez.

update reportes set categoria_code = 'movilidad' where categoria_code = 'control';

update categorias set label = 'Saneamiento ambiental', color = '#16a34a'
where code = 'recoleccion';

insert into categorias (code, label, color)
values ('servicios', 'Servicios ciudadanos', '#8b5cf6')
on conflict (code) do update set label = excluded.label, color = excluded.color;

delete from categorias where code = 'control';
