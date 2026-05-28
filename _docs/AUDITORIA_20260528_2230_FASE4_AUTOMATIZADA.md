# Fase 4 — IAs end-to-end (automatizada pós v9.3.0)
**Data:** 2026-05-28 22:30
**Versão testada:** SW v9.3.0 (singleton ativo)
**Sessão browser:** estável após o singleton fix do commit `6056eff`

---

## Resumo executivo

Com o singleton no Supabase client, **Chrome MCP rodou auth + 4 IAs sem travar**. Achados reais e críticos:

| IA | Upload | Extração | INSERT | Resultado |
|---|---|---|---|---|
| **Tubulação** (iso_tubulacao.pdf) | ✅ | ✅ 1 reg | ✅ Parcial (com warnings) | 1 isometric_sheet + 3 materials + 5 joints |
| **Civil** (ficha_concretagem.pdf) | ✅ | ✅ 1 reg | 🔴 **FALHOU silenciosamente** | 0 INSERTs em civil_concrete_pours/elements |
| **Pintura** (inspecao_dft.pdf) | ✅ | ✅ 1 reg | 🔴 **FALHOU silenciosamente** | 0 INSERTs em painting_inspections |
| **Elétrica** (diagrama_unifilar.pdf) | ✅ | ⚠️ Erro amigável | n/a | "IA respondeu mas não consegui extrair" — esperado pra PDF curto |

---

## 🔴 BUG SÉRIO #6 — Cadastro Civil via IA falha por NOT NULL constraint

**Severidade:** 🔴 Crítico — funcionalidade comercial não funciona.
**Fluxo:** `Cadastrar via IA → CIVIL → ficha_concretagem.pdf → Cadastrar selecionados`

**Erro real (Postgres logs):**
```
ERROR: null value in column "tag" of relation "civil_concrete_elements"
       violates not-null constraint
```

**Causa:** o prompt da IA `civil/ficha_concretagem` (em `discipline_ai_prompts`) está configurado pra extrair concretagem → escreveria em `civil_concrete_pours`. Mas o código do `processFile` está mandando o INSERT pra `civil_concrete_elements` que requer `tag` NOT NULL — sem fornecer `tag`.

**Sintoma para o usuário:** clica "Cadastrar selecionados (1)" → modal fica em Fase 2 → 0 registros foram salvos → nenhuma mensagem de erro mostrada.

**Recomendação:**
1. Logging client-side do erro: capturar response do INSERT e mostrar via `PIAToast.error(error.message)`.
2. Mapear corretamente `ficha_concretagem` → `civil_concrete_pours` no roteador do modal IA universal (`assets/js/discipline-ai-modal.js`).
3. Adicionar `tag` ao prompt LLM quando o destino é `civil_concrete_elements`.

---

## 🔴 BUG SÉRIO #7 — Cadastro Pintura via IA falha por check constraint

**Severidade:** 🔴 Crítico.
**Fluxo:** `Cadastrar via IA → PINTURA → inspecao_dft.pdf → Cadastrar selecionados`

**Erro real (Postgres logs):**
```
ERROR: new row for relation "painting_inspections" violates check constraint
       "painting_inspections_result_check"
```

**Causa:** a IA está mandando `result` com valor fora do enum esperado (provavelmente NULL ou string em pt-BR como "Aprovado" sendo gravada num check que espera `aprovado`/`reprovado`/`pendente`).

**Recomendação:**
1. Investigar a definition do check constraint:
   ```sql
   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='painting_inspections_result_check';
   ```
2. Ajustar o prompt da IA pra retornar valores válidos do enum.
3. Validação client-side antes do INSERT pra mostrar erro amigável.

---

## 🟠 BUG SÉRIO #8 — IA tubulação tem duplicate key warnings (5x)

**Severidade:** 🟠 Sério (funcionalidade rodou, mas logs poluídos).

**Erro real (Postgres logs):**
```
ERROR: duplicate key value violates unique constraint "joints_unique_active" (5x)
ERROR: duplicate key value violates unique constraint "project_materials_project_id_material_id_key" (5x)
```

**Causa provável:** o INSERT de joints/project_materials não usa `ON CONFLICT DO NOTHING`, então tentativas idempotentes geram erro. O sistema tenta 5+ vezes (talvez retry sem distinguir).

**Recomendação:** adicionar `.upsert()` ou `ON CONFLICT (project_id, material_id) DO NOTHING` nos INSERTs.

---

## ✅ Validações positivas

1. **Singleton do Supabase client resolveu o auth race condition** — 4 IAs rodaram em sequência sem travar (vs. 0 conseguia rodar antes do v9.3.0).
2. **Flow completo da IA tubulação funcionou:** upload → extração Gemini ~10s → preview com 4 tabelas (iso + materiais + juntas + suportes) → INSERT real no banco.
3. **Modal IA universal abre via `openDisciplineAIModal(disciplina)`** consistentemente em todas as views testadas.
4. **`file_upload` do Chrome MCP funciona com inputs hidden** (`display:none`) — basta passar o ref correto.
5. **Erros semânticos da IA** (PDF sem texto, baixa qualidade) são exibidos de forma amigável ao usuário (testado com diagrama_unifilar.pdf).
6. **Cleanup**: 20 registros deletados via cascade (1 projeto + 5 joints + 1 iso_sheet + 6 materials + 6 project_materials + 1 line).

---

## Não testadas nesta sessão (renderer Chrome MCP ficou pesado após 4 modais IA seguidas)

- IA Conversacional (`chat-projeto`) — perguntas sobre dados Org A
- IA RDO (`analyze-rdo-handwritten`) — PDF de RDO escrito à mão
- IA Qualidade (`analyze-discipline-doc` para `mapa_juntas`)
- IA SPDA (`elec_spda`)
- IA Armadura Estrutural (`civil_elem`)

**Recomendação:** rodar essas 5 em uma sessão limpa (browser novo, sem testes anteriores acumulados no DOM).

---

## Próximas ações priorizadas

1. **(HIGH)** Fix Bug #6 (Civil) — mapeamento doc_type → tabela alvo está errado
2. **(HIGH)** Fix Bug #7 (Pintura) — alinhar valor de `result` da IA com check constraint
3. **(MED)** Fix Bug #8 (duplicates) — adicionar UPSERT/ON CONFLICT
4. **(MED)** Capturar erros do INSERT no client e mostrar via PIAToast.error
5. **(LOW)** Testar IAs restantes (5) em sessão limpa

---

## Como reproduzir os bugs

Para Bug #6 (Civil):
```js
// No console, logado em Org A com projeto:
window.openDisciplineAIModal('civil');
// Upload ficha_concretagem.pdf
// Click "Cadastrar selecionados (1)"
// Resultado: modal não fecha, 0 INSERT em civil_concrete_pours ou civil_concrete_elements
// Verificar postgres logs: "null value in column tag"
```

Para Bug #7 (Pintura):
```js
window.openDisciplineAIModal('pintura');
// Upload inspecao_dft.pdf
// Click "Cadastrar selecionados (1)"
// Resultado: idem, 0 INSERT em painting_inspections
// Verificar postgres logs: "painting_inspections_result_check"
```

---

*Relatório gerado 2026-05-28 22:30 — pós-deploy do singleton v9.3.0.*
