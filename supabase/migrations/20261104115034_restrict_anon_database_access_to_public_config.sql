-- Restringe o papel anon ao único recurso necessário antes do login.
-- As operações de dados do usuário passam por JWT autenticado ou Edge Functions.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE public.config_app TO anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
