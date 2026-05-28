# Auditoria de Botões — PROJECT.IA

Gerado em 2026-05-27 via sub-agente. Total: **~86 OK, ~70 FORA, 1 duplicado**.

Padrão canônico: `v9-app.js:1257-1274` + `hydrostec_v9.html:1846-1863` (gold standard das toolbars).

## Prioridades de correção (ordem de execução)

1. **btn bo → btn bia** em planejadores civil/elétrica/pintura/caldeiraria (7 botões IA)
2. **btn bc → btn bia** em v9-app.js + hydrostec_v9.html (4 botões IA isos+equip)
3. Adicionar **ícones lucide** nos botões dos módulos comerciais (budget, compositions, materials-catalog, orcamento, pcp, quotations, suppliers, rdo-diario) — ~40 botões
4. **Unificar Excluir** em `sm-d` + `trash-2` (eliminar emoji 🗑 e "×" texto) — 7 botões
5. **Remover duplicado** pcp.js linha 253 (mesmo "+ Novo Pacote" da 159)
6. (Manter SVG inline em modais dinâmicos — não é antipadrão: garante render independente do framework Lucide)

## Decisão de arquitetura

SVG inline com `stroke="currentColor"` é **OK** em modais criados dinamicamente via `document.createElement` (ai-orcamento.js, ai-rdo.js, etc.) — Lucide.createIcons() só roda em HTML estático que existe quando o framework é inicializado. Padronizar como exceção legítima.

## Categorias OK

- Toolbars v9-app.js (60 botões)
- Cabeçalhos hydrostec_v9.html (~10 botões)
- Personalizar (15 usos consistentes)
- Excluir via `sm-d` (14 usos)
- IA via `btn bia` (7 já corretos)

## Lista FORA por categoria

### IA — 14 botões fora
- `hydrostec_planejador_civil.html:377,461` — btn bo → bia
- `hydrostec_planejador_eletrica.html:297,371,426,483` — btn bo → bia
- `hydrostec_planejador_pintura.html:271` — btn bo → bia
- `hydrostec_planejador_caldeiraria.html:273` — btn bo → bia
- `v9-app.js:1268` (equip) — btn bc → bia
- `hydrostec_v9.html:1847,1857` (isos) — btn bc → bia
- `hydrostec_planejador.html:727` — style inline grad-ia duplicado

### Salvar — 10 botões sem ícone check
- compositions.js:403, materials-catalog.js:309, orcamento.js:555,879, pcp.js:500, quotations.js:295, rdo-diario.js:311, suppliers.js:314

### Exportar — 13 botões com classe/ícone errado
- v9-app.js:1264 "MS Project" btn bp (deveria bg)
- v9-app.js:2712 "Exportar Excel" btn bp (deveria bg)
- v9-app.js:4694 "Exportar JSON" btn bp (deveria bg)
- budget.js:100-102, orcamento.js:247-249 sem ícone

### Excluir — 8 variantes inconsistentes
- pcp.js:497 (sem trash-2)
- rdo-diario.js:351,369,392 ("×" texto)
- materials-catalog.js:308 (color sem bg)
- saas-modules.js:381 (border em vez de bg)
- budget.js:242, electrical-base.js:269 (emoji 🗑)
