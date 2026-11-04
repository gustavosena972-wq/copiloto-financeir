CREATE UNIQUE INDEX IF NOT EXISTS membros_usuario_unico_idx
ON public.membros (usuario_id)
WHERE usuario_id IS NOT NULL;
