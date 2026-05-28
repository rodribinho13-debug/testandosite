-- ============================================================
-- PROJECT.IA - Base de Composições Multi-Disciplinar
-- Migration 006 - Substituto industrial do SINAPI
-- ============================================================
-- Inspirado em SINAPI (civil), TCPO, Petrobras N-2461 (tubulação),
-- Conviasa (caldeiraria) e composições próprias.
-- ============================================================

-- ============================================================
-- 1. CATEGORIAS (hierarquia: disciplina > grupo > subgrupo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.composition_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline   text NOT NULL CHECK (discipline IN (
    'mecanica','tubulacao','eletrica','instrumentacao',
    'civil','hidraulica','pintura','caldeiraria','isolamento','seguranca'
  )),
  parent_id    uuid REFERENCES public.composition_categories(id) ON DELETE CASCADE,
  code         text NOT NULL,
  name         text NOT NULL,
  description  text,
  display_order int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(discipline, code)
);

CREATE INDEX IF NOT EXISTS idx_comp_cat_discipline ON public.composition_categories(discipline);
CREATE INDEX IF NOT EXISTS idx_comp_cat_parent ON public.composition_categories(parent_id);

-- ============================================================
-- 2. COMPOSIÇÕES (mestre - públicas para todas as orgs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compositions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid REFERENCES public.composition_categories(id) ON DELETE SET NULL,
  discipline   text NOT NULL,
  code         text NOT NULL UNIQUE,        -- ex: PIA.SOLD.001
  description  text NOT NULL,
  unit         text NOT NULL,                -- un, m, m², m³, kg, h, polegada²
  source       text NOT NULL DEFAULT 'PROJECT.IA' CHECK (source IN (
    'PROJECT.IA','SINAPI','TCPO','PETROBRAS_N2461','PETROBRAS_N1735','ABNT','CUSTOM'
  )),
  source_code  text,                         -- código original no SINAPI/etc
  base_price   numeric(14,2),                -- preço sugerido em R$ (referência)
  productivity numeric(10,4),                -- produtividade (h/un, m/h, kg/h)
  reference_region text DEFAULT 'BR-SE',    -- regional de referência
  tags         text[] DEFAULT '{}',         -- ['solda','topo','sch40']
  notes        text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_discipline ON public.compositions(discipline);
CREATE INDEX IF NOT EXISTS idx_comp_category ON public.compositions(category_id);
CREATE INDEX IF NOT EXISTS idx_comp_code ON public.compositions(code);
CREATE INDEX IF NOT EXISTS idx_comp_search ON public.compositions USING gin(to_tsvector('portuguese', description));
CREATE INDEX IF NOT EXISTS idx_comp_tags ON public.compositions USING gin(tags);

-- ============================================================
-- 3. ITENS DA COMPOSIÇÃO (insumos + mão-de-obra + equipamento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.composition_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id uuid NOT NULL REFERENCES public.compositions(id) ON DELETE CASCADE,
  item_type      text NOT NULL CHECK (item_type IN ('insumo','mao_obra','equipamento','servico')),
  code           text,                       -- código SINAPI/próprio
  description    text NOT NULL,
  unit           text NOT NULL,
  quantity       numeric(14,6) NOT NULL,     -- coeficiente
  unit_price     numeric(14,4),              -- R$/unidade (referência)
  total          numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  display_order  int DEFAULT 0,
  notes          text
);

CREATE INDEX IF NOT EXISTS idx_comp_items_comp ON public.composition_items(composition_id);

-- ============================================================
-- 4. OVERRIDES POR ORG (preço customizado da composição mestre)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.composition_org_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  composition_id  uuid NOT NULL REFERENCES public.compositions(id) ON DELETE CASCADE,
  custom_price    numeric(14,2),
  custom_productivity numeric(10,4),
  notes           text,
  updated_by      uuid,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(org_id, composition_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_override_org ON public.composition_org_overrides(org_id);

-- ============================================================
-- 5. COMPOSIÇÕES PRÓPRIAS DA ORG (não-públicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_custom_compositions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  discipline   text NOT NULL,
  code         text NOT NULL,
  description  text NOT NULL,
  unit         text NOT NULL,
  base_price   numeric(14,2),
  items_json   jsonb DEFAULT '[]',         -- mesma estrutura de composition_items
  tags         text[] DEFAULT '{}',
  notes        text,
  is_active    boolean DEFAULT true,
  created_by   uuid,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_org_comp_org ON public.org_custom_compositions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_comp_discipline ON public.org_custom_compositions(discipline);

-- ============================================================
-- 6. USO DE COMPOSIÇÕES EM ORÇAMENTOS DE PROJETO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_composition_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL,
  project_id       uuid NOT NULL,
  composition_id   uuid REFERENCES public.compositions(id) ON DELETE SET NULL,
  org_composition_id uuid REFERENCES public.org_custom_compositions(id) ON DELETE SET NULL,
  discipline       text NOT NULL,
  description      text NOT NULL,           -- snapshot
  unit             text NOT NULL,
  quantity         numeric(14,4) NOT NULL,
  unit_price       numeric(14,4) NOT NULL,
  total_price      numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  abc_class        text,                    -- 'A','B','C' (calculado)
  notes            text,
  created_by       uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proj_comp_org ON public.project_composition_lines(org_id);
CREATE INDEX IF NOT EXISTS idx_proj_comp_project ON public.project_composition_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_comp_discipline ON public.project_composition_lines(discipline);

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE public.composition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_org_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_custom_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_composition_lines ENABLE ROW LEVEL SECURITY;

-- Composições mestre: leitura pública para todos os usuários autenticados
DROP POLICY IF EXISTS comp_cat_select ON public.composition_categories;
CREATE POLICY comp_cat_select ON public.composition_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS comp_select ON public.compositions;
CREATE POLICY comp_select ON public.compositions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS comp_items_select ON public.composition_items;
CREATE POLICY comp_items_select ON public.composition_items
  FOR SELECT TO authenticated USING (true);

-- Overrides e custom: só da org
DROP POLICY IF EXISTS comp_override_all ON public.composition_org_overrides;
CREATE POLICY comp_override_all ON public.composition_org_overrides
  FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS org_comp_all ON public.org_custom_compositions;
CREATE POLICY org_comp_all ON public.org_custom_compositions
  FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS proj_comp_all ON public.project_composition_lines;
CREATE POLICY proj_comp_all ON public.project_composition_lines
  FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.user_orgs WHERE user_id = auth.uid()));

-- ============================================================
-- 8. VIEW: composições com preço efetivo (override > base)
-- ============================================================
CREATE OR REPLACE VIEW public.v_compositions_effective AS
SELECT
  c.id,
  c.discipline,
  c.code,
  c.description,
  c.unit,
  c.source,
  c.source_code,
  COALESCE(o.custom_price, c.base_price) AS effective_price,
  c.base_price,
  o.custom_price,
  c.productivity,
  c.tags,
  c.notes,
  o.org_id AS override_org_id
FROM public.compositions c
LEFT JOIN public.composition_org_overrides o ON o.composition_id = c.id
WHERE c.is_active = true;

GRANT SELECT ON public.v_compositions_effective TO authenticated;

-- ============================================================
-- 9. FUNÇÃO: calcular curva ABC do projeto
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_project_abc(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_value numeric;
  cumulative numeric := 0;
BEGIN
  SELECT SUM(total_price) INTO total_value
  FROM public.project_composition_lines
  WHERE project_id = p_project_id;

  IF total_value IS NULL OR total_value = 0 THEN RETURN; END IF;

  -- Reset
  UPDATE public.project_composition_lines
  SET abc_class = NULL
  WHERE project_id = p_project_id;

  -- Classifica do mais caro para o mais barato
  WITH ordered AS (
    SELECT id, total_price,
      SUM(total_price) OVER (ORDER BY total_price DESC) AS cum_sum
    FROM public.project_composition_lines
    WHERE project_id = p_project_id
  )
  UPDATE public.project_composition_lines pcl
  SET abc_class = CASE
    WHEN o.cum_sum / total_value <= 0.80 THEN 'A'
    WHEN o.cum_sum / total_value <= 0.95 THEN 'B'
    ELSE 'C'
  END
  FROM ordered o
  WHERE pcl.id = o.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calc_project_abc(uuid) TO authenticated;

COMMENT ON TABLE public.compositions IS 'Base de Composições PROJECT.IA - substituto industrial multi-disciplinar do SINAPI';
COMMENT ON COLUMN public.compositions.source IS 'PROJECT.IA = própria; SINAPI/TCPO = civil; PETROBRAS_N2461 = tubulação; PETROBRAS_N1735 = pintura';
