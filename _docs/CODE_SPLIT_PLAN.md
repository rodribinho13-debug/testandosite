# Plano de Code Split — hydrostec_v9.html
**Origem:** auditoria 2026-05-28 — renderer Chrome MCP travava no bundle inline de 570KB.
**Status:** plano. Não executado nesta sessão por exigir ambiente de teste estável.

---

## Por que dividir

| Métrica | Atual | Alvo |
|---|---|---|
| Tamanho inline do script principal | ~540KB | <120KB |
| TTI (Time to Interactive) | ~1.5s | <600ms |
| Renderer ocupado durante boot | ~10s | <3s |
| Chrome MCP `Runtime.evaluate` estável | ❌ timeouts frequentes | ✅ |

Benefícios secundários: cliente cacheia chunks JS por URL (assets/js/*.js), próximas visitas só baixam o HTML.

---

## Mapa de funções por tamanho e prioridade de extração

Funções `r<View>()` analisadas (renderers que rodam quando `goV(<key>)` é chamado):

| Função | Tamanho | Lazy? | Globais consumidas | Prioridade |
|---|---|---|---|---|
| `rPanel` | 12.8 KB | ❌ (roda no login) | _user, _org, projects, _kpis | C |
| `rQualityJoints` | 8.8 KB | ✅ | _joints, sb, curProj | A |
| `rCivilConcr` | 7.6 KB | ✅ | _civilPours, sb, curProj | A |
| `rQualityReports` | 6.6 KB | ✅ | _ndtReports, sb, curProj | A |
| `rInt` | 6.4 KB | ✅ | _integrations | B |
| `rHydraulic` | 6.0 KB | ✅ | _hydraulic, sb | A |
| `rElecPanels` | 5.5 KB | ✅ | _elecPanels, sb | A |
| `rElecSpda` | 5.3 KB | ✅ | _spda, sb | A |
| `rGantt` | 4.7 KB | ✅ | sheets, projects, Gantt lib | B |
| `rTeam` | 3.3 KB | ✅ | members, invites | B |
| `rProd` | 2.8 KB | ✅ | _prodParams | B |
| `rRefs` | 2.5 KB | ✅ | (static catálogo) | B |
| `rDash` | 2.0 KB | ✅ | _kpis, Chart | B |
| `rPlan` | 0.4 KB | ✅ | _user.plan | (não vale) |

**Total prioridade A (4 funções):** 35 KB
**Total prioridade A+B (12 funções):** 68 KB

---

## Bloqueador técnico: globais locais

As funções dependem de variáveis declaradas com `let` no escopo do inline script:

```js
let _welders = [], _pendings = [], _rdos = [], _testsys = [], _materials = [];
let _civilPours = [], _civilElements = [], _elecPanels = [], _spda = [];
let _hydraulic = [], _scaffolds = [], _instruments = [], _equipments = [];
let _joints = [], _ndtReports = [], _kpis = {}, _prodParams = [];
let _integrations = [], members = [], invites = [];
```

E funções helper:
```js
function san(s){...}        // sanitize HTML
function toast(msg, tipo){} // notification
function fmtD(s){}          // format date
function cm(id){}           // close modal
```

Sem essas no `window.*`, código externo vê `undefined`.

---

## Estratégia recomendada (3 passos)

### Passo 1: Promover globais (30 min, baixo risco)

No final do bloco de declarações (`let _user=null; ...`), adicionar:

```js
// Expose internal state to external modules (assets/js/views-*.js)
window._state = {
  get welders(){ return _welders },
  get pendings(){ return _pendings },
  get rdos(){ return _rdos },
  // ... etc
};
// E expor helpers
window.san = san;
window.toast = toast;
window.fmtD = fmtD;
window.cm = cm;
```

Não promover via reescrita das vars (mantém escopo léxico interno) — só getters em `window._state`.

### Passo 2: Extrair 4 funções A (1h, médio risco)

Criar `assets/js/views-quality-civil.js`:

```js
(function(){
  'use strict';
  const $ = (s) => document.querySelector(s);
  const sb = () => window.__pia_sb || window.sb;
  const _state = () => window._state || {};

  window.rQualityJoints = async function(){
    // ...copiar corpo, trocar _joints por _state().joints, etc.
  };
  window.rCivilConcr = async function(){ /* ... */ };
  window.rQualityReports = async function(){ /* ... */ };
  window.rHydraulic = async function(){ /* ... */ };
})();
```

Adicionar no HTML:
```html
<script src="assets/js/views-quality-civil.js?v=1" defer></script>
```

Remover as 4 funções do inline. Validar `node --check` no inline.

### Passo 3: Extrair 8 funções B (1h, médio risco)

Criar `assets/js/views-analytics.js` com rDash, rGantt, rTeam, rProd, rInt, rRefs, rElecPanels, rElecSpda.

---

## Testes mínimos antes de cada deploy

1. `node --check` no inline depois da extração (catch syntax errors)
2. Login em browser real, navegar 1× pra cada view extraída — sem erro vermelho no console
3. Validar via `typeof window.rQualityJoints === 'function'` no console
4. Cleanup de cache (`navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.update()))`)

---

## Não tocar (alto risco)

- `rPanel` — roda no boot, tem dependência circular com cálculo de KPIs
- `doSI` / `doSU` / `initApp` — fluxo de auth crítico
- Modais HTML (linhas 240-450) — fora do script, mas ligados via onclick inline
- `goV()` — roteador, base de tudo
- `loadExtra()` — fetch agregado disparado em initApp

---

## Estimativa de impacto

| Métrica | Antes | Depois Passo 1 | Depois Passo 2 | Depois Passo 3 |
|---|---|---|---|---|
| Inline JS | 540 KB | 542 KB (+globals) | 507 KB | 472 KB |
| TTI | 1.5s | 1.5s | 1.3s | 1.1s |
| Cache hit rate (visita repetida) | ~0% (tudo inline) | ~0% | ~5% | ~10% |

**Ganho real:** marginal em métricas, mas grande em estabilidade do renderer e testabilidade via Chrome MCP.

---

## Quando NÃO fazer isso

- Se Vercel + Cloudflare já estão fazendo brotli/gzip eficiente, ganho de KB é menor
- Se o time não tem ambiente de staging pra testar antes do deploy
- Se prioridade comercial está em features novas

Code split é refactor — não traz feature. Avaliar custo/benefício antes da próxima sprint.

*Plano gerado 2026-05-28 21:40.*
