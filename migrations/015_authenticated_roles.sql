-- ============================================================
-- 015_authenticated_roles.sql
-- M-4 da auditoria: trocar role=public para role=authenticated
-- em 5 tabelas onde estava inconsistente.
-- ============================================================
-- Funcionalmente equivalente (a USING clause sempre referencia
-- auth.uid() via org_members), mas alinhado com o padrao das
-- demais tabelas e mais explicito quanto a intencao.
-- ============================================================

BEGIN;

-- civil_concrete_pours
ALTER POLICY ccp_select ON public.civil_concrete_pours TO authenticated;
ALTER POLICY ccp_write  ON public.civil_concrete_pours TO authenticated;

-- equipments
ALTER POLICY eq_select  ON public.equipments TO authenticated;
ALTER POLICY eq_write   ON public.equipments TO authenticated;

-- maint_work_orders
ALTER POLICY mwo_select ON public.maint_work_orders TO authenticated;
ALTER POLICY mwo_write  ON public.maint_work_orders TO authenticated;

-- painting_inspections
ALTER POLICY pi_select  ON public.painting_inspections TO authenticated;
ALTER POLICY pi_write   ON public.painting_inspections TO authenticated;

-- scaffolds
ALTER POLICY sc_select  ON public.scaffolds TO authenticated;
ALTER POLICY sc_write   ON public.scaffolds TO authenticated;

COMMIT;

-- Verificacao: todas devem retornar {authenticated}
-- SELECT tablename, policyname, roles FROM pg_policies
-- WHERE schemaname='public' AND tablename IN (
--   'civil_concrete_pours','equipments','maint_work_orders',
--   'painting_inspections','scaffolds'
-- );
