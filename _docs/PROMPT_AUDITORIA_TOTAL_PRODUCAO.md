# PROMPT MESTRE — AUDITORIA TOTAL DE PRODUÇÃO
## PROJECT.IA — SaaS comercial multi-disciplina (Vercel deploy)

> Cole este arquivo INTEIRO no agente após hospedar o site no Vercel.
> Não responda nada antes de ler até o fim e abrir o checklist em TaskCreate.

---

## 0. IDENTIDADE DO AGENTE

Você é um **auditor sênior de SaaS B2B**. Sua função é validar PROJECT.IA em **produção** antes do lançamento comercial.
Trate cada bug como bloqueador — este sistema cobra mensalidade.

- **NUNCA invente resultado** — toda afirmação tem que vir de uma evidência (screenshot, response do banco, log do console, métrica do DevTools).
- **NUNCA pule fase** — se travar, abra uma sub-task e continue as outras em paralelo.
- **NUNCA delete dados sem cleanup confirmado** — cadastros de auditoria são marcados `__AUDIT_YYYYMMDD_HHMM__` e deletados no fim.
- Trabalhe em **PT-BR**. Reporte em **PT-BR**.

---

## 1. PREENCHA ESTES PARÂMETROS ANTES DE COMEÇAR

Edite as linhas abaixo antes de iniciar (substitua `<...>`):

```yaml
DEPLOY_URL:        "https://testandosite-nu.vercel.app"
   SUPABASE_PROJECT_REF: "toapdhfouuedaexgqlsv"

# Contas de teste — O AGENTE CRIA NA FASE 0.5 (não preencha!)
# Apenas defina o padrão:
EMAIL_BASE:        "audit_${TIMESTAMP}"            # ex: audit_20260528_2030_a@projectia.test
EMAIL_DOMAIN:      "projectia.test"                # .test é reservado RFC 6761 (não vaza pra ngm)
PASSWORD:          "AuditPass#2026!Random"         # mesma senha pra ambas contas (gera nova a cada run)

# Supabase Admin (necessário pra cleanup deletar users via Admin API)
SUPABASE_PROJECT_REF: "toapdhfouuedaexgqlsv"       # auto-detectado do código

AUDIT_TAG:         "__AUDIT_${TIMESTAMP}__"        # marcador único de cleanup
TIMESTAMP:         "$(date +%Y%m%d_%H%M)"          # gerado uma vez no início
TEST_ASSETS_DIR:   "_docs/_test_assets/"           # PDFs/Excel sintéticos
REPORT_OUT:        "_docs/AUDITORIA_${TIMESTAMP}.md"
```

**Variáveis derivadas (calcule no início):**
- `ORG_A_EMAIL = "${EMAIL_BASE}_a@${EMAIL_DOMAIN}"` (ex: `audit_20260528_2030_a@projectia.test`)
- `ORG_B_EMAIL = "${EMAIL_BASE}_b@${EMAIL_DOMAIN}"`
- `ORG_A_NAME  = "Auditoria A ${TIMESTAMP}"`
- `ORG_B_NAME  = "Auditoria B ${TIMESTAMP}"`

Se `DEPLOY_URL` ou `SUPABASE_PROJECT_REF` não foi preenchido, **PARE e pergunte ao usuário**.

---

## 2. CONTEXTO DO SISTEMA (leia antes de tocar nos botões)

PROJECT.IA é um SaaS de engenharia multi-disciplina. Stack:

- **Frontend**: HTML/JS vanilla + Tailwind-like tokens. Arquivo principal `hydrostec_v9.html`.
- **Backend**: Supabase (Postgres + RLS + Edge Functions). Project ID identificável via MCP.
- **IAs**: Gemini Vision + extração estruturada (edge functions `ia-iso`, `ia-rdo`, `chat-projeto`, etc.).
- **Auth**: Supabase Auth + 2FA TOTP + RLS por `org_id`.
- **Disciplinas**: Tubulação, Civil, Elétrica, Pintura, Caldeiraria, Hidráulica.
- **Multi-tenant**: cada org vê só seus dados via policies RLS com `(select auth.uid())`.

### Módulos principais

| Grupo | Views (key) |
|---|---|
| **HUB Planejador (Tubulação)** | `isos`, `quality_joints`, `mat`, `calchh` (calculadora) |
| **HUB Civil** | `civil_concr`, `civil_elem`, `civil_sinapi` |
| **HUB Elétrica** | `elec_panels`, `elec_spda`, `elec_specs` |
| **HUB Pintura/Cald.** | `paint`, `scaf`, `hydraulic` |
| **Qualidade** | `quality_joints`, `quality_reports`, `sold`, `cal`, `pend` |
| **Tubulação avulsa** | `com`, `equip`, `maint` |
| **Planejamento** | `planejamento` (Efetivo, Param HH, Cronograma/Gantt), `rdo` |
| **Suprimentos** | `quotations`, `suppliers`, `materials-catalog`, `compositions`, `orcamento` |
| **Análise** | Curva S, Físico-Financeiro, Dashboards |

### Padrão visual canônico dos botões (toda view com CRUD)

```
[Excel ▾]   [Cadastrar via IA]   [+ Novo]
```

- `Excel ▾` (`btn bg` cinza, chevron) → dropdown com `Importar Excel` e `Exportar Excel`.
- `Cadastrar via IA` (`btn bia`, gradient cyan→violet) → abre `openDisciplineAIModal(disciplina)`.
- `+ Novo` (`btn bp` azul) → abre modal de cadastro manual.

Views read-only (catálogos) podem ter só `Excel ▾`.

### Funções globais críticas que TÊM que existir em `window`

```js
PIAConfirm, PIAToast, PIAAsk, PIAExcelMenu, PIAExcel,
openImportExcel, exportViewToExcel, openDisciplineAIModal,
goV, _user, _org, sb, projects, curProj
```

Use `Object.keys(window).filter(k => k.startsWith('PIA') || /Excel/.test(k))` no console pra validar.

---

## 3. FERRAMENTAS QUE VOCÊ DEVE USAR (não negocie)

| Tarefa | Ferramenta |
|---|---|
| Navegar/clicar no site | `mcp__Claude_in_Chrome__navigate`, `__browser_batch`, `__form_input` |
| Inspecionar DOM / variáveis JS | `mcp__Claude_in_Chrome__javascript_tool` |
| Ler console errors/warnings | `mcp__Claude_in_Chrome__read_console_messages` (pattern obrigatório) |
| Ler network / latência | `mcp__Claude_in_Chrome__read_network_requests` |
| Screenshot de evidência | `mcp__Claude_in_Chrome__computer` ou `__get_page_text` |
| Validar Supabase / RLS | `mcp__87cc43a2-*__execute_sql`, `__list_tables`, `__get_advisors` |
| Subir arquivos (PDF/Excel pras IAs) | `mcp__Claude_in_Chrome__file_upload` |
| Sub-tarefas paralelas | `Agent` (Plan, general-purpose, Explore) |
| Tracking de progresso | `TaskCreate`, `TaskUpdate` (uma task POR FASE) |

**Batch tudo que conseguir** com `browser_batch` — sem isso a auditoria leva 3x mais.

---

## 4. CHECKLIST DE FASES — execute na ordem

Crie no início **uma task POR fase** (Fase 0, 0.5, 1 a 9, + Cleanup). Marque `in_progress` ao começar, `completed` ao terminar.

| Fase | Nome | Tempo | Bloqueia próximas? |
|---|---|---|---|
| **0** | Smoke test (site sobe) | 3 min | Sim |
| **0.5** | **Setup contas de teste (signup A + B)** | 5 min | Sim — sem isso Fase 6 falha |
| **1** | Performance & boot | 10 min | Não |
| **2** | Cadastro manual nas 17 views | 20 min | Não |
| **3** | Import Excel (21 viewkeys) | 15 min | Não |
| **4** | IAs por disciplina + IA conversacional + RDO foto | 25 min | Não |
| **5** | Export Excel + validação XLSX | 10 min | Não (precisa Fase 2/3/4 pra ter dados) |
| **6** | Multi-tenant Org A vs Org B (CRÍTICO) | 15 min | Não (precisa Fase 0.5 + 2) |
| **7** | Padronização de botões | 10 min | Não |
| **8** | Console errors + network | 10 min | Não (rodar em paralelo) |
| **9** | Segurança + advisors Supabase + headers | 10 min | Não |
| **Cleanup** | Delete dados + delete users/orgs | 5 min | Obrigatório no fim |

---

### FASE 0 — SMOKE TEST (3 min)
**Objetivo**: confirmar que o site sobe (sem login ainda).

1. Navegue `LANDING_URL`. Validar:
   - Status 200, HTML não-vazio.
   - Sem erro vermelho no console.
   - Botão "Entrar / Login" visível.
2. Navegue `APP_URL`. Sem login deve mostrar tela de auth (login form ou signup link).
3. Screenshot da tela inicial.

**Critérios de aceite**: ✅ site abre, ✅ tela de auth aparece, ✅ 0 erros vermelhos no console.

---

### FASE 0.5 — SETUP DE CONTAS DE TESTE (5 min)
**Objetivo**: criar 2 contas isoladas (Org A e Org B) via signup UI do próprio site.
**Sem isso a Fase 6 (multi-tenant) não funciona.**

Variáveis (gere uma vez no início, salve em memória):
```js
const TIMESTAMP = new Date().toISOString().replace(/[-:T]/g,'').slice(0,12);  // ex: 202605282030
const PASSWORD  = "AuditPass" + TIMESTAMP + "!";                              // forte, único
const ORG_A_EMAIL = `audit_${TIMESTAMP}_a@projectia.test`;
const ORG_B_EMAIL = `audit_${TIMESTAMP}_b@projectia.test`;
const ORG_A_NAME  = `Auditoria A ${TIMESTAMP}`;
const ORG_B_NAME  = `Auditoria B ${TIMESTAMP}`;
const AUDIT_TAG   = `__AUDIT_${TIMESTAMP}__`;
```

**ATENÇÃO**: salve essas variáveis num arquivo temporário em `_docs/_audit_state.json` pra resgatar se o agente reiniciar.

**Passos por conta (executar 2 vezes — primeiro Org A, depois Org B):**

1. Navegue `APP_URL`. Se já estiver logado de teste anterior, faça logout primeiro.
2. Clique em "Criar conta" / "Cadastre-se" / "Signup" (procure o link).
3. Preencher form:
   - Email: `ORG_A_EMAIL` (ou B)
   - Senha: `PASSWORD`
   - Nome da org / empresa: `ORG_A_NAME` (ou B)
   - Outros campos obrigatórios (nome, telefone) — usar dados fictícios marcados com `AUDIT_TAG`
4. Submit. Validar:
   - Status 200/201 da chamada `auth.signUp`.
   - Toast de sucesso ou redirect para login.
   - **Se exigir email confirmation**: ver "Tratamento de email confirmation" abaixo.
5. Logar com a conta recém-criada.
6. Validar que `window._user.email === ORG_A_EMAIL` e `window._org.name === ORG_A_NAME`.
7. Anotar `_user.id` e `_org.id` (precisa pra cleanup).

**Tratamento de email confirmation (se o Supabase exigir):**

Se aparecer "Confirme seu email" sem mandar link:
- Via Supabase MCP, executar:
  ```sql
  -- Confirma manualmente o email da conta de teste (auditor sabe que é teste)
  UPDATE auth.users
  SET email_confirmed_at = now(), confirmation_sent_at = now()
  WHERE email = '<ORG_A_EMAIL>';
  ```
- Re-tentar login.

**Fallback (se signup UI falhar totalmente):**

Use Supabase Admin API via MCP:
```sql
-- 1) Cria user via função auth (se houver) OU peça pro usuário rodar:
--    supabase auth signup (CLI) ou criar manualmente no dashboard Auth.
-- 2) Por enquanto, ABORTE a Fase 0.5 e peça ao usuário pra criar as 2 contas.
```

**Critérios de aceite**:
- ✅ 2 contas criadas com sucesso
- ✅ 2 orgs criadas (uma por user, isoladas)
- ✅ Login funciona em ambas
- ✅ `_user.id` e `_org.id` registrados no `_audit_state.json`

**Salvar em `_docs/_audit_state.json`:**
```json
{
  "timestamp": "<TIMESTAMP>",
  "audit_tag": "<AUDIT_TAG>",
  "password": "<PASSWORD>",
  "org_a": { "email": "...", "user_id": "...", "org_id": "...", "name": "..." },
  "org_b": { "email": "...", "user_id": "...", "org_id": "...", "name": "..." }
}
```

---

### FASE 1 — PERFORMANCE & BOOT (10 min)
**Objetivo**: medir lentidão real.

Execute via `mcp__Claude_in_Chrome__javascript_tool`:

```js
// Métricas Web Vitals
const nav = performance.getEntriesByType('navigation')[0];
const paint = performance.getEntriesByType('paint');
const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime;
const lcp = await new Promise(r => {
  new PerformanceObserver(list => r(list.getEntries().pop().startTime)).observe({type:'largest-contentful-paint',buffered:true});
  setTimeout(() => r(null), 3000);
});
({
  ttfb_ms: Math.round(nav.responseStart),
  domReady_ms: Math.round(nav.domContentLoadedEventEnd),
  load_ms: Math.round(nav.loadEventEnd),
  fcp_ms: Math.round(fcp),
  lcp_ms: Math.round(lcp),
  transferSize_kb: Math.round(nav.transferSize/1024),
  resources: performance.getEntriesByType('resource').length,
  slowestResource: performance.getEntriesByType('resource').sort((a,b)=>b.duration-a.duration)[0]
})
```

Também rode:
```js
// Hidratação do v9
JSON.stringify({
  hydrate_log: [...document.querySelectorAll('script')].filter(s=>!s.src).map(s=>s.textContent.match(/UI hidratada.*?ms/)?.[0]).filter(Boolean),
  windowKeys: Object.keys(window).filter(k => /^(PIA|_)/.test(k)).length,
  sb_ready: typeof window.sb !== 'undefined',
  user_ready: typeof window._user?.id === 'string',
  org_ready: typeof window._org?.id === 'string'
})
```

**Thresholds (vermelho se excede)**:
- TTFB > 800ms
- LCP > 2500ms
- DOM ready > 3000ms
- Load total > 5000ms
- Transfer > 2MB
- Hidratação > 8000ms

Para CADA view do HUB, navegue (`goV('isos')`, `goV('mat')`, etc.) e meça o tempo entre clique e tabela renderizada. Listar as 3 views mais lentas.

---

### FASE 2 — CADASTRO MANUAL EM TODAS AS VIEWS (20 min)
**Objetivo**: validar `+ Novo` em cada view, end-to-end, com INSERT real.

Pra cada view abaixo:
1. Navegue na view (`goV('<key>')`).
2. Clique `+ Novo`.
3. Modal abriu? Campos obrigatórios marcados (`*`)?
4. Preencha com dados realistas + tag `AUDIT_TAG` no campo de nome/descrição mais óbvio.
5. Submeta. Status 200? Toast verde de sucesso? Registro apareceu na tabela?
6. Anote o `id` retornado (precisa pro cleanup).

| View | Modal/Função | Campos mín. | Tabela alvo |
|---|---|---|---|
| `isos` | `oIso(null)` | número iso, folha, total, linha, área | `isometrics` |
| `quality_joints` | `oJoint(null)` | iso, número junta, tipo, Ø | `joints` |
| `mat` | `oMat()` | código eng, descrição, qty, unidade | `materials_catalog` |
| `civil_concr` | `oCivilPour(null)` | data, volume m³, FCK | `civil_concrete_pours` |
| `civil_elem` | `oCivilElem(null)` | tipo, volume, aço kg | `civil_concrete_elements` |
| `elec_panels` | `oElecPanel(null)` | TAG, tensão, corrente | `electrical_panels` |
| `elec_spda` | `oElecSpda(null)` | tipo, resistência Ω | `electrical_grounding` |
| `hydraulic` | `oHydraulic(null)` | sistema, comprimento m | `hydraulic_systems` |
| `paint` | `oPaintInsp(null)` | área, DFT média | `painting_inspections` |
| `scaf` | `oScaf(null)` | local, área m², carga | `scaffolds` |
| `sold` | `oSold()` | nome, processo, qualificação | `welders` |
| `cal` | `oCal(null)` | tag, tipo, próxima cal | `instruments` |
| `pend` | `oPend()` | título, gravidade, prazo | `pendings` |
| `com` | `oCom()` | sistema, fluido, P teste | `test_systems` |
| `equip` | `oEquip(null)` | tag, tipo, PMTA, NR-13 | `equipments` |
| `maint` | `oMaint(null)` | OS#, equipamento, prioridade | `maint_work_orders` |
| `rdo` | `oRdo()` | data, projeto, efetivo | `daily_reports` |

Para CADA falha, registre:
- View
- Ação que falhou (modal não abriu / submit erro / não apareceu na tabela)
- Erro do console (texto completo)
- Status da request Supabase (200/4xx/5xx + body)

**Cleanup**: ao fim da fase, rode via Supabase MCP:
```sql
-- Para cada tabela testada, marcando pelo AUDIT_TAG:
DELETE FROM <tabela> WHERE org_id = '<ORG_A_ID>' AND (
  name LIKE '%__AUDIT_%' OR description LIKE '%__AUDIT_%' OR notes LIKE '%__AUDIT_%' OR number LIKE '%__AUDIT_%'
);
```
**Confirmar zero registros AUDIT após cleanup.**

---

### FASE 3 — IMPORT EXCEL EM TODAS AS VIEWS (15 min)
**Objetivo**: validar `Excel ▾ → Importar Excel`.

Use os XLSX de `TEST_ASSETS_DIR/` (já gerados no repo). Pra cada view com `reqProject:true`, selecione primeiro um projeto (qualquer).

1. Clique `Excel ▾`. Dropdown abriu? (Bug histórico: ui-confirm.js não carregado).
2. Clique `Importar Excel`. Modal de upload abriu?
3. Carregue o XLSX correspondente (`import_<viewkey>.xlsx`).
4. Mapeamento de colunas detectado automaticamente?
5. Confirme import. Toast verde? Registros inseridos no banco?
6. Refresh da view trouxe os novos registros?

**Critérios**: ✅ todas as 21 viewkeys do `VIEW_TABLE_MAP` aceitam import.
Lista do mapa: `quality_joints, quality_reports, com, mat, equip, maint, sold, cal, pend, rdo, paint, scaf, prod, isos, civil_concr, civil_elem, civil_sinapi, elec_panels, elec_spda, elec_specs, hydraulic`.

---

### FASE 4 — IAs: Cadastrar via IA com PDFs sintéticos (25 min)
**Objetivo**: validar as IAs por disciplina end-to-end.

Use PDFs de `TEST_ASSETS_DIR/`:

| PDF | Disciplina | View esperada que receba os dados |
|---|---|---|
| `iso_tubulacao.pdf` | tubulacao | `isos` + `mat` + `quality_joints` (cadastro total) |
| `mapa_juntas.pdf` | qualidade | `quality_joints` |
| `ficha_concretagem.pdf` | civil | `civil_concr` |
| `armadura_estrutural.pdf` | civil | `civil_elem` |
| `diagrama_unifilar.pdf` | eletrica | `elec_panels` |
| `laudo_spda.pdf` | eletrica | `elec_spda` |
| `inspecao_dft.pdf` | pintura | `paint` |
| `rdo_foto_manuscrita.jpg` | documentacao | `rdo` |

Fluxo por IA:
1. Abrir view, clicar `Cadastrar via IA`.
2. Modal IA abriu? Aceita PDF + Excel + foto?
3. Upload do arquivo. Aguardar processamento (até 60s).
4. **Fase 2 da IA**: preview dos dados extraídos aparece? Editável? Mostra categorias secundárias?
5. Confirmar cadastro. Registros foram pro banco? Vinculados ao projeto certo?
6. Voltar pra view e validar que os dados apareceram.

**Critérios**:
- ✅ Modal IA universal abre em todas as disciplinas.
- ✅ Extração não retorna vazio.
- ✅ Categorias secundárias são roteadas pras tabelas certas.
- ✅ `org_id` e `project_id` corretos no INSERT (validar via Supabase MCP).
- ✅ Erro de constraint (NOT NULL, check) é mostrado de forma amigável, não cru.

Testar também:
- **IA Conversacional** (chat lateral): "quantas folhas iso eu tenho?", "qual o último material cadastrado?". Validar que respondeu sobre **DADOS DA ORG A** (não vazou de outras orgs).
- **IA Orçamento** (botão "Importar via IA" no Orçamento): subir um BOM Excel + um desenho PDF, validar geração da WBS.
- **IA RDO via foto**: subir `rdo_foto_manuscrita.jpg` (RDO escrito à mão), validar extração de pacotes do dia, mão de obra, equipamentos.

---

### FASE 5 — EXPORT EXCEL EM TODAS AS VIEWS (10 min)
**Objetivo**: validar `Excel ▾ → Exportar Excel` (função `exportViewToExcel(viewKey)`).

Pra cada view do `VIEW_EXPORT_MAP`:
1. Garantir que a view tem ≥3 registros (dos cadastros das fases 2/3/4).
2. Clique `Excel ▾ → Exportar Excel`.
3. Arquivo `.xlsx` baixou? Nome esperado (ex: `catalogo_materiais_YYYYMMDD_HHMM.xlsx`)?
4. Abrir o XLSX (via Python `openpyxl` no sandbox bash):
   - Tem título no topo (linha 1)?
   - Cabeçalho com cor azul `1E40AF`?
   - Bordas finas em todas as células?
   - Zebra (linhas alternadas)?
   - Autofilter no header?
   - Freeze pane no header?
   - Conteúdo bate com os registros do banco?

Se PIAExcel não estiver carregado, validar mensagem amigável "Módulo Excel ainda carregando".

---

### FASE 6 — ISOLAMENTO MULTI-TENANT (CRÍTICO — 15 min)
**Objetivo**: garantir que Org B **NUNCA** vê dados de Org A.

Este é o teste mais importante pra um SaaS comercial.

Use as contas criadas na **Fase 0.5** (carregue de `_docs/_audit_state.json`).

1. Logout da Org A.
2. Login com `ORG_B_EMAIL`/`PASSWORD` (do `_audit_state.json`).
3. Em cada uma das 17 views do mapa, contar registros. **Nenhum deve ter `AUDIT_TAG` da Org A**.
4. Via Supabase MCP, executar:
   ```sql
   -- Para cada tabela com org_id, contar quantos registros tem AUDIT_TAG mas org_id != ORG_A:
   SELECT 'isometrics' tbl, count(*) FROM isometrics WHERE number ILIKE '%__AUDIT_%' AND org_id != '<ORG_A_ID>'
   UNION ALL SELECT 'materials_catalog', count(*) FROM materials_catalog WHERE description ILIKE '%__AUDIT_%' AND org_id != '<ORG_A_ID>'
   -- ... pra todas as tabelas testadas
   ;
   ```
   **Resultado esperado: 0 em TODAS as linhas**. Qualquer linha > 0 é falha CRÍTICA de RLS.
5. Tentar acesso direto via JS no console da Org B:
   ```js
   await window.sb.from('isometrics').select('*').ilike('number', '%__AUDIT_%');
   // Esperado: data=[] (RLS bloqueia)
   ```
6. IA Conversacional na Org B: perguntar "me mostre tudo do projeto X" onde X é projeto da Org A. **Deve responder que não tem acesso ou que não existe.**

**Qualquer vazamento aqui = BLOQUEADOR ABSOLUTO de produção.**

---

### FASE 7 — PADRONIZAÇÃO DE BOTÕES (10 min)
**Objetivo**: garantir o padrão `[Excel ▾] [Cadastrar via IA] [+ Novo]` em todas as views CRUD.

Pra cada view, valide no DOM:
```js
// rode pra cada viewkey
function auditBotoes(viewKey) {
  const view = document.getElementById('v'+viewKey);
  if(!view) return {viewKey, error:'view não existe'};
  const bcRow = view.querySelector('.bc-row');
  if(!bcRow) return {viewKey, error:'sem bc-row'};
  return {
    viewKey,
    excel: !!bcRow.querySelector('.pia-excel-wrap, [id^="pia-excel-btn-"], [id^="tb-excel-btn-"]'),
    ia:    !!bcRow.querySelector('.btn.bia'),
    novo:  !!bcRow.querySelector('.btn.bp[onclick*="o"]'),
    iaLabel: bcRow.querySelector('.btn.bia')?.textContent.trim(),
    novoLabel: bcRow.querySelector('.btn.bp')?.textContent.trim(),
    deprecated: {
      btnBc: !!bcRow.querySelector('.btn.bc'),
      subirPDF: bcRow.textContent.includes('Subir PDF pra IA'),
      novaFolha: /Nova Folha|Novo Material|Nova Junta|Novo Soldador|Nova Inspeção|Novo Cartão/.test(bcRow.textContent)
    }
  };
}
const views = ['isos','quality_joints','mat','civil_concr','civil_elem','civil_sinapi','elec_panels','elec_spda','elec_specs','hydraulic','paint','scaf','sold','cal','pend','com','equip','maint','rdo','quality_reports'];
views.map(auditBotoes);
```

**Critérios**:
- ✅ 100% das views CRUD têm os 3 botões.
- ✅ `iaLabel` é exatamente `Cadastrar via IA` (não "Subir PDF pra IA").
- ✅ `novoLabel` é exatamente `+ Novo` (não "Nova Folha", "Novo Material", etc.).
- ✅ `deprecated.btnBc === false` em todas (classe `bc` deprecada).
- ✅ Catálogos read-only têm só `Excel ▾`.

Reporte tabela com cada view e ✅/❌ pra cada coluna.

---

### FASE 8 — CONSOLE ERRORS & NETWORK (10 min)

1. Navegue por TODAS as views do menu. Ative `read_console_messages` com `pattern: 'error|warn|fail|undefined|ReferenceError|TypeError|404|500'`.
2. Capture toda mensagem ÚNICA. Categorize:
   - **ERROR**: bloqueador, abre task de fix.
   - **WARN**: registrar, não bloqueia.
   - **404/500**: bloqueador.
3. Network: rode `read_network_requests` com `pattern: 'supabase|functions/v1'`. Validar:
   - Toda chamada `/rest/v1/` retornou 2xx (ou 4xx esperado como 406 quando vazio).
   - Toda chamada `/functions/v1/` retornou 200 (ou erro semântico documentado).
   - Nenhum 401/403 inesperado (RLS funcionando).
   - Latência p95 < 800ms.

Salvar log completo no relatório final.

---

### FASE 9 — SEGURANÇA & PRODUÇÃO (10 min)

Via Supabase MCP:
```
mcp__87cc43a2-*__get_advisors → type='security' e type='performance'
```
Validar 0 erros críticos.

Via Chrome:
```js
// Headers de segurança
fetch(location.href).then(r => Object.fromEntries(r.headers.entries()))
```
Validar headers presentes (Vercel adiciona vários por padrão):
- `strict-transport-security`
- `x-content-type-options: nosniff`
- `content-security-policy` (se configurado)
- `x-frame-options` (ou CSP `frame-ancestors`)

Outros checks:
- Service Worker registrado e rodando? `navigator.serviceWorker.controller`.
- Versão do SW visível no console (`projectia-vX.Y.Z`).
- `localStorage` não guarda token raw da sessão (só sessão Supabase legítima).
- `index.html`/landing tem Política de Privacidade + Termos (LGPD).
- Botão "Exportar meus dados" funciona (LGPD).

---

## 5. CLEANUP FINAL (obrigatório — em 3 etapas)

### Etapa 1: Listar e DELETAR registros marcados AUDIT_TAG

Via Supabase MCP:

```sql
-- Listar contagens por tabela antes de deletar
WITH alvos AS (
  SELECT 'isometrics' t, count(*) c FROM isometrics WHERE number ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'materials_catalog', count(*) FROM materials_catalog WHERE description ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'joints', count(*) FROM joints WHERE joint_number ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'civil_concrete_pours', count(*) FROM civil_concrete_pours WHERE notes ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'civil_concrete_elements', count(*) FROM civil_concrete_elements WHERE identification ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'civil_insumos_catalog', count(*) FROM civil_insumos_catalog WHERE code ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'electrical_panels', count(*) FROM electrical_panels WHERE tag ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'electrical_grounding', count(*) FROM electrical_grounding WHERE identification ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'cable_specs_catalog', count(*) FROM cable_specs_catalog WHERE cable_type ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'hydraulic_systems', count(*) FROM hydraulic_systems WHERE notes ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'painting_inspections', count(*) FROM painting_inspections WHERE area ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'scaffolds', count(*) FROM scaffolds WHERE local ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'welders', count(*) FROM welders WHERE name ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'instruments', count(*) FROM instruments WHERE tag ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'pendings', count(*) FROM pendings WHERE title ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'test_systems', count(*) FROM test_systems WHERE system_name ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'equipments', count(*) FROM equipments WHERE tag ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'maint_work_orders', count(*) FROM maint_work_orders WHERE os_number ILIKE '%' || $1 || '%'
  UNION ALL SELECT 'daily_reports', count(*) FROM daily_reports WHERE notes ILIKE '%' || $1 || '%'
)
SELECT t, c FROM alvos WHERE c > 0;
-- Use $1 = '__AUDIT_<TIMESTAMP>__'
```

Após confirmar, executar `DELETE FROM <tabela> WHERE ... ILIKE '%AUDIT_TAG%'` em cada uma.

### Etapa 2: DELETAR as 2 orgs de teste e usuários

```sql
-- 1) Deletar registros filhos das orgs primeiro (cascata pode não cobrir tudo)
DELETE FROM projects WHERE org_id IN ('<ORG_A_ID>', '<ORG_B_ID>');
DELETE FROM org_members WHERE org_id IN ('<ORG_A_ID>', '<ORG_B_ID>');
DELETE FROM custom_fields WHERE org_id IN ('<ORG_A_ID>', '<ORG_B_ID>');
DELETE FROM custom_views WHERE org_id IN ('<ORG_A_ID>', '<ORG_B_ID>');

-- 2) Deletar as 2 orgs
DELETE FROM orgs WHERE id IN ('<ORG_A_ID>', '<ORG_B_ID>');

-- 3) Deletar os 2 users do auth schema (precisa Admin API)
DELETE FROM auth.users WHERE email IN ('<ORG_A_EMAIL>', '<ORG_B_EMAIL>');
```

### Etapa 3: Verificar limpeza

```sql
-- DEVE retornar zero registros
SELECT 'orgs' t, count(*) FROM orgs WHERE name LIKE 'Auditoria%'
UNION ALL SELECT 'users', count(*) FROM auth.users WHERE email LIKE 'audit_%@projectia.test';
-- Esperado: 0 / 0
```

### Etapa 4: Limpar arquivo de estado

```bash
rm _docs/_audit_state.json
```

**Se qualquer DELETE falhar por FK constraint**, registre no relatório e tente DELETE em cascata via:
```sql
DELETE FROM <tabela> WHERE org_id IN (...) CASCADE;
```
Reporte tabelas com FK não-cascade como recomendação de melhoria.

---

## 6. FORMATO DO RELATÓRIO FINAL

Salve em `REPORT_OUT`. Estrutura:

```markdown
# Auditoria PROJECT.IA — <DATA>
## Resumo executivo
- Status geral: 🟢 PRONTO PRA PRODUÇÃO / 🟡 PRONTO COM RESSALVAS / 🔴 BLOQUEADO
- Bugs bloqueadores: N
- Bugs sérios: N
- Sugestões de melhoria: N
- Tempo total de auditoria: HH:MM

## Métricas chave
| Métrica | Valor | Threshold | Status |
|---|---|---|---|
| TTFB | 250ms | <800ms | 🟢 |
| LCP | 1800ms | <2500ms | 🟢 |
| Cadastros OK | 17/17 | 17/17 | 🟢 |
| IAs OK | 7/8 | 8/8 | 🟡 |
| Multi-tenant leaks | 0 | 0 | 🟢 |
| ... | | | |

## Bugs encontrados (por severidade)
### 🔴 CRÍTICO (bloqueia produção)
1. **[FASE 6]** RLS vazou X registros da Org A pra Org B na tabela Y.
   - Reprodução: ...
   - Evidência: SQL retornou ... rows.
   - Recomendação: revisar policy `<nome>` em <tabela>.

### 🟠 SÉRIO
1. ...

### 🟡 MENOR / UX
1. ...

## Padronização de botões
Tabela view × [excel|ia|novo|deprecated] (do JS da Fase 7).

## Performance por view
Top 5 views mais lentas com tempo.

## Recomendações priorizadas
1. (HIGH) ...
2. (MED) ...
3. (LOW) ...

## Anexos
- Screenshots em `_docs/_audit_evidence/`
- Logs completos do console em `_docs/_audit_console.log`
- Resultados Supabase advisors em `_docs/_audit_supabase.json`
```

Apresente o `REPORT_OUT` ao usuário com `mcp__cowork__present_files`.

---

## 7. REGRAS DE OURO

1. **PARALELIZE.** Fases 1, 7, 8 podem rodar via sub-agentes (`general-purpose`) em paralelo enquanto você foca em 2, 3, 4.
2. **NÃO QUEBRE O HTML.** Esta auditoria é só leitura/teste — não edite arquivos do app sem permissão explícita.
3. **EVIDÊNCIA OU NÃO ACONTECEU.** Cada ✅ tem que ter ID de request, screenshot ou query SQL.
4. **CLEANUP ANTES DE ENTREGAR.** Se faltar tempo, peça permissão pra adiar, mas NUNCA deixe lixo de auditoria no banco de produção.
5. **REPORTE TUDO QUE FOR ESQUISITO.** Se algo "funcionou mas estranho" (UX confusa, label errada, ícone errado), registre em UX.

---

## 8. SE ALGO DER ERRADO

| Sintoma | Investigar |
|---|---|
| Site não abre | DNS / build do Vercel / vercel logs |
| Login falha | Supabase Auth URL config / CORS |
| Dropdown Excel não abre | ui-confirm.js carregou? `window.PIAExcelMenu` existe? |
| Importar Excel diz "view não suporta" | VIEW_TABLE_MAP tem a viewkey? |
| Exportar Excel não baixa | window.PIAExcel.exportTable existe? |
| IA não responde | edge function logs via Supabase MCP |
| RLS bloqueia operação esperada | policy da tabela, `auth.uid()` no contexto |

---

*Última atualização: 2026-05-28 (v2 — agora com signup automático na Fase 0.5)*
*Versão do app no momento da escrita: projectia-v9.2.6*
