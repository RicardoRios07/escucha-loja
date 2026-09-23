-- migrate-003-admin-password.sql — login administrativo sin Google
-- Cuentas admin con email interno + hash scrypt (google_sub NULL).
-- Idempotente.
alter table users alter column google_sub drop not null;
alter table users add column if not exists password_hash text;
