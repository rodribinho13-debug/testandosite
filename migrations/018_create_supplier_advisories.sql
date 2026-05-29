-- 018_create_supplier_advisories.sql
-- ai-supplier.js (parecer de fornecedor por IA) insere em supplier_advisories, que
-- NAO existia -> insert falhava silenciosamente (.catch) e ainda alertava "Parecer salvo".
-- Criada a tabela + RLS org-scoped (mesmo padrao de supplier_certifications).
-- Aplicada em producao via MCP em 2026-05-29.
CREATE TABLE IF NOT EXISTS public.supplier_advisories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
  kind text,
  content text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_advisories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sa_all ON public.supplier_advisories;
CREATE POLICY sa_all ON public.supplier_advisories FOR ALL
  USING (org_id IN (SELECT org_members.org_id FROM org_members WHERE org_members.user_id = (SELECT auth.uid())))
  WITH CHECK (org_id IN (SELECT org_members.org_id FROM org_members WHERE org_members.user_id = (SELECT auth.uid())));

NOTIFY pgrst, 'reload schema';
