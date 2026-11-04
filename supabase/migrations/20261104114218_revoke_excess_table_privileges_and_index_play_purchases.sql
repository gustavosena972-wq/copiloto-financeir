-- Remove table-level privileges that application clients do not need.
-- RLS does not protect TRUNCATE; keep privileged maintenance to trusted roles.
REVOKE TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- Prevent the same excessive privileges from being inherited by future tables
-- created by the postgres role in the public schema.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES
FROM anon, authenticated;

-- Cover all foreign keys in the Google Play purchase review table.
CREATE INDEX IF NOT EXISTS idx_google_play_compras_decidido_por
  ON public.google_play_compras (decidido_por);

CREATE INDEX IF NOT EXISTS idx_google_play_compras_familia_id
  ON public.google_play_compras (familia_id);

CREATE INDEX IF NOT EXISTS idx_google_play_compras_usuario_id
  ON public.google_play_compras (usuario_id);
