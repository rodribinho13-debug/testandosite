/*! PROJECT.IA - Modal de Confirmacao + Toast + Excel Menu v9 */
(function(w, d){'use strict';

function esc(s){
  if(s==null) return '';
  return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function buildModal(opts){
  opts = opts || {};
  const title = opts.title || 'Confirmar';
  const message = opts.message || 'Tem certeza?';
  const confirmLabel = opts.confirmLabel || 'Confirmar';
  const cancelLabel = opts.cancelLabel || 'Cancelar';
  const danger = opts.danger === true;
  const warning = opts.warning === true;

  return new Promise(function(resolve){
    const prev = d.getElementById('pia-confirm-ov'); if(prev) prev.remove();
    const ov = d.createElement('div');
    ov.id = 'pia-confirm-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.72);z-index:9990;display:flex;align-items:center;justify-content:center;padding:24px;animation:pia-cf-fadein .15s ease-out';
    if(!d.getElementById('pia-confirm-keyframes')){
      const st = d.createElement('style');
      st.id = 'pia-confirm-keyframes';
      st.textContent = '@keyframes pia-cf-fadein{from{opacity:0}to{opacity:1}}@keyframes pia-cf-slidein{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}';
      d.head.appendChild(st);
    }
    const iconColor = danger ? '#DC2626' : (warning ? '#D97706' : '#1E40AF');
    const iconBg = danger ? '#FEE2E2' : (warning ? '#FEF3C7' : '#DBEAFE');
    const iconPath = danger
      ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
      : warning
      ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
      : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';

    const confirmClass = danger ? 'btn' : 'btn bp';
    const confirmStyle = danger
      ? 'background:#DC2626;color:#fff;border-color:#DC2626;box-shadow:0 4px 12px rgba(220,38,38,.25)'
      : '';

    ov.innerHTML = ''
      + '<div role="dialog" aria-modal="true" style="background:var(--t0,#fff);border-radius:12px;max-width:460px;width:100%;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(10,22,40,.22);overflow:hidden;animation:pia-cf-slidein .18s ease-out">'
        + '<div style="padding:22px 24px 16px 24px;display:flex;gap:14px;align-items:flex-start">'
          + '<div style="width:40px;height:40px;border-radius:10px;background:' + iconBg + ';color:' + iconColor + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
            + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconPath + '</svg>'
          + '</div>'
          + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:6px;line-height:1.3">' + esc(title) + '</div>'
            + '<div style="font-size:12.5px;color:var(--t7,#475569);line-height:1.5;white-space:pre-wrap">' + esc(message) + '</div>'
          + '</div>'
        + '</div>'
        + '<div style="padding:12px 24px 22px 24px;display:flex;justify-content:flex-end;gap:8px">'
          + '<button class="btn bg" id="pia-cf-cancel">' + esc(cancelLabel) + '</button>'
          + '<button class="' + confirmClass + '" id="pia-cf-ok" style="' + confirmStyle + '" autofocus>' + esc(confirmLabel) + '</button>'
        + '</div>'
      + '</div>';
    d.body.appendChild(ov);

    function close(result){
      try { d.removeEventListener('keydown', onKey); } catch(_){}
      const el = d.getElementById('pia-confirm-ov');
      if(el) el.remove();
      resolve(result);
    }
    function onKey(e){
      if(e.key === 'Escape') close(false);
      else if(e.key === 'Enter') close(true);
    }
    d.addEventListener('keydown', onKey);
    d.getElementById('pia-cf-cancel').onclick = function(){ close(false); };
    d.getElementById('pia-cf-ok').onclick = function(){ close(true); };
    ov.onclick = function(e){ if(e.target === ov) close(false); };
    setTimeout(function(){ const ok = d.getElementById('pia-cf-ok'); if(ok) ok.focus(); }, 20);
  });
}

const PIAConfirm = function(opts){ return buildModal(opts); };
PIAConfirm.danger = function(title, message, confirmLabel){
  return buildModal({ title: title, message: message, confirmLabel: confirmLabel || 'Excluir', danger: true });
};
PIAConfirm.warning = function(title, message, confirmLabel){
  return buildModal({ title: title, message: message, confirmLabel: confirmLabel || 'Confirmar', warning: true });
};

function PIAToast(message, type){
  type = type || 'success';
  const colors = {
    success: { bg: '#DCFCE7', fg: '#166534', border: '#86EFAC' },
    error:   { bg: '#FEE2E2', fg: '#991B1B', border: '#FCA5A5' },
    info:    { bg: '#DBEAFE', fg: '#1E40AF', border: '#93C5FD' },
    warning: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' }
  };
  const c = colors[type] || colors.success;
  let host = d.getElementById('pia-toast-host');
  if(!host){
    host = d.createElement('div');
    host.id = 'pia-toast-host';
    host.style.cssText = 'position:fixed;top:18px;right:18px;z-index:9995;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    d.body.appendChild(host);
  }
  if(!d.getElementById('pia-toast-keyframes')){
    const st = d.createElement('style');
    st.id = 'pia-toast-keyframes';
    st.textContent = '@keyframes pia-toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}@keyframes pia-toast-out{from{opacity:1}to{opacity:0;transform:translateX(20px)}}';
    d.head.appendChild(st);
  }
  const t = d.createElement('div');
  t.style.cssText = 'background:' + c.bg + ';color:' + c.fg + ';border:1px solid ' + c.border + ';border-radius:8px;padding:10px 14px;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px rgba(10,22,40,.12);max-width:380px;pointer-events:auto;animation:pia-toast-in .2s ease-out';
  t.textContent = message;
  host.appendChild(t);
  setTimeout(function(){
    t.style.animation = 'pia-toast-out .3s ease-in forwards';
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 320);
  }, 3500);
}

function PIAAsk(opts, callback){
  if(!callback || typeof callback !== 'function') throw new Error('PIAAsk requires callback function');
  buildModal(opts).then(callback);
}

function PIAExcelMenu(opts){
  opts = opts || {};
  const id = opts.id || 'pia-x';
  const onImp = opts.onImport || '';
  const onExp = opts.onExport || '';
  const menuId = 'pia-excel-menu-' + id;
  const btnId = 'pia-excel-btn-' + id;
  return ''
    + '<div class="pia-excel-wrap" style="position:relative;display:inline-block">'
      + '<button id="' + btnId + '" type="button" class="btn bg" style="display:inline-flex;align-items:center;gap:6px">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>'
        + 'Excel'
        + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</button>'
      + '<div id="' + menuId + '" style="display:none;position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(10,22,40,.12);min-width:180px;z-index:50;overflow:hidden">'
        + '<button type="button" onclick="' + onImp + ';document.getElementById(\'' + menuId + '\').style.display=\'none\'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left">'
          + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
          + 'Importar Excel'
        + '</button>'
        + '<button type="button" onclick="' + onExp + ';document.getElementById(\'' + menuId + '\').style.display=\'none\'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;border-top:1px solid #F1F5F9;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left">'
          + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
          + 'Exportar Excel'
        + '</button>'
      + '</div>'
    + '</div>';
}

function PIAExcelMenuBind(id){
  const btn = d.getElementById('pia-excel-btn-' + id);
  const menu = d.getElementById('pia-excel-menu-' + id);
  if(!btn || !menu) return;
  btn.onclick = function(ev){
    ev.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  };
  setTimeout(function(){ d.addEventListener('click', function(){ if(menu) menu.style.display='none'; }, { once: true }); }, 0);
}

// Auto-bind via delegation - funciona pra todos os botoes Excel que aparecem dinamicamente
d.addEventListener('click', function(ev){
  const t = ev.target.closest('[id^="pia-excel-btn-"]');
  if(t){
    ev.stopPropagation();
    const id = t.id.replace('pia-excel-btn-','');
    const menu = d.getElementById('pia-excel-menu-' + id);
    if(menu){
      const wasOpen = menu.style.display === 'block';
      // Fecha todos
      d.querySelectorAll('[id^="pia-excel-menu-"]').forEach(m => m.style.display = 'none');
      if(!wasOpen) menu.style.display = 'block';
    }
    return;
  }
  // Click fora fecha todos
  if(!ev.target.closest('[id^="pia-excel-menu-"]')){
    d.querySelectorAll('[id^="pia-excel-menu-"]').forEach(m => m.style.display = 'none');
  }
}, true);

w.PIAConfirm = PIAConfirm;
w.PIAToast = PIAToast;
w.PIAAsk = PIAAsk;
w.PIAExcelMenu = PIAExcelMenu;
w.PIAExcelMenuBind = PIAExcelMenuBind;

})(window, document);
