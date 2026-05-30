# Handoff — Bugs Civil/Pintura ainda manifestam em produção
**Data:** 2026-05-28 20:55
**Versão atual:** v9.3.2 + discipline-ai-modal.js?v=24 (ambos no Vercel)

---

## O que foi confirmado

- ✅ v9.3.2 SW ativo em produção
- ✅ module-loader.js carrega `discipline-ai-modal.js?v=24`
- ✅ Conteúdo do v=24 tem os 3 markers `Bug #6 fix`, `Bug #7 fix`, `Bug #8 fix`
- ✅ Singleton do Supabase client funciona (auth não trava mais)
- ✅ IA tubulação ainda funciona: extração + INSERT no banco
- ❌ IA civil + IA pintura: cliente clica "Cadastrar selecionados (1)", modal não progride, **0 INSERTs no banco, 0 erros no postgres log**

---

## Diagnóstico — onde investigar

Os fixes aplicados estão em `insertCategoryRecords()` (linha ~1149 do arquivo). Esta função processa registros em **shape `'array'`**.

Mas no `DOC_TYPES`:
- `ficha_concretagem` tem `shape:'single'` → **NÃO passa por insertCategoryRecords**
- `inspecao_dft_relatorio` tem `shape:'single'` → idem
- `inspecao_dft` (medições DFT lote) tem `shape:'array'` → passa por insertCategoryRecords

Conclusão provável: existe um code path separado para `shape:'single'` (provavelmente `insertSingleRecord` ou inline no `processCadastro`) que **não foi corrigido pelos fixes Bug #6/#7/#8**.

---

## Próximos passos sugeridos

1. **Localizar o code path do single record** em `assets/js/discipline-ai-modal.js`:
   ```bash
   grep -n "shape === 'single'\|shape: *'single'\|insertSingleRecord\|sb.from.*insert" assets/js/discipline-ai-modal.js
   ```

2. **Aplicar o mesmo padrão de fix** que está em insertCategoryRecords:
   - NOT NULL → auto-fill com fallbacks
   - Check constraint → normalize lowercase
   - Duplicate → idempotente

3. **Re-testar via UI manual** (browser real) com `ficha_concretagem.pdf` em Civil → clicar Cadastrar → ver console.log para identificar exatamente onde para.

4. **Logar erros de INSERT explicitamente** no toast: tanto `insertCategoryRecords` quanto o caminho `single` devem chamar `PIAToast.error('Falha ao cadastrar: ' + err.message)` em caso de falha, em vez de apenas `console.warn`.

---

## Arquivos modificados nesta sessão

| Arquivo | Commit | Status |
|---|---|---|
| `assets/js/discipline-ai-modal.js` | `75b14f7` | 3 fixes em `insertCategoryRecords` (array path) — funciona |
| `assets/js/module-loader.js` | `0656f45` | Cache buster v=23→v=24 |
| `sw.js` | `0656f45` | v9.3.0→v9.3.1→v9.3.2 |
| `hydrostec_v9.html` | `6056eff` | Singleton Supabase client |
| `vercel.json` | `31425a0` | CSP + HSTS |
| `migrations/014_*.sql` | aplicado | Trigger signup + REVOKE anon |
| `migrations/015_*.sql` | aplicado | 5 policies authenticated |

---

## Estado real do SaaS em 2026-05-28 21:00

| Item | Status |
|---|---|
| Auth | 🟢 OK (singleton resolve race) |
| Multi-tenant isolation | 🟢 100% |
| Performance | 🟢 TTFB 25ms, DOM 1.3s |
| IA Tubulação (analyze-discipline-doc) | 🟢 ponta-a-ponta OK |
| IA Civil (`ficha_concretagem` single) | 🔴 INSERT silencioso |
| IA Pintura (`inspecao_dft_relatorio` single) | 🔴 INSERT silencioso |
| IA Elétrica (PDF curto) | 🟢 retorna erro amigável |
| IA Conversacional / RDO foto | ⏸️ não testado |
| Export XLSX | ⏸️ não testado (precisa browser real) |
| Import Excel UI mapping | ⏸️ não testado (precisa browser real) |

---

## Cleanup

Banco limpo de todos os registros `__AUDIT_*__` desta sessão. Orgs A/B preservadas.

*Handoff gerado 2026-05-28 21:00.*
