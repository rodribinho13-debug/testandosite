# HANDOFF — Continuar de onde paramos
**Última sessão:** 2026-05-28 18:45
**Próxima ação:** Continuar auditoria de produção (Fases 1-9)

---

## 📋 Cole este arquivo INTEIRO no início da nova sessão Cowork

(Use o botão "New session" no menu lateral. O agente novo já tem acesso à pasta `C:\Users\Usuario\Downloads\SITE INTRANET` automaticamente.)

---

## CONTEXTO RÁPIDO

Você (novo agente) está retomando trabalho num **SaaS comercial de engenharia multi-disciplina chamado PROJECT.IA**, que acabou de ser hospedado em produção (Vercel + Supabase). A sessão anterior:

1. **Hospedou o site** em https://testandosite-nu.vercel.app
2. **Criou 2 scripts PowerShell** pro deploy automático
3. **Executou Fases 0 e 0.5 de uma auditoria de produção** descobrindo 4 bugs
4. **Corrigiu 3 desses bugs no código** e fez deploy do fix
5. **Pausou as Fases 1-9** da auditoria porque o contexto da sessão saturou

Sua missão: **continuar as Fases 1-9 da auditoria** sem perder tempo refazendo o que já foi feito.

---

## ESTADO ATUAL

### Site
- **URL produção:** https://testandosite-nu.vercel.app
- **Versão SW:** projectia-v9.2.7
- **Repo GitHub:** https://github.com/rodribinho13-debug/testandosite
- **Supabase project:** `toapdhfouuedaexgqlsv`
- **Usuário GitHub/Vercel:** rodribinho13-debug, email rodribinho13@gmail.com

### Contas de teste já criadas (NÃO criar de novo!)
Lê o JSON em `_docs/_audit_state.json`. Resumo:

| Org | Email | User ID | Org ID |
|---|---|---|---|
| **A** | `rodribinho13+audit_202605281824_a@gmail.com` | `39692478-55b7-4167-9eb9-cbefa083892f` | `03c3380a-21c7-46e9-b994-609e47d314da` |
| **B** | `rodribinho13+audit_202605281824_b@gmail.com` | `163cc02b-d64e-44dc-b183-48404e6d0d62` | `d693777a-8f0a-4d63-9f52-9481bbda653a` |

Senha das duas: `AuditPassptnwe4!Aa1`
AUDIT_TAG (pra marcar registros de teste): `__AUDIT_202605281824__`

Ambas com role `admin`, plan `trial`. Use direto.

### Bugs já corrigidos (NÃO re-trabalhar)
- 🔴 **#1** Signup/login agora tem timeout 15s + mensagem de erro
- 🟠 **#2** Erros do Supabase agora aparecem em PT-BR via PIAToast
- 🟡 **#4** Validação client-side de email/senha/org antes de submeter
- 🟡 **#3** RATE LIMIT Supabase — pendente (config externa, user precisa setup SMTP em Resend/SendGrid)

### Allowed URLs Supabase
Já configurado pra aceitar `https://testandosite-nu.vercel.app` no Auth.

---

## O QUE VOCÊ DEVE FAZER

Leia `_docs/PROMPT_AUDITORIA_TOTAL_PRODUCAO.md` (é o prompt mestre completo) e **execute as Fases 1 a 9 + Cleanup + Relatório**, PULANDO Fase 0 e 0.5 (já feitas).

### Fases pendentes:

| Fase | Tempo | Descrição |
|---|---|---|
| **1** Performance | 10 min | TTFB, LCP, hidratação de cache, top 5 views lentas |
| **2** Cadastros | 20 min | + Novo em 17 views, com `AUDIT_TAG` no nome, INSERT real |
| **3** Import Excel | 15 min | 21 viewkeys, usar XLSX em `_docs/_test_assets/` |
| **4** IAs | 25 min | 9 PDFs em `_docs/_test_assets/`, IA por disciplina + Conversacional + RDO foto |
| **5** Export Excel | 10 min | Validar formatação do XLSX gerado |
| **6** Multi-tenant CRÍTICO | 15 min | Logar Org B, validar 0 vazamento de Org A via SQL |
| **7** Padronização botões | 10 min | Snippet JS audita `[Excel ▾] [Cadastrar via IA] [+ Novo]` em cada view |
| **8** Console + network | 10 min | Errors, warns, latência p95 |
| **9** Segurança | 10 min | Supabase advisors, headers Vercel, LGPD |
| **Cleanup** | 5 min | DELETE registros AUDIT_TAG + DELETE orgs A/B + DELETE auth.users |
| **Relatório** | 5 min | Compilar bugs por severidade, salvar `_docs/AUDITORIA_<TIMESTAMP>.md` |

### Como começar (cole no chat):

```
Continuação da auditoria de produção do PROJECT.IA.
Leia _docs/HANDOFF_NOVA_SESSAO.md, _docs/PROMPT_AUDITORIA_TOTAL_PRODUCAO.md
e _docs/_audit_state.json. As Fases 0 e 0.5 já foram concluídas, pule essas
duas. As contas de teste Org A e B já existem no banco — use direto.

Comece pela Fase 1 (Performance) usando Chrome MCP e Supabase MCP.

Deploy: https://testandosite-nu.vercel.app
Supabase ref: toapdhfouuedaexgqlsv
```

---

## REGRAS QUE VOCÊ DEVE SEGUIR

1. **NÃO crie contas novas** — Org A e B já existem.
2. **Use AUDIT_TAG** = `__AUDIT_202605281824__` em todos cadastros pra cleanup encontrar.
3. **Logue na conta Org A** com email/senha do `_audit_state.json` pra Fases 2-5.
4. **Logue na conta Org B** apenas na Fase 6 (multi-tenant).
5. **Cleanup é obrigatório** — DELETE registros AUDIT_TAG + DELETE orgs A/B + DELETE auth.users no fim.
6. **Salve evidência** — screenshots e SQL responses pra cada ✅.
7. **Use TaskCreate uma task por fase** + TaskUpdate ao começar/terminar.
8. **NÃO edite código** sem permissão explícita do user — auditoria é só leitura/teste.
9. **Se algo falhar**, registra como bug no relatório com severidade (🔴 crítico / 🟠 sério / 🟡 menor).
10. **Tempo total esperado**: 60-90 min de execução.

---

## ARQUIVOS RELEVANTES

| Arquivo | Pra que serve |
|---|---|
| `_docs/PROMPT_AUDITORIA_TOTAL_PRODUCAO.md` | Prompt mestre detalhado das 9 fases |
| `_docs/_audit_state.json` | Credenciais das contas de teste |
| `_docs/_test_assets/` | 20 XLSX + 9 PDFs sintéticos pras IAs |
| `_docs/AUDITORIA_20260528_PARCIAL.md` | Relatório parcial da sessão anterior (4 bugs encontrados) |
| `hydrostec_v9.html` | App principal (576 KB, agora v9.2.7) |
| `vercel.json` | Config de deploy estático |
| `PUSH_TO_GITHUB.ps1` | Script git push (uso futuro) |
| `DEPLOY_VERCEL.ps1` | Script vercel deploy (uso futuro) |

---

## STATUS DO TASKLIST

Última sessão tinha 453 tasks. Você pode ignorar todas as anteriores e criar tasks novas só pras 11 fases que faltam (1-9 + cleanup + relatório).

---

## QUANDO TERMINAR

Apresente `_docs/AUDITORIA_<TIMESTAMP>.md` ao user com `mcp__cowork__present_files`.
Formato esperado: resumo executivo + métricas + bugs por severidade + recomendações priorizadas.
