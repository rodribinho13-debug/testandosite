# HANDOFF PÓS-AUDITORIA — Continuar do commit `adbb525`
**Origem:** auditoria 2026-05-28 (`_docs/AUDITORIA_20260528_1916.md`)
**Última versão deployada:** SW `projectia-v9.2.8` em https://testandosite-nu.vercel.app
**Supabase ref:** `toapdhfouuedaexgqlsv`
**Repo GitHub:** https://github.com/rodribinho13-debug/testandosite
**Branch:** main · último commit `adbb525`

---

## Cole este arquivo INTEIRO no início da nova sessão Cowork

---

## ✅ O QUE JÁ FOI FEITO (não refaça)

| Item | Status | Localização |
|---|---|---|
| S-1 — bc-row padronizada em 7 views (pend, rdo, sold, com, equip, maint, cal) + upgrade quality_reports | ✅ commitado | `hydrostec_v9.html` + helper `_piaBcRow()` |
| S-2 — trigger `populate_default_org_disciplines` + backfill | ✅ aplicado no banco | `migrations/014_auditoria_fixes.sql` |
| S-3 — `openImportExcel` usa PIAToast.warning + console.warn | ✅ commitado | `hydrostec_v9.html` linha ~830 |
| S-4 — REVOKE SELECT FROM anon + GRANTs seletivos (5 catálogos) | ✅ aplicado no banco | `migrations/014_auditoria_fixes.sql` |
| Bump SW v9.2.7 → v9.2.8 | ✅ commitado | `sw.js` |
| Cleanup registros AUDIT | ✅ executado | banco limpo |

**Contas de teste preservadas** (Org A e B, senha `AuditPassptnwe4!Aa1`) — ver `_docs/_audit_state.json`.

---

## ❌ O QUE FALTA FAZER

### Bloco 1 · Validação do deploy recente (5 min)

Confirmar que o commit `adbb525` foi deployado no Vercel e que as 8 views agora têm bc-row completa:

1. Navegue para `https://testandosite-nu.vercel.app/hydrostec_v9.html`
2. Login com Org A: `rodribinho13+audit_202605281824_a@gmail.com` / `AuditPassptnwe4!Aa1`
3. Verifique `navigator.serviceWorker.controller?.scriptURL` — deve mostrar `sw.js` versão v9.2.8 (force-refresh Ctrl+Shift+R se ainda mostrar v9.2.7).
4. Rode no console:
   ```js
   ['sold','cal','pend','com','maint','rdo','quality_reports','equip'].map(k=>{
     const v=document.getElementById('v'+k);
     const bc=v?.querySelector('.bc-row');
     return {k, hasBc: !!bc, ia: !!bc?.querySelector('.btn.bia'), novo: !!bc?.querySelector('.btn.bp'), excel: !!bc?.querySelector('.pia-excel-wrap, [id^="pia-excel-btn-"]')};
   })
   ```
   **Esperado:** todas com `hasBc=true, ia=true, novo=true`. Excel pode levar até 3s pra aparecer (PIAExcel.autoInject roda em interval).
5. Se alguma falhar, abra issue + debug.

### Bloco 2 · Fixes 🟡 menores ainda não aplicados (30 min)

#### M-1 — Remover `meta-robots: noindex,nofollow`
Arquivos: `index.html`, `hydrostec_v9.html`. Remova `<meta name="robots" content="noindex,nofollow">`.
**Atenção:** só execute quando o user confirmar que é go-live público comercial.

#### M-2 — Remover banner `ABRIR_PROJECT_IA.bat` em contexto Web
Arquivo: `hydrostec_v9.html`. Procure por `Você está abrindo via arquivo direto`. A lógica deve detectar `window.location.protocol === 'file:'` e só mostrar nesse caso. Hoje ela aparece também em `https:`.

#### M-3 — CSP + HSTS explícita no `vercel.json`
Adicione no array `headers` da rota `/(.*)`:
```json
{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
{ "key": "Content-Security-Policy",   "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'self'" }
```
**Atenção:** teste o CSP em preview-deploy antes de fazer merge — pode bloquear algo se faltar domínio.

#### M-4 — Trocar `roles=public` → `roles=authenticated` em 5 policies
```sql
-- Para cada tabela: drop e recria a policy com TO authenticated
-- Tabelas: civil_concrete_pours, equipments, maint_work_orders, painting_inspections, scaffolds
-- Cada uma tem 2 policies: *_select e *_write
-- Use pg_policies pra pegar a definição atual (qual, with_check) e recrie.
```
Modelo para uma tabela (replicar pras outras 4):
```sql
ALTER POLICY ccp_select ON civil_concrete_pours TO authenticated;
ALTER POLICY ccp_write  ON civil_concrete_pours TO authenticated;
-- repetir pra eq_*, mwo_*, pi_*, sc_*
```
Salve em `migrations/015_authenticated_roles.sql`.

#### M-5 — Limpar performance advisor (opcional)
- 304 unused indexes — só deletar depois de confirmar com user que volume baixo permite.
- 190 multiple_permissive_policies — consolidar select+write em uma única policy ALL.
- 3 unindexed_foreign_keys — adicionar índices.

Trata como tech-debt de baixa prioridade. Aplicar apenas se user pedir.

#### Recomendação #6 — Habilitar `auth_leaked_password_protection`
**Não tem API MCP** para isso. Instruir user a:
1. Abrir https://supabase.com/dashboard/project/toapdhfouuedaexgqlsv/auth/providers
2. Em "Email Auth" → ativar "Leaked password protection"

### Bloco 3 · Validações UI que ficaram parciais na auditoria (60 min)

Estes testes ficaram parciais por causa de renderer freezes em screenshots. Faça via browser_batch + form_input + javascript_tool. Para uploads, use o tool `file_upload` apontando pros arquivos em `_docs/_test_assets/`.

#### Fase 3 (Import Excel) — 21 viewkeys
Para cada viewkey de `_docs/_test_assets/import_<viewkey>.xlsx`:
1. Logado em Org A, abra a view, clique `Excel ▾ → Importar Excel`.
2. `file_upload` ref do input com path do XLSX correspondente.
3. Validar: mapeamento detectado, INSERT confirmado, registros aparecem na tabela.
4. Registrar bugs por viewkey.

**Pre-req:** Org A precisa ter ao menos 1 projeto criado (caso a view tenha `reqProject:true`). Crie via `o<Proj>()` ou direto via Supabase MCP.

#### Fase 4 (IAs) — 9 PDFs sintéticos
PDFs em `_docs/_test_assets/`:
- `iso_tubulacao.pdf` → IA tubulação (`isos` + `mat` + `joints`)
- `mapa_juntas.pdf` → IA qualidade
- `ficha_concretagem.pdf` → IA civil → `civil_concr`
- `armadura_estrutural.pdf` → IA civil → `civil_elem`
- `diagrama_unifilar.pdf` → IA elétrica → `elec_panels`
- `laudo_spda.pdf` → IA elétrica → `elec_spda`
- `inspecao_dft.pdf` → IA pintura → `paint`
- `rdo_foto_manuscrita.jpg` → IA documentação → `rdo`

Fluxo por IA: `Cadastrar via IA` → upload → aguarda extração (até 60s) → preview editável → confirma → validar INSERT no banco com `org_id`, `project_id` corretos.

Testar também:
- **IA Conversacional** (chat lateral): "quantas folhas iso eu tenho?", "qual o último material cadastrado?". Validar que respondeu sobre Org A apenas.
- **IA Orçamento** (botão "Importar via IA"): subir BOM Excel + desenho PDF, validar geração WBS.

#### Fase 5 (Export Excel) — validação do XLSX
Para cada view com ≥3 registros (use os criados nas fases 3/4):
1. `Excel ▾ → Exportar Excel`. Confirma download.
2. Abre o XLSX (via Python `openpyxl` no sandbox) e valida:
   - Linha 1 = título
   - Header com fill azul `1E40AF`
   - Bordas finas
   - Zebra
   - Autofilter
   - Freeze pane no header
   - Conteúdo bate com banco

### Bloco 4 · Re-rodar auditoria pós-fixes (15 min)

Depois de aplicar M-1..M-5 + #6:
1. Rode `get_advisors security` e `get_advisors performance` no Supabase MCP.
2. Compare contagens com baseline da auditoria (357 security, 500 perf).
3. Diferenças esperadas:
   - security: -162 `pg_graphql_anon_table_exposed` (resolvido por S-4)
   - security: -1 `auth_leaked_password_protection` (resolvido por #6)
   - performance: -190 `multiple_permissive_policies` se M-5 aplicado
4. Atualizar `_docs/AUDITORIA_<NOVO_TIMESTAMP>.md` com diff.

### Bloco 5 · Cleanup final (se decidir liberar prod)

Quando user confirmar go-live, deletar contas de teste:
```sql
DELETE FROM org_members WHERE org_id IN ('03c3380a-21c7-46e9-b994-609e47d314da','d693777a-8f0a-4d63-9f52-9481bbda653a');
DELETE FROM organizations WHERE id IN ('03c3380a-21c7-46e9-b994-609e47d314da','d693777a-8f0a-4d63-9f52-9481bbda653a');
```
Depois via Supabase Admin API (não tem no MCP):
```bash
# Painel Auth → Users → delete os 2 com email like 'rodribinho13+audit_202605281824_%@gmail.com'
```
Remover `_docs/_audit_state.json` do repo (mas commitar a remoção, mantém histórico).

---

## REGRAS QUE VOCÊ DEVE SEGUIR

1. **NÃO crie commits manuais usando o git do sandbox** — gera locks órfãos no `.git/`. Se editar arquivos, faça o commit via PowerShell do user (rodando `PUSH_TO_GITHUB.ps1`).
2. **Para alterações de banco:** sempre salve o SQL em `migrations/0XX_*.sql` ANTES de aplicar via MCP. Mantém auditabilidade.
3. **Antes de mexer em vercel.json + CSP:** abra Preview Deploy do Vercel pra testar — produção sem CSP é melhor que produção com CSP errada bloqueando JS.
4. **TaskCreate uma task por bloco** + TaskUpdate `in_progress` ao começar, `completed` ao terminar.
5. **NÃO delete dados em massa sem confirmação user**. M-5 (304 unused indexes) é destrutivo — peça permissão.
6. **Se renderer Chrome travar nos screenshots novamente:** use `javascript_tool` direto + `web_fetch` pra HTML estático. Documentar limitação no relatório.
7. **Re-leia o relatório completo** (`_docs/AUDITORIA_20260528_1916.md`) antes de começar — todo contexto de severidade está lá.

---

## ARQUIVOS RELEVANTES

| Arquivo | Pra que serve |
|---|---|
| `_docs/AUDITORIA_20260528_1916.md` | Relatório completo da auditoria com 4 sérios + 5 menores + métricas |
| `_docs/_audit_state.json` | Credenciais Org A/B (não tocar) |
| `_docs/_test_assets/` | 20 XLSX + 9 PDFs sintéticos pras fases 3/4 |
| `migrations/014_auditoria_fixes.sql` | S-2 + S-4 já aplicados (referência) |
| `hydrostec_v9.html` | App principal — bc-row helper `_piaBcRow()` no topo |
| `vercel.json` | Headers Vercel — falta CSP + HSTS (M-3) |
| `sw.js` | SW v9.2.8 — bump pra v9.2.9 se mexer no app |
| `PUSH_TO_GITHUB.ps1` | Script que o user roda no PowerShell pra commit + push |

---

## DICAS DE EFICIÊNCIA

- **browser_batch agressivo:** agrupe `navigate` + `wait` + `find` + `click` + `javascript_tool` em 1 chamada.
- **Subagent Plan/general-purpose** pros blocos 3 e 5 — rodam em paralelo.
- **Performance budget:** se o renderer travar 3x no mesmo screenshot, pula pra `javascript_tool` ou `get_page_text`.
- **Cite linhas exatas** quando descrever bug — facilita o próximo agente fixar.

---

## QUANDO TERMINAR

1. Apresente `_docs/AUDITORIA_<NOVO_TIMESTAMP>.md` com diff vs baseline.
2. Commit consolidado: `Auditoria pos-fixes <DATA>: bloco 1 + 2 + 3 + 4 + cleanup`.
3. Confirme com user antes de deletar Orgs A/B.

---

## COMO COMEÇAR (cole no chat)

```
Continuação da auditoria PROJECT.IA pos-correcoes.
Leia _docs/PROMPT_HANDOFF_POS_AUDITORIA.md, _docs/AUDITORIA_20260528_1916.md
e _docs/_audit_state.json.

Comece pelo Bloco 1 (validar deploy do commit adbb525 no Vercel +
confirmar que as 8 views com bc-row padronizada estao OK em producao).
Use Chrome MCP + Supabase MCP. Org A login disponivel no audit_state.json.

Deploy: https://testandosite-nu.vercel.app
SW esperado: projectia-v9.2.8
Supabase ref: toapdhfouuedaexgqlsv
```

*Handoff gerado em 2026-05-28 19:45 — sessão de auditoria pós-fixes.*
