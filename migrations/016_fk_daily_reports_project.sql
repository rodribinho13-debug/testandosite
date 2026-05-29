-- 016_fk_daily_reports_project.sql
-- Corrige erro 400 no embed PostgREST: daily_reports.select('*, projects(code)')
-- falhava porque NAO existia FK entre daily_reports.project_id e projects.id
-- (as tabelas irmas pendings/test_systems ja tinham). Sem essa FK o PostgREST
-- nao consegue resolver o relacionamento e retorna 400, deixando a lista de RDOs
-- da view principal do v9 sempre vazia (TOTAL RDOS = 0).
--
-- Aplicada em producao via MCP em 2026-05-29 (0 orfaos verificados).
ALTER TABLE public.daily_reports
  ADD CONSTRAINT daily_reports_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
