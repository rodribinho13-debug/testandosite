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

*Atualizado em 2026-05-29.*
