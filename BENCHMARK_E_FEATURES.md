# 📊 BENCHMARK CONSOLIDADO + FEATURES A ADOTAR
**Análise estratégica das 16+ plataformas concorrentes**
_Adaptação das melhores ideias para nossa SaaS_

---

## 🔍 PARTE 1 — ANÁLISE DE CADA CONCORRENTE

### 🏢 1.1 AVEVA (líder mundial em O&G/petroquímica)
**O que tem de bom:**
- **AVEVA E3D Design** — modelagem 3D inteligente de planta
- **AVEVA Asset Performance** — manutenção preditiva integrada
- **AVEVA PI System** — historian de dados de processo (vibração, temperatura, pressão em tempo real)
- **Integração nativa** ERP-CAD-CMMS

**O que vou adotar:**
- ✅ Coleta de dados de processo (mesmo que manual no início) → tabela `process_data_readings`
- ✅ Asset performance dashboard com KPIs operacionais
- ✅ Vinculação **equipamento ⇄ isométrico ⇄ junta ⇄ histórico**

**O que NÃO copiar:**
- ❌ Complexidade enterprise → manter UX simples
- ❌ Preço inalcançável → seu diferencial é preço

---

### 🏢 1.2 Bentley OpenPlant
**O que tem de bom:**
- **OpenPlant Isometrics Manager** — gera isos automáticos a partir de 3D
- **AutoPIPE** — análise de tensões avançada
- **AssetWise** — gestão de ciclo de vida

**O que vou adotar:**
- ✅ **Importação reversa**: cliente sobe 3D (DWG/STEP) → IA detecta tubulação → cria isos automaticamente *(futuro)*
- ✅ Calculadora de **flexibilidade térmica** simplificada (B31.3)

---

### 🏢 1.3 Hexagon (ex-Intergraph)
**O que tem de bom:**
- **SmartPlant** (review + spool management)
- **j5 Operations** (logbook digital)
- **Smart 3D** (modelagem)

**O que vou adotar:**
- ✅ **Logbook digital de turno** (passagem de turno operacional) — virou tabela `shift_handovers`
- ✅ **Spool tracking** (você já tem `spools`, vai expandir com QR code)

---

### 🏢 1.4 IBM Maximo
**O que tem de bom:**
- EAM completo (equipamentos, OS, inventory, contratos)
- **Maximo MAS APM** — manutenção preditiva via IA
- **Workflow engine** customizável

**O que vou adotar:**
- ✅ Engine de workflow simples (aprovações de OS, NCs, RDOs) → tabela `workflow_instances`
- ✅ Hierarquia de equipamentos (planta → área → sistema → equipamento → sub-componente)
- ✅ Integração com manutenção preditiva via IA (ISOMÉTRICO IA + EQUIPAMENTO IA)

---

### 🏢 1.5 SAP EAM (S/4HANA)
**O que tem de bom:**
- Integração com ERP financeiro
- **Notification → Order → Confirmation** (fluxo SAP padrão)

**O que vou adotar:**
- ✅ Estrutura **SS → OS → Apontamento → Fechamento** (já fizemos com `service_requests` → `maint_work_orders`)
- ✅ **Centro de custo** por OS (futuro — `cost_centers`)

---

### 🏢 1.6 Tractian 🇧🇷 (líder Brasil — top-3 mundo Gartner)
**O que tem de bom (e que VOCÊ DEVE COPIAR):**
- ✅ **Verticalização**: CMMS + Sensores IoT + OEE em um só lugar
- ✅ **App mobile** offline-first
- ✅ **Onboarding simples** (cadastro em minutos)
- ✅ **Dashboards lindos** com KPIs operacionais
- ✅ **Análise espectral de vibração** com IA (anomaly detection)

**O que vou adotar agora:**
- ✅ **PWA mobile** com sync offline (próximo sprint)
- ✅ **Dashboards bonitos** por persona (engenheiro, planejador, executivo)
- ✅ **Onboarding de 5 minutos** com wizard

**Diferencial nosso vs Tractian:**
- Eles **NÃO TÊM** o lado de EPC/instalação (isométrico, fabricação, comissionamento). Você tem.
- Eles **NÃO TÊM** NR-13 estruturada. Você tem.

---

### 🏢 1.7 Engeman 🇧🇷
**O que tem de bom:**
- Tradicional, robusto
- Customização forte

**O que NÃO copiar:**
- ❌ Interface dos anos 2010
- ❌ On-premise pesado
- ❌ Licença permanente cara

---

### 🏢 1.8 SGMAN 🇧🇷 (4.8★ Capterra)
**O que tem de bom:**
- Preço justo (~R$ 119–399/mês)
- Boa relação custo/benefício

**O que vou adotar:**
- ✅ Mesma faixa de preço como teto pra PMEs
- ✅ Foco em **PME industrial** (você já está aqui)

---

### 🏢 1.9 Fracttal 🇨🇱 (LATAM)
**O que tem de bom:**
- Multi-idioma (PT/ES/EN)
- Mobile bom
- API aberta

**O que vou adotar:**
- ✅ **API REST pública** com OAuth — futura monetização (R$ 200/mês ilimitado)
- ✅ Internacionalização (PT-BR primeiro, depois ES-LATAM)

---

### 🏢 1.10 Fiix / MaintainX / UpKeep / Limble (USA)
**O que têm de bom:**
- **Mobile-first** verdadeiro
- **Onboarding instantâneo**
- Integração com WhatsApp/Teams

**O que vou adotar:**
- ✅ **PWA mobile** (já mencionei)
- ✅ **Webhook → Slack/Teams/WhatsApp** quando OS é criada, alerta de prazo, etc.
- ✅ **Integração WhatsApp Business** (notificar soldador qualificado de OS atribuída)

---

### 🏢 1.11 Software NR13 IEI 7.0 🇧🇷 (Learn Softwares)
**O que tem de bom:**
- Cálculos ASME VIII Div.1 (PMTA, espessura mínima)
- API-510 (vida residual)
- Memorial de cálculo profissional
- Conformidade ABNT NBR 15417

**O que vou adotar:**
- ✅ **Calculadora ASME VIII Div.1 completa** na Caixa de Ferramentas
- ✅ **Cálculo de PMTA** (Pressão Máxima de Trabalho Admissível)
- ✅ **Vida residual API-510** baseada em corrosão histórica (já tem `equipment_thickness_readings`)
- ✅ **Memorial de cálculo PDF** automático
- ✅ **Relatório NBR 15417** automático

**Vantagem nossa:**
- Eles são **DESKTOP**. Você é **CLOUD**.
- Eles cobram R$ 1.500–3.000/ano por 1 inspetor. Você pode cobrar R$ 79–149/mês com 5 inspetores.

---

### 🏢 1.12 Produttivo 🇧🇷 (SaaS de inspeção)
**O que tem de bom:**
- **Checklists customizáveis** drag-and-drop
- **Mobile** com foto + assinatura digital
- **Relatórios automáticos PDF** com logo do cliente

**O que vou adotar:**
- ✅ **Form builder** drag-and-drop pra inspeções customizadas
- ✅ **Foto + GPS + assinatura digital** em campo
- ✅ **PDF white-label** (logo do cliente nos relatórios)

---

### 🏢 1.13 Sienge 🇧🇷 (líder ERP construção)
**O que tem de bom:**
- Tudo integrado (financeiro, RH, planejamento, materiais)
- Domina mercado construtor

**O que vou adotar:**
- ✅ **Diário de obra (RDO) robusto** (já existe, expandir com mobile + foto)
- ✅ **Curva ABC de materiais** (já temos materiais, fazer ranking de criticidade)
- ✅ **Boletim de medição (BM)** automático

**O que NÃO copiar:**
- ❌ ERP completo — fugir disso, focar em engenharia

---

### 🏢 1.14 Mobuss Construção 🇧🇷
**O que tem de bom:**
- **RDO mobile** com foto/GPS
- Boletim de medição
- Acompanhamento físico-financeiro

**O que vou adotar:**
- ✅ **RDO mobile** com captura de foto (PWA)

---

### 🏢 1.15 Procore / PlanGrid / Autodesk Construction Cloud
**O que têm de bom:**
- **Marcação em planta** (PDF com pins clicáveis)
- **Drawing comparison** (compara revisões)
- **Issue tracking** vinculado a localização

**O que vou adotar:**
- ✅ **Pins clicáveis em isométrico PDF** (pendência → ponto no desenho)
- ✅ **Comparação visual de revisões** (futuro)

---

### 🏢 1.16 BMW Mobile / SafetyDocs / Pluria 🇧🇷
**O que têm de bom:**
- **APR digital** com canvas pra desenhar
- **Permissão de Trabalho** via QR code
- **Treinamentos** NR-10/12/35 integrados

**O que vou adotar:**
- ✅ **PT digital com QR code** (já temos `work_permits`, falta UI mobile)
- ✅ **APR** estruturada por etapa (já mencionado no roadmap)

---

## 🎯 PARTE 2 — TOP 25 FEATURES PRIORIZADAS PARA ADOTAR

Cada feature vinha de UM concorrente; agora todas vão estar em UM produto.

### 🟢 Já implementadas (✅)
1. ✅ Isométricos com IA (white-labeled como "ISOMÉTRICO IA")
2. ✅ Materiais com filtros + export Excel
3. ✅ Estrutura multi-disciplina
4. ✅ Equipamentos estáticos/rotativos (banco)
5. ✅ NR-13 base
6. ✅ Caixa de Ferramentas (17 calculadoras)
7. ✅ Power BI feed básico
8. ✅ Primavera P6 export XML
9. ✅ MS Project export XLSX

### 🟡 PRIORIDADE 1 — Próximas 30 dias
10. 🟡 **Templates Power BI por disciplina** (.pbit prontos) — _diferencial competitivo gigante_
11. 🟡 **Primavera P6 sync bi-direcional** (importa atualizações do P6)
12. 🟡 **Dashboard nativo por persona** (engenheiro / planejador / inspetor / executivo)
13. 🟡 **PWA mobile offline-first** (RDO, inspeção, OS, PT em campo)
14. 🟡 **Calculadora ASME VIII Div.1** completa (PMTA + vida residual API-510)
15. 🟡 **Plano Pessoa Física** (Estudante R$ 19 / Solo R$ 49 / Solo IA R$ 89)
16. 🟡 **Permissões granulares por módulo** (admin escolhe quem vê o quê)
17. 🟡 **Workflow de aprovação** (OS, NC, RDO)

### 🟠 PRIORIDADE 2 — Próximos 60 dias
18. 🟠 **EQUIPAMENTO IA** (IA lê plot plan/P&ID e cadastra vasos/bombas automaticamente)
19. 🟠 **Form builder** drag-and-drop pra checklist customizado
20. 🟠 **Webhook + WhatsApp Business** (notifica soldador, encarregado)
21. 🟠 **Análise espectral de vibração** com IA preditiva
22. 🟠 **Curva ABC + RBI** (Risk-Based Inspection) — priorização de inspeção
23. 🟠 **MTBF/MTTR/OEE** automáticos por equipamento/área
24. 🟠 **Pin em PDF**: pendência clicável no desenho

### 🔵 PRIORIDADE 3 — 90+ dias
25. 🔵 **3D viewer leve** (IFC/STEP/GLB)
26. 🔵 **Importação 3D → isos automáticos**
27. 🔵 **API REST pública** + OAuth + Webhook
28. 🔵 **Logbook digital de turno**
29. 🔵 **Internacionalização** (ES-LATAM, EN)
30. 🔵 **Sensores IoT** (futuro — competir com Tractian)

---

## 📊 PARTE 3 — POWER BI INTEGRATION (DIFERENCIAL)

### 🎁 Templates .pbit prontos por disciplina

Vamos criar 8 dashboards Power BI prontos que o cliente baixa, conecta no nosso feed e tem analytics enterprise sem esforço:

| Template .pbit | Para quem | Visuais |
|---|---|---|
| **Planejamento Executivo** | Diretor / gerente projeto | Curva S, lookahead 21d, % avanço por área, custo planejado x realizado |
| **Tubulação Operacional** | Coordenador piping | Folhas por status, juntas RT/UT, T.H. pendentes, soldadores ranking |
| **Equipamentos / NR-13** | Inspetor sênior | Próximas inspeções, vida residual, equipamentos críticos, mapa UT |
| **Manutenção** | Planejador manutenção | Backlog, MTBF/MTTR, OEE, OS por equipamento/criticidade |
| **Qualidade** | QA / SGI | Taxa de aprovação END, retrabalho %, NCs em aberto, tempo médio resolução |
| **Materiais / Orçamento** | Comprador / suprimentos | Curva ABC, materiais críticos lead-time, % comprado, valor R$ |
| **Pintura** | Inspetor pintura | DFT distribuição, aderência média, ponto orvalho falhas, % aprovação |
| **SSMA** | SSMA / segurança | PTs ativas, acidentes, treinamentos vencendo, NRs aplicáveis |

**Como funciona:**
1. Cliente assina o plano com Power BI inclusivo
2. Vai em "Integrações → Power BI" → escolhe template → baixa .pbit
3. Abre no Power BI Desktop
4. Cola o link único (já temos `hyd_get_or_create_powerbi_token`)
5. **Atualização automática** sempre que abre o relatório
6. Pode publicar no Power BI Service (cobrança Microsoft separada)

**Tecnicamente:**
- Templates são arquivos binários .pbit que ficam no Storage Supabase
- Endpoint `/templates/{discipline}/{role}.pbit` retorna o arquivo
- Cliente conecta o token nosso → dados em tempo real

### 📥 Primavera P6 — Sync bi-direcional

**Hoje:** exportamos XML (OK).

**Vamos adicionar:**
- **Import P6 XML** → atualiza % concluído das folhas/spools
- **Reconciliação automática** (P6 é a fonte de verdade do prazo; nosso é da execução)
- **Calendário** P6 (jornadas, feriados, paradas) sincronizado
- **Linha de base (baseline)** P6 vs realizado nosso
- **Frequência:** semanal ou sob demanda

---

## 👤 PARTE 4 — PLANO PESSOA FÍSICA + PERMISSÕES GRANULARES

### 💼 Catálogo de planos final

| Plano | Tipo | Preço/mês | Usuários | Disciplinas | IA | Quem é o público |
|---|---|---|---|---|---|---|
| **Free** | PF | R$ 0 | 1 | Caixa Ferramentas | 0 análises | Curioso, divulgação |
| **Estudante** | PF (.edu) | R$ 19 | 1 | Ferramentas + simulados | 5 análises | Estudante engenharia |
| **Solo** | PF profissional | R$ 49 | 1 | 1 disciplina à escolha | 10 análises | Engenheiro autônomo |
| **Solo IA** | PF + IA | R$ 89 | 1 | 1 disciplina | 50 análises | Inspetor freelance |
| **Solo Plus** | PF multi | R$ 149 | 1 | Até 3 disciplinas | 100 análises | Consultor multi-disciplinar |
| --- | --- | --- | --- | --- | --- | --- |
| **Starter** | PJ pequena | R$ 99/user | até 5 | 1 disciplina | 50 análises | Empresa pequena |
| **Pro** | PJ média | R$ 79/user | até 25 | 1 disciplina | 200 análises | Construtora média |
| **Multi** | PJ obras | R$ 149/user | até 50 | 3 disciplinas | 500 análises | EPC pequeno/médio |
| **Enterprise** | PJ grandes | sob consulta | ilimitado | Todas | Ilimitada | Petrobras/Braskem |
| **Owner** | Operador industrial | R$ 35–69/user | ilimitado | Todas | Ilimitada | Owner com 100+ users |

### 🔐 Sistema de permissões granulares

**Estrutura:**
1. **`org_members.role`** — papel base (admin, gerente, engenheiro, inspetor, viewer)
2. **`org_members.is_billing_owner`** — flag: quem paga (titular da assinatura)
3. **`user_module_access`** — controle granular: quais módulos cada user vê
4. **`user_project_access`** — controle granular: quais projetos cada user vê

**Como o admin (titular) gerencia:**

Aba **"Equipe & Acessos"** (admin only) com tabela visual:

```
┌──────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Usuário          │ Tub. │ Eq.E │ Eq.R │ Man. │ Pint │ NR13 │
├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ joão (engenheiro)│  ✅  │  ✅  │  ❌  │  ❌  │  ❌  │  ✅  │
│ ana (inspetor)   │  ✅  │  ✅  │  ❌  │  ❌  │  ✅  │  ✅  │
│ carlos (gerente) │  ✅  │  ✅  │  ✅  │  ✅  │  ✅  │  ✅  │
│ pedro (viewer)   │  👁️  │  👁️  │  👁️  │  ❌  │  ❌  │  ❌  │
└──────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
            ✅=criar/editar  👁️=ver  ❌=sem acesso
```

**Granularidade ainda mais fina:**
- Por **disciplina** (acima)
- Por **projeto** (acesso só ao projeto X)
- Por **ação** (ver / criar / editar / excluir / aprovar / exportar)

**Regras automáticas:**
- `admin` (titular do pacote) → sempre tudo
- `gerente` → tudo da sua org, exceto billing
- `engenheiro` → padrão: tudo exceto exclusão e admin de equipe
- `inspetor` → padrão: módulos de inspeção (NR-13, END, pintura), VT, calibração
- `viewer` → padrão: só leitura em tudo
- `custom` → admin define manualmente

### 📥 Convite de usuários

Admin:
1. Vai em **"Equipe & Acessos"** → **"+ Convidar usuário"**
2. Email + role base (ou "Personalizado")
3. Marca caixinhas dos módulos
4. Envia → email com link de aceite (Supabase magic link)
5. Usuário entra → vê apenas o que foi liberado

---

## 🎯 PARTE 5 — RESUMO ESTRATÉGICO

### 5.1 Mensagem de venda final
> **"Plataforma de Engenharia Industrial 360°: do isométrico ao handover, da NR-13 à manutenção preditiva. IA brasileira, preço justo, modular. Pessoa física? Tem plano. Empresa grande? Tem plano enterprise."**

### 5.2 Pirâmide de preço (visualização)
```
              ┌──────────────────┐
              │   ENTERPRISE     │ R$ 35–69/usuário (Petrobras-like)
              │   ilimitado all  │
              └──────────────────┘
            ┌───────────────────────┐
            │   MULTI (R$ 149)      │ EPCs médios
            │   3 disciplinas       │
            └───────────────────────┘
          ┌─────────────────────────────┐
          │   PRO (R$ 79–99)            │ Construtoras
          │   1 disciplina, +25 users   │
          └─────────────────────────────┘
        ┌────────────────────────────────┐
        │   SOLO IA (R$ 89)              │ Inspetor freelance
        │   PF · 1 disc · 50 IA          │
        └────────────────────────────────┘
      ┌──────────────────────────────────────┐
      │   ESTUDANTE (R$ 19) / FREE (R$ 0)    │ Aquisição/Marketing
      └──────────────────────────────────────┘
```

### 5.3 Cronograma (próximos 90 dias)

| Sprint | Foco | Entregas |
|---|---|---|
| **Sprint 1 (sem 1–2)** | Plano PF + Permissões | Migration de planos + permissions + UI "Equipe & Acessos" |
| **Sprint 2 (sem 3–4)** | Power BI Templates | 8 templates .pbit + página de download |
| **Sprint 3 (sem 5–6)** | Primavera Sync | Import XML + reconciliação |
| **Sprint 4 (sem 7–8)** | Dashboards Persona | 4 dashboards nativos no v9 |
| **Sprint 5 (sem 9–10)** | PWA Mobile | Service worker + offline-first |
| **Sprint 6 (sem 11–12)** | ASME VIII + EQUIPAMENTO IA | Memorial cálculo + IA pra equipamentos |

### 5.4 KPIs para validar mercado

- **Conversão Free → Pago:** meta 8% em 14 dias
- **Churn mensal:** &lt; 5%
- **NPS:** &gt; 50
- **LTV/CAC:** &gt; 3
- **Tempo médio até primeira IA:** &lt; 10 minutos
- **MRR meta 12 meses:** R$ 150 mil/mês
- **Clientes pagantes meta 12 meses:** 80–120

---

## 📌 PRÓXIMA AÇÃO IMEDIATA

Vou aplicar AGORA:
1. ✅ Migration 35 — Catálogo de planos + permissões granulares
2. ✅ Funções helper de checagem de acesso
3. ✅ Estrutura de billing_owner e roles padrão

Depois (sob demanda):
- UI "Equipe & Acessos"
- Templates Power BI .pbit
- Sync Primavera bi-direcional
- PWA mobile
