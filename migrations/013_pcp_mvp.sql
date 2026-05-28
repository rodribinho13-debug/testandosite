-- ============================================================
-- PCP MVP: WWP (Weekly Work Plan) + PPC + CNC
-- Last Planner System adaptado pra montagem industrial
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE pcp_status AS ENUM ('backlog','planned','in_progress','done','partial','not_done');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE pcp_cnc AS ENUM (
    'material','projeto','mao_obra','seguranca','andaime','clima',
    'retrabalho','equipamento','interferencia','planejamento','outros'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela principal
CREATE TABLE IF NOT EXISTS pcp_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  codigo text,                         -- ex: "WWP-2026W22-001"
  disciplina text NOT NULL DEFAULT 'industrial',  -- tubulacao, civil, eletrica, mecanica, instrumentacao, pintura, etc
  frente text,                         -- frente de serviço / área da obra
  descricao text NOT NULL,             -- "J-101 a J-115, 6\" SCH 80, A335-P11"
  hh_prev numeric DEFAULT 0,           -- HH previsto
  hh_real numeric DEFAULT 0,           -- HH realizado (vem do RDO)
  qty_prev numeric DEFAULT 0,          -- quantidade prevista (m, m², juntas, etc)
  qty_real numeric DEFAULT 0,
  unidade text,                        -- m, m², m³, jt, pç
  equipe text,                         -- nome da equipe (texto livre)
  responsavel_id uuid,                 -- user_id do encarregado
  responsavel_nome text,
  status pcp_status NOT NULL DEFAULT 'backlog',
  week_start date,                     -- segunda da semana planejada (YYYY-MM-DD)
  planned_date date,                   -- dia específico (quando saiu do WWP pro plano diário)
  completed_date date,
  cnc_cause pcp_cnc,                   -- só preenche se status in (partial, not_done)
  cnc_obs text,
  restricoes jsonb DEFAULT '[]'::jsonb,-- lista: [{tipo:'material', desc:'flange F-22', resolvida:false}]
  parent_rdo_id uuid,                  -- daily_reports.id que reportou o resultado
  meta jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pcp_org_proj_week ON pcp_packages(org_id, project_id, week_start) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pcp_planned_date ON pcp_packages(org_id, project_id, planned_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pcp_status ON pcp_packages(org_id, project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pcp_disciplina ON pcp_packages(org_id, disciplina) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION pcp_packages_touch() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pcp_packages_touch ON pcp_packages;
CREATE TRIGGER trg_pcp_packages_touch BEFORE UPDATE ON pcp_packages
  FOR EACH ROW EXECUTE FUNCTION pcp_packages_touch();

-- RLS por org_id
ALTER TABLE pcp_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pcp_org_select ON pcp_packages;
CREATE POLICY pcp_org_select ON pcp_packages FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS pcp_org_insert ON pcp_packages;
CREATE POLICY pcp_org_insert ON pcp_packages FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS pcp_org_update ON pcp_packages;
CREATE POLICY pcp_org_update ON pcp_packages FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS pcp_org_delete ON pcp_packages;
CREATE POLICY pcp_org_delete ON pcp_packages FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- View materializada PPC por semana/projeto/disciplina
CREATE OR REPLACE VIEW v_pcp_ppc AS
SELECT
  org_id,
  project_id,
  week_start,
  disciplina,
  COUNT(*) FILTER (WHERE status IN ('done','partial','not_done')) AS total_avaliados,
  COUNT(*) FILTER (WHERE status = 'done') AS concluidos,
  COUNT(*) FILTER (WHERE status = 'partial') AS parciais,
  COUNT(*) FILTER (WHERE status = 'not_done') AS nao_concluidos,
  COALESCE(SUM(hh_prev) FILTER (WHERE status IN ('done','partial','not_done')), 0) AS hh_prev_total,
  COALESCE(SUM(hh_real) FILTER (WHERE status IN ('done','partial','not_done')), 0) AS hh_real_total,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('done','partial','not_done')) > 0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'done') / COUNT(*) FILTER (WHERE status IN ('done','partial','not_done')), 1)
    ELSE NULL
  END AS ppc_pct
FROM pcp_packages
WHERE deleted_at IS NULL AND week_start IS NOT NULL
GROUP BY org_id, project_id, week_start, disciplina;

-- View Pareto de CNC
CREATE OR REPLACE VIEW v_pcp_cnc AS
SELECT
  org_id,
  project_id,
  week_start,
  cnc_cause,
  COUNT(*) AS ocorrencias,
  COALESCE(SUM(hh_prev), 0) AS hh_perdido_prev
FROM pcp_packages
WHERE deleted_at IS NULL
  AND cnc_cause IS NOT NULL
  AND status IN ('partial','not_done')
GROUP BY org_id, project_id, week_start, cnc_cause;

COMMENT ON TABLE pcp_packages IS 'PCP MVP — pacotes de trabalho do Last Planner System';
COMMENT ON VIEW v_pcp_ppc IS 'KPI PPC (% Plan Complete) por semana/disciplina';
COMMENT ON VIEW v_pcp_cnc IS 'Pareto de Causas de Não-Conclusão';
