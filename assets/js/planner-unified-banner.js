/* ============================================================
   PROJECT.IA — Planner Unified Banner
   Quando um dos arquivos hydrostec_planejador*.html é aberto
   FORA do iframe (top window) e SEM o param ?embedded=1,
   mostra um banner sugerindo abrir na versão unificada (v9).
   Não força redirect, não impede o uso atual.
   ============================================================ */
(function(){
  'use strict';
  try {
    // Não mostra se já estiver dentro de iframe (embutido no v9)
    if(window.top !== window) return;
    // Não mostra se a URL já tem ?embedded=1 (foi aberto explicitamente embedded)
    if(/[?&]embedded=1/.test(location.search)) return;
    // Não mostra se o usuário já dispensou o banner
    try { if(localStorage.getItem('pia.unifiedBanner.dismissed') === '1') return; } catch(_){}

    function inject(){
      if(document.getElementById('pia-unified-banner')) return;
      var bar = document.createElement('div');
      bar.id = 'pia-unified-banner';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#1E40AF,#3B82F6);color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;z-index:99998;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;box-shadow:0 4px 16px rgba(30,64,175,.25);font-weight:500';
      bar.innerHTML = ''+
        '<div style="font-size:20px;flex-shrink:0">💡</div>'+
        '<div style="flex:1;line-height:1.4">'+
          '<strong>Novidade:</strong> o HUB Planejador agora vive dentro do PROJECT.IA. Você tem uma sidebar única, navegação mais rápida e tudo conectado.'+
        '</div>'+
        '<button id="pia-ub-open" style="background:#fff;color:#1E40AF;border:none;padding:8px 16px;border-radius:7px;font-weight:700;cursor:pointer;font-size:12.5px;font-family:inherit;white-space:nowrap">Abrir no PROJECT.IA →</button>'+
        '<button id="pia-ub-close" title="Dispensar" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px;font-family:inherit">×</button>';
      // Empurra o body pra baixo pra não tampar conteúdo
      var prevTop = document.body.style.paddingTop;
      document.body.style.paddingTop = (parseInt(prevTop)||0) + 56 + 'px';
      document.body.appendChild(bar);

      document.getElementById('pia-ub-open').onclick = function(){
        // Detecta qual hub é e qual hash atual pra reabrir no v9 com a view certa
        var file = location.pathname.split('/').pop() || '';
        var disc = 'tubulacao';
        if(/civil/.test(file))       disc = 'civil';
        else if(/eletrica/.test(file))    disc = 'eletrica';
        else if(/pintura/.test(file))     disc = 'pintura';
        else if(/caldeiraria/.test(file)) disc = 'caldeiraria';
        var hash = (location.hash||'').replace('#','').trim();
        // Abre v9 com hash sinalizando para abrir o HUB embutido
        var target = 'hydrostec_v9.html#planner-hub:' + disc + (hash ? ':' + hash : '');
        window.location.href = target;
      };
      document.getElementById('pia-ub-close').onclick = function(){
        try { localStorage.setItem('pia.unifiedBanner.dismissed','1'); } catch(_){}
        document.body.style.paddingTop = prevTop;
        bar.remove();
      };
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  } catch(e){ console.warn('[unified-banner]', e); }
})();
