-- migrate-004-rate-limit.sql — tabla para rate limiting persistente
-- (los serverless aíslan memoria entre invocaciones; esto sí es global).
-- Idempotente.
create table if not exists login_intentos (
  ip text not null,
  ventana timestamptz not null,
  intentos int not null default 1,
  primary key (ip, ventana)
);
