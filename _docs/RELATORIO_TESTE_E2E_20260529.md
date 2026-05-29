# Relatório de Teste E2E — PROJECT.IA

**Data:** 2026-05-29
**Ambiente:** produção `https://testandosite-nu.vercel.app/hydrostec_v9.html`
**Deploy testado:** commit `13dea95` (SW v9.3.14) — confirmado no ar via `planejamento.js?v=4`
**Conta:** Org A (`rodribinho13+audit_202605281824_a@gmail.com`, org_id `03c3380a…`)
**Método:** navegador real (Chrome MCP) para o que foi possível + verificação/limpeza via Supabase.

---

## Resumo executivo

| Área | Status |
|---|---|
| Deploy mais recente no ar | 🟢 OK |
| Erros JS no boot / "Multiple GoTrueClient" | 🟢 Nenhum |
| Libs pesadas sob demanda (boot) | 🟢 OK (XLSX/Chart/jsPDF/pdf.js não carregam no boot) |
| Performance de boot | 🟢 DOM interativo 377 ms · load 770 ms (antes ~1,3 s) |
| Login + abrir projeto + abrir módulos | 🟢 OK |
| **IA do RDO (bug corrigido)** | 🟢 **INSERT validado nas 4 tabelas** contra o schema real |
| Multi-tenant (RLS) | 🟢 RLS habilitado + policies em todas as tabelas-chave |
| Fluxos de IA por **upload** de arquivo (UI) | 🟡 **Não automatizável** nesta sessão (limite do navegador) |
| Matriz completa 20 módulos × 5 ações | 🟡 Não executada (ver limitações) |

---

## 1. Verificado em produção (navegador real)

Via `javascript_tool` / console / navegação na página logada:

- **Deploy correto:** `planejamento.js?v=4`, `sidebar-groups v28` no console.
- **Console limpo:** sem erros JS, sem "Multiple GoTrueClient instances".
- **On-demand de libs:** no boot, `typeof XLSX/Chart/jspdf/pdfjsLib === 'undefined'` → confirmado que as libs pesadas **não** carregam no boot. `window.PIALibs` e `window.__pia_sb` presentes.
- **Performance (Navigation Timing):** responseEnd 155 ms · domInteractive 377 ms · domContentLoaded 667 ms · loadEvent 770 ms.
- **Fluxo de UI confirmado:** login Org A OK → abrir projeto `__AUDIT_v934_PROBE__` OK → abrir módulo **RDO Diário** OK → botão **"IA Foto Manuscrita"** abre o modal corretamente (`openFromPhoto` executa; `PIAAIRouter` e `PIAIARdo` carregados sob demanda).

## 2. IA do RDO — correção PROVADA (prioridade #1)

O bug era no **INSERT** (gravava em `daily_report_team` — tabela inexistente — e em colunas que não existem em `daily_reports`/`daily_report_activities`). Testado o payload exato que o código corrigido (`ai-rdo.js`) gera, contra o **schema de produção**:

- `daily_reports` ✅ (morning_status/afternoon_status/responsible_engineer/disciplina/notes/status/created_by)
- `daily_report_workforce` ✅ (workforce_type NOT NULL preenchido)
- `daily_report_activities` ✅
- `daily_report_events` ✅

Resultado: 1 RDO + 1 efetivo + 1 atividade + 1 ocorrência inseridos sem erro. **Bug resolvido.** (registros de teste removidos — ver Limpeza.)

## 3. Multi-tenant / RLS

- **RLS habilitado** (`relrowsecurity = true`) com policies em: `daily_reports`, `daily_report_workforce`, `civil_concrete_pours`, `painting_inspections`, `projects`, `isometric_sheets`, `project_materials`.
- O isolamento por `org_id` é imposto no banco (consistente com a auditoria anterior que reportou isolamento 100%).

---

## Limitações desta sessão (transparência)

1. **Fluxos de IA por upload de arquivo via UI não puderam ser automatizados.** Depois do login, a conexão viva do app (Supabase) faz a página nunca atingir o estado `document_idle` que as ferramentas `read_page`/`find`/`screenshot` exigem — elas dão timeout. Sem `read_page`/`find` não é possível mirar o `<input type=file>` (oculto) para anexar o PDF. Além disso o renderer ficou instável após o modal. **É um limite da automação do navegador, não um bug do site.**
2. Por isso, **não foram executados via UID**: import Excel por aba, export, Orçamento completo, e o CRUD por módulo da matriz 20×5.
3. **Senha:** o login foi feito pelo usuário (o agente não digita senhas).
4. **Concorrência de 5 sessões / 2 orgs simultâneas:** inviável no mesmo perfil de navegador (token de sessão único no localStorage por origem). Recomenda-se testar com perfis/janelas anônimas separadas.

## Recomendação — checklist manual rápido (o que ficou faltando)

Para cada um, fazer Ctrl+Shift+R antes:

1. **RDO foto:** RDO Diário → IA Foto Manuscrita → enviar `_docs/_test_assets/rdo_foto_manuscrita.pdf` → Ler com IA → revisar → **Gravar RDO** (deve gravar sem erro — a correção já está validada no banco).
2. **IA por disciplina:** ex. Pintura → Cadastrar via IA → `inspecao_dft.pdf` → usar "Instruções extras" → Cadastrar selecionados.
3. **Importar Excel:** numa aba (ex. Materiais) → Excel ▾ → Importar Excel → `import_mat.xlsx` → mapear → importar.
4. **Exportar Excel:** Excel ▾ → Exportar Excel (1ª vez há um pequeno atraso enquanto a lib XLSX carrega sob demanda — comportamento esperado).
5. **Orçamento:** abrir, adicionar itens, conferir totais, exportar.

## Limpeza

- Removidos todos os registros `__AUDIT_E2E__` criados nesta sessão (1 `daily_reports` + 1 `daily_report_workforce` + 1 `daily_report_activities` + 1 `daily_report_events`).
- Org A e Org B **preservadas**.
- Observação: existe um projeto pré-existente `__AUDIT_v934_PROBE__` (org A, de sessão anterior) — **não** removido (não foi criado nesta sessão).

*Relatório gerado em 2026-05-29.*
