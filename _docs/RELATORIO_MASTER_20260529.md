# Relatório-Mestre — PROJECT.IA rumo a 100% comercial

**Data:** 2026-05-29 · **Produção:** `https://testandosite-nu.vercel.app/hydrostec_v9.html` · **SW:** v9.3.28

> Este relatório consolida o trabalho da sessão e mapeia o **Definition of Done (DoD)**.
> Detalhes por fase em `RELATORIO_TESTE_FASES_20260529.md` e `RELATORIO_TESTE_E2E_20260529.md`.

---

## Definition of Done — status

| # | Item | Status | Evidência |
|---|---|---|---|
| 1 | Console 100% limpo (toda página) | 🟢 **em grande parte** | FASE 0: removido `frame-ancestors` do `<meta>`, `unpkg` no `connect-src` (sourcemap lucide), `<meta mobile-web-app-capable>`. Auditoria de erros JS: 0 botões mortos (`tools/_audit_onclick.cjs` → `{}`). Falta confirmação visual final do usuário (carga limpa). |
| 2 | Botões funcionam + tamanho padronizado | 🟢 | 10 botões mortos corrigidos (7 modais novos + NR-13 IA religado + sino removido). Botões de toolbar normalizados (medido: todos 36px). Roteamento de IA por view corrigido. |
| 3 | CRUD grava no banco (todas as abas) | 🟢 (verificado por SQL) | Auditoria insert×schema: corrigidos RDO, Mapa de Juntas, IA cotação, parecer fornecedor; demais (pendências, soldadores, comissionamento, END, calibração, projetos, fornecedores, materiais, RFQ) conferidos OK. |
| 4 | Toda IA ponta-a-ponta | 🟡 | RDO (schema corrigido), discipline-ai (rede de segurança), NR-13 (religado), roteamento por view corrigido; backend `discipline_ai_prompts` tem prompts p/ todas. **Upload de arquivo na tela precisa de teste do usuário** (automação não anexa arquivo). |
| 5 | Import/Export Excel em todas as abas | 🟢 (wiring) / 🟡 (teste de tela) | `tools/_audit_import.cjs`: toda view com botão tem FIELD_SCHEMA + VIEW_TABLE_MAP. XLSX agora carrega sob demanda (resolvia a "inconsistência"). |
| 6 | Sem regressões (login/multi-tenant/perf) | 🟢 | Login OK; RLS habilitado + policies em todas as tabelas-chave; sem "Multiple GoTrueClient". |
| 7 | Performance | 🟢 | Boot: DOM interativo 377ms, load 770ms (antes ~1,3s). Libs pesadas sob demanda. |

---

## Correções desta sessão (com commit)

**Frentes 1–5:** português UI, IA RDO (schema real), padronização IA Desenho Técnico (+ edge v3), toolbars (Pintura/Juntas/Andaime), performance (defer → on-demand).

**Fases 1–6 (auditoria estática + insert×schema):**
- Orçamento: `TypeError onclick null` (orc-export-csv) — **corrigido** (o bug-conhecido do prompt). + budget.js + iso-save (mesma classe).
- 10 **botões mortos** → 7 modais novos (Civil/Elétrica/Hidráulica), NR-13 IA religado, sino removido.
- **Mapa de Juntas** `+Novo`: colunas fantasma (migration 017) + line_id NOT NULL (auto-cria linha).
- **IA de Cotação** (colunas erradas) + **Parecer de Fornecedor** (tabela ausente, migration 018).
- **Roteamento "Cadastrar via IA" por view** (NR-13/Andaime/END/Pendências/RDO/Comissionamento/Manutenção/Calibração abriam disciplina errada).
- Banco: FK `daily_reports→projects` (migration 016, corrige 400 da lista de RDO).

**Infra / estabilidade:**
- **Service Worker**: era a causa do "Cannot access 'sb'" e dos travamentos — convertido para **pass-through** (não cacheia, não intercepta) + auto-reparo no HTML. **Fim das quebras de cache.**
- **FASE 0**: higiene global de console (CSP/meta).

**Ferramentas versionadas:** `tools/_audit_ids.cjs`, `_audit_onclick.cjs`, `_audit_import.cjs`. **Migrations:** 016, 017, 018.

---

## O que ainda depende do usuário (teste de tela)
A automação de navegador deste ambiente não consegue, após login: anexar arquivo (IA por upload / Importar Excel por clique) nem medir telas de forma estável. Esses fluxos precisam de 1 clique de validação por aba. Tudo o que é diagnosticável/corrigível por código + verificável por SQL foi feito.

## Limpeza
Registros `__AUDIT_E2E__` removidos; Org A/B preservadas.

*Atualizado em 2026-05-29 (SW v9.3.28).*
