# PROMPT — Excel ▾ Dropdown Universal

> Use sempre que precisar garantir que o botão Excel ▾ funcione como dropdown unificado em todas as views.

---

## PROBLEMA QUE ESTE PROMPT RESOLVE

Quando uma view tem mais de uma fonte de "Excel":
1. Botão Excel simples (fallback do helper PIAExcelMenu)
2. Botão "Exportar Excel" auto-injetado pelo `excel-export.js`
3. Botão "Importar Excel" antigo do toolbarV

→ Aparecem **2-3 botões Excel separados** em vez de UM dropdown ▾.

---

## SOLUÇÃO DEFINITIVA — HTML INLINE GARANTIDO

NÃO confiar em helper. Inlinear o dropdown direto no bc-row de cada view. Marcar com classe `.pia-excel-wrap` para o auto-injetor reconhecer e NÃO duplicar.

### Template inline canônico

```html
<div class="pia-excel-wrap" style="position:relative;display:inline-block">
  <button id="pia-excel-btn-VIEWKEY" type="button" class="btn bg" style="display:inline-flex;align-items:center;gap:6px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
    Excel
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <div id="pia-excel-menu-VIEWKEY" style="display:none;position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(10,22,40,.12);min-width:180px;z-index:50;overflow:hidden">
    <button type="button" onclick="openImportExcel('VIEWKEY');document.getElementById('pia-excel-menu-VIEWKEY').style.display='none'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Importar Excel
    </button>
    <button type="button" onclick="document.getElementById('exp-modal')&&document.getElementById('exp-modal').classList.add('open');document.getElementById('pia-excel-menu-VIEWKEY').style.display='none'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;border-top:1px solid #F1F5F9;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Exportar Excel
    </button>
  </div>
</div>
```

Substitua `VIEWKEY` por: `isos`, `mat`, `quality_joints`, `civil_concr`, `civil_elem`, `civil_sinapi`, `elec_panels`, `elec_spda`, `elec_specs`, `paint`, `scaf`, `hydraulic` (etc.)

### Toggle do dropdown

`ui-confirm.js` já tem event delegation global que detecta `#pia-excel-btn-*` e abre/fecha o `#pia-excel-menu-*` correspondente. Não precisa adicionar handler nenhum.

---

## CHECKLIST

```bash
# 1) Toda view do HUB tem `.pia-excel-wrap`:
grep -c "pia-excel-wrap" hydrostec_v9.html  # ~12 (uma por view do HUB)

# 2) Zero botões Excel simples como fallback:
grep -c 'class="btn bg"[^>]*openImportExcel' hydrostec_v9.html  # 0

# 3) Zero botões "Exportar Excel" duplicados:
# (devem estar todos DENTRO do dropdown, não isolados)

# 4) excel-export.js auto-inject NÃO duplica:
# regra: se `headerEl.querySelector('.pia-excel-wrap')` retorna algo, não injeta.
grep -c "querySelector('.pia-excel-wrap')" assets/js/excel-export.js  # 1
```

---

## REGRA FINAL

> **NUNCA usar `${window.PIAExcelMenu ? ... : '<button>Excel</button>'}`** no bc-row do HUB. SEMPRE inlinear o HTML completo do dropdown. O helper PIAExcelMenu permanece pra outros usos (modais, toolbar global), mas no HUB é HTML direto.

> **NUNCA deixar um botão `Excel` simples ou `Exportar Excel` separado.** O dropdown ▾ É O ÚNICO ponto de entrada pra Importar/Exportar.

---

*Última atualização: 2026-05-28*
