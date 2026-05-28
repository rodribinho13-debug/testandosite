-- ============================================================
-- PROJECT.IA - Seed Completo da Base de Composições
-- 80+ composições reais multi-disciplinares
-- Referências: SINAPI 2025, TCPO, Petrobras N-2461, N-1735, ABNT
-- ============================================================

-- ============================================================
-- TUBULAÇÃO / MECÂNICA — Soldagem (N-2461)
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('tubulacao','PIA.SOLD.001','Solda topo a topo SMAW 1/2" SCH 40 (CS) - eletrodo E7018', 'un',    'PROJECT.IA', NULL, 38.50,  0.45, ARRAY['solda','SMAW','sch40','CS'], 'Inclui eletrodo, soldador, esmerilhamento'),
('tubulacao','PIA.SOLD.002','Solda topo a topo SMAW 3/4" SCH 40 (CS) - eletrodo E7018', 'un',   'PROJECT.IA', NULL, 52.20,  0.65, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.003','Solda topo a topo SMAW 1" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 68.50,  0.85, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.004','Solda topo a topo SMAW 2" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 95.30,  1.20, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.005','Solda topo a topo SMAW 3" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 142.80, 1.80, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.006','Solda topo a topo SMAW 4" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 198.50, 2.50, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.007','Solda topo a topo SMAW 6" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 312.00, 3.85, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.008','Solda topo a topo SMAW 8" SCH 40 (CS) - eletrodo E7018', 'un',     'PROJECT.IA', NULL, 445.00, 5.20, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.009','Solda topo a topo SMAW 10" SCH 40 (CS) - eletrodo E7018', 'un',    'PROJECT.IA', NULL, 612.00, 7.10, ARRAY['solda','SMAW','sch40','CS'], NULL),
('tubulacao','PIA.SOLD.010','Solda topo a topo SMAW 12" SCH 40 (CS) - eletrodo E7018', 'un',    'PROJECT.IA', NULL, 810.00, 9.30, ARRAY['solda','SMAW','sch40','CS'], NULL),

-- Aço inox
('tubulacao','PIA.SOLD.020','Solda topo a topo GTAW 2" SCH 10S (SS304) - vareta ER308L', 'un',  'PROJECT.IA', NULL, 168.00, 2.10, ARRAY['solda','GTAW','TIG','SS','inox'], 'TIG com argônio'),
('tubulacao','PIA.SOLD.021','Solda topo a topo GTAW 4" SCH 10S (SS304) - vareta ER308L', 'un',  'PROJECT.IA', NULL, 320.00, 4.20, ARRAY['solda','GTAW','TIG','SS','inox'], NULL),
('tubulacao','PIA.SOLD.022','Solda topo a topo GTAW 6" SCH 10S (SS304) - vareta ER308L', 'un',  'PROJECT.IA', NULL, 485.00, 6.30, ARRAY['solda','GTAW','TIG','SS','inox'], NULL),

-- Filete
('tubulacao','PIA.SOLD.030','Solda filete em ângulo 4mm - posição PB', 'pol²',                  'PROJECT.IA', NULL, 14.20, 0.18, ARRAY['solda','filete','SMAW'], 'Custo por pol² de cordão'),

-- Montagem
('tubulacao','PIA.MONT.001','Montagem flange WN classe 150# 2" (com junta espiral)', 'un',     'PROJECT.IA', NULL, 145.00, 1.60, ARRAY['flange','montagem','150#'], NULL),
('tubulacao','PIA.MONT.002','Montagem flange WN classe 150# 4" (com junta espiral)', 'un',     'PROJECT.IA', NULL, 215.00, 2.40, ARRAY['flange','montagem','150#'], NULL),
('tubulacao','PIA.MONT.003','Montagem flange WN classe 150# 6" (com junta espiral)', 'un',     'PROJECT.IA', NULL, 295.00, 3.30, ARRAY['flange','montagem','150#'], NULL),
('tubulacao','PIA.MONT.004','Montagem flange WN classe 300# 6" (com junta espiral)', 'un',     'PROJECT.IA', NULL, 358.00, 3.80, ARRAY['flange','montagem','300#'], NULL),
('tubulacao','PIA.MONT.010','Aperto torqueado classe 150# (por parafuso, c/torquímetro hidr.)','un','PROJECT.IA', NULL, 18.50, 0.12, ARRAY['torque','aperto'], NULL),
('tubulacao','PIA.MONT.020','Aplicação de junta PTFE entre flanges', 'un',                     'PROJECT.IA', NULL, 22.00, 0.10, ARRAY['junta','PTFE'], NULL),

-- Testes
('tubulacao','PIA.TEST.001','Teste hidrostático em linha (até 6") - por trecho até 50m', 'un', 'PROJECT.IA', NULL, 850.00, NULL, ARRAY['hidrostatico','teste'], 'Bombas, manômetro calibrado, água tratada, registro'),
('tubulacao','PIA.TEST.002','Teste hidrostático em linha (8" a 12") - por trecho até 50m', 'un','PROJECT.IA', NULL, 1450.00, NULL, ARRAY['hidrostatico','teste'], NULL),
('tubulacao','PIA.TEST.010','Teste pneumático com hélio - linha de processo', 'm',             'PROJECT.IA', NULL, 28.00, NULL, ARRAY['pneumatico','helio','teste'], 'Crítico em refinaria')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ELÉTRICA - Cabos, eletrodutos, painéis, SPDA
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('eletrica','PIA.ELE.001','Lançamento cabo BT 4x2,5mm² PVC/PVC em eletrocalha', 'm',          'PROJECT.IA', NULL, 12.50, 0.08, ARRAY['cabo','BT','2.5mm'], NULL),
('eletrica','PIA.ELE.002','Lançamento cabo BT 4x6mm² PVC/PVC em eletrocalha', 'm',            'PROJECT.IA', NULL, 22.00, 0.10, ARRAY['cabo','BT','6mm'], NULL),
('eletrica','PIA.ELE.003','Lançamento cabo BT 4x10mm² PVC/PVC em eletrocalha', 'm',           'PROJECT.IA', NULL, 32.50, 0.12, ARRAY['cabo','BT','10mm'], NULL),
('eletrica','PIA.ELE.004','Lançamento cabo BT 4x16mm² PVC/PVC em eletrocalha', 'm',           'PROJECT.IA', NULL, 48.00, 0.15, ARRAY['cabo','BT','16mm'], NULL),
('eletrica','PIA.ELE.005','Lançamento cabo BT 4x35mm² PVC/PVC em eletrocalha', 'm',           'PROJECT.IA', NULL, 92.00, 0.20, ARRAY['cabo','BT','35mm'], NULL),
('eletrica','PIA.ELE.006','Lançamento cabo BT 4x50mm² PVC/PVC em eletrocalha', 'm',           'PROJECT.IA', NULL, 130.00, 0.25, ARRAY['cabo','BT','50mm'], NULL),
('eletrica','PIA.ELE.007','Lançamento cabo BT 4x95mm² em eletroduto galvanizado', 'm',        'PROJECT.IA', NULL, 245.00, 0.40, ARRAY['cabo','BT','95mm'], NULL),
('eletrica','PIA.ELE.010','Lançamento cabo MT 15kV 3x35mm² em duto subterrâneo', 'm',         'PROJECT.IA', NULL, 285.00, 0.35, ARRAY['cabo','MT','15kV'], NULL),
('eletrica','PIA.ELE.011','Lançamento cabo MT 15kV 3x70mm² em duto subterrâneo', 'm',         'PROJECT.IA', NULL, 420.00, 0.45, ARRAY['cabo','MT','15kV'], NULL),

-- Eletrodutos / calhas
('eletrica','PIA.ELE.020','Lançamento eletroduto galvanizado 3/4" (Sem fornecimento)', 'm',   'PROJECT.IA', NULL, 28.50, 0.18, ARRAY['eletroduto','galv'], NULL),
('eletrica','PIA.ELE.021','Lançamento eletroduto galvanizado 1" (Sem fornecimento)', 'm',     'PROJECT.IA', NULL, 36.00, 0.22, ARRAY['eletroduto','galv'], NULL),
('eletrica','PIA.ELE.022','Lançamento eletroduto galvanizado 2" (Sem fornecimento)', 'm',     'PROJECT.IA', NULL, 65.00, 0.32, ARRAY['eletroduto','galv'], NULL),
('eletrica','PIA.ELE.025','Montagem eletrocalha perfurada 200x100mm (com suporte)', 'm',      'PROJECT.IA', NULL, 88.00, 0.42, ARRAY['eletrocalha'], NULL),
('eletrica','PIA.ELE.026','Montagem eletrocalha perfurada 300x100mm (com suporte)', 'm',      'PROJECT.IA', NULL, 118.00, 0.55, ARRAY['eletrocalha'], NULL),
('eletrica','PIA.ELE.027','Montagem leito 600x100mm para cabos BT/MT', 'm',                   'PROJECT.IA', NULL, 215.00, 0.85, ARRAY['leito','cabos'], NULL),

-- Painéis
('eletrica','PIA.ELE.040','Montagem painel CCM (por kg de painel)', 'kg',                     'PROJECT.IA', NULL, 18.50, 0.08, ARRAY['painel','CCM','montagem'], NULL),
('eletrica','PIA.ELE.041','Conexão de cabo em borne (por veia)', 'un',                        'PROJECT.IA', NULL, 4.20, 0.04, ARRAY['conexao','borne'], NULL),
('eletrica','PIA.ELE.042','Energização e teste funcional de painel CCM', 'un',                'PROJECT.IA', NULL, 1850.00, NULL, ARRAY['energizacao','teste','CCM'], NULL),

-- SPDA / Aterramento
('eletrica','PIA.SPDA.001','Instalação de haste cobreada 5/8"x2,4m + conector', 'un',         'PROJECT.IA', NULL, 145.00, 0.65, ARRAY['SPDA','haste','aterramento'], NULL),
('eletrica','PIA.SPDA.002','Lançamento cabo cobre nu 35mm² para malha SPDA', 'm',             'PROJECT.IA', NULL, 38.00, 0.10, ARRAY['SPDA','cabo','cobre'], NULL),
('eletrica','PIA.SPDA.003','Medição de resistência ôhmica de malha SPDA (NBR 5419)', 'un',    'PROJECT.IA', NULL, 1250.00, NULL, ARRAY['SPDA','medicao','NBR5419'], NULL),

-- Testes
('eletrica','PIA.TEST.001','Teste hipot em cabo MT (por kV durante 1 min)', 'kV.min',         'PROJECT.IA', NULL, 95.00, NULL, ARRAY['hipot','teste'], NULL),
('eletrica','PIA.TEST.002','Megagem de cabo (BT ou MT) - por cabo', 'un',                     'PROJECT.IA', NULL, 65.00, NULL, ARRAY['megagem','isolamento'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- INSTRUMENTAÇÃO
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('instrumentacao','PIA.INST.001','Instalação de transmissor de pressão (rosqueado)', 'un',    'PROJECT.IA', NULL, 480.00, 1.8, ARRAY['transmissor','pressao'], NULL),
('instrumentacao','PIA.INST.002','Instalação de transmissor de temperatura com termopoço', 'un','PROJECT.IA', NULL, 720.00, 2.5, ARRAY['transmissor','temperatura','termopoço'], NULL),
('instrumentacao','PIA.INST.003','Instalação de transmissor de vazão tipo coriolis', 'un',    'PROJECT.IA', NULL, 1450.00, 4.5, ARRAY['transmissor','vazao','coriolis'], NULL),
('instrumentacao','PIA.INST.004','Instalação de transmissor de nível tipo radar', 'un',       'PROJECT.IA', NULL, 1280.00, 4.0, ARRAY['transmissor','nivel','radar'], NULL),
('instrumentacao','PIA.INST.010','Lançamento cabo de instrumentação 1x2x1,5mm² blindado', 'm','PROJECT.IA', NULL, 18.50, 0.12, ARRAY['cabo','instr','blindado'], NULL),
('instrumentacao','PIA.INST.011','Lançamento cabo de instrumentação 4x2x1,5mm² blindado', 'm','PROJECT.IA', NULL, 32.00, 0.18, ARRAY['cabo','instr','blindado'], NULL),
('instrumentacao','PIA.INST.020','Loop check (de campo até SDCD)', 'loop',                    'PROJECT.IA', NULL, 580.00, NULL, ARRAY['loop','check','comissionamento'], NULL),
('instrumentacao','PIA.INST.021','Calibração 5 pontos de transmissor c/ HART communicator', 'un','PROJECT.IA', NULL, 285.00, NULL, ARRAY['calibracao','HART'], NULL),
('instrumentacao','PIA.INST.022','Calibração de válvula de controle (curva característica)', 'un','PROJECT.IA', NULL, 685.00, NULL, ARRAY['calibracao','valvula','controle'], NULL),
('instrumentacao','PIA.INST.030','Configuração e parametrização em SDCD/PLC', 'tag',         'PROJECT.IA', NULL, 145.00, NULL, ARRAY['SDCD','PLC','config'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- CIVIL - Concreto, fôrma, armação, terraplenagem
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('civil','PIA.CIV.001','Concreto estrutural Fck 25 MPa (usinado) - lançamento manual', 'm³',  'SINAPI', '92873', 545.00, 0.95, ARRAY['concreto','25MPa','manual'], 'Inclui dosagem, lançamento, adensamento e cura'),
('civil','PIA.CIV.002','Concreto estrutural Fck 30 MPa (usinado) - lançamento c/ bomba', 'm³','SINAPI', '92874', 612.00, 0.40, ARRAY['concreto','30MPa','bombeado'], NULL),
('civil','PIA.CIV.003','Concreto estrutural Fck 40 MPa (usinado) - lançamento c/ bomba', 'm³','SINAPI', '94965', 740.00, 0.40, ARRAY['concreto','40MPa','bombeado'], NULL),
('civil','PIA.CIV.010','Fôrma plana de madeira para estrutura (5 reaproveitamentos)', 'm²',  'SINAPI', '94962', 92.00, 1.30, ARRAY['forma','madeira'], NULL),
('civil','PIA.CIV.011','Fôrma metálica para pilar (10 reaproveitamentos)', 'm²',              'SINAPI', NULL,    158.00, 1.10, ARRAY['forma','metalica','pilar'], NULL),
('civil','PIA.CIV.020','Armação aço CA-50 - corte, dobra e montagem', 'kg',                  'SINAPI', '92775', 14.80, 0.10, ARRAY['armacao','CA-50'], NULL),
('civil','PIA.CIV.021','Armação aço CA-25 - corte, dobra e montagem', 'kg',                  'SINAPI', '92778', 13.50, 0.10, ARRAY['armacao','CA-25'], NULL),

-- Terraplenagem
('civil','PIA.CIV.030','Escavação manual em solo - até 1,5m de profundidade', 'm³',          'SINAPI', '93358', 92.00, 2.50, ARRAY['escavacao','manual'], NULL),
('civil','PIA.CIV.031','Escavação mecanizada c/ retroescavadeira', 'm³',                     'SINAPI', '93382', 38.00, NULL, ARRAY['escavacao','retro','mecanica'], NULL),
('civil','PIA.CIV.032','Aterro compactado (100% PN) c/ controle de umidade', 'm³',           'SINAPI', '96527', 68.00, 0.45, ARRAY['aterro','compactacao'], NULL),
('civil','PIA.CIV.033','Reaterro de vala c/ apiloamento', 'm³',                              'SINAPI', '93382', 42.00, 0.65, ARRAY['reaterro','vala'], NULL),

-- Alvenaria
('civil','PIA.CIV.040','Alvenaria bloco cerâmico 14cm c/ argamassa', 'm²',                   'SINAPI', '87489', 145.00, 1.50, ARRAY['alvenaria','bloco','ceramico'], NULL),
('civil','PIA.CIV.041','Alvenaria bloco concreto estrutural 14cm', 'm²',                     'SINAPI', '87491', 158.00, 1.40, ARRAY['alvenaria','bloco','concreto'], NULL),
('civil','PIA.CIV.050','Chumbador químico HILTI HVU2 M16 (instalado)', 'un',                 'PROJECT.IA', NULL, 95.00, 0.25, ARRAY['chumbador','quimico','HILTI'], NULL),
('civil','PIA.CIV.051','Chumbador mecânico M12 expansível', 'un',                            'PROJECT.IA', NULL, 32.00, 0.18, ARRAY['chumbador','mecanico'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- HIDRÁULICA
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('hidraulica','PIA.HID.001','Tubulação PVC SCH 80 DN50 (2") c/ conexões', 'm',                'PROJECT.IA', NULL, 58.00, 0.35, ARRAY['PVC','DN50','água'], NULL),
('hidraulica','PIA.HID.002','Tubulação PVC SCH 80 DN100 (4") c/ conexões', 'm',               'PROJECT.IA', NULL, 112.00, 0.55, ARRAY['PVC','DN100'], NULL),
('hidraulica','PIA.HID.010','Instalação de hidrante c/ abrigo (NBR 13714)', 'un',             'PROJECT.IA', NULL, 1850.00, 4.5, ARRAY['hidrante','PCI','NBR13714'], NULL),
('hidraulica','PIA.HID.011','Bomba contra incêndio centrífuga 1500 lpm/8 bar - instalação', 'un','PROJECT.IA', NULL, 4250.00, 8.0, ARRAY['bomba','PCI','incendio'], NULL),
('hidraulica','PIA.HID.020','Caixa de inspeção 60x60cm em alvenaria', 'un',                  'SINAPI', '74108/001', 485.00, 4.0, ARRAY['caixa','inspecao'], NULL),
('hidraulica','PIA.HID.030','Drenagem oleosa - canaleta 30x30cm c/ tampa metálica', 'm',     'PROJECT.IA', NULL, 320.00, 1.2, ARRAY['drenagem','oleosa'], 'Comum em refinaria/petroquimica')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PINTURA INDUSTRIAL (Petrobras N-1735, N-2680)
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
-- Preparação
('pintura','PIA.PIN.001','Jateamento abrasivo padrão Sa 2.5 (SIS 05 59 00)', 'm²',           'PROJECT.IA', NULL, 38.50, 0.35, ARRAY['jato','Sa2.5','preparacao'], NULL),
('pintura','PIA.PIN.002','Jateamento abrasivo padrão Sa 3 (metal branco)', 'm²',             'PROJECT.IA', NULL, 52.00, 0.45, ARRAY['jato','Sa3','preparacao'], NULL),
('pintura','PIA.PIN.003','Limpeza manual padrão St 2 (escova rotativa)', 'm²',               'PROJECT.IA', NULL, 18.50, 0.20, ARRAY['limpeza','St2'], NULL),

-- Sistemas Petrobras
('pintura','PIA.PIN.010','Sistema N-2680 PU (3 demãos: primer epóxi rico Zn + interm. epóxi + acab. PU)', 'm²','PROJECT.IA', NULL, 145.00, 0.55, ARRAY['N-2680','PU','sistema'], 'Equipamentos em atmosfera severa C5-M'),
('pintura','PIA.PIN.011','Sistema N-1735 epóxi (2 demãos: primer + acabamento)', 'm²',       'PROJECT.IA', NULL, 88.00, 0.40, ARRAY['N-1735','epoxi','sistema'], NULL),
('pintura','PIA.PIN.012','Sistema imersão (epóxi alcatrão de hulha - 250µm)', 'm²',          'PROJECT.IA', NULL, 165.00, 0.65, ARRAY['imersao','epoxi','alcatrao'], 'Tanques de produto'),

-- Por demão
('pintura','PIA.PIN.020','Aplicação primer epóxi rico em zinco (DFT 75µm)', 'm²',            'PROJECT.IA', NULL, 42.00, 0.18, ARRAY['primer','epoxi','zinco'], NULL),
('pintura','PIA.PIN.021','Aplicação intermediário epóxi (DFT 100µm)', 'm²',                  'PROJECT.IA', NULL, 38.00, 0.16, ARRAY['intermediario','epoxi'], NULL),
('pintura','PIA.PIN.022','Aplicação acabamento poliuretano (DFT 50µm)', 'm²',                'PROJECT.IA', NULL, 35.00, 0.15, ARRAY['acabamento','PU'], NULL),

-- Inspeção
('pintura','PIA.PIN.030','Inspeção de espessura DFT (Elcometer) - por ponto', 'un',          'PROJECT.IA', NULL, 8.50, NULL, ARRAY['inspecao','DFT','Elcometer'], NULL),
('pintura','PIA.PIN.031','Inspeção de aderência (pull-off NBR 11003)', 'un',                 'PROJECT.IA', NULL, 185.00, NULL, ARRAY['inspecao','aderencia','pull-off'], NULL),
('pintura','PIA.PIN.032','Inspeção de descontinuidade (holiday tester) - por m²', 'm²',      'PROJECT.IA', NULL, 4.20, NULL, ARRAY['holiday','descontinuidade'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- CALDEIRARIA - Estruturas metálicas
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('caldeiraria','PIA.CAL.001','Fabricação de estrutura metálica em perfil W ASTM A572 Gr.50', 'kg','PROJECT.IA', NULL, 12.80, 0.04, ARRAY['estrutura','perfil','W','A572'], NULL),
('caldeiraria','PIA.CAL.002','Fabricação de estrutura metálica em perfil U ASTM A36', 'kg',  'PROJECT.IA', NULL, 11.50, 0.04, ARRAY['estrutura','perfil','U','A36'], NULL),
('caldeiraria','PIA.CAL.003','Fabricação chapa estrutural ASTM A36 (corte + furação + solda)', 'kg','PROJECT.IA', NULL, 14.20, 0.05, ARRAY['chapa','A36'], NULL),
('caldeiraria','PIA.CAL.010','Solda em estrutura metálica - filete 6mm (por m linear)', 'm', 'PROJECT.IA', NULL, 38.50, 0.25, ARRAY['solda','estrutura','filete'], NULL),
('caldeiraria','PIA.CAL.011','Solda em estrutura metálica - filete 8mm (por m linear)', 'm', 'PROJECT.IA', NULL, 52.00, 0.32, ARRAY['solda','estrutura','filete'], NULL),
('caldeiraria','PIA.CAL.020','Montagem de estrutura metálica em obra (sem içamento)', 'kg',  'PROJECT.IA', NULL, 4.80, 0.025, ARRAY['montagem','estrutura'], NULL),
('caldeiraria','PIA.CAL.021','Içamento de estrutura c/ guindaste 60t (mobilização inclusa)', 't','PROJECT.IA', NULL, 850.00, NULL, ARRAY['icamento','guindaste','60t'], NULL),
('caldeiraria','PIA.CAL.022','Içamento de estrutura c/ guindaste 100t', 't',                 'PROJECT.IA', NULL, 1280.00, NULL, ARRAY['icamento','guindaste','100t'], NULL),
('caldeiraria','PIA.CAL.030','Corte oxiacetilênico em chapa até 25mm', 'm',                  'PROJECT.IA', NULL, 28.00, 0.12, ARRAY['corte','oxiacetileno'], NULL),
('caldeiraria','PIA.CAL.031','Corte com plasma em chapa até 12mm', 'm',                      'PROJECT.IA', NULL, 35.00, 0.08, ARRAY['corte','plasma'], NULL),
('caldeiraria','PIA.CAL.040','Tratamento térmico para alívio de tensão (TTAT)', 'kg',        'PROJECT.IA', NULL, 18.50, NULL, ARRAY['TTAT','tratamento'], NULL),
('caldeiraria','PIA.CAL.050','Galvanização a fogo (imersão a quente) - por kg de aço', 'kg', 'PROJECT.IA', NULL, 8.20, NULL, ARRAY['galvanizacao','fogo','imersao'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ISOLAMENTO TÉRMICO
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('isolamento','PIA.ISO.001','Isolamento térmico lã de rocha 50mm c/ revest. alumínio (até 4")', 'm²','PROJECT.IA', NULL, 215.00, 1.20, ARRAY['isolamento','la-rocha','aluminio'], NULL),
('isolamento','PIA.ISO.002','Isolamento térmico lã de rocha 75mm c/ revest. alumínio (até 8")', 'm²','PROJECT.IA', NULL, 285.00, 1.40, ARRAY['isolamento','la-rocha'], NULL),
('isolamento','PIA.ISO.003','Isolamento térmico calha pré-moldada cerâmica + aluminio', 'm',  'PROJECT.IA', NULL, 165.00, 0.95, ARRAY['isolamento','ceramica'], 'Alta temperatura'),
('isolamento','PIA.ISO.010','Isolamento frigorífico em poliuretano expandido 50mm', 'm²',    'PROJECT.IA', NULL, 248.00, 1.10, ARRAY['isolamento','frio','PU'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEGURANÇA DO TRABALHO
-- ============================================================
INSERT INTO public.compositions (discipline, code, description, unit, source, source_code, base_price, productivity, tags, notes) VALUES
('seguranca','PIA.SEG.001','Andaime tubular - mobilização, montagem e desmontagem', 'm³',    'SINAPI', '93208', 38.50, NULL, ARRAY['andaime','NR18'], NULL),
('seguranca','PIA.SEG.002','Andaime suspenso (balancim) - por dia de uso', 'dia',            'PROJECT.IA', NULL, 285.00, NULL, ARRAY['andaime','suspenso','balancim'], NULL),
('seguranca','PIA.SEG.010','Linha de vida horizontal aço inox 8mm (NR-35)', 'm',             'PROJECT.IA', NULL, 195.00, 0.65, ARRAY['linha-vida','NR35','altura'], NULL),
('seguranca','PIA.SEG.020','Permissão de Trabalho (PT) - elaboração e liberação', 'un',     'PROJECT.IA', NULL, 145.00, NULL, ARRAY['PT','permissao'], NULL),
('seguranca','PIA.SEG.030','Bombeiro civil - turno 12h (NR-23)', 'turno',                    'PROJECT.IA', NULL, 380.00, NULL, ARRAY['bombeiro','NR23'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- VINCULAR COMPOSIÇÕES ÀS CATEGORIAS
-- ============================================================
UPDATE public.compositions c
SET category_id = (
  SELECT id FROM public.composition_categories cc
  WHERE cc.discipline = c.discipline
    AND cc.code = CASE
      WHEN c.code LIKE 'PIA.SOLD.%' THEN 'SOL'
      WHEN c.code LIKE 'PIA.MONT.%' THEN 'MON'
      WHEN c.code LIKE 'PIA.TEST.%' AND c.discipline='tubulacao' THEN 'TES'
      WHEN c.code LIKE 'PIA.ELE.0%' AND c.code <= 'PIA.ELE.019' THEN 'CAB'
      WHEN c.code LIKE 'PIA.ELE.02%' THEN 'ENC'
      WHEN c.code LIKE 'PIA.ELE.04%' THEN 'PAI'
      WHEN c.code LIKE 'PIA.SPDA.%' THEN 'ATE'
      WHEN c.code LIKE 'PIA.INST.02%' THEN 'LCK'
      WHEN c.code LIKE 'PIA.INST.%' THEN 'INS'
      WHEN c.code LIKE 'PIA.CIV.0%' AND c.code <= 'PIA.CIV.009' THEN 'CON'
      WHEN c.code LIKE 'PIA.CIV.01%' OR c.code LIKE 'PIA.CIV.02%' THEN 'EST'
      WHEN c.code LIKE 'PIA.CIV.03%' THEN 'TER'
      WHEN c.code LIKE 'PIA.CIV.04%' THEN 'ALV'
      WHEN c.code LIKE 'PIA.HID.%' THEN 'HID'
      WHEN c.code LIKE 'PIA.PIN.00%' THEN 'PRE'
      WHEN c.code LIKE 'PIA.PIN.01%' OR c.code LIKE 'PIA.PIN.02%' THEN 'APL'
      WHEN c.code LIKE 'PIA.PIN.03%' THEN 'INS'
      WHEN c.code LIKE 'PIA.CAL.00%' THEN 'FAB'
      WHEN c.code LIKE 'PIA.CAL.0%' THEN 'MTM'
      WHEN c.code LIKE 'PIA.ISO.%' THEN 'ISO'
      WHEN c.code LIKE 'PIA.SEG.%' THEN 'SEG'
      ELSE NULL
    END
  LIMIT 1
)
WHERE c.category_id IS NULL;

-- ============================================================
-- ESTATÍSTICAS
-- ============================================================
DO $$
DECLARE
  total int;
BEGIN
  SELECT COUNT(*) INTO total FROM public.compositions;
  RAISE NOTICE 'Total de composições cadastradas: %', total;
END $$;
