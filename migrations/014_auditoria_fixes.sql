-- ============================================================
-- 014_auditoria_fixes.sql
-- Correções da auditoria de produção 2026-05-28
-- ============================================================
-- S-2: Signup não popula org_discipline_subscriptions
-- S-4: 162 tabelas com GRANT SELECT para role anon (defesa em profundidade)
-- ============================================================

BEGIN;

-- ============================================================
-- S-2 · Trigger: ao criar uma org, popula 8 disciplinas default
-- em trial de 14 dias.
-- ============================================================

CREATE OR REPLACE FUNCTION public.populate_default_org_disciplines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_disciplines TEXT[] := ARRAY[
    'tubulacao',
    'pintura',
    'andaime',
    'comissionamento',
    'manutencao',
    'eq_estatico',
    'eq_rotativo',
    'instrumentacao_cal'
  ];
  d TEXT;
BEGIN
  FOREACH d IN ARRAY default_disciplines LOOP
    INSERT INTO public.org_discipline_subscriptions
      (org_id, discipline_code, active, trial, starts_at, expires_at)
    VALUES
      (NEW.id, d, TRUE, TRUE, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days')
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_org_disciplines ON public.organizations;

CREATE TRIGGER trg_populate_org_disciplines
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.populate_default_org_disciplines();

-- Backfill para orgs já criadas sem disciplinas (Org A e B da auditoria + qualquer outra)
INSERT INTO public.org_discipline_subscriptions
  (org_id, discipline_code, active, trial, starts_at, expires_at)
SELECT o.id, d, TRUE, TRUE, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days'
FROM public.organizations o
CROSS JOIN UNNEST(ARRAY[
  'tubulacao','pintura','andaime','comissionamento',
  'manutencao','eq_estatico','eq_rotativo','instrumentacao_cal'
]) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_discipline_subscriptions s
  WHERE s.org_id = o.id AND s.discipline_code = d
);

-- ============================================================
-- S-4 · Revogar GRANT SELECT do role `anon` em todas as tabelas
-- public. Manter apenas catalogos legitimamente publicos.
-- ============================================================

-- Revogar tudo de anon
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- Re-conceder SELECT só em catálogos públicos legítimos
-- (planos comerciais visíveis na landing, lista de disciplinas para
--  página de pricing/signup, anonymous_ia_usage para rate-limit do
--  preview de IA na landing).
GRANT SELECT ON public.subscription_plans      TO anon;
GRANT SELECT ON public.disciplines              TO anon;
GRANT SELECT, INSERT, UPDATE ON public.anonymous_ia_usage TO anon;
GRANT SELECT ON public.industry_references     TO anon;
GRANT SELECT ON public.composition_categories  TO anon;

-- Garantir que defaults futuros de novas tabelas não tragam anon de volta
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;

COMMIT;

-- ============================================================
-- ROLLBACK (em caso de necessidade):
-- ============================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_populate_org_disciplines ON public.organizations;
-- DROP FUNCTION IF EXISTS public.populate_default_org_disciplines();
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
-- COMMIT;
