# PROMPT — Padronização HUB Planejador

> Use este prompt sempre que precisar padronizar uma view do HUB Planejador.
> Cole-o INTEIRO no Claude. É à prova de erros.

---

## PADRÃO VISUAL OBRIGATÓRIO

Toda view do HUB Planejador (Folhas/Isos, Mapa de Juntas, Materiais, Concretagens, Elementos Estruturais, SPDA, Sala de Controle, Specs Elétricas, Inspeções DFT, Andaimes, Insumos Civis SINAPI, Hidráulica, Desenho Técnico) DEVE ter exatamente este header no início do innerHTML:

```
[Excel ▾]   [Cadastrar via IA gradient cyan→violet]   [+ Novo]
```

**Posição:** todos no canto direito do `.bc-row`.
**Ordem (esquerda → direita):** Excel ▾ → Cadastrar via IA → + Novo.
**Labels EXATOS:**
- Botão Excel: `Excel` com chevron ▾ (dropdown)
- Botão IA: `Cadastrar via IA` (NÃO "Subir PDF pra IA")
- Botão Novo: `+ Novo` (NÃO "Nova Folha", "Nova Junta", etc.)

---

## TEMPLATE HTML CANÔNICO

Substitua o bc-row de cada renderer (rIsos, rQualityJoints, rMat, rCivilConcr, rCivilElem, rCivilSinapi, rElecPanels, rElecSpda, rElecSpecs, rPaint, rScaf, rHydraulic, etc.) por este template:

```html
<div class="bc-row">
  <i data-lucide="ICONE" style="width:14px;height:14px;color:var(--primary)"></i>
  <span style="font-weight:600;color:var(--t9)">TÍTULO DA VIEW</span>
  <span style="margin-left:8px;font-size:11px;color:var(--t6)">${count} itens · ${meta}</span>
  <div style="flex:1"></div>
  ${window.PIAExcelMenu ? window.PIAExcelMenu({
    id: 'hub-VIEWKEY',
    onImport: "openImportExcel('VIEWKEY')",
    onExport: "document.getElementById('exp-modal') && document.getElementById('exp-modal').classList.add('open')"
  }) : '<button class="btn bg" onclick="openImportExcel(\'VIEWKEY\')">Excel</button>'}
  <button class="btn bia" onclick="openDisciplineAIModal && openDisciplineAIModal('DISCIPLINA')" title="Cadastrar via IA — extrai dados de PDF">
    <i data-lucide="sparkles" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:4px"></i>Cadastrar via IA
  </button>
  <button class="btn bp" onclick="ABRIR_MODAL_NOVO()" title="Cadastrar manualmente">
    <i data-lucide="plus" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:4px"></i>+ Novo
  </button>
</div>
```

Substituições:
- `ICONE` → ícone Lucide da view (file-text, combine, package, square-stack, square-power, zap, paintbrush, columns, etc.)
- `TÍTULO DA VIEW` → nome curto e claro (ex: "Mapa de Juntas", "Folhas / Isos")
- `${count} itens · ${meta}` → contagem + meta relevante (ex: "${tot} juntas · ${soldadas} soldadas")
- `VIEWKEY` → chave do VIEW_TABLE_MAP (ex: 'quality_joints', 'isos', 'mat', 'civil_concr')
- `DISCIPLINA` → tubulacao | civil | eletrica | pintura | caldeiraria | hidraulica
- `ABRIR_MODAL_NOVO()` → função existente do renderer (oIso(null), oJoint(null), oMat(), etc.)

---

## REGRAS DE OURO

### NUNCA
1. ❌ Usar "Nova Folha", "Nova Junta", "Novo Material" — APENAS `+ Novo`
2. ❌ Usar "Subir PDF pra IA", "Subir laudo", "Subir projeto" — APENAS `Cadastrar via IA`
3. ❌ Usar `class="bc"` em qualquer botão — está deprecated
4. ❌ Colocar botão "Exportar" separado — Excel ▾ já cobre Import+Export
5. ❌ Adicionar botões dentro de banner/empty-state — só no bc-row
6. ❌ Mudar ordem horizontal — DEVE ser Excel ▾ → IA → + Novo

### SEMPRE
1. ✅ 3 botões à direita do bc-row na ordem [Excel ▾ → IA → + Novo]
2. ✅ Label exato: "Excel", "Cadastrar via IA", "+ Novo"
3. ✅ Classes: `Excel→PIAExcelMenu helper` / `IA→btn bia` / `Novo→btn bp`
4. ✅ Ícones Lucide: file-spreadsheet (no helper) / sparkles / plus
5. ✅ flex:1 spacer antes dos botões pra empurrar pra direita
6. ✅ Banner/info-box pode existir mas SEM botões repetidos do bc-row

---

## LISTA DE VIEWS DO HUB

Marcar [✓] após padronizar:

### Tubulação
- [ ] `rIsos` (Folhas / Isos) — vi
- [ ] `rQualityJoints` (Mapa de Juntas) — vquality_joints
- [ ] `rMat` (Materiais do Projeto) — vmat

### Civil
- [ ] `rCivilConcr` (Concretagens) — vcivil_concr
- [ ] `rCivilElem` (Elementos Estruturais) — vcivil_elem
- [ ] `rCivilSinapi` (Insumos Civis SINAPI) — vcivil_sinapi

### Elétrica
- [ ] `rElecPanels` (Sala de Controle) — velec_panels
- [ ] `rElecSpda` (SPDA) — velec_spda
- [ ] `rElecSpecs` (Specs Elétricas) — velec_specs

### Pintura
- [ ] `rPaint` (Inspeções DFT) — vpaint
- [ ] `rScaf` (Andaimes) — vscaf

### Outras
- [ ] `rHydraulic` (Hidráulica) — vhydraulic
- [ ] `rCalcHH` (Calculadora HH) — vcalchh (sem Excel/+Novo, só info)
- [ ] `rRefs` (Normas Técnicas) — vrefs (sem Excel/+Novo, só tabela)
- [ ] `rCablecat` (Catálogo de Cabos) — vcablecat (sem Excel/+Novo, só tabela)
- [ ] `rPerfis` (Perfis Estruturais) — vperfis (sem Excel/+Novo, só tabela)

---

## PROTOCOLO DE EXECUÇÃO

1. **Backup obrigatório:**
   ```bash
   cp hydrostec_v9.html _archive_legacy/hub_pre_$(date +%Y%m%d_%H%M%S).bak
   ```

2. **Para cada renderer:**
   - `grep -n "function rXxx" hydrostec_v9.html` — achar
   - Ler o bc-row atual
   - Substituir pelo template padrão
   - Manter os IDs e handlers existentes
   - Remover botões duplicados (Subir PDF / Exportar antigos)

3. **Validar:**
   ```bash
   # Cada view deve ter EXATAMENTE 1 bc-row com 3 botões padrão
   grep -c "Cadastrar via IA" hydrostec_v9.html   # deve igualar nº de views
   grep -c "Subir PDF pra IA" hydrostec_v9.html   # deve ser 0
   grep -c "Nova Folha\|Nova Junta\|Novo Material" hydrostec_v9.html  # deve ser baixo
   grep -c 'class="bc"[^>]*sparkles' hydrostec_v9.html  # deve ser 0
   ```

4. **HTML válido + scripts balanceados:**
   ```python
   python3 -c "
   import re
   with open('hydrostec_v9.html','rb') as f: data = f.read()
   text = data.decode('utf-8')
   opens = len(re.findall(r'<script[^>]*?>', text))
   closes = len(re.findall(r'</script>', text))
   assert opens == closes, f'Scripts desbalanceados: {opens}/{closes}'
   assert text.rstrip().endswith('</html>'), 'HTML não termina em </html>'
   print(f'OK — {len(text)} chars, {opens} scripts')
   "
   ```

5. **Bumpar SW:**
   ```
   sw.js: const V='projectia-vX.Y.Z'  (incrementar Z)
   ```

---

*Última atualização: 2026-05-28*
