# PROMPT-MESTRE para Claude Code — PROJECT.IA 100% comercial, à prova de cache e de presunção

Levar o SaaS **PROJECT.IA** a um estado **comercial, profissional e sem erros**, encerrando o ciclo de "corrige um, quebra outro". Use quantos tokens forem necessários. Só pare quando o "Definition of Done" estiver **comprovadamente** 100% verde **em produção, testado de verdade** — não por presunção.

- App principal: `hydrostec_v9.html` (~7.600 linhas, JS inline) + `assets/js/*.js` + `custom_views.js`.
- Produção: `https://testandosite-nu.vercel.app/hydrostec_v9.html` (Vercel, deploy a cada push na `main`).
- Service Worker: `sw.js` (`const V='projectia-vX.Y.Z'`). Cache busters por módulo: `assets/js/module-loader.js` (`?v=N`). CSP: `vercel.json` (header) **e** uma `<meta>` no `hydrostec_v9.html`. Backend Supabase, cliente singleton `window.__pia_sb` (= `window.sb`).

---

## ⛔ REGRA ZERO — PROIBIDO PRESUMIR. PROIBIDO CULPAR O CACHE SEM PROVA.

O dono já cansou de ouvir "deve estar funcionando" e "é só cache". A partir de agora:

1. **Banido o vocabulário de suposição.** Nunca escreva "deve funcionar", "provavelmente", "presumo", "deveria estar ok", "é cache" como conclusão. Toda afirmação de que algo funciona precisa vir acompanhada de **evidência de teste real** (saída do console, linha retornada por SQL, screenshot, resposta HTTP). Sem evidência = não está pronto.
2. **"É cache" é hipótese, não diagnóstico.** Você só pode dizer que um problema era cache DEPOIS de provar com o "Protocolo à prova de cache" abaixo que o navegador estava servindo bytes antigos E que, servindo os bytes novos, o problema some. Caso contrário, é bug de verdade no código — encontre a causa-raiz no código.
3. **Nada é "resolvido" sem o ciclo completo:** reproduzir → achar a causa-raiz no código → corrigir → **deployar** → **provar que o código novo está em execução** → **testar a função de verdade** → registrar a evidência. Pular qualquer etapa = não conta.

---

## 🧪 PROTOCOLO À PROVA DE CACHE (obrigatório a cada correção de asset)

Toda vez que alterar `hydrostec_v9.html`, `sw.js`, ou qualquer `assets/js/*.js`:

1. **Crie um selo de build verificável.** Adicione (uma vez) uma constante global tipo `window.__BUILD__='vX.Y.Z+<timestamp>'` no `hydrostec_v9.html`, logada no console no boot (`console.log('[build]', window.__BUILD__)`). Incremente a cada deploy. Isso permite confirmar, sem ambiguidade, qual código está rodando.
2. **Suba os versionadores:** o `?v=N` do módulo no `module-loader.js` **e** a versão `V` do `sw.js`. Sem isso, o SW/HTTP cache (max-age 86400) serve o antigo.
3. **Após o deploy, prove que a origem serve o código novo** (antes de testar a UI): faça `fetch('<arquivo>?cb='+Date.now(), {cache:'no-store'})` e confirme que o **conteúdo corrigido** está presente (procure a string/trecho exato que você mudou, e o selo de build/versão). Se vier o antigo, é deploy pendente — não é "cache do usuário"; espere o Vercel publicar e refaça.
4. **Garanta ambiente limpo no teste:** antes de validar na UI, **desregistre o Service Worker e limpe os caches** (`navigator.serviceWorker.getRegistrations()` → `unregister()`; `caches.keys()` → `delete`) **ou** teste numa janela anônima/perfil limpo. Recarregue e confirme no console o `window.__BUILD__` novo.
5. **Só então teste a funcionalidade.** Se o `__BUILD__` no console for o novo e o bug persistir → **NÃO é cache, é bug**: volte à causa-raiz. Se o `__BUILD__` for o antigo → o problema é deploy/versionamento (corrija o push/CSP/SW), não invente "cache do navegador".
6. **Registre a evidência** dos passos 3–5 no relatório (URL fetchada + trecho confirmado + `__BUILD__` no console + resultado do teste).

> Regra prática: "funciona no meu código local" não vale nada. O que vale é o **arquivo servido pela produção**, com o selo de build novo confirmado no console, e a função testada ali.

---

## DEFINITION OF DONE (não concluir até TUDO ser PROVADO)

1. **Console 100% limpo** em TODA página/aba do sidebar: zero erros, zero warnings de CSP, zero `Uncaught`, zero recurso bloqueado, zero deprecation evitável. (Evidência: log do console por página.)
2. **Todo botão funciona** (nenhum `onclick` para id/função inexistente) e **tamanho/estilo padronizados** (sem desproporção). (Evidência: clique testado + screenshot.)
3. **Todo CRUD** grava no banco em todas as abas. (Evidência: `SELECT` antes/depois.)
4. **Toda IA** funciona ponta a ponta até o INSERT, com toast. Inclui RDO por foto. (Evidência: id inserido por SQL + console.)
5. **Importar e Exportar Excel** funcionam em TODAS as abas com o botão. (Evidência por aba.)
6. **Sem regressões:** login, isolamento multi-tenant (Org A não vê Org B), performance.
7. **Performance:** boot do v9 e troca de abas sem delay perceptível (medido antes/depois).

Cada item acima só conta como ✅ com a evidência anexada. Sem evidência → ❌.

---

## METODOLOGIA ANTI-REGRESSÃO (obrigatória)

1. **Inventário primeiro** (`_docs/INVENTARIO_BUGS.md`): cada página do sidebar, cada botão/onclick, status (OK/quebrado) com o erro de console capturado.
2. **Baseline de regressão fixa:** login + abrir cada aba sem erro de console + 1 cadastro + 1 import/export + 1 IA por disciplina. Rode ANTES e DEPOIS de cada lote.
3. **Mudança incremental + verificação:** corrija um grupo, commit, deploy, rode o Protocolo à prova de cache e a baseline. Regrediu? Conserte antes de avançar.
4. **Validação técnica de cada edição** (ver Cuidados) + teste real no navegador.
5. **Relatório vivo** `_docs/RELATORIO_MASTER_<data>.md` com evidências e o estado do Definition of Done.

---

## ⚠️ CUIDADOS TÉCNICOS (já causaram quebra grave)

- **Truncamento (CRLF):** editar esses arquivos já cortou o fim. Após CADA edição: `grep -c "</html>" hydrostec_v9.html` = 1; contagem de linhas coerente; `node --check` em todo `.js`; para blocos JS no HTML, extraia e `node --check`.
- **Singleton Supabase:** nunca criar `createClient` novo sem reusar `window.__pia_sb` (múltiplas instâncias GoTrueClient travam auth/escritas).
- **Credenciais de teste:** Org A/B em `_docs/HANDOFF_NOVA_SESSAO.md`. Não criar contas pela UI. Marcar registros de teste com `__AUDIT__` e limpar ao final.

---

## FASE 0 — Higiene global (erros que aparecem em TODAS as páginas)

1. **CSP `frame-ancestors` ignorado no `<meta>`:** removê-la da `<meta>` CSP do `hydrostec_v9.html` (já existe no header do `vercel.json`); manter as duas coerentes.
2. **Sourcemap do lucide bloqueado** (`unpkg.com/lucide.min.js.map` x `connect-src`): liberar `https://unpkg.com` no `connect-src` (header `vercel.json` E `<meta>`) **ou** self-hostar o lucide em `/assets/vendor/`. Console sem o warning.
3. **Meta deprecado:** adicionar `<meta name="mobile-web-app-capable" content="yes">`.
4. **Selo de build** (`window.__BUILD__`) implementado e logado no boot.
5. **Design system de botões:** centralizar `btn`/`bia/bp/bg/bo/ba` com tamanho/padding/fonte/ícone consistentes; remover estilos inline divergentes que deixam botões desproporcionais.
6. **Toolbars:** a barra do topo (`#hdr-acts`/`rHdr`) não pode duplicar a barra de conteúdo (`bc-row`/`_piaBcRow`). Aplicar o padrão já usado em 8 abas às demais que ainda duplicam.
7. **Boot/performance:** diagnosticar e otimizar o delay de entrada e troca de abas; relatar antes/depois.

## FASE 1..N — Página por página, ABA POR ABA (todo o sidebar)

Para CADA item do menu, rodar o **checklist** e corrigir tudo antes de avançar:
(a) abre sem erro de console / sem tela branca; (b) cadastro manual grava no banco; (c) Cadastrar via IA (doc real + "Instruções extras") → INSERT; (d) Importar Excel (`import_<view>.xlsx`) → INSERTs; (e) Exportar Excel/PDF baixam; (f) editar/excluir reflete no banco; (g) botões funcionam e padronizados.

Cobrir TODOS (na ordem do menu): **GERAL** (Projetos, Dashboard); **ENGENHARIA** (Base Elétrica: Cabos/Eletrodutos/Quadros/SPDA/Specs, Sistemas Hidráulicos, Concretagens, Estruturas de Concreto, Composições SINAPI, Catálogo de Materiais, Isométricos/HUB, Equipamentos NR-13, Manutenção, Pintura, Andaime); **PLANEJAMENTO** (PCP, Orçamento, Compras, Composições, RDO Diário, HUB Planejador, Gantt); **QUALIDADE** (Mapa de Juntas, Relatórios END, Soldadores, Calibração, Pendências/NCs, Comissionamento); **SUPRIMENTOS** (Compras, Fornecedores, Catálogo); **SISTEMA** (Integrações, Equipe & Acessos — não alterar permissões reais, Meu Plano).

## BUGS CONHECIDOS (corrigir com prioridade — e PROVAR a correção)

1. **Orçamento quebra / não troca de aba interna:** `assets/js/orcamento.js (~258)` → `Uncaught TypeError: Cannot set properties of null (setting 'onclick')`. Faz `getElementById('orc-export-xlsx'/'orc-export-csv'/'orc-export-pdf'/'orc-import-ia').onclick=...`, mas o topo renderiza ids diferentes ("IA Import"/"Excel"/"PDF"). Casar os ids + proteger todo `getElementById(...).onclick` com checagem de nulo. Testar TODAS as abas internas (BOM, Insumos, BDI & Impostos, Cronograma Físico-Financeiro, Curva ABC, Comparativo), Templates, "+ Novo capítulo", "Adicionar da Base", IA Import, Excel, PDF e os totais. **Provar pelo Protocolo à prova de cache** (selo de build novo + console sem o erro).
2. **IA do RDO não funciona:** `PIAIARdo.openFromPhoto` (`assets/js/rdo-diario.js`) com `_docs/_test_assets/rdo_foto_manuscrita.pdf`. Diagnosticar (console + edge `analyze-discipline-doc` + doc-type) e corrigir até o INSERT.
3. **Importar/Exportar Excel inconsistente:** mapear todas as abas, achar a causa (ids/handlers/`VIEW_EXPORT_MAP`/`openImportExcel` sem a viewkey) e padronizar.
4. **Botões desproporcionais / mortos:** varrer toda a UI; zero `onclick` morto; tamanhos consistentes.

## Documentos reais para teste
`_amostras_teste/` e `_docs/_test_assets/` (PDFs por disciplina + `rdo_foto_manuscrita.pdf` + `import_<view>.xlsx` por aba) e `_modelos_teste/` (CSVs).

---

## ACEITE FINAL (prova obrigatória)

`_docs/RELATORIO_MASTER_<data>.md` com:
- **Matriz** sidebar × (render/manual/IA/import/export/editar/UI) toda verde, **com evidência por célula** (não basta marcar ✅).
- Para cada bug: reprodução (com a versão servida), causa-raiz **no código**, a correção (diff/commit), e o **log de verificação pós-fix** mostrando o `window.__BUILD__` novo no console + o resultado correto. Itens diagnosticados como "cache" só são aceitos com a prova do passo 3–5 do Protocolo.
- Console limpo por página (log), performance antes/depois, banco limpo (`__AUDIT__` removidos), Org A/B preservadas.

Só declare concluído quando os 7 itens do Definition of Done estiverem **provados** em produção (selo de build novo confirmado + função testada), nunca por suposição.
