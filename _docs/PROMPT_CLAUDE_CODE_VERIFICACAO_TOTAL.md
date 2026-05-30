# PROMPT para Claude Code — Verificação TOTAL e certificação do PROJECT.IA (produto comercial, zero erro)

Você vai executar uma **verificação completa e cética** do SaaS **PROJECT.IA** — testar de verdade cada funcionalidade, achar todo bug, corrigir, e **re-testar até certificar 100%**. Este é um produto comercial: não pode haver erro. Nada de suposição, nada de "deve funcionar", nada de "é cache". **Rodar → verificar → provar.** Use quantos tokens forem necessários.

- App: `hydrostec_v9.html` (~7.600 linhas, JS inline) + `assets/js/*.js` + `custom_views.js`.
- Produção: `https://testandosite-nu.vercel.app/hydrostec_v9.html` (Vercel; deploy a cada push na `main`).
- SW: `sw.js` (`const V='projectia-vX.Y.Z'`). Cache busters: `module-loader.js` (`?v=N`). CSP em `vercel.json` (header) e `<meta>`. Backend Supabase, cliente singleton `window.__pia_sb` (= `window.sb`).
- Credenciais de teste (Org A/B) em `_docs/HANDOFF_NOVA_SESSAO.md`. Não criar contas pela UI. Marcar dados de teste com `__AUDIT__` e limpar ao final.

---

## ⛔ REGRAS INVIOLÁVEIS

1. **Proibido presumir.** Nenhum item é "OK" sem **evidência de teste real**: saída do console, linha retornada por SQL, resposta HTTP, ou screenshot. "Deve funcionar"/"provavelmente"/"presumo" = não verificado.
2. **Proibido culpar o cache sem prova.** "É cache" é hipótese; só vira diagnóstico depois do "Protocolo à prova de cache" provar que (a) a origem serve o código novo e (b) com o código novo em execução o problema some. Caso contrário é **bug no código** — ache a causa-raiz.
3. **Verificou na origem, não no local.** "Funciona no meu código" não vale. Vale o **arquivo servido pela produção**, com o selo de build novo confirmado no console, e a função exercida ali.
4. **Achou bug → corrige → re-testa → certifica.** Verificação que encontra falha não termina em "anotado": termina em corrigido e re-verificado com evidência.

---

## 🧪 PROTOCOLO À PROVA DE CACHE (usar sempre que validar algo em produção)

1. **Selo de build:** garanta um `window.__BUILD__='vX.Y.Z+<timestamp>'` no `hydrostec_v9.html`, logado no boot (`console.log('[build]', window.__BUILD__)`). Incrementado a cada deploy. É a fonte da verdade de "qual código está rodando".
2. **Versionadores:** ao mudar um asset, suba o `?v=N` do módulo (`module-loader.js`) E a versão `V` do SW (`sw.js`). (`/assets/` tem `max-age=86400`.)
3. **Prove que a origem serve o novo:** `fetch('<arquivo>?cb='+Date.now(), {cache:'no-store'})` e confirme que o trecho corrigido + o selo estão lá. Veio o antigo → deploy pendente (espere o Vercel), não é "cache do usuário".
4. **Ambiente limpo:** antes de testar a UI, desregistre o SW e limpe caches (`serviceWorker.getRegistrations()→unregister`; `caches.keys()→delete`) **ou** use janela anônima. Recarregue e confirme o `__BUILD__` novo no console.
5. **Teste a função.** `__BUILD__` novo + bug persiste → **é bug** (causa-raiz). `__BUILD__` antigo → problema de deploy/versão, não "cache do navegador".
6. **Registre a evidência** (URL fetchada, trecho confirmado, `__BUILD__`, resultado).

---

## ESCOPO DA VERIFICAÇÃO (testar TUDO, com evidência)

### A) Autenticação e sessão
Signup (sem criar conta real — usar fluxo de teste), login, logout, refresh mantém sessão, timeout/erro amigável, recuperação. Sem "Multiple GoTrueClient instances" no console.

### B) Multi-tenant / segurança (CRÍTICO)
Logar Org A e Org B em paralelo. Provar por UI **e** SQL que A não lê/edita dados de B (RLS). Tentar burlar via console/URL e confirmar bloqueio. Nenhum dado vaza entre orgs.

### C) Cada página do sidebar — aba por aba (TODAS)
Para cada item, checklist com evidência: (a) abre sem erro de console / sem tela branca; (b) cadastro manual grava (SQL antes/depois); (c) **Cadastrar via IA** com doc real + "Instruções extras" → INSERT + toast; (d) **Importar Excel** com `import_<view>.xlsx` → INSERTs; (e) **Exportar Excel/PDF** baixam corretos; (f) editar/excluir reflete no banco; (g) todos os botões funcionam (zero `onclick` morto) e têm tamanho/estilo padronizados.

Cobrir, na ordem do menu: **GERAL** (Projetos, Dashboard); **ENGENHARIA** (Base Elétrica: Cabos/Eletrodutos/Quadros/SPDA/Specs; Sistemas Hidráulicos; Concretagens; Estruturas de Concreto; Composições SINAPI; Catálogo de Materiais; Isométricos/HUB; Equipamentos NR-13; Manutenção; Pintura; Andaime); **PLANEJAMENTO** (PCP; Orçamento; Compras; Composições; RDO Diário; HUB Planejador; Gantt); **QUALIDADE** (Mapa de Juntas; Relatórios END; Soldadores; Calibração; Pendências/NCs; Comissionamento); **SUPRIMENTOS** (Compras; Fornecedores; Catálogo); **SISTEMA** (Integrações; Equipe & Acessos — não alterar permissões reais; Meu Plano).

### D) Todas as IAs (ponta a ponta)
`openDisciplineAIModal` por disciplina; `PIAIARdo.openFromPhoto` (RDO por foto, `rdo_foto_manuscrita.pdf`); `openEquipAIModal`; `openAIImport`; IA do Desenho Técnico (`tdraw.openAIWizard`). Cada uma: abre → extrai → **Cadastrar insere no banco** → toast. Sem travar em silêncio.

### E) Excel / PDF
Importar e Exportar em TODAS as abas com o botão. Mapear quais funcionam e quais não; corrigir até funcionar em todas. Testar erros (linha inválida, coluna faltando).

### F) Console e rede (toda página)
Zero erro/warning evitável: CSP (`frame-ancestors` no `<meta>` é ignorado → mover/remover; liberar `unpkg.com` no `connect-src` para o sourcemap do lucide, ou self-hostar), meta deprecado (`apple-mobile-web-app-capable` → add `mobile-web-app-capable`), nenhum recurso bloqueado, nenhum `Uncaught`.

### G) UI/UX profissional
Botões padronizados (tamanho/padding/fonte/ícone), sem desproporção; toolbars sem duplicar ações (barra do topo `#hdr-acts` x barra de conteúdo `bc-row`); estados vazios e mensagens claras; responsivo básico; português correto em toda string visível.

### H) Performance
Medir boot do v9 (TTFB, tempo até interativo) e troca de abas. Sem delay perceptível. Relatar antes/depois das otimizações.

---

## BUGS JÁ CONHECIDOS (verificar e corrigir com prioridade)
1. **Orçamento:** `assets/js/orcamento.js (~258)` → `Cannot set properties of null (setting 'onclick')` — faz `getElementById('orc-export-xlsx'/'orc-export-csv'/'orc-export-pdf'/'orc-import-ia').onclick` mas o topo tem ids "IA Import"/"Excel"/"PDF". Casar ids + proteger contra nulo; testar todas as abas internas, Templates, "+ Novo capítulo", "Adicionar da Base", IA Import, Excel, PDF e totais.
2. **IA do RDO** não funciona — diagnosticar e corrigir até o INSERT.
3. **Importar/Exportar Excel** inconsistente entre abas — padronizar.
4. **Botões mortos/desproporcionais** — varrer e corrigir.

## Documentos reais para teste
`_amostras_teste/`, `_docs/_test_assets/` (PDFs por disciplina + `rdo_foto_manuscrita.pdf` + `import_<view>.xlsx` por aba), `_modelos_teste/` (CSVs).

## ⚠️ Cuidados técnicos
- **Truncamento (CRLF):** após CADA edição, `grep -c "</html>" hydrostec_v9.html`=1, linhas coerentes, `node --check` em todo `.js` (e nos blocos JS do HTML extraídos).
- Nunca criar `createClient` novo sem reusar `window.__pia_sb`.
- Limpar `__AUDIT__` ao final; preservar Org A/B; não mexer em permissões reais.

---

## CERTIFICAÇÃO FINAL (só entregar quando 100% PROVADO)

Produza `_docs/CERTIFICACAO_<data>.md` com:
- **Matriz de verificação** de A–H, item a item, = ✅/❌ **com evidência por célula** (console, SQL, resposta HTTP, screenshot). Sem evidência ≠ ✅.
- Para cada bug: reprodução (na versão servida) → causa-raiz no código → correção (commit/diff) → **re-teste com `window.__BUILD__` novo confirmado** mostrando o resultado correto.
- Console limpo por página (logs), resultado multi-tenant, métricas de performance antes/depois.
- Declaração final: "Verificado em produção (build vX.Y.Z), 100% das funcionalidades testadas e aprovadas, com as evidências acima."

Só assine a certificação quando **toda** a matriz estiver verde **com prova**. Qualquer item sem evidência, ou diagnosticado como "cache" sem o Protocolo, invalida a certificação.
