# PROMPT para Claude Code — Teste E2E completo do PROJECT.IA (como usuário real)

Você vai testar o SaaS **PROJECT.IA** em produção (`https://testandosite-nu.vercel.app/hydrostec_v9.html`) **como um usuário real**, usando um navegador de verdade (Chrome MCP / browser tools), não só chamadas de API. Cada funcionalidade deve ser exercida pela UI: clicar, enviar arquivo, ver o resultado e **confirmar o INSERT no banco (Supabase)**.

## Ambiente e credenciais

- Contas de teste em `_docs/HANDOFF_NOVA_SESSAO.md`: **Org A** e **Org B** (senha única). **NÃO crie contas novas pela UI.** Se precisar de mais usuários para a simulação, crie via Supabase Auth admin e **remova ao final**.
- Marque todo registro de teste com a tag `__AUDIT__` no nome/código (ex.: `__AUDIT_E2E__-...`) para limpar depois.
- Supabase: confirme cada operação com `SELECT` (contagem antes/depois, conteúdo inserido, `org_id`/`project_id` corretos).

## Documentos REAIS para os testes (já no repositório)

- **PDFs para IA** (`_amostras_teste/` e `_docs/_test_assets/`): `iso_tubulacao.pdf`, `ficha_concretagem.pdf`, `armadura_estrutural.pdf`, `diagrama_unifilar.pdf`, `laudo_spda.pdf`, `inspecao_dft.pdf`, `mapa_juntas.pdf`, `lista_materiais_avulsa.pdf`, `01_TESTE_…08_TESTE_*.pdf`.
- **Foto de RDO preenchido (manuscrito):** `_docs/_test_assets/rdo_foto_manuscrita.pdf`.
- **Planilhas de importação por aba:** `_docs/_test_assets/import_<view>.xlsx` — uma para cada: `isos, mat, civil_concr, civil_elem, civil_sinapi, elec_panels, elec_spda, elec_specs, hydraulic, quality_joints, quality_reports, paint, scaf, sold, com, cal, equip, maint, pend, rdo`.
- **Modelos CSV/HTML:** `_modelos_teste/*` (alternativa para importação).

---

## Parte 1 — Simulação de 5 usuários (concorrência + multi-tenant)

Rode **5 sessões de usuário em paralelo** (abas/contextos separados): por exemplo 3 sessões na **Org A** e 2 na **Org B**. Para cada sessão:

1. Login, seleção/criação de um projeto de teste (`__AUDIT_E2E_u<N>__`).
2. Executar um fluxo de cadastro (manual + IA + import) simultaneamente com as outras sessões.

Verificações desta parte:
- **Isolamento multi-tenant:** usuários da Org A **não** enxergam nem editam dados da Org B (e vice-versa). Confirme por UI e por SQL (RLS).
- **Concorrência:** escritas simultâneas das 5 sessões não travam, não se misturam entre orgs e não geram erro de lock/auth (atenção ao singleton `window.__pia_sb` — não pode haver "Multiple GoTrueClient").
- **Sessão:** login/refresh em uma aba não derruba as outras.

---

## Parte 2 — Matriz de testes por módulo (para CADA aba)

Para cada aba/módulo abaixo, executar os 5 passos e registrar OK/Falha + evidência:

| Passo | O que fazer |
|---|---|
| a) Manual | Clicar **+ Novo**, preencher e salvar → confirmar INSERT no banco |
| b) IA | Clicar **Cadastrar via IA**, enviar o PDF real da disciplina, **usar o campo "Instruções extras"**, revisar a extração, clicar **Cadastrar selecionados** → confirmar INSERT |
| c) Importar Excel | Abrir **Excel ▾ → Importar Excel**, subir o `import_<view>.xlsx`, mapear colunas, importar → confirmar INSERTs em lote |
| d) Exportar Excel | **Excel ▾ → Exportar Excel** → confirmar download com os dados da tela |
| e) Editar/Excluir | Editar um registro e (se houver) excluir → confirmar no banco |

Abas a cobrir: **Isométricos, Materiais, Concretagens, Estruturas de concreto, Insumos SINAPI, Quadros elétricos, SPDA, Specs elétricas, Hidráulica, Mapa de juntas, Relatórios de qualidade (END/NDT), Pendências/NCs, Soldadores, Comissionamento, Calibração, Equipamentos NR-13, Manutenção (OS), Pintura, Andaime, RDO.**

Em cada IA, confirmar: o modal abre, a extração responde, o **"Cadastrar" insere de fato** (sem travar em silêncio) e há toast de sucesso/erro explícito.

---

## Parte 3 — Testes específicos destacados

1. **Foto de RDO preenchido:** na aba **RDO**, usar o fluxo de IA por foto (`PIAIARdo.openFromPhoto`, acionado em `assets/js/rdo-diario.js`) com `rdo_foto_manuscrita.pdf`. **Hoje a IA do RDO está com problema — diagnosticar** (console + edge function `analyze-discipline-doc` + doc-type de RDO) e reportar exatamente onde falha; testar até o INSERT do RDO no banco.
2. **Orçamento (completo):** abrir o módulo **Orçamento**, criar/abrir um orçamento de teste, adicionar itens/composições, importar planilha (se suportado), conferir totais/curva S/físico-financeiro, exportar. Confirmar persistência no banco.
3. **Importação Excel (completa):** validar a importação de TODAS as abas que têm `import_<view>.xlsx`, incluindo o mapeamento automático de colunas e o tratamento de erros (linha inválida, coluna faltando).

---

## Parte 4 — Verificações transversais

- **Banco:** todo "Cadastrar/Importar" gera linha(s) reais com `org_id`/`project_id` corretos; nada de "0 INSERT silencioso".
- **Feedback:** sucesso e erro sempre mostram toast; nada trava sem mensagem.
- **Performance:** medir o tempo de entrada no v9 e a troca entre abas; anotar páginas com **delay** perceptível.
- **Português/UI:** anotar erros de texto e botões fora do padrão que aparecerem durante os testes.
- **Console:** sem erros JS não tratados; sem "Multiple GoTrueClient instances".

---

## Como reportar

Entregue um **relatório em `_docs/RELATORIO_TESTE_E2E_<data>.md`** com:
- Tabela: módulo × (manual / IA / import / export / editar) = OK / Falha, com a evidência (mensagem, id inserido, ou erro do console).
- Lista priorizada dos bugs encontrados (crítico → menor), com passos de reprodução.
- Resultado da simulação dos 5 usuários (isolamento + concorrência).
- Status específico de: RDO por foto, Orçamento, Importação Excel.
- Métricas de performance (boot do v9, troca de abas).

## Cuidados

- Use navegador real para os fluxos de UI; use o Supabase só para **verificar/limpar**, não para substituir o teste pela API.
- **Limpe ao final** todos os registros/projetos `__AUDIT__` criados (e quaisquer usuários extras criados para a simulação). Preserve Org A e Org B.
- Não execute ações destrutivas fora dos dados de teste.
