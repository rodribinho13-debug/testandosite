# Auditoria PROJECT.IA — Relatório Parcial
**Data:** 2026-05-28 18:30  
**URL produção:** https://testandosite-nu.vercel.app  
**Versão:** projectia-v9.2.6  
**Supabase project:** toapdhfouuedaexgqlsv  
**Auditor:** Claude (Cowork)

---

## Resumo executivo

🟡 **PRONTO COM RESSALVAS** — site está no ar, mas o fluxo de signup tem **4 bugs** que devem ser corrigidos antes do lançamento comercial.

- **Bugs bloqueadores comerciais**: 1 (signup sem feedback)
- **Bugs sérios**: 1
- **Bugs menores**: 2
- **Auditoria concluída**: Fases 0, 0.5 (parcial)
- **Auditoria pendente**: Fases 1-9 (precisam de nova sessão por limite de contexto e timeouts do Chrome MCP)

---

## Status por fase

| Fase | Status | Resultado |
|---|---|---|
| **0** Smoke test | ✅ Completa | Landing 200, App 200, console limpo, 0 erros vermelhos. Tela de auth renderiza correto. |
| **0.5** Setup contas | 🟡 Concluída via SQL | UI signup tentada 4x → 4 bugs descobertos. Contas A e B criadas via SQL admin como workaround. |
| **1** Performance | ⏸️ Pendente | Próxima sessão |
| **2** Cadastros | ⏸️ Pendente | Próxima sessão |
| **3** Import Excel | ⏸️ Pendente | Próxima sessão |
| **4** IAs | ⏸️ Pendente | Próxima sessão |
| **5** Export Excel | ⏸️ Pendente | Próxima sessão |
| **6** Multi-tenant | ⏸️ Pendente | Próxima sessão |
| **7** Padronização botões | ⏸️ Pendente | Próxima sessão |
| **8** Console errors | ⏸️ Pendente | Próxima sessão |
| **9** Segurança | ⏸️ Pendente | Próxima sessão |

---

## 🔴🟠🟡 Bugs descobertos

### 🔴 BUG #1 — CRÍTICO: signup trava em "Criando…" sem timeout
**Onde:** botão "Criar conta" no `hydrostec_v9.html`  
**Sintoma:** quando a request `POST /auth/v1/signup` demora (CORS pendente, network lento, Supabase down), a UI mostra "Criando…" indefinidamente. **Renderer Chrome até congela**.  
**Impacto comercial:** cliente novo tentando cadastrar pensa que sistema travou e desiste.  
**Reprodução:** acessar https://testandosite-nu.vercel.app/hydrostec_v9.html ANTES de configurar Supabase Allowed URLs e tentar criar conta.  
**Recomendação:**
```js
const result = await Promise.race([
  supabase.auth.signUp({...}),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: o servidor demorou demais. Tente de novo em alguns segundos.')), 15000))
]);
```

### 🟠 BUG #2 — SÉRIO: signup falha silenciosamente em 400/429/5xx
**Onde:** mesmo botão "Criar conta"  
**Sintoma:** Quando Supabase retorna erro (validação, rate limit, etc.), botão volta de "Criando…" pra "Criar conta" **sem mostrar mensagem alguma**. PIAToast não dispara.  
**Evidência:** capturei via interceptor de fetch:
- Tentativa 1: `400 {"code":"email_address_invalid","message":"Email address \"audit_xxx@projectia.test\" is invalid"}`
- Tentativa 2: `429 {"code":"over_email_send_rate_limit","message":"email rate limit exceeded"}`

UI não exibiu nenhum dos erros.  
**Impacto comercial:** cliente clica "Criar conta", nada acontece visualmente, ele clica de novo, 4 vezes — agora está em rate limit e nunca vai conseguir.  
**Recomendação:**
```js
const {data, error} = await supabase.auth.signUp({...});
if (error) {
  const msgs = {
    'email_address_invalid': 'Esse email não é válido. Use um email real (gmail, outlook, empresa).',
    'over_email_send_rate_limit': 'Muitas tentativas. Aguarde 1 hora e tente de novo.',
    'user_already_exists': 'Esse email já está cadastrado. Tente fazer login.',
    'weak_password': 'Senha muito fraca. Use ≥8 caracteres com letra, número e símbolo.'
  };
  PIAToast(msgs[error.code] || error.message, 'error');
  return;
}
```

### 🟡 BUG #3 — Email rate-limit muito baixo (config Supabase)
**Onde:** Supabase Auth config (free tier)  
**Sintoma:** Após 4 signups consecutivos, todo signup retorna `429 over_email_send_rate_limit`. Default Supabase = 4 emails/hora.  
**Impacto comercial:** se 5+ clientes tentam cadastrar no mesmo intervalo de 1h, do 5° em diante todos falham.  
**Recomendação:** Configurar SMTP customizado em Supabase Dashboard → Auth → SMTP Settings (use Resend ou SendGrid — ~$0/mês até 3000 emails). Sem isso o produto não escala.

### 🟡 BUG #4 — Validação client-side de email não bate com servidor
**Onde:** form de signup  
**Sintoma:** App aceita qualquer string com `@` (ex: `audit@projectia.test`) mas Supabase rejeita TLDs não-públicos.  
**Recomendação:** Adicionar regex client-side antes de chamar signUp:
```js
const tld = email.split('@')[1]?.split('.').pop()?.toLowerCase();
const validTlds = ['com','org','net','br','io','co','app','gov','edu','com.br','gov.br','org.br'];
if (!validTlds.some(t => email.endsWith('.' + t))) {
  PIAToast('Email inválido. Use um domínio público (gmail, outlook, empresa.com).', 'error');
  return;
}
```

---

## ✅ O que funciona bem

- ✅ Landing comercial carrega rápido e limpa
- ✅ App `hydrostec_v9.html` carrega sem erros de console
- ✅ Form de signup tem todos os campos certos (org, email, senha)
- ✅ Form de login renderiza correto com tab toggle
- ✅ Service Worker registrado e funcionando
- ✅ Headers de segurança presentes (HTTPS, Vercel default)
- ✅ Trigger `hyd_on_user_signup` no Supabase está perfeito — cria org + member + settings + token Power BI atomicamente quando user signupa
- ✅ Schema multi-tenant `organizations` + `org_members` bem desenhado (com plan, max_users, max_projects, etc.)

---

## 📦 Contas de teste criadas (use na próxima sessão)

Salvas em `_docs/_audit_state.json`:

| Org | Email | User ID | Org ID |
|---|---|---|---|
| **A** | `rodribinho13+audit_202605281824_a@gmail.com` | `39692478-55b7-4167-9eb9-cbefa083892f` | `03c3380a-21c7-46e9-b994-609e47d314da` |
| **B** | `rodribinho13+audit_202605281824_b@gmail.com` | `163cc02b-d64e-44dc-b183-48404e6d0d62` | `d693777a-8f0a-4d63-9f52-9481bbda653a` |

**Senha (ambas):** `AuditPassptnwe4!Aa1`  
**AUDIT_TAG:** `__AUDIT_202605281824__`

Ambas com role `admin`, plan `trial`, criadas direto via SQL (`hyd_on_user_signup` trigger fez tudo automaticamente).

---

## Recomendações priorizadas pra LANÇAMENTO COMERCIAL

| # | Severidade | Ação | Esforço |
|---|---|---|---|
| 1 | 🔴 ANTES de vender | Corrigir BUG #2 (mostrar erro do signup) | 30 min |
| 2 | 🔴 ANTES de vender | Corrigir BUG #1 (timeout no signup) | 15 min |
| 3 | 🟠 Antes de escalar | Configurar SMTP customizado (Resend/SendGrid) | 20 min |
| 4 | 🟡 Polimento | Validação TLD client-side (BUG #4) | 10 min |
| 5 | ✅ Já feito | Allowed URLs Supabase pro Vercel | — |

**Total esforço pra desbloqueio comercial: ~1h15min de dev.**

---

## Próximos passos da auditoria

A auditoria foi **interrompida** por 2 motivos:
1. **Contexto da sessão Cowork ficou muito carregado** (450+ tasks), Chrome MCP começou a dar timeouts
2. **Login na UI também ficou pending por 15s+** depois do signup — sugere o mesmo BUG #1 também afeta o LOGIN (não só signup). Vale registrar como confirmação

**Pra continuar:**
1. Abra uma **nova sessão Cowork** (limpa)
2. Cole o conteúdo de `_docs/PROMPT_AUDITORIA_TOTAL_PRODUCAO.md` no chat
3. **Pule a Fase 0.5** dizendo: "as contas Org A e B já estão criadas, ver `_docs/_audit_state.json`"
4. O agente novo continua das Fases 1-9 com sessão limpa, sem timeouts

Ou, alternativamente, primeiro **corrija os 4 bugs encontrados** (são fix de poucas linhas) e depois rode a auditoria completa.

---

*Auditor: Claude (Cowork)*  
*Tempo investido: ~45 min*  
*Bugs reais encontrados: 4 (1 crítico + 1 sério + 2 menores)*
