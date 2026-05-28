# ROADMAP — SaaS de Engenharia Multi-Disciplina
**Visão de negócio + plano técnico**
_(Análise feita como se eu fosse engenheiro mecânico sênior da Braskem / Petrobras / Vale, olhando o que esses clientes pagariam por uma plataforma de gestão)_

---

## 1. PROPOSTA DE VALOR

**Hoje:** sistema voltado para *tubulação industrial* (isométricos, juntas, soldagem, END, TH).

**Para virar SaaS multi-bilhão:** uma plataforma única que cobre **todas as disciplinas de uma obra/manutenção industrial pesada**, com cobrança modular (compra a disciplina que quiser).

**Concorrentes diretos a observar:**
- Bentley (OpenPlant, AssetWise) — caro, complexo, fora do alcance da maioria
- Hexagon (Smart Plant, EAM)
- IBM Maximo / SAP PM — enterprise, R$ milhões/ano
- AutoConstroi, Mobuss Construção (BR)
- Sienge (BR — só civil)

**Diferencial proposto:**
- **Cloud-first**, sem instalação local
- **IA embarcada** (você já tem o ISOMÉTRICO IA — vai estender pra cada disciplina)
- **Preço modular** (R$ 99–499/usuário/mês por disciplina, bundle ~40% off)
- **Mobile-first** para campo (offline + sync)
- **Compliance brasileiro** (NRs, NBRs, Petrobras N-XXX, normas IBR)

---

## 2. ARQUITETURA DE DISCIPLINAS

Cada disciplina é um módulo independente que **compartilha**: projetos, usuários, organizações, segurança/SSMA, documentos.

### 📦 DISCIPLINAS PROPOSTAS (ordem de implementação sugerida)

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 1 — Mecânica completa (próximos 90 dias)              │
├─────────────────────────────────────────────────────────────┤
│  ✅ tubulação industrial        (já implementado)            │
│  🟡 equipamentos estáticos      (vasos, tanques, torres)     │
│  🟡 equipamentos rotativos      (bombas, compressores)       │
│  🟡 estruturas metálicas        (pipe-racks, plataformas)    │
│  🟡 caldeiraria                 (fabricação metálica)        │
│  🟡 manutenção mecânica         (OS, MP, MTBF, MTTR)         │
│  🟡 comissionamento mecânico                                 │
│  🟡 calibração de instrumentos  (já tem tabela)              │
├─────────────────────────────────────────────────────────────┤
│  FASE 2 — Multi-disciplina (próximos 180 dias)              │
├─────────────────────────────────────────────────────────────┤
│  ⬜ pintura industrial          (esquemas, DFT, aderência)   │
│  ⬜ andaime / acesso            (cartões, vigências)         │
│  ⬜ civil / concreto            (lançamento, ensaios)        │
│  ⬜ elétrica                    (cabos, malha terra)         │
│  ⬜ instrumentação              (loop check, calibração)     │
│  ⬜ isolamento térmico                                       │
│  ⬜ refratário                  (fornos, torres)             │
│  ⬜ tratamento de superfície    (jateamento, decapagem)      │
├─────────────────────────────────────────────────────────────┤
│  FASE 3 — Suporte transversal (todas usam)                  │
├─────────────────────────────────────────────────────────────┤
│  ⬜ SSMA (NR-10, NR-12, NR-18, NR-33, NR-35, APR, PT)       │
│  ⬜ documentação (CFA, revisões, as-built)                   │
│  ⬜ qualidade transversal (auditoria, NCs, ações corretivas)│
│  ⬜ planejamento integrado (Primavera P6 sync, MS Project)  │
│  ⬜ contratos & medições (PPU, BM, aplicação ART)           │
│  ⬜ recursos humanos do projeto (HH, alocação, ASOs)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DETALHAMENTO DE CADA MÓDULO MECÂNICO

### 🔧 3.1 Equipamentos Estáticos (vasos, tanques, torres, fornos, trocadores)
**Quem usa:** Inspetor de equipamentos, engenheiro de inspeção, NR-13.
**O que controla:**
- Cadastro com TAG, fabricante, modelo, P×T projeto, código (ASME VIII, API 650, NBR 16161)
- Categoria NR-13 (I, II, III, IV, V) com periodicidade automática
- Inspeções: externa, interna, TH periódico
- **Mapeamento de espessuras (UT thickness)** — pontos georef no equipamento, série histórica, taxa de corrosão, vida residual
- Reparos por soldagem (PQR aplicada, área tratada, antes/depois)
- Modificações (registro de alteração de projeto)
- Histórico imutável (livro de ocorrências eletrônico)
- Geração automática de **placa NR-13** (PDF) e **prontuário do equipamento**

**Tabelas no banco:**
- `equipments` (cadastro)
- `equipment_inspections` (cada inspeção)
- `equipment_thickness_readings` (pontos UT × data × espessura)
- `equipment_repairs` (reparos com OS vinculada)
- `equipment_documents` (prontuário, ART, memorial)

### ⚙️ 3.2 Equipamentos Rotativos (bombas, compressores, turbinas, agitadores)
**Quem usa:** Mantenedor mecânico, analista preditivo, lubrificador.
**O que controla:**
- Cadastro com TAG, fabricante, modelo, curva (vazão×altura), RPM, potência
- Plano de **lubrificação** (lubrificante, ponto, periodicidade)
- Análise de **vibração** (RMS, FFT, ISO 10816 niveis A/B/C/D)
- **Análise de óleo** (TAN, TBN, viscosidade, contagem partículas ISO 4406)
- **Alinhamento** (laser, paralelo + angular)
- **Balanceamento** (campo, ISO 1940)
- Histórico de falhas (FMECA, causa raiz RCA)
- **MTBF / MTTR / disponibilidade**
- Sinais de **PdM** (preditivo automatizado por IA)

**Tabelas:**
- `rotating_equipments` (cadastro)
- `lubrication_plans` + `lubrication_executions`
- `vibration_analyses` (RMS, frequências de pico)
- `oil_analyses`
- `alignment_records`
- `equipment_failures` (com RCA)

### 🏗️ 3.3 Estruturas Metálicas
- Cadastro de elementos (pilares, vigas, contraventos)
- Lay-down de fabricação
- Soldas estruturais (AWS D1.1)
- Pintura aplicada (link com módulo Pintura)
- Memorial de cargas
- Bolts: torque aplicado por flange/conexão

**Tabelas:** `structures`, `structural_elements`, `structural_welds`, `structural_bolts`

### 🔥 3.4 Caldeiraria (Fabricação metálica leve/pesada)
- Pacote de trabalho (work pack) com BOM
- Sequência de fabricação (corte → calandra → ajuste → solda → tratamento → pintura → ensaio)
- Apontamento por pacote (qtd, prazo, refugo, retrabalho)
- Lote/rastreabilidade do material (link com certificado de qualidade)
- Marcação eletrônica (QR code por peça)

**Tabelas:** `fabrication_packages`, `fabrication_operations`, `material_certificates`

### 🛠️ 3.5 Manutenção Mecânica
**Quem usa:** Planejador de manutenção, encarregado, técnico.
**O que controla:**
- **Solicitação de serviço (SS)** → triagem → OS
- **Ordem de Serviço (OS)** com: TAG, descrição, criticidade, prazo
- **Tipos:** preventiva, preditiva, corretiva planejada, corretiva emergencial, melhoria
- **Backlog** com filtro por área, criticidade, prazo
- **Plano de manutenção** (MP) com frequência (calendário, HH operação, ciclos)
- Execução com apontamento de HH, materiais, OS aberta/fechada/postergada
- **KPIs:** backlog (dias), cumprimento MP %, MTBF/MTTR, disponibilidade, OEE
- Integração com OS de fabricação (módulo Caldeiraria)

**Tabelas:** `service_requests`, `work_orders` (já tem schema), `maintenance_plans`, `work_order_executions`, `mtbf_calculations`

### 🧪 3.6 Comissionamento Mecânico
**Quem usa:** Engenheiro de comissionamento, sub-líder.
**O que controla:**
- **Sistemas de teste** (SOP, subSOP, STH) — já existe como `test_systems`
- **Loop de comissionamento:** mecânico → elétrico → instrumentação → operacional
- **Checklists** por etapa (limpeza, alinhamento, lubrificação, sinalização, identificação)
- **Punch lists** A/B/C por status
- **Run-in** (rodagem) e **performance test**
- **Handover mecânico → operação** (passagem com livro vermelho)
- Geração de **dossiê de comissionamento** automático (PDF)

**Tabelas:** estende `test_systems`, adiciona `commissioning_checklists`, `punch_lists`, `handover_documents`

### 📏 3.7 Calibração de Instrumentos
Já tem `instruments` e `instrument_calibrations`. Expandir com:
- Plano anual de calibração
- Etiquetas com QR (rastreabilidade)
- Histórico de desvio (drift)
- Vínculo com norma de aceitação
- Vencimentos com alerta automático
- Padrões usados (rastreabilidade INMETRO)

---

## 4. ESTRATÉGIA COMERCIAL — MODELO SaaS

### 💰 Modelo de cobrança

**Cobrança por usuário/mês, por disciplina:**

| Plano | Disciplinas | Usuários | Preço/mês/usuário | Recomendado para |
|---|---|---|---|---|
| **Starter** | 1 disciplina | até 5 | R$ 99 | Manutenção interna |
| **Pro** | 1 disciplina | até 25 | R$ 79 | Construtoras médias |
| **Multi** | 3 disciplinas | até 50 | R$ 149 | Obras médias |
| **Enterprise** | Todas | ilimitado | sob consulta (R$ 49–69) | Grandes obras/Owner |
| **Owner Module** | Petrobras/Braskem | ilimitado | R$ 35 + setup | Multi-projeto |

**Add-ons:**
- IA por disciplina: + R$ 30/usuário/mês
- White-label: + R$ 1.500/mês fixo
- Migração de dados (one-shot): R$ 5–25 mil
- Treinamento on-site: R$ 8 mil/dia
- API key Power BI ilimitada: + R$ 200/mês

**Trial: 14 dias com 1 disciplina + 1 usuário + 10 isos/PDFs grátis.**

### 🎯 Target audience (em ordem de prioridade)

1. **Empresas EPC/Montagem** (CCM, Setal, Camargo, Galvão, Andrade Gutierrez)
2. **Owners industriais** (Petrobras, Braskem, Vale, Suzano, CSN, Gerdau, BRF)
3. **Engenharias de detalhamento** (Promon, Worley, AP Consultoria, Petroplan)
4. **Empresas de manutenção** (Esso, Mantipa, Servtec, Engesa)
5. **Inspetoras independentes** (Bureau Veritas, IBR, IBQN, TÜV)
6. **Estaleiros e offshore** (BrasFELS, Atlantico Sul, EBR)

### 📈 Estratégia GTM (Go-to-Market)

**Mês 1–3:** consolidar mecânica + 5 clientes-piloto (gratuito → testemunho/case)
**Mês 4–6:** lançar civil + pintura + andaime
**Mês 7–9:** integrações nativas (Primavera, MS Project, SAP, Maximo, Power BI)
**Mês 10–12:** mobile (PWA + app nativo Android — campo) e push de marketing
**Mês 13–18:** internacionalização (espanhol → mercado LATAM petroquímico)

---

## 5. PADRÕES E NORMAS A CONTEMPLAR

Sistema precisa ter conhecimento embarcado dessas normas para validação automática:

**Mecânica:**
- ASME B31.1, B31.3, B31.4, B31.8 (tubulação)
- ASME Sec. VIII (vasos)
- ASME Sec. IX (soldagem)
- API 510, 570, 653 (inspeção)
- API 580, 581 (RBI — Risk-Based Inspection)
- API 614 (lubrificação)
- ISO 14224 (confiabilidade)
- AWS D1.1, D1.6 (soldagem estrutural/inox)

**Brasil:**
- NR-10 (elétrica), NR-12 (máquinas), NR-13 (vasos/caldeiras), NR-18 (construção)
- NR-33 (confinado), NR-35 (altura)
- NBR 16161, NBR 14787, NBR 12693
- Petrobras N-1738, N-1593, N-115, N-133, N-2624
- Resoluções ANP (refinação)

**Pintura:**
- NACE / SSPC SP1-SP10
- ISO 8501-1 (Sa 1, Sa 2, Sa 2½, Sa 3)
- ASTM D4541 (pull-off)

**Andaime:**
- NR-18 item 18.15
- NBR 6494 (andaime)

---

## 6. PRIORIZAÇÃO (PRÓXIMOS 30 DIAS)

### Sprint 1 (próximos 7 dias)
1. ✅ Renomear sistema (de "HYDROSTEC" para nome mais amplo — sugestões abaixo)
2. ✅ Criar tabela `disciplines` com 12 disciplinas catalogadas
3. ✅ Criar tabela `org_discipline_subscriptions` (controle de assinatura)
4. ✅ Criar tabelas-core: `equipments`, `equipment_inspections`, `equipment_thickness_readings`
5. ✅ Criar sidebar adaptativa que mostra módulos por disciplina ativa

### Sprint 2 (dias 8–14)
1. UI da aba "Equipamentos Estáticos" (cadastro, inspeção, espessuras)
2. Estender ISOMÉTRICO IA para também ler **plant flowsheet** e **plot plans** (extrai equipamentos)
3. Tabela `rotating_equipments` + UI básica
4. Tabela `work_orders` + tela de SS → OS

### Sprint 3 (dias 15–21)
1. Módulo Manutenção (backlog + plano)
2. Calculadora MTBF/MTTR
3. Dashboard de manutenção
4. Integração com sistema de tubulação (vincular spool ⇄ equipamento)

### Sprint 4 (dias 22–30)
1. Módulo Comissionamento estendido (punch list, checklist)
2. Mobile-friendly (PWA pra campo)
3. Auditoria/QA: testar com PDFs de cada tipo (vasos, bombas, estruturas)
4. Documentação onboarding cliente

---

## 7. NOMES SUGERIDOS PARA O SISTEMA

Tirar "HYDROSTEC" porque está colado em tubulação. Opções:

| Nome | Pros | Contras |
|---|---|---|
| **MECPLAN** | Direto, fácil, .com.br disponível | Soa generico |
| **OBRAFLOW** | Universal (todas obras), bonito | Pode confundir com BIM |
| **ENGSYNC** | Sincronização de engenharia | Genérico |
| **ASSETIK** ou **ASSETIQ** | Foco em ativos, premium | Estranho em PT |
| **MULTIDISCIP** | Honesto sobre o que é | Comprido |
| **ENGINOVA** | Engenharia + inovação | Já existe (verificar) |
| **PETROFLOW** | Forte no setor petro | Limita |
| **FIELDORA** | Campo + ORA (manutenção) | Genérico |
| **OBRAVIA** | Obra + via (caminho) | Bonito mas próprio? |
| **CONSTRUIA** | Cosntrutivo + IA | OK |

**Minha recomendação:** **MECPLAN** ou **OBRAFLOW** — pra deixar claro que é gestão de obra/manutenção e abranger todas as disciplinas. Outra opção: usar um nome neutro tipo **CASTRA** ou **TORQUEHUB**.

---

## 8. ESTIMATIVA DE ESFORÇO TÉCNICO

| Sprint | Esforço (h) | Entrega |
|---|---|---|
| Sprint 1 (core multi-disciplina) | 40 h | Banco + sidebar adaptativa |
| Sprint 2 (equipamentos) | 60 h | Módulo equipamentos estático + rotativo |
| Sprint 3 (manutenção) | 50 h | Módulo manutenção + KPIs |
| Sprint 4 (comissionamento expandido) | 40 h | Punch list + handover |
| **TOTAL FASE 1** | **190 h** | **Mecânica completa** |

Fase 2 (pintura/civil/andaime): ~250 h.
Fase 3 (multi-disciplina integrado + comercial): ~150 h.

**Total para SaaS comercial completo:** ~600 horas (~ 4 meses 1 dev sênior full-time, ou 2 meses 2 devs).

---

## 9. STACK SUGERIDA (já está sendo usada)

- **Frontend:** HTML/CSS/JS vanilla (rápido, simples) → migrar pra React/Next.js em V2
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **IA:** Gemini 2.5 Flash (white-label como "ISOMÉTRICO IA", "EQUIPAMENTO IA", etc.)
- **Mobile:** PWA primeiro, depois React Native quando justificar
- **Pagamento:** Stripe + Pagar.me (BR)
- **Email:** SendGrid ou Resend
- **Analytics:** PostHog (open-source) ou Mixpanel

---

## 10. PRÓXIMO PASSO IMEDIATO

Aplicar o **Sprint 1** agora:
1. Criar tabelas `disciplines` e `org_discipline_subscriptions`
2. Criar tabelas-core de equipamentos
3. Criar UI adaptativa da sidebar
4. Renomear o sistema (você decide o nome final)
5. Testar com isométrico real para garantir que nada quebrou
