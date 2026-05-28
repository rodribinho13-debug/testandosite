# PROMPT — Auditoria e padronização total de botões/cores do sistema

> Cole esse bloco na próxima conversa pra acionar a refatoração visual.

---

## Contexto

PROJECT.IA tem botões espalhados em **30+ módulos JS** + **5 páginas HTML legacy** (`hydrostec_planejador*.html` por disciplina) + view principal `hydrostec_v9.html`. Funcionalidades iguais aparecem com **cores/estilos diferentes** dependendo de quem escreveu o código. Exemplo concreto identificado:

- **Botão IA** tem hoje 3+ estilos diferentes:
  - `btn bia` gradient cyan→violet (gold standard do v9-app.js)
  - "Cadastrar via IA" violet sólido (HUB Planejador)
  - `btn bo` outlined com sparkles (planejadores civil/caldeiraria/elétrica)
- **Botão Excel** tem 4+ estilos:
  - `btn bg` + ícone file-spreadsheet (v9-app.js toolbar)
  - "Excel" outlined verde
  - "Importar Excel" cinza claro
  - botão style inline `background:#fff;border:1px solid #E5E7EB` (tdraw, eng-modules)
- **+ Novo X** ora azul (`btn bp`), ora verde, ora outlined

Quero **TUDO padronizado** — mesma funcionalidade = mesma cor, mesmo ícone, mesma classe CSS. Sem mexer em comportamento.

## Tarefa

### Fase A — Auditoria completa (sem código)

1. Use Grep recursivo pra encontrar TODOS os botões em:
   - `assets/js/**/*.js`
   - `hydrostec_v9.html`
   - `hydrostec_planejador*.html` (todas as disciplinas)
   - `index.html`
   - Padrão: `<button class="btn|<button style|class="btn |\.btn\.b[a-z]+`

2. Pra cada botão, extraia:
   - Arquivo + linha
   - Label (texto visível)
   - Classe CSS atual (`btn bp`/`btn bg`/`btn bia`/`btn bo`/`btn bc`/inline style)
   - Ícone (lucide name ou SVG inline)
   - Função onclick (handler)

3. Agrupe por **funcionalidade canônica**:
   - **NOVO / CRIAR** (Novo material, Nova RM, Nova folha, Novo desenho, Novo projeto, etc.)
   - **IA / SPARKLES** (Importar via IA, Cadastrar via IA, IA Cotação, IA Foto Manuscrita, Ler com IA, ABC Inteligente, etc.)
   - **IMPORTAR EXCEL** (Importar Excel, Importar XLSX, Importar planilha, Excel)
   - **EXPORTAR EXCEL** (Exportar Excel, Exportar XLSX, baixar planilha)
   - **EXPORTAR PDF** (Exportar PDF, Gerar PDF, PDF em branco)
   - **EXPORTAR CSV**
   - **PERSONALIZAR / SETTINGS** (Personalizar colunas, Customizar campos)
   - **EDITAR** (lápis)
   - **EXCLUIR** (lixeira)
   - **VOLTAR / CANCELAR**
   - **SALVAR / CONFIRMAR**
   - **AÇÕES SECUNDÁRIAS** (Alçadas, Toggle Kanban/Lista, Filtros)

Entregue em `_docs/AUDITORIA_BOTOES.md` no formato:
```markdown
## NOVO / CRIAR (canônico: btn bp + ícone "plus")
| Arquivo | Linha | Label atual | Classe atual | Ícone atual | Status |
|---|---|---|---|---|---|
| v9-app.js | 1260 | + Novo Material | btn bp | plus | OK |
| quotations.js | 89 | + Nova RM | btn bp | (sem) | falta ícone |
| hydrostec_planejador.html | 803 | Novo suporte | btn bp | plus | OK |
...

## IA (canônico: btn bia + ícone "sparkles" + texto começa com "IA" ou "Importar via IA")
...
```

### Fase B — Definir padrão único

Reaproveite o padrão já estabelecido no v9-app.js (`rIsos` toolbar):

| Funcionalidade | Classe | Ícone Lucide | SVG fallback | Cor visual |
|---|---|---|---|---|
| **Novo / Criar** | `btn bp` | `plus` | quadrado com + | azul escuro `#1E40AF` |
| **IA** | `btn bia` | `sparkles` | 8 raios | gradient cyan→violet |
| **Importar Excel** | `btn bg` | `file-spreadsheet` | retângulo+linhas | cinza neutro |
| **Exportar Excel** | `btn bg` | `download` + spreadsheet | seta pra baixo | cinza neutro |
| **Exportar PDF** | `btn bg` | `file-text` | doc | cinza neutro |
| **Personalizar** | `btn bo` | `settings` | engrenagem | outline cinza |
| **Voltar / Cancelar** | `btn bg` | `arrow-left` ou `x` | seta esquerda | cinza neutro |
| **Salvar** | `btn bp` | `check` | check | azul escuro |
| **Excluir** | (inline `#FEE2E2`) | `trash-2` | lixeira | vermelho claro |

**Decisão de ícones:** sempre SVG inline com `stroke="currentColor"` (não depender de Lucide framework, que pode não estar carregado quando modals abrem). Centralize os SVGs em `assets/js/ui-icons.js` (helper `PIAIcons.plus()`, `PIAIcons.sparkles()`, etc.) pra reuso.

### Fase C — Aplicar refactoring

Pra cada botão fora do padrão:
1. **Atomic write** via Python heredoc (`cat > /tmp/parts && cat parts > file.js`) — NUNCA Edit gigante (já truncou 4× nesta sessão).
2. Antes de tocar arquivo > 200 linhas: backup automático em `_archive_legacy/<arquivo>.<timestamp>.bak`.
3. Após edit: `node --check` no arquivo. Se falhar, restaurar backup + reportar como pendente.
4. Após edit: `grep "^function "` no arquivo ANTES e DEPOIS pra garantir que nenhuma função foi cortada acidentalmente.
5. Bump cache no `module-loader.js` (v=N+1) + SW.

### Fase D — Validação

1. **Visual diff** via Claude in Chrome: abrir cada view, screenshot do toolbar, comparar com baseline esperado (v9-app.js `rIsos`).
2. **Funcional**: clicar cada botão refatorado, garantir handler executa.
3. **Console limpo**: F12 → 0 erros relacionados a ícones quebrados ou onclick undefined.
4. **Cypress**: spec `cypress/e2e/buttons_consistency.cy.js` que percorre cada view e valida que botões com mesmo texto têm mesma classe.

### Fase E — Documentação

Atualizar `_docs/DESIGN_SYSTEM.md` com:
- Tabela canônica de botões (label → classe → ícone)
- Quando usar `bp` vs `bg` vs `bia` vs `bo` vs `bc`
- Exemplo de uso correto pra cada caso
- Lista de arquivos auditados + status

## Princípios não-negociáveis

1. **Preservar 100% das funcionalidades** — só estilo muda, comportamento intacto
2. **Sem refatoração funcional** disfarçada — não aproveitar pra "consertar" lógica
3. **Atomic writes** sempre — Python heredoc, nunca Edit > 50 linhas
4. **Verificação antes/depois** com grep `^function` em cada arquivo modificado
5. **Backup automático** antes de tocar arquivo grande
6. **Validar syntax** com `node --check` após cada arquivo
7. **Bumps de cache** explicitos no module-loader.js + SW
8. **Sem hardcoded colors** — usar `var(--t0/t1/t3/t6/t9)` e classes oficiais `bp/bg/bia/bo/bc`
9. **SVG inline** com `currentColor` em vez de `<i data-lucide="...">` (evita ícone vazio se framework não carregou)

## Modo de execução

- Fase por fase em sequência (A → B → C → D → E)
- Só pausar se ocorrer erro real ou se a Fase A revelar > 100 botões fora do padrão (aí pedir prioridade)
- Reportar progresso a cada fase: arquivos tocados + botões padronizados + validação OK
- Se um arquivo específico falhar 2× no Edit, marcar como pendente e seguir adiante

## Critério de aceite

- 0 botões com style inline fora do padrão (exceto excluir/lixeira que tem cor própria vermelha)
- 0 funcionalidades quebradas (Cypress verde + console limpo)
- Documentação completa em `_docs/DESIGN_SYSTEM.md` + `_docs/AUDITORIA_BOTOES.md`
- Aplicado nos seguintes módulos no mínimo:
  - **v9 toolbars** (v9-app.js, v9-fields.js — 12+ views)
  - **Suprimentos** (quotations.js, suppliers.js, materials-catalog.js, compositions.js, orcamento.js, budget.js)
  - **Planejamento** (planejamento.js, pcp.js, rdo-diario.js)
  - **HUB Planejador** (hub-unified.js, planner-hub.js, eng-modules.js, tdraw.js)
  - **5 páginas legacy** (hydrostec_planejador.html, _civil, _eletrica, _pintura, _caldeiraria)
  - **Módulos IA** (todos os ai-*.js criados nesta sessão)
- SW bumped (próxima versão deve cobrir tudo de uma vez)
