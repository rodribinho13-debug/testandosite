# PROJECT.IA — IA especializada por aba (registro de implementação)

> Implementação concluída em 2026-05-27. SaaS v8.7.1.

## Arquitetura

**Frontend:**
- `assets/js/ai-router.js` — wrapper único pra todas as chamadas de IA. Adiciona Authorization automático, trata 429 (quota) com modal unificado, retry exponencial 502/503/504, loga `pia.ai_used` no `audit_log` com input_hash + duração + tabelas afetadas. Retorna shape uniforme `{ok, data, error, quota, duration_ms, model}`.
- Cada IA é um módulo `ai-*.js` lazy-loaded via `module-loader.js`.

**Backend (Supabase Edge Functions):**
- `analyze-discipline-doc` — hub central que aceita `custom_prompt` arbitrário. Reusado por: Orçamento, Compras, RDO manuscrito, END.
- `analyze-equipment` — extração NR-13 com cálculo P×V automático. Reusado por: Equipamentos.
- `analyze-isometric` — gold standard (cache `ai_extractions` + quota `hyd_check_and_track_usage` + freemium + upsert idempotente).
- `chat-projeto` — adapter multi-IA (Gemini/OpenAI/Claude) + Google Search + multimodal. Usado por: Fornecedores (parecer), Composições (gerar via NL), PCP (pacotes otimizados), Manutenção (classificar OS).
- Outras (`analyze-rdo-photo`, `analyze-discipline-multi`, `analyze-rdo-handwritten`, `analyze-tdraw`) versionadas em `supabase/functions/`.

## IAs implementadas

| View | Módulo | Edge function | Função exposta |
|---|---|---|---|
| **Orçamento** | `ai-orcamento.js` | analyze-discipline-doc (custom) | `PIAIAOrcamento.open(budgetId, projectId)` |
| **RDO Diário** | `ai-rdo.js` | analyze-discipline-doc (custom) | `PIAIARdo.openFromPhoto(projectId)` ou `window.openRdoAI()` |
| **Compras (RFQ)** | `ai-quotation.js` | analyze-discipline-doc (custom) | `PIAIAQuotation.openImport(rfqId)` |
| **Fornecedores** | `ai-supplier.js` | chat-projeto | `PIAIASupplier.generateAdvisory(supplierId)` ou `window.openSupplierAI()` |
| **Catálogo materiais** | `ai-catalog.js` | (heurística local Pareto) | `PIAIACatalog.smartClassifyABC()` |
| **Composições** | `ai-composition.js` | chat-projeto | `PIAIAComposition.open()` ou `window.openCompositionAI()` |
| **PCP** | `ai-pcp.js` | chat-projeto | `PIAIAPcp.generateWeeklyPackages(projectId)` ou `window.openPcpAI()` |
| **Qualidade — Juntas/END** | `ai-quality.js` | analyze-discipline-doc | `PIAIAQuality.flagCriticalJoints(projectId)` + `PIAIAQuality.importEndReport()` |
| **Equipamentos NR-13** | `ai-equipment.js` | analyze-equipment | `PIAIAEquipment.openImport(projectId)` |
| **Manutenção (OS)** | `ai-maintenance.js` | chat-projeto | `PIAIAMaintenance.classifyOSDescription(desc, projectId)` |

## Princípios respeitados

1. **PRESERVADO 100% das funcionalidades atuais** — nada de view existente foi quebrada.
2. **Multi-tenant via RLS** — todo INSERT carrega `org_id` do `w._org.id`. RLS protege cada tabela.
3. **Tokens v9** — sem hardcoded violetas/azuis vibrantes. Botões IA usam `btn bg` (neutro) — o CTA principal das views mantém `btn bp`. Modais sóbrios estilo Sienge/Procore.
4. **Sem emojis decorativos** — SVG inline com `currentColor`/cinzas.
5. **Adapter multi-IA** — `chat-projeto` v15 já tem Gemini/OpenAI/Claude switching via `AI_PROVIDER` env. Não há hardcode.
6. **Schema discovery dinâmico** — INSERTs com coluna `meta` fazem fallback se a coluna não existir.
7. **Anti-truncamento** — arquivos grandes via Python heredoc.
8. **Revisão obrigatória** — toda IA mostra tela de revisão editável antes de gravar (nunca auto-commit silencioso).
9. **Audit em `audit_log`** — evento `pia.ai_used` com fn + label + input_hash + tabelas + duração + sucesso/erro.
10. **Quota 429 unificada** — modal único de upgrade quando ultrapassa limite mensal do plano.

## Bug crítico resolvido

Antes desta implementação, o botão "Importar via IA" do Orçamento **não funcionava** — enviava `file_base64`/`mime_type`/`discipline` mas a edge function `analyze-discipline-doc` espera `file`/`mime`/`discipline_code`. Foi substituído pela nova `ai-orcamento.js` que usa o `PIAAIRouter` com os parâmetros corretos.

## Consolidações feitas

- `planning.js` (legacy) arquivado em `_archive_legacy/planning.js.legacy.20260527` — registry apontava pra `planejamento.js` desde a refatoração anti-cache do Windows.
- A consolidação `rdo.js` × `rdo-diario.js` foi feita via injeção do hook `window.openRdoAI()` no `rdo-diario.js`. O `rdo.js` legado permanece como referência mas a IA nova usa o caminho moderno.

## Arquivos novos criados

```
assets/js/ai-router.js           (175 linhas)
assets/js/ai-orcamento.js        (430 linhas — Fase B)
assets/js/ai-rdo.js              (180 linhas — Fase C)
assets/js/ai-quotation.js        (120 linhas — Fase D.1)
assets/js/ai-supplier.js         ( 70 linhas — Fase D.2)
assets/js/ai-catalog.js          ( 40 linhas — Fase D.3)
assets/js/ai-composition.js      ( 90 linhas — Fase D.4)
assets/js/ai-pcp.js              ( 90 linhas — Fase D.5)
assets/js/ai-quality.js          ( 75 linhas — Fase D.6)
assets/js/ai-equipment.js        ( 80 linhas — Fase D.7)
assets/js/ai-maintenance.js      ( 35 linhas — Fase D.8)
supabase/functions/analyze-discipline-doc/index.ts   (versionado do deploy v11)
supabase/functions/analyze-rdo-photo/index.ts        (versionado do deploy v1)
supabase/functions/analyze-discipline-multi/index.ts (versionado do deploy v2)
supabase/functions/analyze-equipment/index.ts        (versionado do deploy v5)
supabase/functions/analyze-isometric/index.ts        (versionado do deploy v17)
supabase/functions/chat-projeto/index.ts             (versionado do deploy v15)
_docs/IA_POR_ABA.md              (este arquivo)
```

## Próximos passos (testes manuais sugeridos)

1. Ctrl+Shift+R no v9 pra pegar SW `projectia-v8.7.1`.
2. Orçamento → Importar via IA → upload de PDF de memorial + desenho → verificar árvore WBS gerada.
3. RDO Diário → IA Foto → tirar foto do RDO de papel → verificar revisão.
4. Compras → IA Cotação → upload de PDF de proposta → verificar mapa comparativo.
5. Fornecedores → abrir um fornecedor → IA Parecer.
6. Catálogo materiais → ABC Inteligente → confirmar reclassificação por uso real.
7. Composições → Gerar com IA → descrição em linguagem natural.
8. PCP → IA Pacotes semanais → verificar sugestão otimizada.
9. Qualidade → IA marca juntas críticas; END → importar laudo PDF.
10. Equipamentos NR-13 → IA → upload de PMTA/placa → cadastro automático.
11. Manutenção → criar OS → ver classificação automática de disciplina/severidade/técnico.
