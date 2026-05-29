# Relatório de Teste por Fases — PROJECT.IA

**Data:** 2026-05-29 · **Produção:** SW v9.3.16

> Método: como a automação de navegador não atinge `document_idle` depois do login
> (a conexão viva do app impede `read_page`/`find`/`screenshot` e o upload de arquivo),
> os bugs foram caçados por **auditoria estática de código** (`tools/_audit_ids.cjs`) +
> verificação no **Supabase (SQL)**. Os fluxos de clicar/enviar arquivo na tela precisam
> de teste manual do usuário (checklist no fim).

---

## FASE 1 — PLANEJAMENTO

### Bugs corrigidos (commitados)

| Bug | Módulo | Causa | Fix | Commit |
|---|---|---|---|---|
| `TypeError: Cannot set properties of null (onclick)` | **Orçamento** (`orcamento.js`) | `getElementById('orc-export-csv').onclick` — não há botão CSV (só Excel/PDF/IA Import) → null.onclick quebrava o `renderShell` e o bind do IA Import | guard `if(el)` nos 4 binds | `ba5452f` |
| Mesma classe (onclick null) | **Budget** (`budget.js`) | `getElementById('pia-bud-csv').onclick` — botão CSV não renderizado → quebrava bind + `loadAndRender()` | guard `if(el)` nos 7 binds da toolbar | `ab03926` |
| onclick/textContent null | **iso-save** (`hydrostec_v9.html`) | `getElementById('tb-i').textContent` sem guarda após salvar Iso (a linha irmã já guardava) | guard `if(el)` | `ab03926` |
| Lista de RDO 400 | **RDO (view v9)** | embed `daily_reports.select('*, projects(code)')` sem FK no banco | FK `daily_reports→projects` (migration 016) | `f244c3c` |

### Auditoria estática de ids (onclick null landmines)

`tools/_audit_ids.cjs` cruza ids referenciados em `getElementById` × ids renderizados.
- **Reais (corrigidos):** `orc-export-csv`, `pia-bud-csv`, `tb-i`.
- **Falsos positivos (ids dinâmicos, seguros):** `bdi-*` (`id="bdi-"+k`), `r-morning/afternoon/night` (`id="r-${per}"`), `se-*` (via `fld()`), `hw-ef-*` (`id="hw-ef-${k}"`), `td-code` (com `if(i)`/`val()` guard), `content` (custom_views, com `if(!content) return`).

### Itens da Fase 1 — pendente de teste manual de UI
PCP, Compras (RFQ/PO/AR), Composições, RDO Diário, HUB Planejador, Gantt (P6/MS Project):
render + manual + IA + import/export ainda precisam do clique na tela (ver checklist).

---

## Limitação de automação (recorrente)
O ambiente de navegador conectado não consegue automatizar, **após o login**:
`read_page`/`find`/`screenshot` (timeout em `document_idle`) e **upload de arquivo**.
Por isso os fluxos de **IA por upload** e **Importar Excel por clique** dependem de
teste manual. Tudo que é verificável por código/SQL foi feito e corrigido.

## Checklist manual rápido (Fase 1) — após Ctrl+Shift+R
1. **Orçamento:** abrir → **não deve ter erro no console** (era o onclick null) → testar abas BOM/Insumos/BDI/Cronograma/Curva ABC/Comparativo, IA Import, Excel, PDF, conferir Subtotal/BDI/Total.
2. **PCP:** criar plano/semana, alocar, salvar.
3. **Gantt:** importar/exportar P6 e MS Project.
4. **RDO Diário:** lista deve carregar (400 corrigido) + IA Foto → Gravar.

---

## Auditoria de BOTÕES MORTOS (onclick → função inexistente) — app inteiro

`tools/_audit_onclick.cjs` cruzou `onclick="FN()"` × funções definidas. Achou **10 botões mortos** (davam `ReferenceError`). Confirmado em runtime (`typeof === "undefined"`). **Todos resolvidos:**

| Botão morto | View | Decisão / Fix | Commit |
|---|---|---|---|
| `openEquipAIModal` | NR-13 "Cadastrar via IA" | wrapper lazy → `PIAIAEquipment.openImport` (módulo já existia) | `3939226` |
| `toggleNotifPanel`, `markAllNotifRead` | sino de notificações | **removido** (recurso não implementado) | `8946f67` |
| `oCivilPour`, `oCivilElem`, `oCivilSinapi` | Civil: Concretagens/Estruturas/Insumos | **modal implementado** (`manual-forms.js`) | `c5091d0`/`209c649` |
| `oElecPanel`, `oElecSpda`, `oElecSpec` | Elétrica: Quadros/SPDA/Specs | **modal implementado** | `c5091d0`/`209c649` |
| `oHydraulic` | Sistemas Hidráulicos | **modal implementado** | `c5091d0`/`209c649` |

Após os fixes, `_audit_onclick.cjs` retorna **`{}`** (zero botões mortos).

Os 7 modais foram **validados por SQL** (insert OK nas 7 tabelas com o payload do modal + cleanup). Descobertas de schema tratadas: `civil_insumos_catalog` e `cable_specs_catalog` são **catálogos globais** (sem `org_id`) → flag `orgScoped:false`.

---

## FASE 2 — ENGENHARIA (auditoria estática + runtime)

| Verificação | Ferramenta | Resultado |
|---|---|---|
| Toda função de render (`renderers` do goV) existe | grep cruzado | ✅ 28/28 definidas — nenhuma view abre em branco |
| Botões mortos nas abas de Engenharia | `_audit_onclick.cjs` | ✅ resolvidos (Civil/Elétrica/Hidráulica `+Novo` + NR-13 IA) |
| Import/Export consistente | `_audit_import.cjs` | ✅ toda view com botão tem FIELD_SCHEMA + VIEW_TABLE_MAP (0 quebrados) |
| IA por disciplina | grep × DOC_TYPES | ✅ civil/eletrica/hidraulica/pintura/tubulacao todas em DOC_TYPES |
| Null-deref de ids | `_audit_ids.cjs` | ✅ só dinâmicos (seguros) |

**Conclusão Fase 2:** sem novos bugs de código nas abas de Engenharia (os principais — botões mortos de Civil/Elétrica/Hidráulica — foram corrigidos). A "inconsistência" de Importar/Exportar relatada era provavelmente o **XLSX não carregado a tempo**, já resolvido pelo carregamento sob demanda (cada export/import garante a lib antes de usar).

**Pendente de teste manual (precisa do clique/upload):** import real de `import_<view>.xlsx` por aba, IA por disciplina com os PDFs, e o teste visual dos 7 modais novos.

---

## FASE 3 — QUALIDADE (auditoria insert × schema real — classe do bug RDO)

Comparei o payload de cada função de cadastro manual com as colunas reais da tabela:

| Função | Tabela | Resultado |
|---|---|---|
| `oPend` | pendings | ✅ colunas batem |
| `oSold` | welders | ✅ batem |
| `oCom` | test_systems | ✅ batem |
| `oNdt` | ndt_inspections | ✅ batem |
| `oCal` | instruments + instrument_calibrations | ✅ batem |
| `oJoint` (Mapa de Juntas) | joints | 🔴 **QUEBRADO → corrigido** |

**Bug do `oJoint` (Mapa de Juntas "+ Novo")** — dois problemas:
1. Inseria `iso_number`/`revision`/`material` que **não existiam** em `joints` (o app usa essas colunas em ~16 pontos: tabela, filtro, export, dropdown) → `column does not exist`. **Fix:** migration `017` adiciona as 3 colunas (text). Corrige também o **import** desses campos.
2. `joints.line_id` é **NOT NULL** e o `oJoint` não fornecia → `oJoint` agora **cria/reusa uma linha** (a partir do iso_number) antes de inserir, como o caminho da IA faz.

Testado end-to-end por SQL (linha + junta) + cleanup. Commit `6f8f262`. SW v9.3.21.

---

## FASE 4 — SUPRIMENTOS (auditoria insert × schema real)

| Função / módulo | Tabela | Resultado |
|---|---|---|
| `suppliers.js` (cadastro fornecedor) | suppliers | ✅ batem |
| `materials-catalog.js` | materials_catalog | ✅ batem |
| `quotations.js` (RFQ/itens/respostas/aprovações) | quotation_requests, quotation_items, quotation_responses, purchase_approvals, supplier_certifications | ✅ batem |
| **`ai-quotation.js`** (IA de cotação) | quotation_items | 🔴 **QUEBRADO → corrigido** |
| **`ai-supplier.js`** (parecer IA) | supplier_advisories | 🔴 **QUEBRADO → corrigido** |

**Bug `ai-quotation`:** inseria em `quotation_items` com colunas inexistentes (`org_id, quotation_id, unit_price, total_price, lead_time_days, observation, meta`) — a tabela só tem `rfq_id/description/unit/quantity/budget_unit_price/notes`. **Fix:** mapeamento correto (`quotation_id→rfq_id`, `unit_price→budget_unit_price`, total/prazo/obs → `notes`) + erro real reportado. Commit `9f0717b`.

**Bug `ai-supplier`:** inseria em `supplier_advisories` que **não existia**, com erro engolido (`.catch`) + alerta falso "Parecer salvo". **Fix:** migration `018` cria a tabela (RLS org-scoped igual às irmãs) + mensagem honesta (só confirma se gravou). Commit `9f0717b`. SW v9.3.22.

*Atualizado em 2026-05-29 (SW v9.3.22).*
