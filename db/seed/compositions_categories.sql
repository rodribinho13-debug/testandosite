-- ============================================================
-- SEED: Categorias por disciplina
-- ============================================================

INSERT INTO public.composition_categories (discipline, code, name, display_order) VALUES
-- MECÂNICA / TUBULAÇÃO
('mecanica',     'MEC',  'Mecânica - Geral',                10),
('tubulacao',    'TUB',  'Tubulação - Geral',               20),
('tubulacao',    'SOL',  'Soldagem',                        21),
('tubulacao',    'MON',  'Montagem (flanges, juntas)',      22),
('tubulacao',    'TES',  'Testes hidrostáticos/pneumáticos', 23),

-- ELÉTRICA
('eletrica',     'ELE',  'Elétrica - Geral',                30),
('eletrica',     'CAB',  'Cabos',                           31),
('eletrica',     'ENC',  'Encaminhamentos (eletrodutos/calhas)', 32),
('eletrica',     'PAI',  'Painéis e CCM',                   33),
('eletrica',     'ATE',  'Aterramento e SPDA',              34),

-- INSTRUMENTAÇÃO
('instrumentacao', 'INS','Instrumentação - Geral',          40),
('instrumentacao', 'LCK','Loop check e calibração',         41),

-- CIVIL
('civil',        'CIV',  'Civil - Geral',                   50),
('civil',        'CON',  'Concreto',                        51),
('civil',        'EST',  'Estrutura (armação/fôrma)',       52),
('civil',        'TER',  'Terraplenagem',                   53),
('civil',        'ALV',  'Alvenaria/Vedações',              54),

-- HIDRÁULICA
('hidraulica',   'HID',  'Hidráulica - Geral',              60),

-- PINTURA
('pintura',      'PIN',  'Pintura - Geral',                 70),
('pintura',      'PRE',  'Preparação de superfície',        71),
('pintura',      'APL',  'Aplicação de tinta',              72),
('pintura',      'INS',  'Inspeção',                        73),

-- CALDEIRARIA
('caldeiraria',  'CAL',  'Caldeiraria - Geral',             80),
('caldeiraria',  'FAB',  'Fabricação',                      81),
('caldeiraria',  'MTM',  'Montagem',                        82),

-- ISOLAMENTO
('isolamento',   'ISO',  'Isolamento térmico',              90),

-- SEGURANÇA
('seguranca',    'SEG',  'Segurança do trabalho',          100)
ON CONFLICT (discipline, code) DO NOTHING;
