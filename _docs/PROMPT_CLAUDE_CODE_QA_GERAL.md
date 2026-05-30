# PROMPT para Claude Code — QA geral PROJECT.IA (português, IAs, padronização, performance)

Você vai trabalhar no SaaS **PROJECT.IA** (engenharia multidisciplinar). App single-page principal: `hydrostec_v9.html` (~7.600 linhas, JS inline) + módulos em `assets/js/*.js` + `custom_views.js`. Backend Supabase. Deploy automático no Vercel a cada push na `main`. Service Worker em `sw.js` (constante de versão `V`); cache busters por módulo em `assets/js/module-loader.js` (campo `src: '...?v=N'`).

Trate as 6 frentes abaixo. Faça uma frente por vez, commit separado por frente, e valide cada uma antes de seguir.

---

## ⚠️ Cuidados de implementação (LER ANTES — já causaram quebra)

1. **Truncamento de arquivos:** edições nesses arquivos (CRLF) já truncaram o final em sessões anteriores. Depois de QUALQUER edição:
   - Confirme integridade: `grep -c "</html>" hydrostec_v9.html` deve ser `1`; `wc -l` não pode cair sem motivo.
   - `node --check assets/js/<arquivo>.js` em todo `.js` alterado.
   - Para blocos JS dentro do HTML, extraia o trecho e rode `node --check`.
2. **Cache:** todo arquivo em `/assets/` tem `Cache-Control: max-age=86400`. Ao alterar um módulo, **suba o cache buster** dele no `module-loader.js` (`?v=N`→`?v=N+1`) e **suba a versão do SW** (`sw.js`, `const V='projectia-vX.Y.Z'`). Sem isso, o navegador/SW servem a versão antiga. Para validar em produção, use **Ctrl+Shift+R**.
3. **Cliente Supabase único:** existe um singleton `window.__pia_sb` (criado em `hydrostec_v9.html`) exposto como `window.sb`. NUNCA crie um `createClient` novo sem reaproveitar `window.__pia_sb` (múltiplas instâncias GoTrueClient causam deadlock de auth e escritas presas). Os módulos devem ler `window.sb`/`window.__pia_sb`.
4. **Credenciais/ambiente de teste:** use as contas e IDs de teste documentados em `_docs/HANDOFF_NOVA_SESSAO.md` (Org A/B). NÃO crie contas novas. URL de produção: `https://testandosite-nu.vercel.app/hydrostec_v9.html`. Limpe registros de teste (`__AUDIT_*__`) ao final.

---

## Frente 1 — Corrigir todos os erros de português

Varra a interface inteira e corrija ortografia, acentuação e concordância em **todas as strings visíveis ao usuário**: labels, títulos, botões, `placeholder`, mensagens de `toast`/erro, textos de modais e estados vazios.

- Fontes: `hydrostec_v9.html`, `custom_views.js`, todos os `assets/js/*.js`.
- Mantenha acentuação correta (UTF-8): "Manutenção", "Pendências", "Concretagem", "Inspeção", "Cadastrar", "Relatório", etc.
- Não altere chaves técnicas, nomes de variáveis, ids, nem valores enviados ao banco — só o texto exibido.
- Critério de aceite: nenhuma palavra exibida com erro de português; nenhuma string com acento quebrado (mojibake).

## Frente 2 — Auditar e testar TODAS as funcionalidades de IA

Pontos de IA existentes (mapeie e teste cada um ponta-a-ponta: abrir modal → enviar arquivo/foto → extração → "Cadastrar" → confirmar INSERT no banco):

- **Modal padrão de disciplina:** `openDisciplineAIModal(disciplina)` em `assets/js/discipline-ai-modal.js` (disciplinas: `tubulacao`, `civil`, `eletrica`, `hidraulica`, `pintura`, `qualidade`, `instrumentacao`, `comissionamento`, `documentacao`, `manutencao`…). Tipos de documento em `DOC_TYPES`.
- **RDO:** `PIAIARdo.openFromPhoto` (`assets/js/ai-rdo.js`) e o caminho `openDisciplineAIModal('documentacao')`. **A IA do RDO NÃO está funcionando — investigar e corrigir** (verificar console, a edge function `analyze-discipline-doc`, o doc-type de RDO e o `PIAIARdo.openFromPhoto` chamado em `assets/js/rdo-diario.js`).
- **Equipamentos NR-13:** `openEquipAIModal()`.
- **Importação via IA / Excel:** `openAIImport(view)`.
- **Desenho Técnico (Hub Planejador):** `openAIWizard()` em `assets/js/tdraw.js` (ver Frente 3).

Para cada ponto: confirmar que o modal abre, a extração responde, o "Cadastrar" **insere no banco** (sem travar em silêncio) e há feedback de sucesso/erro explícito (toast). Liste num relatório o status de cada IA (OK / corrigido / pendente) e corrija o que estiver quebrado.

## Frente 3 — Padronizar a IA do Desenho Técnico (Hub Planejador)

Hoje o Desenho Técnico usa um modal **próprio e diferente**: `openAIWizard()` em `assets/js/tdraw.js` (overlay `#tdraw-ai-ov`, botão `#tdraw-ai`). Problemas: **não tem o campo de "Instruções extras"** e o **design é diferente** das outras abas.

O padrão correto é o `openDisciplineAIModal()` (`discipline-ai-modal.js`), que tem: design em 3 fases (Upload → Revisar → Cadastrar), o textarea **"Instruções extras (opcional)"** (`#dai-instr`), seleção de tipo de documento, dropdown de projeto e o fluxo de "Cadastrar selecionados".

Tarefa: fazer o Desenho Técnico usar o mesmo componente/fluxo do `openDisciplineAIModal` (idealmente substituir `openAIWizard` por uma chamada a `openDisciplineAIModal` com a disciplina/tipo de documento de desenhos técnicos, criando o doc-type em `DOC_TYPES` se faltar), de modo que fique **visualmente e funcionalmente idêntico** às demais — incluindo o campo de instruções extras. Critério: a IA do Desenho Técnico tem o mesmo visual, o campo de instruções extras e cadastra corretamente no banco.

## Frente 4 — Padronizar os botões (toolbars)

Contexto: existem duas barras — `#hdr-acts` (barra escura do topo, montada em `rHdr()` no `hydrostec_v9.html`) e a barra de conteúdo `bc-row` (helper `_piaBcRow()`, ao lado de "Cadastrar via IA"). O padrão desejado é: **a barra do topo NÃO deve ter botões de ação**; as ações ficam na barra de conteúdo, na ordem **[Excel ▾] · [Cadastrar via IA] · [+ Novo / ações próprias] · [Personalizar]**.

Já foi feito para 8 abas (Manutenção, Equipamentos NR-13, Pendências, RDO, Soldadores, Comissionamento, Relatórios de qualidade, Calibração): `#hdr-acts` esvaziado e `_piaBcRow` passou a incluir Excel ▾ + Personalizar (+ Corretiva/Nova OS na Manutenção).

Tarefa: aplicar o MESMO padrão às abas que ainda duplicam (têm `cfg` no `rHdr` **e** uma `bc-row` no conteúdo) — pelo menos **Pintura, Mapa de Juntas, Andaime** (e qualquer outra que ainda mostre botões na barra escura). Para cada uma: esvaziar a entrada no `cfg` do `rHdr` e garantir que a `bc-row` do conteúdo tenha Excel ▾ + Cadastrar via IA + Novo + Personalizar. Não mexer nas abas sem `bc-row` (ex.: Isométricos, Materiais, Parâmetros HH, Gantt) — nelas a barra do topo É a toolbar. Critério: nenhuma aba exibe a mesma ação em duas barras; visual consistente (classes `btn bia/bp/bg/bo`).

## Frente 5 — Corrigir delay/atraso de carregamento

Sintomas: **muito delay para entrar no v9** e em algumas páginas. Investigar e otimizar:

- Boot do `hydrostec_v9.html` (arquivo único ~7.600 linhas com muito JS inline e render síncrono). Medir TTFB, tempo até interativo e o que bloqueia a thread principal no load.
- Service Worker (`sw.js`): a estratégia é stale-while-revalidate; verificar se o `cache.addAll` no install ou o fetch handler estão atrasando o primeiro paint.
- Restauração de sessão / init do Supabase no load (evitar await bloqueante antes de renderizar a UI).
- Lazy-load (`module-loader.js`): confirmar que módulos pesados só carregam sob demanda e que nada essencial espera por eles.
- Entregar um diagnóstico curto (onde está o gargalo) + as otimizações aplicadas, com antes/depois (ex.: tempo de boot).

---

## Critérios de aceite gerais

- Cada frente em commit próprio, com mensagem clara, e cache buster/SW subidos quando houver mudança em assets.
- Todos os `.js` alterados passam em `node --check`; `hydrostec_v9.html` mantém `</html>` e contagem de linhas coerente.
- Nenhuma regressão: login, isolamento multi-tenant, e as IAs que já funcionavam continuam funcionando.
- Testar em produção após deploy (Ctrl+Shift+R) e reportar o status de cada frente.
- Banco limpo de registros de teste ao final.
