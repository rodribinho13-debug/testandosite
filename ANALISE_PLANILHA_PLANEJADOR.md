# 📋 Análise da Planilha do Planejador Multi-Disciplinar
**Documento de Rodrigo Brandão.xlsx — 16 abas analisadas**

## 🏆 Pontos-chave identificados

A planilha é o **estado-da-arte do que um planejador faz hoje em obra industrial**. Combina dados de **6 disciplinas** com controle granular de cada etapa. Vou propor adicionar ao sistema tudo que ainda falta.

---

## 📊 Estrutura analisada

| Aba | Linhas | Colunas | Conteúdo |
|---|---|---|---|
| CAPA | 50 | 10 | Identificação do projeto |
| Sala de Controle rev. 01 | 15 | 26 | Desconexão / Interligação |
| Sala de Controle | 1.126 | 13 | Painéis e barreiras |
| **CONTROLE DE CABOS** | **934** | 22 | Cabos LM/LC, lançamento, rotina/parada |
| CONTROLE DE INFRAESTRUTURA | 144 | 19 | Eletroduto + suportes |
| CONTROLE DE INSTRUMENTO & EQUIP | 309 | 38 | Instrumentos |
| CONTROLE E.M | 10 | 6 | Estruturas Metálicas (peso, fab/mont) |
| **CONTROLE DE SUPORTES TU** | **1.131** | 29 | Suportes tubulação (fab/jato/mont/peso) |
| Comp. MJ | 734 | 3 | Áreas/locais |
| RESUMO ISOMETRICOS | 128 | 8 | Ref/Desmont./Mont. |
| MATERIAIS | 4 | 14 | Lista materiais |
| HYCONTROL | 180 | 81 | Custo R$, HH, avanço semana |
| **Mapa de Juntas** | **1.475** | **106** | END completo por junta |
| TUBULAÇÃO | 113 | 13 | Coeficientes Hh/m |
| VÁLVULAS, FLANGES E PESTANAS | 623 | 12 | Coeficientes Hh/und |
| VALIDAÇÃO | 83 | 33 | Listas suspensas |

---

## 🔥 Top achados — o que ELA tem e o sistema PRECISA

### 1. 🔧 **Mapa de Juntas com 106 colunas** (Profissional pesado!)
Cada junta tem ciclo END completo:
- VA (visual antes), VS Raiz, VS Final
- LP/PM Bisel, LP/PM Raiz, LP/PM Final, LP/PM TT
- RX/US (radiografia / ultrassom)
- ES (estanqueidade), TT (tratamento térmico), DU (dureza), Acetona
- PMI (Positive Material Identification)
- Para CADA: Data, Relatório, Inspetor responsável
- Sinete soldador raiz + ench/acab (rastreabilidade)
- Reparo: filmes RX + comp. retro
- TH: SOP, SubSOP, Semana, STH, Rel TH, Data TH
- Códigos material 1 e 2 (rastreabilidade certificado)

**Sistema hoje:** tabela `joints` com poucos campos.
**Proposta:** estender para 100+ colunas (migration 41).

### 2. 🏗️ **Controle de Suportes TU** (1.131 suportes!)
Etapas reais de obra:
- **Fabricação** (data + responsável)
- **Envio para jato** (preparação para pintura)
- **Recebido do jato** (pronto pra pintar)
- **Montagem** (instalação no campo)
- **Peso total** + **Peso HILT** (fixação Hilti)
- **% Avanço** automático
- Estrutura metálica vinculada

**Sistema hoje:** tabela `supports` simples.
**Proposta:** estender com 5 etapas e peso (migration 41).

### 3. ⚡ **Controle de Cabos** (934 cabos)
Disciplinas: Elétrica + Instrumentação. Status de avanço:
- **Projetado** (de projeto)
- **LM** (Lançamento de Cabo)
- **LC** (Ligação de Cabo / Conectorização)
- **Rotina** vs **Parada** (manutenção)
- Subtotal lançado por disciplina

**Sistema hoje:** tabela `electrical_cables` com cadastro.
**Proposta:** adicionar etapas de lançamento + conectorização.

### 4. 🛠️ **Tabela de Coeficientes Hh** (a mais valiosa!)
**Aba TUBULAÇÃO:**
- 100+ combinações de Material (AC, AC GALV, INOX) × SCH × Diâmetro
- Exemplo: AC 10" SCH 40 = 6,5 Hh/m · AC 10" SCH 80 = 6,45 Hh/m
- INOX 1/2" 40S = 1,45 Hh/m

**Aba VÁLVULAS, FLANGES E PESTANAS:**
- Coeficientes Hh/und por código de válvula/flange
- Inclui número e diâmetro de furos das flanges

**Sistema hoje:** tabela `productivity_params` genérica.
**Proposta:** popular com TODOS os coeficientes da planilha (importação direta).

### 5. 💰 **HYCONTROL** — Custo R$ + HH planejado
- Duração total fabricação (dias)
- **Custo total fabricação (R$ 124.748,69)** — calculado!
- **Custo total montagem (R$ 258.973,35)**
- Recurso fabricação: 10 HH
- Recurso montagem: 10 HH
- Avanço físico por semana (S-37, S-38...)
- 81 colunas de detalhe semanal

**Sistema hoje:** sem cálculo de custo automático.
**Proposta:** criar `budget_summary` com R$ automático via coeficientes.

### 6. 🔌 **Sala de Controle — Desconexão/Interligação**
Quando para uma máquina ou troca um painel:
- Quantas conexões precisam ser desconectadas
- Quantas barreiras (intrínsecas)
- Quantos painéis envolvidos
- Total de interligações pós-trabalho

**Sistema hoje:** não existe.
**Proposta:** módulo "Comissionamento Elétrico" novo.

### 7. 🧱 **Estruturas Metálicas** (Aba CONTROLE E.M)
- ID, Tipo, Localização, **Peso (kg)**, Fabricado, Montado

**Sistema hoje:** disciplina `estrutura` cadastrada mas sem UI.
**Proposta:** criar `structural_elements` com peso e etapas (migration 41).

### 8. 🛤️ **CONTROLE DE INFRAESTRUTURA** (eletroduto)
- Total projetado vs % realizado
- Eletroduto: projetado/fabricado/montado/%
- Disciplinas: Instrumentação, Elétrica, Automação
- Suportes: projetado/fabricado/montado/% fabricado/% montado

**Sistema hoje:** não existe.
**Proposta:** tabela `eletroduct_runs` (migration 41).

### 9. 📁 **RESUMO ISOMETRICOS** com categoria
- ISOs de **referência** (consulta)
- ISOs de **desmontagem/cancelamento** (parada para reparo)
- ISOs de **montagem** (nova instalação)

**Sistema hoje:** todos os isos viram "folha".
**Proposta:** adicionar campo `iso_category` em `isometric_sheets`.

### 10. 📦 **MATERIAIS** com workflow de compra
- Rev. | Iso | Cod | Material | Descrição | Diâmetro | QTD
- **Status** (planejado/comprado/aplicado)
- **Prioridade** (alta/média/baixa)
- **Solicitado** (data)
- **Retirada** (data efetiva)
- OBS + Controle

**Sistema hoje:** temos `materials_catalog` + `project_materials` (qty_planned/purchased/used) — já cobre 80%.
**Proposta:** adicionar prioridade e datas (migration 41).

---

## 🎯 Mapa de Migração — o que vou implementar

### Tabelas novas
- `support_progress` — etapas (fab/jato/mont) + peso
- `cable_progress` — LM (lançamento) e LC (conectorização)
- `eletroduct_runs` — eletrodutos com %
- `structural_elements_extended` — fab/mont/peso
- `panel_disconnect_records` — desconexão/interligação sala de controle

### Colunas adicionais em tabelas existentes
- **joints** → 70+ colunas novas: VA, VS Raiz, LP/PM, RX/US, ES, TT, DU, PMI, sinete, ciclo, SOP, semana TH
- **supports** → peso_total, peso_hilt, etapa_fab, etapa_jato, etapa_mont
- **isometric_sheets** → iso_category (referencia/desmontagem/montagem)
- **electrical_cables** → status_lm, status_lc, tipo_servico (rotina/parada)
- **project_materials** → priority, requested_date, picked_date

### Catálogos importados da planilha
- **`hh_coefficients_tubulacao`** — 100+ Hh/m por material × SCH × diâmetro
- **`hh_coefficients_valvulas`** — Hh/und por código de válvula/flange

### Funções automáticas novas
- **Cálculo automático de custo** (R$) = Hh × R$/hora + materiais
- **Curva S** de cabos lançados (semanal)
- **% avanço suportes** automático baseado nas etapas
- **Lookahead 21 dias** integrado com Mapa de Juntas

---

## 💡 Recursos a adicionar na UI

| Aba | Conteúdo |
|---|---|
| 🔧 **Mapa de Juntas (expandido)** | 106 colunas, filtros por status END |
| 🏗️ **Suportes & EM** | Peso total, etapas, % avanço |
| ⚡ **Controle de Cabos** | LM/LC, rotina vs parada |
| 🛤️ **Infraestrutura** | Eletrodutos + suportes |
| 🔌 **Sala de Controle** | Desconexão/Interligação |
| ⏱️ **Coeficientes HH** | Tabela completa (popular do planilha) |
| 💰 **HYCONTROL** | Custo R$ e HH planejado vs real |
| 📁 **Resumo Iso** | Ref/Desmont/Mont com totais |

---

## 🚀 Próximos passos imediatos

1. ✅ Migration 41 — colunas novas em `joints`, `supports`, `isometric_sheets`, `electrical_cables`, `project_materials`
2. ✅ Migration 42 — Tabelas `support_progress`, `cable_progress`, `eletroduct_runs`, `panel_disconnect_records`
3. ✅ Migration 43 — Importar coeficientes Hh/m e Hh/und da aba TUBULAÇÃO e VÁLVULAS pra `productivity_params`
4. UI das novas abas (próxima rodada — ~2.000 linhas no v9)
