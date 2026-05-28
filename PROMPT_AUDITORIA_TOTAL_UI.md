# PROMPT — Auditoria TOTAL de UI, botões, labels e funcionalidades

> Cole na próxima conversa pra disparar pente fino completo.

---

## Objetivo

Padronizar **100%** do sistema PROJECT.IA visualmente e funcionalmente. Tudo que tem mesma função tem que ter **mesmo label, mesma cor, mesmo ícone, mesma posição** em todas as views. Botões mortos sem handler precisam ser removidos. Duplicações semânticas (Excel + CSV + Exportar = mesma função) devem ser consolidadas.

**Não é só estilo — é coerência funcional do produto inteiro.**

## Problemas conhecidos (referência de gravidade)

Exemplos reais identificados nas screenshots:

1. **Aba Suportes** (Tubulação): "+ Novo" azul `#1E40AF` + "Importar Excel" branco + "Excel" verde com ícone (que na verdade é Exportar, não importar)
2. **Aba Estruturas Metálicas** (Tubulação): "+ Novo" **laranja** `#F97316` (fora do padrão da aba anterior!)
3. **Aba Concretagens** (Civil): "Excel" verde + "Exportar" branco + "Subir PDF pra IA" cyan + banner azul "Use a IA Civil:" com botão "Subir PDF" azul → 2 botões diferentes pra mesma coisa
4. **Alert nativo** "Esta view não tem dados cadastrados ainda. Gerar Excel só com os cabeçalhos?" — estilo browser feio em vez de modal v9
5. **CSV** redundante (Excel já cobre, e o user já confirmou que não precisa)
6. **Botões "Excel" e "Exportar"** — labels diferentes pra mesma função (download de planilha)

## Tarefa

### Fase A — Mapa funcional completo

1. Use Grep recursivo em TODOS os arquivos:
   - `assets/js/*.js` (exceto `_backup*`, `_archive_legacy*`)
   - `hydrostec_v9.html`
   - `hydrostec_planejador*.html` (5 disciplinas)
   - `index.html`
   - `custom_views.js`

2. Pra cada `<button>` encontrado, extraia:
   - **Arquivo + linha**
   - **Label visível** (texto)
   - **Classe CSS** (`btn bp` / `bg` / `bia` / `bo` / `bc` / inline style)
   - **Ícone** (data-lucide ou SVG inline path)
   - **onclick / id + handler** (qual função executa)
   - **Cor de fundo efetiva** (deduzir da classe ou do inline)
   - **View/contexto** (Tubulação → Suportes, Civil → Concretagens, etc.)

3. **Identifique funcionalidade canônica** agrupando por handler:
   - Todos os botões que chamam `openImportExcel(*)` ou `parseXlsx(*)` → categoria **IMPORTAR EXCEL**
   - Todos que chamam `exportXLSX()` / `exportToExcel()` / `downloadXLSX()` ou similares → **EXPORTAR EXCEL**
   - Todos que chamam `openDisciplineAIModal()` / `openEquipAIModal()` / `openImportIA()` / `aiUpload()` / `PIAIA*.open*` → **IA (extração)**
   - Todos que chamam `o<Entity>()` / `openNew*()` / criam linha → **NOVO REGISTRO**
   - Todos que chamam `exportPDF()` / `gen*PDF()` / `doc.save()` → **EXPORTAR PDF**
   - Etc.

4. **Detecte botões mortos** (handler ausente, undefined, ou apontando pra função inexistente):
   - Grep no JS pelo nome da função do onclick → se 0 matches em definição → MORTO
   - Botões com `alert('em construção')` ou stubs vazios → MORTO

Entregue em `_docs/AUDITORIA_FUNCIONAL.md` no formato:

```markdown
## Categoria: EXPORTAR EXCEL (canônico: btn bg + ícone "file-spreadsheet" + label "Exportar")
Handler canônico: `exportXLSX()` (ou nome consolidado)
| Arquivo | Linha | Label atual | Classe | Handler | Status |
|---|---|---|---|---|---|
| view-x | 123 | "Excel" | btn bp verde | `exportXLSX()` | LABEL ERRADO (deveria ser "Exportar"), COR ERRADA (deveria ser bg) |
| view-y | 456 | "Exportar" | btn bg | `exportXLSX()` | OK |
| view-z | 789 | "Exportar Excel" | btn bg + svg | `exportXLSX()` | LABEL VERBOSO (deveria ser só "Exportar") |
| ... | ... | "Exportar CSV" | btn bg | `exportCSV()` | REMOVER (CSV redundante com Excel) |
```

### Fase B — Padrão canônico global

Decidir nomes/cores/ícones definitivos pra cada função. Proposta:

| Função | Label canônico | Classe | Ícone | Cor visual | Localização |
|---|---|---|---|---|---|
| Criar registro | `+ Novo` (ou `+ Novo <X>` se houver ambiguidade) | `btn bp` | plus | azul `#1E40AF` | direita do toolbar |
| Editar | (sem label, só ícone) | `btn bg` | edit-2 | cinza neutro | inline na linha |
| Excluir | (sem label, só ícone) | inline `#FEE2E2` | trash-2 | vermelho claro | inline na linha |
| Importar | `Importar` | `btn bg` | upload | cinza | toolbar esquerda |
| Exportar | `Exportar` | `btn bg` | download | cinza | toolbar direita do Importar |
| IA (qualquer) | `IA <ação>` (Ler com IA, IA Cotação, IA Foto, etc.) | `btn bia` | sparkles | gradient cyan→violet | ao lado dos primários |
| Personalizar | `Personalizar` | `btn bo` | settings | outline | direita do toolbar |
| Voltar | `Voltar` | `btn bg` | arrow-left | cinza | esquerda do header |
| Salvar | `Salvar` (ou `Salvar e <ação>`) | `btn bp` | check | azul | direita do modal footer |
| Cancelar | `Cancelar` | `btn bg` | (sem ícone) | cinza | esquerda do modal footer |
| Confirmar destrutivo | `Confirmar exclusão` | `btn` + `#FEE2E2` | check | vermelho | modal de confirmação |

**Decisões específicas (consolidações):**

1. **Remover CSV** em todos os módulos — Excel cobre. Manter só Excel.
2. **Unificar label "Excel" / "Exportar Excel" / "Exportar XLSX" → "Exportar"** (ícone download deixa claro o formato)
3. **Unificar "Importar Excel" / "Importar XLSX" → "Importar"** (ícone upload)
4. **Banner inline "Use a IA: ..."** com botão "Subir PDF" → REMOVER o botão duplicado, manter só o do toolbar principal (1 ponto único de upload por view)
5. **Substituir `alert()` / `confirm()` nativos** por modal v9 padronizado (cor v9, botões `btn bg`/`bp`, dark mode OK)
6. **"+ Novo X"** sempre azul `btn bp` — **NUNCA laranja, verde, violeta**

### Fase C — Detectar e remover botões mortos

Pra cada botão encontrado na Fase A, validar:
- Handler existe no codebase? (`grep "function <handler>"` ou `grep "<handler>:"`)
- Handler faz algo útil ou só `alert('em construção')` / `console.log`?
- Funcionalidade tem suporte no banco? (se tabela não existe, função morta)

Lista de candidatos a remoção:
- Botões com `onclick=""` vazio
- Botões cuja função chama outra função inexistente
- Botões duplicados na mesma toolbar (ex: 2 "Subir PDF pra IA" na Concretagens)
- Botões "em construção" sem deadline real

Entregar em `_docs/BOTOES_MORTOS.md` com plano de remoção (não remover automaticamente — listar primeiro pra confirmação humana).

### Fase D — Refactoring (após confirmação humana das Fases A/B/C)

Pra cada arquivo:
1. **Backup automático** em `_archive_legacy/ui_pentefino_<timestamp>/<arquivo>.bak`
2. Aplicar substituições via Python heredoc (atomic):
   - Classe canônica
   - Label canônico  
   - Ícone canônico (SVG inline com `currentColor`)
   - Ordem dos botões no toolbar (Importar | Exportar | IA | + Novo | Personalizar)
3. **Validar com `node --check`** após cada arquivo
4. **`grep "^function"` antes/depois** pra garantir que nenhuma função foi cortada
5. **Bump cache** do módulo no `module-loader.js` + SW global

### Fase E — Validação visual

1. **Screenshot baseline** de cada view antes (já temos as screenshots que o user mandou)
2. **Após refactor**, abrir cada view e tirar screenshot novo
3. **Comparar visualmente** que TODOS os toolbars de TODAS as views têm:
   - Mesma altura
   - Mesma ordem de botões (Importar | Exportar | IA | + Novo | Personalizar)
   - Mesmos ícones
   - Mesmas cores
   - Mesmos labels

Cypress spec `cypress/e2e/ui_consistency.cy.js`:
- Itera por TODAS as 30+ views
- Pra cada uma:
  - Valida que existe `button:contains("Importar")` com classe `btn bg`
  - Valida que existe `button:contains("Exportar")` com classe `btn bg`
  - Valida que botões "+ Novo" têm classe `btn bp`
  - Valida que botões IA têm classe `btn bia`
  - Valida que nenhum botão tem onclick=""
  - Valida que nenhum botão chama função inexistente

### Fase F — Documentação consolidada

`_docs/DESIGN_SYSTEM_V2.md`:
- Tabela canônica final
- Screenshots de antes/depois
- Lista de 30+ views auditadas + status
- Cada botão por categoria com handler canônico
- Padrões de label (PT-BR sempre, infinitivo)
- Padrões de ordem no toolbar
- Padrões de modal (footer com Cancelar + Salvar)
- Quando usar alert() vs modal vs toast
- Decisões registradas: por que removemos CSV, por que unificamos "Excel" → "Exportar", etc.

## Princípios não-negociáveis

1. **Preservar 100% das funcionalidades** que estão funcionando — só estilo + label + posição mudam
2. **Backup automático** antes de tocar qualquer arquivo
3. **Atomic write** via Python heredoc — nunca Edit > 50 linhas
4. **`grep "^function"` antes/depois** sempre
5. **`node --check`** após cada arquivo
6. **SVG inline** com `currentColor` (não depender de Lucide framework em modais dinâmicos)
7. **Sem hardcoded colors** — usar `var(--t0/t1/t3/t6/t9)` e classes oficiais
8. **Sem `alert()` nativo** pra ações > 1 confirmação — usar modal v9
9. **Labels em pt-BR no infinitivo** quando for ação (Salvar, Exportar, Importar, Cancelar)
10. **Botões mortos só removidos APÓS confirmação humana** (Fase C entrega lista, não deleta sozinho)

## Modo de execução

- **Fase por fase em ordem** (A → B → C → D → E → F)
- **Pausar entre B e C** pra confirmar padrão canônico antes de aplicar
- **Pausar entre C e D** pra confirmar lista de botões mortos antes de remover
- Reportar progresso a cada fase com: arquivos tocados, botões antes/depois, validação OK
- Se falhar 2× num arquivo: marcar pendente, seguir adiante, reportar no final

## Critério de aceite

- Todos os toolbars de TODAS as views com mesma ordem, cor, ícones, labels
- 0 botões mortos no codebase
- 0 alertas nativos pra ações destrutivas/importantes
- CSV removido em favor de Excel onde aplicável
- "Excel" / "Exportar Excel" / "Exportar XLSX" todos unificados em "Exportar"
- Cypress E2E verde (`cypress/e2e/ui_consistency.cy.js`)
- Console limpo em todas as views (F12 → 0 erros)
- `_docs/AUDITORIA_FUNCIONAL.md` + `_docs/BOTOES_MORTOS.md` + `_docs/DESIGN_SYSTEM_V2.md` completos
- SW bumped com versão major (v9.0.0 sugerido por ser refactor visual completo)

## Áreas prioritárias identificadas pelo user

Pelo menos estas precisam ficar 100%:

1. **HUB Planejador Tubulação:**
   - Folhas / Isos
   - Mapa de Juntas
   - Suportes
   - Estruturas Metálicas (atualmente com "+ Novo" laranja — corrigir)
   - Materiais do Projeto
2. **HUB Planejador Civil:**
   - Desenho Técnico
   - Concretagens (2 botões "Subir PDF" duplicados — consolidar)
   - Elementos Estruturais
3. **HUB Planejador Elétrica / Pintura / Caldeiraria** — idem
4. **Views v9 principais** (Catálogo materiais, Compras, Suppliers, Orçamento, Composições, RDO, PCP)
5. **IA Conversacional** (botão flutuante já corrigido na rodada anterior)
