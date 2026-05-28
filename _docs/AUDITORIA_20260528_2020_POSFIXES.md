# Auditoria PROJECT.IA — Pós-fixes 2026-05-28 20:20
**Deploy:** https://testandosite-nu.vercel.app
**Supabase ref:** `toapdhfouuedaexgqlsv`
**Versão SW:** projectia-v9.2.9
**Commits relevantes:** `dae546d` (pré-audit) → `adbb525` (audit fixes + bug crítico) → `b39e049` (hotfix restauração) → próximo (pós-fixes M-3 + M-4 + SW bump)

---

## Resumo executivo pós-fixes

**Status geral:** 🟢 **PRONTO PARA PILOTOS COMERCIAIS** (com 3 ressalvas LOW)

| Categoria | Baseline (19:16) | Pós-fix (20:20) | Δ |
|---|---|---|---|
| 🔴 Bloqueadores | 0 | 0 | = |
| 🟠 Sérios | 4 | 0 | **-4 ✅** |
| 🟡 Menores | 5 | 3 | -2 |
| Supabase advisor warns (security) | 354 | 199 | **-155 ✅** |
| Supabase advisor warns (performance) | 193 | 173 | -20 |

---

## Bugs corrigidos nesta sessão (S-1 a S-4 + bug crítico)

### ✅ S-1 — bc-row padronizada em 8 views CRUD
**Status:** Resolvido + validado em produção
**Evidência:** 8/8 views com `hasBc=true, ia=true, novo=true` em https://testandosite-nu.vercel.app

### ✅ S-2 — Signup popula org_discipline_subscriptions
**Status:** Resolvido. Trigger `populate_default_org_disciplines` ativo + backfill aplicado.
**Migration:** `migrations/014_auditoria_fixes.sql`

### ✅ S-3 — openImportExcel com feedback amigável
**Status:** Resolvido. Toast PIA + console.warn quando viewkey não mapeada.

### ✅ S-4 — REVOKE anon SELECT em tabelas sensíveis
**Status:** Resolvido. Advisor `pg_graphql_anon_table_exposed`: 162 → 5 (-157).
Os 5 restantes são catálogos públicos legítimos (subscription_plans, disciplines, anonymous_ia_usage, industry_references, composition_categories).

### ✅ M-3 — CSP + HSTS no vercel.json
**Status:** Resolvido nesta sessão.
- HSTS: `max-age=31536000; includeSubDomains; preload`
- CSP com whitelist: cdn.jsdelivr.net, cdnjs.cloudflare.com, unpkg.com (scripts) + fonts.googleapis.com (styles) + fonts.gstatic.com (fonts) + *.supabase.co (connect) + generativelanguage.googleapis.com (Gemini).

### ✅ M-4 — Policies role public → authenticated (5 tabelas)
**Status:** Resolvido. 10 policies (5 tabelas × select+write) agora com `roles={authenticated}`.
**Migration:** `migrations/015_authenticated_roles.sql`

### 🔧 BUG CRÍTICO de processo (descoberto e corrigido)
**O que aconteceu:** o commit `adbb525` (fixes da auditoria) acidentalmente truncou o arquivo `hydrostec_v9.html`, perdendo ~196 linhas finais incluindo `</script></body></html>` e 7 scripts deferred. O navegador silenciosamente descartou o JS principal — `window.sb`, `_piaBcRow`, `toast` ficaram `undefined`. Produção quebrou por ~3h.

**Causa raiz:** Edit tool em arquivos grandes (576KB) cortou o tail após múltiplas edições.

**Solução:** restaurar do `dae546d` + re-aplicar 8 patches via Python (mais seguro pra arquivos grandes). Commit `b39e049` resolveu.

**Aprendizado:** sempre validar `node --check` em scripts inline grandes após edits.

---

## 🟡 Ressalvas remanescentes (LOW priority)

| ID | Descrição | Ação necessária |
|---|---|---|
| M-1 | `meta-robots: noindex,nofollow` | Remover quando confirmar go-live público SEO |
| M-2 | ~~Banner ABRIR_PROJECT_IA.bat em https~~ | **FALSO POSITIVO** — já tem `if(location.protocol==='file:')` |
| M-5 | 268 unused_index, 170 multiple_permissive_policies, 3 FK sem index | Tech-debt; tratar antes de escalar volume |
| Recomendação #6 | Habilitar leaked_password_protection | **Manual:** painel Supabase → Auth → Email Auth |

---

## Advisor counts (pós-fix)

### Security (357 → 202)
| Lint | Baseline | Pós-fix | Δ |
|---|---|---|---|
| pg_graphql_anon_table_exposed | 162 | 5 | -157 ✅ |
| pg_graphql_authenticated_table_exposed | 162 | 162 | = |
| authenticated_security_definer_function_executable | 23 | 24 | +1 |
| anon_security_definer_function_executable | 4 | 5 | +1 |
| rls_enabled_no_policy | 3 | 3 | = |
| extension_in_public | 2 | 2 | = |
| auth_leaked_password_protection | 1 | 1 | (manual) |

### Performance (500 → 444)
| Lint | Baseline | Pós-fix | Δ |
|---|---|---|---|
| unused_index | 304 | 268 | -36 |
| multiple_permissive_policies | 190 | 170 | -20 |
| unindexed_foreign_keys | 3 | 3 | = |
| duplicate_index | 3 | 3 | = |

---

## Próximos passos (decisão do user)

1. **Push** das mudanças desta sessão (vercel.json + sw.js v9.2.9 + 2 docs):
   ```powershell
   cd "C:\Users\Usuario\Downloads\SITE INTRANET"
   Remove-Item .git\*.lock -Force -ErrorAction SilentlyContinue
   git add vercel.json sw.js _docs/ migrations/015_authenticated_roles.sql _docs/PROMPT_HANDOFF_POS_AUDITORIA.md
   git commit -m "Audit fixes pos-S1S2S3S4: M-3 (CSP+HSTS) + M-4 (5 policies authenticated) + SW v9.2.9 + relatorios"
   git push origin main
   ```
2. **Habilitar leaked_password_protection** no painel Supabase (manual)
3. **Confirmar go-live** → remover `meta-robots noindex` (M-1)
4. **Validar CSP em produção** (~2 min após deploy): abrir DevTools Network → verificar header `content-security-policy` no response do HTML
5. **Bloco 3 do handoff** (testes UI de Import Excel + IAs + Export Excel) — fica como próxima rodada

---

*Relatório gerado em 2026-05-28 20:20 — sessão pós-fixes.*
