# PROMPT MESTRE — Padronização Definitiva PROJECT.IA

> **Use este prompt sempre que precisar padronizar UI no PROJECT.IA.**
> Cole-o INTEIRO no Claude/Cowork. Ele é à prova de erros: dita o design system, as regras de UI, o checklist de validação e o que NÃO fazer.

---

## CONTEXTO DO PROJETO

PROJECT.IA é um SaaS comercial de engenharia industrial multi-disciplinar (Tubulação, Civil, Elétrica, Pintura, Caldeiraria). Arquivo principal: `C:\Users\Usuario\Downloads\SITE INTRANET\hydrostec_v9.html` (todas as views renderers estão INLINE neste HTML, não em `assets/js/v9-app.js` — esse arquivo está DESATIVADO).

**Stack:** Supabase Postgres + RLS multi-tenant, edge functions, Service Worker stale-while-revalidate, lazy-load modular.

**Crítico:** preservar 100% das funcionalidades existentes. Multi-tenant RLS é inviolável.

---

## DESIGN SYSTEM (FONTE ÚNICA DE VERDADE)

### Tokens de cor (NÃO usar cores hardcoded fora destes tokens)

```css
--t0  /* branco card (modo claro) ou cinza escuro (modo dark)         */
--t1  /* background sutil                                              */
--t3  /* borda padrão (#E5E7EB)                                        */
--t6  /* texto secundário (#64748B)                                    */
--t7  /* texto labels (#475569)                                        */
--t9  /* texto principal (#0F172A)                                     */
--primary, --primary-l, --primary-h  /* azul corporativo               */
--accent, --accent-l                 /* azul claro                     */
--success, --success-l, --success-h  /* verde                          */
--warning, --warning-l               /* âmbar                          */
--danger,  --danger-l                /* vermelho                       */
```

### Classes canônicas de botão (NUNCA inventar novas)

| Classe       | Uso semântico                          | Visual                                |
|--------------|----------------------------------------|---------------------------------------|
| `btn bp`     | **Ação primária positiva** (Novo, Criar, Salvar) | Azul corporativo `#2563EB`            |
| `btn bg`     | Ação secundária / Excel / Exportar     | Cinza neutro com borda                |
| `btn bia`    | **TUDO de IA** (gradient cyan→violet)  | `linear-gradient(135deg,#06B6D4,#7C3AED)` |
| `btn bo`     | Personalizar, configurar               | Cinza claro                           |
| `btn bc`     | **DEPRECATED — não usar mais**         | (era gradient antigo)                 |

### Pattern semântico — botões por função

| Função              | Classe canônica | Ícone Lucide        | Label padrão           |
|---------------------|-----------------|---------------------|------------------------|
| Novo / Criar        | `btn bp`        | `plus`              | `+ Novo X`             |
| Subir PDF / Cadastrar via IA | `btn bia` | `sparkles`          | `Subir PDF pra IA`     |
| Excel (Import+Export unificado) | `PIAExcelMenu()` helper | `file-spreadsheet` | `Excel ▾` (dropdown)   |
| Importar Excel só   | `btn bg`        | `upload` ou seta ↑  | `Importar Excel`       |
| Exportar só         | `btn bg`        | `download` ou seta ↓| `Exportar`             |
| Personalizar        | `btn bo`        | `settings`          | `Personalizar`         |
| Excluir             | (vermelho dentro de PIAConfirm.danger) | `trash` | `Excluir` |
| Editar              | `btn bg`        | `edit`              | `Editar`               |

### Padrão de Modal de Confirmação (NUNCA usar `confirm()` nativo)

```javascript
// Destrutivo
const ok = await PIAConfirm.danger('Excluir X?', 'Esta ação remove X e não pode ser desfeita.', 'Excluir');
if (!ok) return;

// Não-destrutivo crítico
const ok = await PIAConfirm.warning('Confirmar Y?', 'Esta ação altera Z permanentemente.', 'Confirmar');

// Toast de sucesso (NUNCA usar `alert()` para sucessos)
PIAToast('Salvo com sucesso', 'success');
```

### Padrão Excel (Import + Export unificados)

**SEMPRE usar `PIAExcelMenu()` helper** (exposto em `assets/js/ui-confirm.js`):

```javascript
${window.PIAExcelMenu ? window.PIAExcelMenu({
  id: 'mat-top',  // único por view
  onImport: "openImportExcel('mat')",
  onExport: "mtExportXLSX()"
}) : '<button class="btn bg" onclick="...">Excel</button>'}
```

Para views injetadas automaticamente pelo `excel-export.js` (`autoInject`), basta adicionar `importKey` no `VIEW_CONFIGS[]`.

---

## TEMPLATE PADRÃO DE HEADER (TODAS as views)

Toda view de listagem DEVE ter este header como primeira linha:

```html
<div class="bc-row">
  <i data-lucide="ICON" style="width:14px;height:14px;color:var(--primary)"></i>
  <span style="font-weight:600;color:var(--t9)">TÍTULO DA VIEW</span>
  <span style="margin-left:8px;font-size:11px;color:var(--t6)">${count} itens · ${meta}</span>
  <div style="flex:1"></div>
  <!-- ORDEM OBRIGATÓRIA dos botões: -->
  <button class="btn bia" onclick="openDisciplineAIModal('DISCIPLINA')">
    <i data-lucide="sparkles" ...></i>Subir PDF pra IA
  </button>
  ${window.PIAExcelMenu ? PIAExcelMenu({...}) : '<button class="btn bg">Excel</button>'}
  <button class="bp" onclick="oNOVO()">
    <i data-lucide="plus" ...></i>+ Novo X
  </button>
  <!-- Personalizar (opcional, view-specific): -->
  <button class="bo" onclick="openFieldsCustomization('VIEW')">
    <i data-lucide="settings"></i>Personalizar
  </button>
</div>
```

**Ordem horizontal obrigatória:**
1. Ícone + Título + meta (à esquerda)
2. `flex:1` spacer
3. **Subir PDF pra IA** (gradient cyan→violet) — primeiro botão à direita
4. **Excel ▾ dropdown** — segundo
5. **+ Novo X** (azul) — terceiro (CTA principal)
6. **Personalizar** (opcional) — último

---

## REGRAS DE OURO

### O QUE NUNCA FAZER

1. ❌ NUNCA criar botão Excel verde isolado (`background:#10B981`)
2. ❌ NUNCA duplicar Subir PDF (no header E dentro do banner azul)
3. ❌ NUNCA duplicar Exportar (header tem só o dropdown Excel ▾, não Exportar separado)
4. ❌ NUNCA usar `class="bc"` em botão IA — usar `class="btn bia"`
5. ❌ NUNCA usar `confirm()`/`alert()` nativos — usar `PIAConfirm` / `PIAToast`
6. ❌ NUNCA adicionar funções em `assets/js/v9-app.js` esperando que carreguem — ele está DESATIVADO. Funções de view devem ficar INLINE no `hydrostec_v9.html`
7. ❌ NUNCA colocar 3 botões "Importar Excel + Subir PDF + Cadastrar manualmente" no empty state — use só uma mensagem orientativa apontando pros botões do topo
8. ❌ NUNCA editar mais de ~30 linhas via `Edit` tool em arquivos grandes (>500KB) — usa Python heredoc com backup automático
9. ❌ NUNCA esquecer de bumpar versão `?v=N` do arquivo e do SW depois de modificar

### O QUE SEMPRE FAZER

1. ✅ Backup automático antes de mudança grande: `cp arquivo _archive_legacy/arquivo_AAAAMMDD_HHMMSS.bak`
2. ✅ Validar syntax com `node --check` em TODOS os arquivos JS modificados
3. ✅ Verificar HTML balanceado (scripts open=close) e termina em `</html>`
4. ✅ Bumpar SW: `sw.js` linha `const V='projectia-vX.Y.Z'`
5. ✅ Bumpar `?v=N` no `module-loader.js` E nas tags `<script src=...?v=N>` do HTML
6. ✅ Padronizar TODAS as views da MESMA SEÇÃO de uma vez (não deixar metade no padrão antigo)
7. ✅ Cada renderer DEVE usar o template padrão de header acima
8. ✅ Antes de declarar a tarefa concluída, fazer `grep -c "PATRÃO ANTIGO"` retornar 0

---

## LISTA COMPLETA DE VIEWS DO SITE

Todas DEVEM seguir o template padrão de header. Marca [✓] depois de padronizar.

### Tubulação (HUB Planejador)
- [ ] Folhas / Isos (`isos` → `#vi`) — função `rIsos()`
- [ ] Mapa de Juntas (`quality_joints` → `#vquality_joints`) — `rQualityJoints()`
- [ ] Suportes (`eng=supports`)
- [ ] Estruturas Metálicas (`eng=em`)
- [ ] Materiais do Projeto (`mat` → `#vmat`) — `rMat()`
- [ ] Calculadora HH (`calchh` → `#vcalchh`) — `rCalcHH()`
- [ ] Planejamento (`planning=true`)
- [ ] HYCONTROL Semanal (`eng=hycontrol`)
- [ ] Normas Técnicas (`refs` → `#vrefs`) — `rRefs()`
- [ ] Catálogo de Cabos (`cablecat` → `#vcablecat`) — `rCablecat()`
- [ ] Perfis Estruturais (`perfis` → `#vperfis`) — `rPerfis()`

### Civil
- [ ] Desenho Técnico (`tdraw=civil`)
- [ ] Concretagens (`civil_concr` → `#vcivil_concr`) — `rCivilConcr()`
- [ ] Elementos Estruturais (`civil_elem` → `#vcivil_elem`) — `rCivilElem()`
- [ ] Insumos Civis SINAPI (`civil_sinapi`)
- [ ] Planejamento (`planning=true`)
- [ ] Calculadora HH

### Elétrica
- [ ] Desenho Técnico (`tdraw=eletrica`)
- [ ] Cabos lançamento (`eng=cables`)
- [ ] Eletrodutos (`eng=eletroduct`)
- [ ] Sala de Controle / Quadros Elétricos (`elec_panels` → `#velec_panels`) — `rElecPanels()`
- [ ] SPDA (`elec_spda` → `#velec_spda`) — `rElecSpda()`
- [ ] Specs Elétricas (`elec_specs` → `#velec_specs`) — `rElecSpecs()`
- [ ] Planejamento
- [ ] Catálogo de Cabos

### Pintura
- [ ] Desenho Técnico (`tdraw=pintura`)
- [ ] Inspeções DFT (`paint` → `#vpaint`) — `rPaint()`
- [ ] Andaimes (`scaf` → `#vscaf`) — `rScaf()`
- [ ] Planejamento

### Caldeiraria
- [ ] Desenho Técnico (`tdraw=caldeiraria`)
- [ ] Estruturas Metálicas (`eng=em`)
- [ ] Perfis Estruturais
- [ ] Planejamento
- [ ] Calculadora HH

### Qualidade (fora do HUB)
- [ ] Soldadores (`sold` → `#vsold`) — `rSold()`
- [ ] Mapa de Juntas
- [ ] Relatórios END (`quality_reports` → `#vquality_reports`) — `rQualityReports()`
- [ ] Calibração (`cal` → `#vcal`) — `rCal()`

### Outros
- [ ] Comissionamento / Sistemas TH (`com` → `#vcom`) — `rCom()`
- [ ] RDO Industrial (`rdo` → `#vrdo`) — `rRdo()`
- [ ] Equipamentos NR-13 (`equip` → `#vequip`) — `rEquip()`
- [ ] Manutenção (`maint` → `#vmaint`) — `rMaint()`
- [ ] Pendências (`pend` → `#vpend`) — `rPend()`
- [ ] Produtividade HH (`prod` → `#vprod`) — `rProd()`

---

## CHECKLIST DE VALIDAÇÃO (rodar a cada mudança)

```bash
cd "/sessions/.../mnt/SITE INTRANET"

# 1. Syntax check em TODOS os arquivos JS modificados
for f in hydrostec_v9.html assets/js/*.js sw.js; do
  case "$f" in *.html) ;; *) node --check "$f" && echo "OK $f" || echo "FAIL $f";; esac
done

# 2. HTML válido + scripts balanceados + UTF-8 + termina em </html>
python3 -c "
import re
with open('hydrostec_v9.html','rb') as f: data = f.read()
text = data.decode('utf-8')  # se der UnicodeDecodeError, ARQUIVO TRUNCADO
opens = len(re.findall(r'<script[^>]*?>', text))
closes = len(re.findall(r'</script>', text))
assert opens == closes, f'Scripts desbalanceados: {opens}/{closes}'
assert text.rstrip().endswith('</html>'), 'HTML não termina em </html>'
print(f'OK — {len(text)} chars, {opens} scripts balanceados')
"

# 3. Contar padrões ANTIGOS que devem ser ZERO
echo "Botões class=bc IA (deve ser 0):"
grep -c 'class="bc"[^>]*sparkles' hydrostec_v9.html
echo "Botões Excel verde isolado #10B981 (deve ser 0):"
grep -c '#10B981.*Excel' assets/js/excel-export.js
echo "alert() em produção (deve ser baixo):"
grep -c "^\s*alert(" hydrostec_v9.html

# 4. SW bumpado (deve mostrar versão atual):
grep "const V=" sw.js
```

---

## PROTOCOLO DE EXECUÇÃO PASSO-A-PASSO

Para uma nova rodada de padronização:

1. **Auditar primeiro:**
   - `grep -n "function r<NomeView>" hydrostec_v9.html` → encontrar o renderer
   - Ler o renderer completo
   - Comparar com o template padrão de header
   - Listar TODAS as discrepâncias

2. **Backup obrigatório:**
   ```bash
   cp hydrostec_v9.html _archive_legacy/hydrostec_pre_$(date +%Y%m%d_%H%M%S).html.bak
   ```

3. **Aplicar o template padrão:**
   - Substituir o bc-row antigo pelo template padrão acima
   - Manter os IDs/handlers existentes
   - Remover empty-state buttons duplicados (3 botões que repetem os do topo)
   - Padronizar IA com `class="btn bia"`

4. **Validar:**
   - Rodar o checklist acima
   - Confirmar 0 padrões antigos
   - HTML termina em `</html>`
   - Scripts balanceados

5. **Bumpar versões:**
   - `sw.js`: incrementar `const V='projectia-vX.Y.Z'`
   - Arquivos JS modificados: `?v=N` no module-loader E no HTML

6. **Reportar:**
   - Lista de views padronizadas com [✓]
   - Lista de issues encontrados e como foram resolvidos
   - Versão final

---

## ARQUITETURA: O QUE CARREGA O QUÊ

```
hydrostec_v9.html (PRINCIPAL — TODAS as renderers inline)
├── <script src="security.js?v=1">
├── <script src="custom_views.js?v=3">
├── <script src="saas-modules.js?v=4">
├── <script src="ia-chat.js?v=11">
├── <script src="ui-confirm.js?v=2">       ← PIAConfirm, PIAToast, PIAExcelMenu, PIAAsk
├── <script src="excel-export.js?v=6">     ← autoInject (precisa estar APÓS ui-confirm)
├── <script src="ai-router.js?v=1">
├── <script src="module-loader.js?v=19">   ← lazy-load registry
├── <script src="planejamento.js?v=3">
└── <script src="sidebar-groups.js?v=28">
```

**v9-app.js DESATIVADO** — não adicionar nada lá esperando que carregue.

Módulos lazy (`tdraw.js`, `pcp.js`, `orcamento.js`, etc.) são carregados sob demanda via `PIALazy.run()` ou `PIALazy.ensure()`.

---

## VOCABULÁRIO PARA REPORTAR PROGRESSO

Use estes termos exatos pra evitar ambiguidade:

- **Header padronizado** = o bc-row com [ícone+título+meta] + [IA gradient] + [Excel ▾] + [+ Novo X]
- **Empty state limpo** = sem botões duplicados, só texto orientativo
- **Excel dropdown** = `PIAExcelMenu()` com Importar+Exportar (NÃO botão simples)
- **IA padronizada** = `class="btn bia"` com gradient cyan→violet
- **View nativa** = render inline no HTML (não iframe, não module externo)
- **View integrada** = nativa OU eng-module OU tdraw OU planning (NÃO iframe `hub:`)

---

## REGRA FINAL

> **Se em qualquer momento durante a sessão você precisar fazer >5 edits em mais de 3 arquivos diferentes pra padronizar uma view, PARE e re-leia este prompt. A view provavelmente já tem um pattern parcialmente aplicado — termine ele primeiro, depois faça o próximo.**

> **Site comercial = ZERO ERROS. Cada mudança DEVE passar pelo checklist antes de declarar concluída.**

---

*Última atualização: 2026-05-28*
*Versão atual do sistema: projectia-v9.0.6*
