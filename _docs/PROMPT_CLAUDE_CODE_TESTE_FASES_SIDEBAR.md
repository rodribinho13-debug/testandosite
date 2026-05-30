# PROMPT para Claude Code — Teste por FASES de todo o sidebar (todas as funcionalidades)

Testar o **PROJECT.IA** em produção (`https://testandosite-nu.vercel.app/hydrostec_v9.html`), **uma fase por vez, seguindo a ordem do menu lateral (sidebar)**, começando por **Planejamento → PCP**. Para cada item do sidebar, exercer TODAS as funcionalidades (render, cadastro manual, IA, Importar/Exportar Excel, PDF, editar/excluir) e **confirmar no banco (Supabase) via SQL**. Pode usar SQL para verificar/semear e o navegador para os fluxos de UI — o que for mais eficiente, mas toda função visível tem que ser realmente exercida.

> Regra de ouro: **corrigir o que estiver quebrado na fase, commitar, e só então passar para a próxima fase.** Não acumular bugs.

## Ambiente
- Credenciais de teste (Org A/B) em `_docs/HANDOFF_NOVA_SESSAO.md`. Não criar contas pela UI. Marcar registros de teste com `__AUDIT__` e limpar ao final.
- Docs reais para IA e import já estão em `_amostras_teste/`, `_docs/_test_assets/` (PDFs + `import_<view>.xlsx` + `rdo_foto_manuscrita.pdf`) e `_modelos_teste/` (CSVs).

## ⚠️ Cuidados (já quebraram o app antes)
- Edições em `hydrostec_v9.html` e `assets/js/*.js` (CRLF) já **truncaram** arquivos. Após editar: `grep -c "</html>" hydrostec_v9.html` = 1; `node --check` em todo `.js`.
- Ao alterar um módulo, **suba o cache buster** no `module-loader.js` (`?v=N`) e a **versão do SW** (`sw.js`, `const V`). Validar com Ctrl+Shift+R.
- Cliente Supabase é singleton `window.__pia_sb` (= `window.sb`). Nunca criar `createClient` novo sem reusar o singleton.

---

## Checklist padrão (aplicar a CADA item do sidebar)

1. **Render:** abrir a aba — não pode haver erro no console nem tela em branco.
2. **Cadastro manual:** `+ Novo`, preencher, salvar → confirmar INSERT por SQL (`org_id`/`project_id` corretos).
3. **Cadastrar via IA:** enviar o PDF real da disciplina, usar o campo "Instruções extras", revisar, **Cadastrar selecionados** → confirmar INSERT (sem travar em silêncio; toast de sucesso/erro).
4. **Importar Excel:** `Excel ▾ → Importar`, subir `import_<view>.xlsx`, mapear, importar → confirmar INSERTs em lote.
5. **Exportar Excel / PDF:** confirmar download com os dados da tela.
6. **Editar/Excluir:** alterar um registro → confirmar no banco.
7. **UI:** todos os botões funcionam (sem `onclick` morto); **tamanhos/estilos consistentes** (classes `btn bia/bp/bg/bo`); sem botões desproporcionais; barra de ações padronizada.

Registrar OK/Falha + evidência (id inserido, mensagem, ou erro do console) por item.

---

## FASE 1 — PLANEJAMENTO (começar aqui)

Itens (na ordem do menu): **PCP — Plano Semanal**, **Orçamento**, **Compras (RFQ/PO/AR)**, **Composições**, **RDO Diário**, **HUB Planejador**, **Cronograma (Gantt)**.

- **PCP (PRIMEIRO):** abrir, criar plano/semana, alocar itens, salvar; importar/exportar se houver; confirmar persistência.
- **Orçamento — BUG CONHECIDO (corrigir já):** ao abrir, o console quebra com `Uncaught TypeError: Cannot set properties of null (setting 'onclick')` em `assets/js/orcamento.js:~258`. Causa: o código faz `d.getElementById('orc-export-xlsx'/'orc-export-csv'/'orc-export-pdf'/'orc-import-ia').onclick=...`, mas o shell renderiza os botões do topo com **outros ids** ("IA Import", "Excel", "PDF"). Corrigir o casamento de ids (ou guardar com `if(el)`), e então testar: abas Composições (BOM), Insumos, BDI & Impostos, Cronograma Físico-Financeiro, Curva ABC, Comparativo; adicionar itens/composições; **IA Import**; **Excel** (importar/exportar); **PDF**; conferir Subtotal/BDI/Total.
- **Compras / Composições / RDO Diário / HUB / Gantt:** aplicar o checklist padrão. No Gantt, testar Importar/Exportar P6 e MS Project.

## FASE 2 — ENGENHARIA

Itens: **Isométricos/HUB Planejador**, **Catálogo de materiais**, **Concretagens**, **Estruturas de Concreto**, **Composições SINAPI**, **Cabos (HUB)**, **Eletrodutos (HUB)**, **Quadros Elétricos**, **SPDA / Aterramento**, **Specs Cabos**, **Sistemas Hidráulicos**, **Equipamentos NR-13**, **Manutenção**, **Pintura Industrial**, **Andaime**.

- PDFs de IA por disciplina: tubulação (`iso_tubulacao.pdf`), civil (`ficha_concretagem.pdf`, `armadura_estrutural.pdf`), elétrica (`diagrama_unifilar.pdf`, `laudo_spda.pdf`), hidráulica, pintura (`inspecao_dft.pdf`), juntas (`mapa_juntas.pdf`), andaime (`07_TESTE_andaime_cartao.pdf`).
- Importar Excel com o `import_<view>.xlsx` de cada uma. **Anotar quais abas o Importar/Exportar Excel funciona e quais não** (o usuário relatou inconsistência).

## FASE 3 — QUALIDADE

Itens: **Mapa de Juntas**, **Relatórios END (VS/LP/RT/TH…)**, **Soldadores · Qualificação**, **Calibração de Instrumentos**, **Pendências / NCs**, **Comissionamento**. Checklist padrão + IA (`qualidade`/`instrumentacao`) + import `import_quality_joints/quality_reports/sold/cal/pend/com.xlsx`.

## FASE 4 — SUPRIMENTOS

Itens: **Compras/RFQ-PO-AR**, **Fornecedores**, **Catálogo de materiais** (se listados aqui). Checklist padrão; testar IA de fornecedor/cotação se existir (`openAIImport`, `PIAIASupplier`, `PIAIAQuotation`).

## FASE 5 — RDO (foco no bug relatado)

- **RDO / RDC** e **RDO Diário**: testar a **IA por foto** com `_docs/_test_assets/rdo_foto_manuscrita.pdf` (`PIAIARdo.openFromPhoto`, acionada em `assets/js/rdo-diario.js`). **A IA do RDO não está funcionando — diagnosticar** (console + edge function `analyze-discipline-doc` + doc-type de RDO) e corrigir até o INSERT.

## FASE 6 — GERAL / SISTEMA

Itens: **Projetos**, **Dashboard**, **Integrações**, **Equipe & Acessos**, **Meu Plano**. Checklist padrão (cadastro de projeto, KPIs do dashboard, telas de sistema). Em "Equipe & Acessos" NÃO alterar permissões reais de produção.

---

## Saída esperada (por fase)

Para cada fase, anexar ao `_docs/RELATORIO_TESTE_FASES_<data>.md`:
- Tabela: item × (render / manual / IA / import / export / editar / UI) = OK/Falha + evidência.
- Lista de **botões mortos** (onclick para id inexistente) e **botões com tamanho/estilo fora do padrão**, com a correção aplicada.
- Status de Importar/Exportar Excel por aba (quais funcionam, quais não, e por quê).
- Bugs corrigidos na fase (com commit) e bugs pendentes priorizados.

## Critérios de aceite gerais
- Console sem erros não tratados em nenhuma aba (incluindo o `onclick null` do Orçamento, que deve ser corrigido na Fase 1).
- Importar/Exportar Excel funcionando de forma consistente em todas as abas que oferecem o botão.
- Botões com tamanho/estilo padronizados e todos funcionais.
- Cada `Cadastrar/Importar` gera linha real no banco; nada de "0 INSERT silencioso".
- Banco limpo de `__AUDIT__` ao final; Org A/B preservadas.
