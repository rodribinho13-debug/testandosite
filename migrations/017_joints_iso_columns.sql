-- 017_joints_iso_columns.sql
-- O app referencia joints.iso_number / revision / material em ~16 pontos (oJoint insert,
-- FIELD_SCHEMA[quality_joints], display/filtro/export/dropdown do Mapa de Juntas, import),
-- mas essas colunas NAO existiam -> o "+ Novo" (oJoint) falhava no INSERT
-- ("column iso_number does not exist") e o import quebrava ao mapear esses campos.
-- Adicionadas como text nullable (aditivo). Aplicada em producao via MCP em 2026-05-29.
ALTER TABLE public.joints
  ADD COLUMN IF NOT EXISTS iso_number text,
  ADD COLUMN IF NOT EXISTS revision   text,
  ADD COLUMN IF NOT EXISTS material   text;

NOTIFY pgrst, 'reload schema';
