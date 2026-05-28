/**
 * PROJECT.IA — Auditoria de Acessibilidade (axe-core 4.10 WCAG 2.1 AA)
 *
 * COMO USAR:
 * 1. Abra o PROJECT.IA no Chrome (a página que quer auditar)
 * 2. Pressione F12 para abrir o DevTools
 * 3. Vá na aba "Console"
 * 4. Cole TODO esse script abaixo e pressione Enter
 * 5. Aguarde 3-5 segundos. Resultado aparece como tabela colorida no console
 *    + um overlay flutuante mostrando o resumo
 *
 * REPITA em cada view do site (login, hub, modais, etc.) pra mapear tudo.
 */
(async function piaA11yAudit(){
  'use strict';
  console.log('%c⚡ PROJECT.IA A11Y Audit — carregando axe-core...', 'background:#7C3AED;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:13px');

  // 1) Carrega axe-core do CDN
  if(!window.axe){
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js';
      s.onload = res;
      s.onerror = ()=> rej(new Error('Falha carregando axe-core do CDN'));
      document.head.appendChild(s);
    });
  }

  // 2) Roda audit WCAG 2.1 A + AA
  const t0 = performance.now();
  const results = await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] },
    resultTypes: ['violations']
  });
  const elapsed = Math.round(performance.now() - t0);

  const v = results.violations || [];
  const groups = { critical: [], serious: [], moderate: [], minor: [] };
  v.forEach(r => (groups[r.impact] || groups.minor).push(r));

  // 3) Loga sumário no console
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#7C3AED');
  console.log(`%c📊 Resultado axe-core (${elapsed}ms) — ${v.length} violação(ões)`, 'background:#1E40AF;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:13px');
  console.log(`%c🚨 Critical: ${groups.critical.length}    %c🔴 Serious: ${groups.serious.length}    %c🟡 Moderate: ${groups.moderate.length}    %c🟢 Minor: ${groups.minor.length}`,
    'color:#DC2626;font-weight:bold;font-size:12px',
    'color:#EA580C;font-weight:bold;font-size:12px',
    'color:#CA8A04;font-weight:bold;font-size:12px',
    'color:#16A34A;font-weight:bold;font-size:12px');

  // 4) Tabela detalhada
  if(v.length){
    const tableData = v.map(r => ({
      Severidade: r.impact,
      Regra: r.id,
      'Elementos afetados': r.nodes.length,
      'Descrição (curta)': (r.help || '').slice(0, 60),
      'Mais info': r.helpUrl
    }));
    console.table(tableData);

    // 5) Detalhes de cada violação (clicável no console)
    v.forEach((r, i) => {
      console.groupCollapsed(`%c[${i+1}/${v.length}] ${r.impact?.toUpperCase()} · ${r.id} · ${r.nodes.length} elemento(s)`,
        `color:${r.impact==='critical'?'#DC2626':r.impact==='serious'?'#EA580C':r.impact==='moderate'?'#CA8A04':'#16A34A'};font-weight:bold`);
      console.log('Descrição:', r.description);
      console.log('Como corrigir:', r.help);
      console.log('Saiba mais:', r.helpUrl);
      console.log('Tags WCAG:', r.tags.join(', '));
      r.nodes.forEach((n, j) => {
        console.groupCollapsed(`Elemento ${j+1}: ${n.target.join(' ')}`);
        console.log('HTML:', n.html);
        console.log('Selector CSS:', n.target.join(' '));
        n.target.forEach(sel => {
          try {
            const el = document.querySelector(sel);
            if(el) console.log('Elemento DOM:', el);
          } catch(_){}
        });
        if(n.failureSummary) console.log('Problema:', n.failureSummary);
        console.groupEnd();
      });
      console.groupEnd();
    });
  } else {
    console.log('%c✓ Nenhuma violação encontrada — esta view passa WCAG 2.1 AA + best-practices!', 'color:#16A34A;font-weight:bold;font-size:13px');
  }

  // 6) Cria overlay flutuante com resumo + botão de download JSON
  const existing = document.getElementById('pia-a11y-overlay');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'pia-a11y-overlay';
  overlay.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#fff;border:2px solid #7C3AED;border-radius:12px;padding:14px 18px;box-shadow:0 12px 40px rgba(15,23,42,.25);z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:380px;color:#0F172A';
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">⚡</span>
      <strong style="font-size:14px;flex:1">A11Y Audit · ${v.length} violação(ões)</strong>
      <button id="pia-a11y-close" style="background:transparent;border:none;color:#64748B;cursor:pointer;font-size:18px;line-height:1">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px;margin-bottom:10px">
      <div>🚨 Critical: <strong style="color:#DC2626">${groups.critical.length}</strong></div>
      <div>🔴 Serious: <strong style="color:#EA580C">${groups.serious.length}</strong></div>
      <div>🟡 Moderate: <strong style="color:#CA8A04">${groups.moderate.length}</strong></div>
      <div>🟢 Minor: <strong style="color:#16A34A">${groups.minor.length}</strong></div>
    </div>
    <div style="font-size:11px;color:#475569;margin-bottom:10px;border-top:1px solid #E5E7EB;padding-top:8px">
      ${v.length ? 'Veja o console (F12) pra detalhes clicáveis de cada violação.' : '✓ Nenhuma violação. Esta view passa WCAG 2.1 AA.'}
    </div>
    <button id="pia-a11y-dl" style="background:#7C3AED;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:11.5px;width:100%">📥 Baixar relatório JSON</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('pia-a11y-close').onclick = ()=> overlay.remove();
  document.getElementById('pia-a11y-dl').onclick = ()=>{
    const blob = new Blob([JSON.stringify({url:location.href,timestamp:new Date().toISOString(),summary:{critical:groups.critical.length,serious:groups.serious.length,moderate:groups.moderate.length,minor:groups.minor.length},violations:v},null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `a11y-${location.pathname.split('/').pop().replace('.html','')}-${Date.now()}.json`;
    a.click();
  };

  // Retorna pra console exploration
  window.__piaA11y = results;
  return { totalViolations: v.length, byImpact: { critical: groups.critical.length, serious: groups.serious.length, moderate: groups.moderate.length, minor: groups.minor.length }, elapsedMs: elapsed };
})();
