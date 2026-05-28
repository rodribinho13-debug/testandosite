/*! PROJECT.IA — PIAShell v1 */
(function(w,d){'use strict';
try {
const NATIVE_IDS = ['vpanel','vp','vi','vmap','vpend','vrdo','vmat','vsold','vcom','vimp','vgantt','vprod','vdash','vint','vequip','vmaint','vpaint','vscaf','vcal','vcivil_concr','vcivil_elem','vcivil_sinapi','velec_panels','velec_spda','velec_specs','vhydraulic','vquality_joints','vquality_reports','vteam','vplan'];
function getContainer(){
  let c = d.getElementById('vPIA');
  if(!c){ const content = d.querySelector('.content'); if(!content) return null;
    c = d.createElement('div'); c.id = 'vPIA'; c.style.display='none'; content.appendChild(c);
  }
  return c;
}
function hideAllNativeViews(){ NATIVE_IDS.forEach(id => { const el = d.getElementById(id); if(el) el.style.display = 'none'; }); }
function setActiveTab(tabId){
  if(!tabId) return;
  d.querySelectorAll('.side-item.active').forEach(b => b.classList.remove('active'));
  const t = d.getElementById(tabId); if(t) t.classList.add('active');
}
function inlineWrap(ov, modId, tabId){
  if(!ov) return false;
  const c = getContainer(); if(!c) return false;
  hideAllNativeViews(); setActiveTab(tabId);
  ov.style.position='relative'; ov.style.inset=''; ov.style.top=''; ov.style.left=''; ov.style.right=''; ov.style.bottom='';
  ov.style.background='transparent'; ov.style.backdropFilter='none'; ov.style.zIndex='';
  ov.style.padding='14px'; ov.style.display='block'; ov.style.width='100%'; ov.style.minHeight='calc(100vh - 80px)';
  ov.onclick = null;
  // Não esconde o botão close do Hub Unificado (precisa ficar visível pra usuário sair)
  ov.querySelectorAll('[id$="-close"]').forEach(b => {
    if(b.id === 'pia-hubu-close' || b.id === 'pia-hubu-back') return;
    b.style.display='none';
  });
  c.innerHTML=''; c.appendChild(ov); c.style.display='block'; c.dataset.mod=modId;
  return true;
}
function unmount(){ const c = d.getElementById('vPIA'); if(c){ c.style.display='none'; c.innerHTML=''; delete c.dataset.mod; } }
w.PIAShell = { unmount, hideAllNativeViews, inlineWrap };
function hookGoV(){
  if(typeof w.goV === 'function' && !w.goV._piaHooked){
    const orig = w.goV;
    w.goV = function(){ try { unmount(); } catch(_){} return orig.apply(this, arguments); };
    w.goV._piaHooked = true; return true;
  }
  return false;
}
if(!hookGoV()){
  if(d.readyState === 'loading'){ d.addEventListener('DOMContentLoaded', ()=> { setTimeout(hookGoV, 300); setTimeout(hookGoV, 1500); }); }
  else { setTimeout(hookGoV, 300); setTimeout(hookGoV, 1500); }
}
} catch(e){ console.warn('[pia-shell] init falhou:', e); }
})(window, document);
