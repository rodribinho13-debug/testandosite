# Auditoria Funcional Total — PROJECT.IA

Gerado em 2026-05-27 via sub-agente Explore. Pente fino em ~30 arquivos JS+HTML.

## Resumo executivo

- **~30 inconsistências críticas** de cor/classe
- **~7 botões mortos/duplicados**
- **49 alertas nativos + 43 confirms** — destes, **~26 são destrutivos/críticos** que precisam virar modal v9

## 1. INCONSISTÊNCIAS CRÍTICAS

### "+ Novo" fora do padrão (canônico: `btn bp` azul `#1E40AF`)

| Arquivo | Linha | Cor atual | Correção |
|---|---|---|---|
| `electrical-base.js` | 155 | inline `#10B981` VERDE | `btn bp` |
| `hh-params.js` | 68 | inline `#10B981` VERDE | `btn bp` |
| `hh-params.js` | 69 | inline `#8B5CF6` ROXO ("Duplicar") | `btn bp` |
| `rdo.js` | 133 | inline `#10B981` VERDE | `btn bp` |
| `eng-modules.js` | 243 | inline `${mod.color}` DINÂMICA | `btn bp` (cor fixa) |
| `tdraw.js` | 222 | inline `#2563EB` azul mas sem classe | `btn bp` |
| `materials-catalog.js` | 144 | `btn bg` CINZA (empty state CTA) | `btn bp` |

### Exportar Excel — labels e cores divergentes (canônico: `btn bg` + "Exportar")

| Arquivo | Linha | Label/cor atual | Correção |
|---|---|---|---|
| `rdo.js` | 234 | "📥 Excel" verde `#10B981` | `btn bg` + "Exportar" + ícone download |
| `v9-app.js` | 2070 | "Excel" `bc` ciano | `btn bg` + "Exportar" |
| `v9-app.js` | 2712 | "Exportar Excel" `btn bp` azul | `btn bg` + "Exportar" |
| `hydrostec_v9.html` | 3531 | idem (DUPLICADO) | unificar |
| `hydrostec_planejador.html` | 1217 | "Exportar" `btn bp` azul | `btn bg` |
| `*planejador_civil/pintura/eletrica.html` | várias | "Exportar Excel" verboso | "Exportar" |
| `eng-modules.js` 242 / `tdraw.js` 220 | "📥 Excel" inline | `btn bg` + ícone |

### Importar Excel — cores erradas

| Arquivo | Linha | Cor atual | Correção |
|---|---|---|---|
| `v9-app.js` | 1433 | `bp` azul | `btn bg` cinza |
| `hydrostec_v9.html` | 2126, 3551 | `bp` azul | `btn bg` |
| `eng-modules.js` | 241 | inline cinza com border | `btn bg` |

### Botões IA fora do padrão (canônico: `btn bia` gradient cyan→violet)

| Arquivo | Linha | Label/cor atual | Correção |
|---|---|---|---|
| `v9-app.js` | 1802, 1841 | "Subir PDF" `bp` azul (banner IA Civil) | `btn bia` + sparkles |
| `v9-app.js` | 1903, 1936 | "Subir PDF/laudo" `bp` (IA Elétrica) | `btn bia` |
| `v9-app.js` | 2003 | "Subir projeto" `bp` (IA Hidráulica) | `btn bia` |
| **Labels divergentes IA**: "IA Cotação" / "IA Import" / "IA: importar lista" / "Cadastrar via IA" / "Subir PDF pra IA" | — | inconsistente | **PADRONIZAR: "IA — <ação>"** |

### CSV redundante (remover, Excel cobre)

| Arquivo | Linha | Ação |
|---|---|---|
| `budget.js` | 100-102 | remover botão CSV |
| `orcamento.js` | 247-249 | remover botão CSV |
| `v9-app.js` | 2713 | remover CSV |
| `hydrostec_v9.html` | 3532 | remover CSV |
| `saas-modules.js` | 49 | remover botão CSV |

## 2. BOTÕES MORTOS / DUPLICADOS

| Arquivo | Linha | Tipo | Ação |
|---|---|---|---|
| `pcp.js` | 159 + 253 | ID `pcp-pkg-new` duplicado em 2 sub-views | Renomear 2º para `pcp-pkg-new-backlog` |
| `v9-app.js` | 6639 + `hydrostec_v9.html` 7296 | `genNR13PDF()` = "em manutenção" | **Esconder botão até função pronta** |
| `v9-app.js` 2273 vs `hydrostec_v9.html` 3092 | `exportQualityJointsXLSX` definida 2× | Manter só no v9-app.js, remover HTML |
| `v9-app.js` 2860/2880 vs `hydrostec_v9.html` 3679/3699 | `mtExportXLSX/CSV` duplicadas | Idem |
| `hydrostec_v9.html` 2889 vs `v9-app.js` 2070 | render template duplicado | Unificar |
| `hh-params.js` | 69 | "Duplicar planning → budget" sem confirmação | Adicionar modal antes |

## 3. ALERTAS NATIVOS — 26 destrutivos pra migrar pra modal v9

| Arquivo | Linha | Texto | Severidade |
|---|---|---|---|
| `v9-app.js` | 4146 | "Excluir projeto…folhas também removidas" | **MUITO DESTRUTIVO** |
| `v9-app.js` | 5377 | "Excluir equipamento…remove inspeções" | **MUITO DESTRUTIVO** |
| `saas-modules.js` | 185 | "Desativar 2FA?…segurança" | **CRÍTICO SEGURANÇA** |
| `v9-app.js` | 4231/4242/4285 | "Atualizar/Excluir folha" | destrutivo |
| `v9-app.js` | 2266/2557/2564/2612/2923/2962/3006 | "Excluir junta/pendência/relatório/laudo" | destrutivo |
| `v9-app.js` | 4615/4862 | "Compartilhar/Remover usuário" | privacidade |
| `budget.js`/`electrical-base.js`/`eng-modules.js`/`hh-params.js`/`materials-catalog.js`/`orcamento.js`/`pcp.js`/`rdo-diario.js`/`tdraw.js` | várias | "Excluir este X?" | destrutivo |

**~15 alerts de sucesso** (`"✓ Salvo"`, `"RDO cadastrado"`) deveriam virar **toast** (não bloqueante).

**~8 alerts de validação curta** (selecione projeto, sistema carregando) podem ficar como alert nativo.

## Prioridade sugerida pra Fase C/D

1. **HIGH** — Unificar paleta "+ Novo" (substituir 5 verdes + 1 dinâmica + 1 cinza por `btn bp`) — impacta percepção de marca
2. **HIGH** — Resolver ID `pcp-pkg-new` duplicado (bug funcional)
3. **HIGH** — Migrar 3 confirms críticos pra modal v9 (projeto+folhas, equip+inspeções, 2FA)
4. **MEDIUM** — Remover labels "CSV" redundantes e padronizar "Exportar Excel" → "Exportar"
5. **MEDIUM** — Reclassificar 5 "Subir PDF" do v9-app pra `btn bia`
6. **MEDIUM** — Esconder/remover `genNR13PDF` "em construção"
7. **LOW** — Padronizar labels divergentes de IA ("IA: importar X" → "IA — <ação>")
8. **LOW** — Migrar 15 alerts de sucesso pra toast
