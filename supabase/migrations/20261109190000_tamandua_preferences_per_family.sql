-- Preferences remain personal and family-scoped; existing rows and RLS policies are preserved.
BEGIN;
ALTER TABLE public.tamandua_preferencias DROP CONSTRAINT tamandua_preferencias_pkey;
ALTER TABLE public.tamandua_preferencias ADD PRIMARY KEY (usuario_id, familia_id);
COMMIT;
