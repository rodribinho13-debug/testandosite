/*! PROJECT.IA — Módulo Planejamento v1
 *  Efetivo + Biblioteca de Produtividade + Cronograma (Tabela + Gantt)
 *  PIAPlanning.open() abre a view dentro do container .content do v9
 */
(function(w,d){'use strict';
try {

// w.sb pode não existir no momento do load (este módulo carrega cedo, antes do supabase init).
// Usamos um getter que resolve dinamicamente toda vez que sb for usado.
const sb = new Proxy({}, {
  get(_, prop){
    if(!w.sb){ throw new Error('Supabase client não inicializado. Faça login primeiro.'); }
    const val = w.sb[prop];
    return typeof val === 'function' ? val.bind(w.sb) : val;
  }
});
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function n(v,def){const x=parseFloat(v);return isFinite(x)?x:(def==null?0:def);}
function fmtDate(d){if(!d)return '';if(typeof d==='string')return d.slice(0,10);try{return new Date(d).toISOString().slice(0,10);}catch(_){return '';}}
function addDays(date, days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}

// ============================================================
// ÍCONES SVG (Feather/Lucide style, monocromático)
// ============================================================
const ICONS = {
  // Header / tabs
  calendar:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  users:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clock:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  list:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  chart:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  // Actions
  plus:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  spreadsheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>',
  sparkles:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
  back:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  edit:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  zap:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  close:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  // KPIs
  hash:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  dollar:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  layers:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  // States
  check:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  download:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  upload:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  info:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  alert:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};
function ico(name, size, color){
  const sz = size || 16;
  const cor = color || 'currentColor';
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:'+sz+'px;height:'+sz+'px;color:'+cor+';flex-shrink:0">'+(ICONS[name]||'')+'</span>';
}

let _state = {
  project: null,    // { id, name }
  crew: [],         // crew_capacity rows
  productivity: [], // service_productivity rows
  tasks: [],        // schedule_tasks rows
  view: 'effort'    // 'effort' | 'params' | 'schedule'
};

// Lista de funções comuns
const ROLES_COMUNS = [
  ['pedreiro','Pedreiro'],['servente','Servente'],['carpinteiro','Carpinteiro'],
  ['armador','Armador'],['ajudante','Ajudante'],['caldereiro','Caldereiro'],
  ['soldador','Soldador'],['montador','Montador'],['eletricista','Eletricista'],
  ['encanador','Encanador'],['pintor','Pintor'],['jatista','Jatista'],
  ['inspetor','Inspetor'],['azulejista','Azulejista'],['operador','Operador'],
  ['engenheiro','Engenheiro'],['mestre_obra','Mestre de obra']
];

const DISCIPLINAS = [
  ['civil','Civil'],['tubulacao','Tubulação'],['eletrica','Elétrica'],
  ['caldeiraria','Caldeiraria'],['pintura','Pintura'],['hidraulica','Hidráulica']
];

// ============================================================
// ABRIR VIEW
// ============================================================
// Cache do root pra que renderShell + detect Voltar use o MESMO container
// IMPORTANTE: criamos um overlay PRÓPRIO (#pia-planning-overlay) em vez de
// sobrescrever o .content do v9. Isso evita destruir #vp, #vd, etc. e o erro
// "Cannot set properties of null" em rProj() (hydrostec_v9.html:1865)
let _root = null;

async function open(projectId){
  // Remove qualquer overlay anterior pra garantir estado limpo
  const prev = d.getElementById('pia-planning-overlay');
  if(prev) prev.remove();

  // Cria overlay próprio fullscreen — NÃO toca no DOM do v9
  const root = d.createElement('div');
  root.id = 'pia-planning-overlay';
  root.style.cssText = 'position:fixed;inset:0;background:#FAFBFC;z-index:9640;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  d.body.appendChild(root);
  _root = root;
  console.log('[planning] open: overlay próprio #pia-planning-overlay criado (DOM do v9 preservado)');

  // Resolve projeto
  let pid = projectId || (w._curProject && w._curProject.id) || w.curProj;
  if(!pid && Array.isArray(w.projects) && w.projects[0]) pid = w.projects[0].id;
  if(!pid){
    if(typeof w.toast === 'function') w.toast('Selecione um projeto primeiro','warn');
    else alert('Selecione um projeto primeiro');
    return;
  }
  const p = (w.projects||[]).find(x=>x.id===pid);
  _state.project = { id: pid, name: p ? p.name : 'Projeto' };

  // Carrega dados em paralelo
  await loadAll();

  // Render
  renderShell(root);
}

async function loadAll(){
  const orgId = (w._org && w._org.id) || null;
  const pid = _state.project.id;
  const [crewR, prodR, tasksR] = await Promise.all([
    sb.from('crew_capacity').select('*').eq('project_id', pid).is('deleted_at', null).order('role'),
    sb.from('service_productivity').select('*').or('is_system.eq.true,org_id.eq.'+orgId).is('deleted_at', null).order('discipline').order('service_name'),
    sb.from('schedule_tasks').select('*').eq('project_id', pid).is('deleted_at', null).order('planned_start')
  ]);
  _state.crew = crewR.data || [];
  _state.productivity = prodR.data || [];
  _state.tasks = tasksR.data || [];
}

// ============================================================
// SHELL — abas
// ============================================================
function renderShell(root){
  // Se foi chamado sem root (ex: depois de salvar), usa o cache
  if(!root && _root) root = _root;
  _root = root;
  const v = _state.view;
  root.innerHTML = `
    <div id="vplanning" style="padding:0;background:#FAFBFC;min-height:calc(100vh - 70px)">
      <div style="background:#fff;border-bottom:1px solid #E5E7EB;padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button id="pl-back-btn" style="background:transparent;border:1px solid #E5E7EB;color:#475569;padding:7px 14px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;font-family:inherit" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">${ico('back',14)} Voltar</button>
        <div style="width:38px;height:38px;border-radius:9px;background:#0F172A;display:flex;align-items:center;justify-content:center;color:#fff">${ico('calendar',20,'#fff')}</div>
        <div>
          <div style="font-size:16px;font-weight:800;color:#0F172A">Planejamento &amp; Cronograma</div>
          <div style="font-size:11.5px;color:#64748B">Projeto: <strong>${esc(_state.project.name)}</strong></div>
        </div>
        <div style="flex:1"></div>
        <div style="display:flex;gap:4px;background:#F1F5F9;padding:4px;border-radius:8px">
          <button id="tab-effort" class="ptab ${v==='effort'?'active':''}" data-view="effort"><span class="ptab-ico">${ico('users',14)}</span>Efetivo</button>
          <button id="tab-params" class="ptab ${v==='params'?'active':''}" data-view="params"><span class="ptab-ico">${ico('clock',14)}</span>Parâmetros</button>
          <button id="tab-schedule" class="ptab ${v==='schedule'?'active':''}" data-view="schedule"><span class="ptab-ico">${ico('calendar',14)}</span>Cronograma</button>
        </div>
      </div>
      <style>
        .ptab{background:transparent;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12.5px;color:#64748B;font-family:inherit;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
        .ptab-ico{display:inline-flex;align-items:center}
        .ptab:hover{background:#fff;color:#0F172A}
        .ptab.active{background:#fff;color:#1E40AF;box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .pbtn{background:#0F172A;color:#fff;border:none;padding:7px 13px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:background .12s}
        .pbtn:hover{background:#1E293B}
        .pbtn-ia{background:#1E40AF}
        .pbtn-ia:hover{background:#1E3A8A}
        .pbtn-g{background:#fff;color:#475569;border:1px solid #E5E7EB}
        .pbtn-g:hover{background:#F8FAFC}
        .pbtn-d{background:#FEE2E2;color:#991B1B;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit}
        .pbtn-d:hover{background:#FCA5A5}
        .ptable{width:100%;border-collapse:collapse;font-size:12px;background:#fff;font-family:inherit}
        .ptable th{padding:9px 12px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap;background:#F8FAFC;position:sticky;top:0}
        .ptable td{padding:8px 12px;border-bottom:1px solid #F1F5F9;color:#0F172A}
        .ptable tr:hover td{background:#FAFBFC}
        .pinput{padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px;font-family:inherit;outline:none;width:100%}
        .pinput:focus{border-color:#1E40AF;box-shadow:0 0 0 3px rgba(30,64,175,.1)}
        .pselect{padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px;font-family:inherit;background:#fff;cursor:pointer}
        .pbadge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
        .pst-planejado{background:#DBEAFE;color:#1E40AF}
        .pst-em_andamento{background:#FEF3C7;color:#92400E}
        .pst-concluido{background:#D1FAE5;color:#065F46}
        .pst-atrasado{background:#FEE2E2;color:#991B1B}
        .pst-cancelado{background:#F1F5F9;color:#475569}
      </style>
      <div id="planview" style="padding:22px"></div>
    </div>`;

  // Bind tabs
  root.querySelectorAll('.ptab').forEach(b => {
    b.onclick = ()=>{ _state.view = b.dataset.view; renderShell(root); };
  });

  // Bind tabs já feito acima. O botão Voltar usa event delegation global
  // (registrado uma vez no fim do arquivo) pra sobreviver a re-renderizações.

  // Render view atual
  const view = root.querySelector('#planview');
  if(_state.view === 'effort') renderEffort(view);
  else if(_state.view === 'params') renderParams(view);
  else if(_state.view === 'schedule') renderSchedule(view);
}

// ============================================================
// 1) EFETIVO
// ============================================================
function renderEffort(el){
  const totalPeople = _state.crew.reduce((s,c)=>s+n(c.quantity),0);
  const totalHHday = _state.crew.reduce((s,c)=>s+n(c.quantity)*n(c.hours_per_day,8),0);
  const totalCost = _state.crew.reduce((s,c)=>s+n(c.quantity)*n(c.hours_per_day,8)*n(c.hourly_cost_brl),0);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      <div style="font-size:14px;font-weight:700;color:#0F172A">Efetivo disponível neste projeto</div>
      <div style="flex:1"></div>
      <button class="pbtn pbtn-g" id="imp-crew-xlsx" title="Importar de planilha Excel/CSV">${ico('spreadsheet',14)} Importar Excel</button>
      <button class="pbtn pbtn-ia" id="imp-crew-ai" title="Subir foto/PDF da lista da equipe — IA cadastra automaticamente">${ico('sparkles',14)} Importar via IA</button>
      <button class="pbtn" id="add-crew">${ico('plus',14,'#fff')} Adicionar função</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:18px">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
        <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700">Total de pessoas</div>
        <div style="font-size:26px;font-weight:800;color:#0F172A;font-family:ui-monospace,monospace;letter-spacing:-.5px">${totalPeople.toFixed(0)}</div>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
        <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700">HH/dia disponível</div>
        <div style="font-size:26px;font-weight:800;color:#1E40AF;font-family:ui-monospace,monospace;letter-spacing:-.5px">${totalHHday.toFixed(0)}</div>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
        <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700">Custo HH/dia estimado</div>
        <div style="font-size:26px;font-weight:800;color:#059669;font-family:ui-monospace,monospace;letter-spacing:-.5px">R$ ${totalCost.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
        <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700">Funções cadastradas</div>
        <div style="font-size:26px;font-weight:800;color:#475569;font-family:ui-monospace,monospace;letter-spacing:-.5px">${_state.crew.length}</div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
      <div style="overflow:auto;max-height:55vh">
        <table class="ptable">
          <thead><tr>
            <th>Função</th><th>Qtd.</th><th>h/dia</th><th>dias/sem.</th>
            <th>R$/h</th><th>HH/dia</th><th>R$/dia</th><th>Obs</th><th></th>
          </tr></thead>
          <tbody>${_state.crew.length ? _state.crew.map(rowCrew).join('') :
            '<tr><td colspan="9" style="padding:50px;text-align:center;color:#64748B">Nenhum efetivo cadastrado. Clique em <strong>+ Adicionar função</strong> pra começar.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  el.querySelector('#add-crew').onclick = ()=> openCrewModal(null);
  el.querySelector('#imp-crew-xlsx').onclick = ()=> openImportModal('crew', 'excel');
  el.querySelector('#imp-crew-ai').onclick = ()=> openImportModal('crew', 'ai');
  el.querySelectorAll('[data-edit-crew]').forEach(b => b.onclick = ()=> openCrewModal(b.dataset.editCrew));
  el.querySelectorAll('[data-del-crew]').forEach(b => b.onclick = ()=> delCrew(b.dataset.delCrew));
}

function rowCrew(c){
  const hhDay = n(c.quantity)*n(c.hours_per_day,8);
  const costDay = hhDay*n(c.hourly_cost_brl);
  return `<tr>
    <td><strong>${esc(c.role_label||c.role)}</strong><div style="font-size:10.5px;color:#64748B">${esc(c.role)}</div></td>
    <td class="mono" style="font-weight:700">${n(c.quantity).toFixed(0)}</td>
    <td class="mono">${n(c.hours_per_day,8).toFixed(1)}</td>
    <td class="mono">${n(c.days_per_week,5).toFixed(0)}</td>
    <td class="mono">R$ ${n(c.hourly_cost_brl).toFixed(2)}</td>
    <td class="mono" style="color:#1E40AF;font-weight:700">${hhDay.toFixed(0)}</td>
    <td class="mono" style="color:#059669;font-weight:700">R$ ${costDay.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
    <td style="font-size:10.5px;color:#64748B">${esc(c.notes||'')}</td>
    <td style="white-space:nowrap"><button class=\"pbtn pbtn-g\" data-edit-crew='${esc(c.id)}' style=\"padding:4px 9px;font-size:11px;margin-right:4px\">${ico('edit',12)} Editar</button><button class=\"pbtn-d\" data-del-crew='${esc(c.id)}' title=\"Remover\">${ico('trash',12)}</button></td>
  </tr>`;
}

function openCrewModal(id){
  const item = id ? _state.crew.find(c=>c.id===id) : {};
  const ov = d.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,sans-serif';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:520px;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">
      <div style="padding:16px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;font-weight:800;color:#0F172A">${id?'Editar':'Adicionar'} função</div>
      <div style="padding:20px 22px">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:5px">Função</label>
        <select id="cr-role" class="pselect" style="width:100%;margin-bottom:14px">${ROLES_COMUNS.map(([v,l])=>`<option value="${v}" ${item.role===v?'selected':''}>${l}</option>`).join('')}<option value="__custom" ${item.role&&!ROLES_COMUNS.find(r=>r[0]===item.role)?'selected':''}>+ Outra função personalizada</option></select>
        <input id="cr-role-custom" class="pinput" placeholder="Nome da função personalizada" style="margin-bottom:14px;display:${item.role&&!ROLES_COMUNS.find(r=>r[0]===item.role)?'block':'none'}" value="${item.role&&!ROLES_COMUNS.find(r=>r[0]===item.role)?esc(item.role):''}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Quantidade</label><input id="cr-qty" type="number" class="pinput" min="0" step="1" value="${n(item.quantity,1)}"></div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Horas/dia</label><input id="cr-hd" type="number" class="pinput" min="1" max="24" step="0.5" value="${n(item.hours_per_day,8)}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Dias/semana</label><input id="cr-dw" type="number" class="pinput" min="1" max="7" step="1" value="${n(item.days_per_week,5)}"></div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Custo R$/h</label><input id="cr-cost" type="number" class="pinput" min="0" step="0.01" value="${n(item.hourly_cost_brl,0)}"></div>
        </div>
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Observações</label>
        <textarea id="cr-notes" class="pinput" rows="2">${esc(item.notes||'')}</textarea>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">
        <button class="pbtn pbtn-g" id="cr-cancel">Cancelar</button>
        <button class="pbtn" id="cr-save">${id?'Atualizar':'Adicionar'}</button>
      </div>
    </div>`;
  d.body.appendChild(ov);
  ov.querySelector('#cr-cancel').onclick = ()=> ov.remove();
  ov.querySelector('#cr-role').onchange = (e)=> {
    ov.querySelector('#cr-role-custom').style.display = e.target.value === '__custom' ? 'block' : 'none';
  };
  ov.querySelector('#cr-save').onclick = async ()=>{
    const roleSel = ov.querySelector('#cr-role').value;
    const role = roleSel === '__custom' ? (ov.querySelector('#cr-role-custom').value||'').trim().toLowerCase().replace(/\s+/g,'_') : roleSel;
    if(!role){ alert('Função obrigatória'); return; }
    const roleLabel = ROLES_COMUNS.find(r=>r[0]===role) ? ROLES_COMUNS.find(r=>r[0]===role)[1] : role.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
    const payload = {
      org_id: w._org.id,
      project_id: _state.project.id,
      role,
      role_label: roleLabel,
      quantity: n(ov.querySelector('#cr-qty').value, 1),
      hours_per_day: n(ov.querySelector('#cr-hd').value, 8),
      days_per_week: n(ov.querySelector('#cr-dw').value, 5),
      hourly_cost_brl: n(ov.querySelector('#cr-cost').value, 0),
      notes: ov.querySelector('#cr-notes').value || null
    };
    let res;
    if(id) res = await sb.from('crew_capacity').update(payload).eq('id', id);
    else res = await sb.from('crew_capacity').insert(payload);
    if(res.error){
      if(/duplicate|unique/i.test(res.error.message)){
        alert('Essa função já está cadastrada neste projeto. Edite a existente.');
      } else alert('Erro: '+res.error.message);
      return;
    }
    ov.remove();
    await loadAll();
    renderShell(_root);
  };
}

async function delCrew(id){
  if(!confirm('Remover essa função do efetivo?')) return;
  const r = await sb.from('crew_capacity').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if(r.error){ alert('Erro: '+r.error.message); return; }
  await loadAll();
  renderShell(_root);
}

// ============================================================
// 2) PARÂMETROS DE PRODUTIVIDADE
// ============================================================
function renderParams(el){
  let filterDisc = 'all';
  const byDisc = {};
  _state.productivity.forEach(p => { (byDisc[p.discipline] = byDisc[p.discipline] || []).push(p); });

  function paint(){
    const list = filterDisc === 'all' ? _state.productivity : (byDisc[filterDisc] || []);
    el.querySelector('#prod-tbody').innerHTML = list.length ? list.map(rowProd).join('')
      : '<tr><td colspan="7" style="padding:50px;text-align:center;color:#64748B">Nenhuma produtividade nesta disciplina.</td></tr>';
    el.querySelectorAll('[data-edit-prod]').forEach(b => b.onclick = ()=> openProdModal(b.dataset.editProd));
    el.querySelectorAll('[data-del-prod]').forEach(b => b.onclick = ()=> delProd(b.dataset.delProd));
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      <div style="font-size:14px;font-weight:700;color:#0F172A">Biblioteca de produtividade</div>
      <div style="font-size:11.5px;color:#64748B">${_state.productivity.length} serviços (SINAPI + customizados)</div>
      <div style="flex:1"></div>
      <select id="prod-filter" class="pselect">
        <option value="all">Todas disciplinas</option>
        ${DISCIPLINAS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <button class="pbtn pbtn-g" id="imp-prod-xlsx" title="Importar planilha de produtividades (SINAPI/TCPO/custom)">${ico('spreadsheet',14)} Importar Excel</button>
      <button class="pbtn pbtn-ia" id="imp-prod-ai" title="Subir PDF/foto da tabela de HH — IA extrai automaticamente">${ico('sparkles',14)} Importar via IA</button>
      <button class="pbtn" id="add-prod">${ico('plus',14,'#fff')} Adicionar produtividade</button>
    </div>

    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1E3A8A">
      <strong style="display:inline-flex;align-items:center;gap:5px">${ico('info',13)} Como funciona:</strong> "HH/un" significa Homem-Hora por unidade. Ex: concretagem fck 25 → 1.25 HH/m³ significa que 1 m³ leva 1h15 de mão de obra acumulada. No cronograma, o sistema calcula automaticamente os dias necessários com base no efetivo disponível.
    </div>

    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
      <div style="overflow:auto;max-height:60vh">
        <table class="ptable">
          <thead><tr>
            <th>Serviço</th><th>Disciplina</th><th>Un.</th><th>HH/un</th>
            <th>Equipe sugerida</th><th>Fonte</th><th></th>
          </tr></thead>
          <tbody id="prod-tbody"></tbody>
        </table>
      </div>
    </div>`;

  el.querySelector('#add-prod').onclick = ()=> openProdModal(null);
  el.querySelector('#imp-prod-xlsx').onclick = ()=> openImportModal('productivity', 'excel');
  el.querySelector('#imp-prod-ai').onclick = ()=> openImportModal('productivity', 'ai');
  el.querySelector('#prod-filter').onchange = (e)=>{ filterDisc = e.target.value; paint(); };
  paint();
}

function rowProd(p){
  const rolesStr = Object.entries(p.required_roles||{}).map(([k,v])=>`${v}× ${k}`).join(', ');
  const sysLabel = p.is_system ? '<span style="background:#F1F5F9;color:#475569;padding:1px 6px;border-radius:3px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px">Sistema</span>' : '<span style="background:#DBEAFE;color:#1E40AF;padding:1px 6px;border-radius:3px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px">Custom</span>';
  return `<tr>
    <td><strong>${esc(p.service_name)}</strong><div style="font-size:10.5px;color:#64748B;font-family:ui-monospace,monospace">${esc(p.service_code)}</div></td>
    <td><span class="pbadge" style="background:#F1F5F9;color:#475569">${esc(p.discipline)}</span></td>
    <td class="mono">${esc(p.unit)}</td>
    <td class="mono" style="color:#1E40AF;font-weight:700">${n(p.hh_per_unit).toFixed(3)}</td>
    <td style="font-size:11.5px">${esc(rolesStr||'—')}</td>
    <td style="font-size:10.5px;color:#64748B">${esc(p.source||'')} ${sysLabel}</td>
    <td style="white-space:nowrap">${p.is_system ? '<span style="color:#94A3B8;font-size:10.5px">somente leitura</span>' : `<button class=\"pbtn pbtn-g\" data-edit-prod='${esc(p.id)}' style=\"padding:4px 9px;font-size:11px;margin-right:4px\">${ico('edit',12)} Editar</button><button class=\"pbtn-d\" data-del-prod='${esc(p.id)}' title=\"Remover\">${ico('trash',12)}</button>`}</td>
  </tr>`;
}

function openProdModal(id){
  const item = id ? _state.productivity.find(p=>p.id===id) : {};
  if(item.is_system){ alert('Produtividades do sistema são somente leitura. Crie uma nova personalizada.'); return; }
  const rolesObj = item.required_roles || {};
  const rolesStr = Object.entries(rolesObj).map(([k,v])=>`${k}:${v}`).join(', ');
  const ov = d.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,sans-serif';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:580px;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">
      <div style="padding:16px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;font-weight:800;color:#0F172A">${id?'Editar':'Adicionar'} produtividade</div>
      <div style="padding:20px 22px;max-height:65vh;overflow:auto">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:5px">Código do serviço</label>
        <input id="pr-code" class="pinput" placeholder="ex: concretagem_fck25_personalizado" style="margin-bottom:14px;font-family:ui-monospace,monospace" value="${esc(item.service_code||'')}">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Nome descritivo</label>
        <input id="pr-name" class="pinput" placeholder="ex: Concretagem fck 25 MPa - obra A" style="margin-bottom:14px" value="${esc(item.service_name||'')}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Disciplina</label>
            <select id="pr-disc" class="pselect" style="width:100%">${DISCIPLINAS.map(([v,l])=>`<option value="${v}" ${item.discipline===v?'selected':''}>${l}</option>`).join('')}</select>
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Unidade</label>
            <select id="pr-unit" class="pselect" style="width:100%">${['m','m2','m3','un','pc','kg','l','rolo'].map(u=>`<option ${item.unit===u?'selected':''}>${u}</option>`).join('')}</select>
          </div>
        </div>
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">HH por unidade</label>
        <input id="pr-hh" type="number" class="pinput" min="0.001" step="0.01" placeholder="ex: 1.25" style="margin-bottom:14px" value="${item.hh_per_unit||''}">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Equipe sugerida (formato: função:qtd, separado por vírgula)</label>
        <input id="pr-roles" class="pinput" placeholder="ex: pedreiro:2, ajudante:1" style="margin-bottom:14px" value="${esc(rolesStr)}">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Observações</label>
        <textarea id="pr-notes" class="pinput" rows="2">${esc(item.notes||'')}</textarea>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">
        <button class="pbtn pbtn-g" id="pr-cancel">Cancelar</button>
        <button class="pbtn" id="pr-save">${id?'Atualizar':'Adicionar'}</button>
      </div>
    </div>`;
  d.body.appendChild(ov);
  ov.querySelector('#pr-cancel').onclick = ()=> ov.remove();
  ov.querySelector('#pr-save').onclick = async ()=>{
    const code = (ov.querySelector('#pr-code').value||'').trim().toLowerCase().replace(/\s+/g,'_');
    const name = (ov.querySelector('#pr-name').value||'').trim();
    const hh = n(ov.querySelector('#pr-hh').value, 0);
    if(!code || !name || hh <= 0){ alert('Código, nome e HH/un > 0 são obrigatórios.'); return; }
    const rolesRaw = ov.querySelector('#pr-roles').value || '';
    const roles = {};
    rolesRaw.split(',').forEach(p => {
      const [k,v] = p.split(':').map(s=>(s||'').trim());
      if(k && v && !isNaN(parseFloat(v))) roles[k.toLowerCase()] = parseFloat(v);
    });
    const payload = {
      org_id: w._org.id,
      service_code: code,
      service_name: name,
      discipline: ov.querySelector('#pr-disc').value,
      unit: ov.querySelector('#pr-unit').value,
      hh_per_unit: hh,
      required_roles: roles,
      source: 'manual',
      notes: ov.querySelector('#pr-notes').value || null
    };
    let res;
    if(id) res = await sb.from('service_productivity').update(payload).eq('id', id);
    else res = await sb.from('service_productivity').insert(payload);
    if(res.error){ alert('Erro: '+res.error.message); return; }
    ov.remove();
    await loadAll();
    renderShell(_root);
  };
}

async function delProd(id){
  if(!confirm('Remover essa produtividade?')) return;
  const r = await sb.from('service_productivity').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if(r.error){ alert('Erro: '+r.error.message); return; }
  await loadAll();
  renderShell(_root);
}

// ============================================================
// 3) CRONOGRAMA — sub-abas Tabela | Gantt
// ============================================================
let _schedView = 'table'; // 'table' | 'gantt'

function renderSchedule(el){
  const totalHH = _state.tasks.reduce((s,t)=>s+n(t.estimated_hh),0);
  const done = _state.tasks.filter(t=>t.status==='concluido').length;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <div style="font-size:14px;font-weight:700;color:#0F172A">Cronograma — ${_state.tasks.length} tarefa(s)</div>
      <div style="font-size:11.5px;color:#64748B">HH total estimado: <strong>${totalHH.toLocaleString('pt-BR',{maximumFractionDigits:0})}</strong> · Concluídas: <strong>${done}/${_state.tasks.length}</strong></div>
      <div style="flex:1"></div>
      <div style="display:flex;gap:4px;background:#F1F5F9;padding:4px;border-radius:8px;margin-right:8px">
        <button id="sv-table" class="ptab ${_schedView==='table'?'active':''}"><span class="ptab-ico">${ico('list',14)}</span>Tabela</button>
        <button id="sv-gantt" class="ptab ${_schedView==='gantt'?'active':''}"><span class="ptab-ico">${ico('chart',14)}</span>Gantt</button>
      </div>
      <button class="pbtn" id="add-task">${ico('plus',14,'#fff')} Nova tarefa</button>
    </div>

    <div id="sched-view"></div>`;
  el.querySelector('#sv-table').onclick = ()=>{ _schedView='table'; renderSchedule(el); };
  el.querySelector('#sv-gantt').onclick = ()=>{ _schedView='gantt'; renderSchedule(el); };
  el.querySelector('#add-task').onclick = ()=> openTaskModal(null);

  const inner = el.querySelector('#sched-view');
  if(_schedView === 'table') renderScheduleTable(inner);
  else renderScheduleGantt(inner);
}

function renderScheduleTable(el){
  el.innerHTML = `
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
      <div style="overflow:auto;max-height:60vh">
        <table class="ptable">
          <thead><tr>
            <th>Tarefa</th><th>Disciplina</th><th>Qtd × Un</th>
            <th>HH est.</th><th>Início</th><th>Fim</th><th>Dias</th>
            <th>Equipe</th><th>Status</th><th>Prog.</th><th></th>
          </tr></thead>
          <tbody>${_state.tasks.length ? _state.tasks.map(rowTask).join('') :
            '<tr><td colspan="11" style="padding:60px;text-align:center;color:#64748B"><div style="margin-bottom:10px;display:flex;justify-content:center;color:#CBD5E1"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div style="font-weight:700;color:#0F172A;margin-bottom:4px">Nenhuma tarefa planejada</div><div style="font-size:11.5px">Clique em <strong>+ Nova tarefa</strong> pra começar.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  el.querySelectorAll('[data-edit-task]').forEach(b => b.onclick = ()=> openTaskModal(b.dataset.editTask));
  el.querySelectorAll('[data-del-task]').forEach(b => b.onclick = ()=> delTask(b.dataset.delTask));
}

function rowTask(t){
  const rolesStr = Object.entries(t.assigned_roles||{}).map(([k,v])=>`${v}× ${k.slice(0,4)}`).join(' ');
  return `<tr>
    <td><strong>${esc(t.name)}</strong>${t.service_code?`<div style="font-size:10px;color:#64748B;font-family:ui-monospace,monospace">${esc(t.service_code)}</div>`:''}</td>
    <td><span class="pbadge" style="background:#F1F5F9;color:#475569">${esc(t.discipline||'—')}</span></td>
    <td class="mono">${n(t.quantity).toLocaleString('pt-BR',{maximumFractionDigits:2})} ${esc(t.unit||'')}</td>
    <td class="mono" style="color:#1E40AF;font-weight:700">${n(t.estimated_hh).toFixed(0)}</td>
    <td class="mono">${fmtDate(t.planned_start)}</td>
    <td class="mono">${fmtDate(t.planned_finish)}</td>
    <td class="mono" style="text-align:center;font-weight:700">${t.planned_days}</td>
    <td style="font-size:10.5px">${esc(rolesStr||'—')}</td>
    <td><span class="pbadge pst-${esc(t.status)}">${esc(t.status)}</span></td>
    <td class="mono" style="text-align:center"><div style="display:inline-block;width:50px;background:#F1F5F9;border-radius:3px;overflow:hidden;height:8px;vertical-align:middle"><div style="background:#10B981;height:100%;width:${n(t.progress_pct)}%"></div></div> ${n(t.progress_pct).toFixed(0)}%</td>
    <td style="white-space:nowrap"><button class=\"pbtn pbtn-g\" data-edit-task='${esc(t.id)}' style=\"padding:4px 9px;font-size:11px;margin-right:4px\">${ico('edit',12)} Editar</button><button class=\"pbtn-d\" data-del-task='${esc(t.id)}' title=\"Remover\">${ico('trash',12)}</button></td>
  </tr>`;
}

function renderScheduleGantt(el){
  if(!_state.tasks.length){
    el.innerHTML = '<div style="padding:60px;text-align:center;color:#64748B;background:#fff;border:1px solid #E5E7EB;border-radius:10px"><div style="margin-bottom:10px;display:flex;justify-content:center;color:#CBD5E1"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div style="font-weight:700;color:#0F172A">Nenhuma tarefa pra exibir no Gantt</div><div style="font-size:11.5px;margin-top:4px">Adicione tarefas na aba Tabela primeiro</div></div>';
    return;
  }

  // Encontra range de datas
  const dates = _state.tasks.flatMap(t => [t.planned_start, t.planned_finish].filter(Boolean).map(d => new Date(d)));
  if(!dates.length){ el.innerHTML = '<div style="padding:40px;text-align:center;color:#64748B">Tarefas sem datas válidas</div>'; return; }
  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates));
  // Adiciona buffer de 2 dias
  minD.setDate(minD.getDate() - 1);
  maxD.setDate(maxD.getDate() + 2);
  const totalDays = Math.ceil((maxD - minD) / 86400000) + 1;
  const dayWidth = Math.max(28, Math.min(80, Math.floor(900 / totalDays)));

  // Header com dias
  let headerCells = '';
  for(let i = 0; i < totalDays; i++){
    const dt = addDays(minD, i);
    const dow = dt.getDay();
    const isWeekend = dow === 0 || dow === 6;
    headerCells += `<div style="width:${dayWidth}px;flex-shrink:0;text-align:center;border-right:1px solid #F1F5F9;padding:6px 2px;font-size:9.5px;color:${isWeekend?'#94A3B8':'#475569'};font-weight:${dow===1?'700':'500'};background:${isWeekend?'#F8FAFC':'#fff'}"><div>${dt.getDate()}/${(dt.getMonth()+1).toString().padStart(2,'0')}</div><div style="font-size:8.5px;text-transform:uppercase">${['D','S','T','Q','Q','S','S'][dow]}</div></div>`;
  }

  // Linhas (1 por tarefa)
  const STATUS_COLOR = {planejado:'#3B82F6',em_andamento:'#F59E0B',concluido:'#10B981',atrasado:'#EF4444',cancelado:'#94A3B8'};
  let rows = '';
  _state.tasks.forEach(t => {
    const start = new Date(t.planned_start);
    const finish = new Date(t.planned_finish);
    const offset = Math.max(0, Math.floor((start - minD) / 86400000));
    const span = Math.max(1, Math.floor((finish - start) / 86400000) + 1);
    const color = STATUS_COLOR[t.status] || '#3B82F6';
    const progress = n(t.progress_pct);
    rows += `
      <div style="display:flex;border-bottom:1px solid #F1F5F9;min-height:36px">
        <div style="width:280px;flex-shrink:0;padding:8px 12px;border-right:1px solid #E5E7EB;background:#FAFBFC;font-size:11.5px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
          <div style="font-size:10px;color:#64748B">${esc(t.discipline||'')} · ${n(t.estimated_hh).toFixed(0)} HH</div>
        </div>
        <div style="display:flex;position:relative;flex:1">
          ${Array.from({length: totalDays}, (_,i) => {
            const dt = addDays(minD, i);
            const dow = dt.getDay();
            const isWeekend = dow === 0 || dow === 6;
            return `<div style="width:${dayWidth}px;flex-shrink:0;border-right:1px solid #F8FAFC;background:${isWeekend?'#FAFBFC':'#fff'}"></div>`;
          }).join('')}
          <div title="${esc(t.name)} (${fmtDate(t.planned_start)} → ${fmtDate(t.planned_finish)}, ${t.planned_days} dias, ${n(t.estimated_hh).toFixed(0)} HH)" style="position:absolute;left:${offset*dayWidth}px;top:6px;height:24px;width:${span*dayWidth - 2}px;background:${color};border-radius:4px;display:flex;align-items:center;padding:0 8px;color:#fff;font-size:10.5px;font-weight:700;cursor:pointer;overflow:hidden" onclick="PIAPlanning&&PIAPlanning.editTask('${esc(t.id)}')">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
            ${progress > 0 ? `<div style="position:absolute;left:0;top:0;height:100%;width:${progress}%;background:rgba(255,255,255,.25);border-right:1px solid rgba(255,255,255,.4)"></div>` : ''}
          </div>
        </div>
      </div>`;
  });

  el.innerHTML = `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1E3A8A">
      <strong style="display:inline-flex;align-items:center;gap:5px">${ico('chart',13)} Gantt</strong> — clique numa barra pra editar. Hoje: <strong>${fmtDate(new Date())}</strong>. Cores: <span style="background:#3B82F6;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">planejado</span> <span style="background:#F59E0B;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">em andamento</span> <span style="background:#10B981;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">concluído</span> <span style="background:#EF4444;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">atrasado</span>
    </div>
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:auto;max-width:100%">
      <div style="min-width:max-content">
        <div style="display:flex;border-bottom:2px solid #E5E7EB;background:#F8FAFC;position:sticky;top:0;z-index:2">
          <div style="width:280px;flex-shrink:0;padding:9px 12px;border-right:1px solid #E5E7EB;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Tarefa</div>
          <div style="display:flex">${headerCells}</div>
        </div>
        ${rows}
      </div>
    </div>`;
}

function openTaskModal(id){
  const item = id ? _state.tasks.find(t=>t.id===id) : { planned_start: fmtDate(new Date()), planned_finish: fmtDate(addDays(new Date(), 1)) };
  const ov = d.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,sans-serif';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:680px;max-height:92vh;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;display:flex;flex-direction:column">
      <div style="padding:16px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;font-weight:800;color:#0F172A">${id?'Editar':'Nova'} tarefa</div>
      <div style="padding:20px 22px;overflow:auto;flex:1">
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:5px">Nome da tarefa</label>
        <input id="tk-name" class="pinput" placeholder="ex: Concretagem viga V1 - 1º pavimento" style="margin-bottom:14px" value="${esc(item.name||'')}">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Disciplina</label>
            <select id="tk-disc" class="pselect" style="width:100%"><option value="">—</option>${DISCIPLINAS.map(([v,l])=>`<option value="${v}" ${item.discipline===v?'selected':''}>${l}</option>`).join('')}</select>
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Serviço (biblioteca)</label>
            <select id="tk-service" class="pselect" style="width:100%"><option value="">— Manual (sem ref) —</option></select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Quantidade</label>
            <input id="tk-qty" type="number" class="pinput" min="0" step="0.01" value="${n(item.quantity,0)}">
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Unidade</label>
            <input id="tk-unit" class="pinput" placeholder="m3, m2, un, m" value="${esc(item.unit||'')}">
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">HH/un</label>
            <input id="tk-hhu" type="number" class="pinput" min="0" step="0.001" value="${item.hh_per_unit||''}">
          </div>
        </div>

        <div id="tk-calc-banner" style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:#065F46;display:none">
          <strong style="display:inline-flex;align-items:center;gap:5px">${ico('zap',12)} Cálculo automático:</strong> <span id="tk-calc-text"></span>
        </div>

        <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:5px;letter-spacing:.3px">Equipe alocada</label>
        <div id="tk-roles-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"></div>
        <button type="button" id="tk-roles-add" style="background:transparent;border:1px dashed #CBD5E1;color:#475569;padding:7px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:11.5px;font-family:inherit;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:5px;margin-bottom:14px;transition:all .12s" onmouseover="this.style.background='#F8FAFC';this.style.borderColor='#1E40AF';this.style.color='#1E40AF'" onmouseout="this.style.background='transparent';this.style.borderColor='#CBD5E1';this.style.color='#475569'">${ico('plus',12)} Adicionar função à equipe</button>
        <input type="hidden" id="tk-roles" value="${esc(Object.entries(item.assigned_roles||{}).map(([k,v])=>`${k}:${v}`).join(', '))}">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Início planejado</label>
            <input id="tk-start" type="date" class="pinput" value="${fmtDate(item.planned_start)}">
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Fim planejado</label>
            <input id="tk-finish" type="date" class="pinput" value="${fmtDate(item.planned_finish)}">
          </div>
        </div>

        <button id="tk-auto" class="pbtn pbtn-g" style="margin-bottom:14px;width:100%;justify-content:center">${ico('zap',14)} Cálculo automático — Quantidade × HH/un ÷ Efetivo</button>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Status</label>
            <select id="tk-status" class="pselect" style="width:100%">${['planejado','em_andamento','concluido','atrasado','cancelado'].map(s=>`<option value="${s}" ${item.status===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
          <div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Progresso (%)</label>
            <input id="tk-prog" type="number" class="pinput" min="0" max="100" step="1" value="${n(item.progress_pct,0)}">
          </div>
        </div>

        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Observações</label>
        <textarea id="tk-notes" class="pinput" rows="2">${esc(item.notes||'')}</textarea>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">
        <button class="pbtn pbtn-g" id="tk-cancel">Cancelar</button>
        <button class="pbtn" id="tk-save">${id?'Atualizar':'Adicionar'}</button>
      </div>
    </div>`;
  d.body.appendChild(ov);

  // ============================================================
  // EQUIPE ALOCADA — UI por linhas
  // ============================================================
  function renderRolesList(){
    const list = ov.querySelector('#tk-roles-list');
    if(!list) return;
    // Lê valor atual do hidden input
    const raw = ov.querySelector('#tk-roles').value || '';
    const rolesArr = [];
    raw.split(',').forEach(p => {
      const [k,v] = p.split(':').map(s=>(s||'').trim());
      if(k){ rolesArr.push({ role: k.toLowerCase(), qty: parseFloat(v) || 1 }); }
    });
    if(!rolesArr.length){
      list.innerHTML = '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 14px;font-size:11.5px;color:#64748B;text-align:center">Nenhuma função alocada. Clique abaixo pra adicionar a primeira.</div>';
      return;
    }
    list.innerHTML = rolesArr.map((r, i) => {
      const opts = ROLES_COMUNS.map(([v,l]) => `<option value="${v}" ${r.role===v?'selected':''}>${l}</option>`).join('');
      const isCustom = !ROLES_COMUNS.find(rc => rc[0] === r.role);
      return `<div class="tk-role-row" data-i="${i}" style="display:grid;grid-template-columns:1fr 100px 36px;gap:6px;align-items:center">
        <select class="pselect tk-role-sel" data-i="${i}" style="width:100%">${opts}<option value="__custom" ${isCustom?'selected':''}>+ Outra (personalizada)</option></select>
        <input type="number" class="pinput tk-role-qty" data-i="${i}" min="0" step="0.5" value="${r.qty}" placeholder="Qtd" title="Quantidade de pessoas">
        <button type="button" class="tk-role-del" data-i="${i}" style="background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;width:36px;height:32px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-family:inherit;transition:all .12s" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='#FEF2F2'" title="Remover">${ico('trash',13)}</button>
        ${isCustom ? `<input type="text" class="pinput tk-role-custom" data-i="${i}" placeholder="Nome da função personalizada" value="${esc(r.role)}" style="grid-column:1 / -1;margin-top:2px">` : ''}
      </div>`;
    }).join('');

    // Binds
    list.querySelectorAll('.tk-role-sel').forEach(sel => {
      sel.onchange = (e) => {
        const i = +e.target.dataset.i;
        const val = e.target.value;
        rolesArr[i].role = val === '__custom' ? '' : val;
        syncRolesToHidden(rolesArr);
        renderRolesList();
      };
    });
    list.querySelectorAll('.tk-role-qty').forEach(inp => {
      inp.oninput = (e) => {
        const i = +e.target.dataset.i;
        rolesArr[i].qty = parseFloat(e.target.value) || 0;
        syncRolesToHidden(rolesArr);
        updateCalcBanner();
      };
    });
    list.querySelectorAll('.tk-role-custom').forEach(inp => {
      inp.oninput = (e) => {
        const i = +e.target.dataset.i;
        rolesArr[i].role = (e.target.value||'').trim().toLowerCase().replace(/\s+/g,'_');
        syncRolesToHidden(rolesArr);
      };
    });
    list.querySelectorAll('.tk-role-del').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.i;
        rolesArr.splice(i, 1);
        syncRolesToHidden(rolesArr);
        renderRolesList();
        updateCalcBanner();
      };
    });
  }

  function syncRolesToHidden(rolesArr){
    const str = rolesArr.filter(r => r.role && r.qty > 0).map(r => r.role + ':' + r.qty).join(', ');
    ov.querySelector('#tk-roles').value = str;
  }

  // Botão "+ Adicionar função"
  ov.querySelector('#tk-roles-add').onclick = () => {
    const cur = ov.querySelector('#tk-roles').value || '';
    const newRole = cur ? cur + ', pedreiro:1' : 'pedreiro:1';
    ov.querySelector('#tk-roles').value = newRole;
    renderRolesList();
    updateCalcBanner();
  };

  // Render inicial
  renderRolesList();

  // Popula dropdown de serviços ao mudar disciplina
  function refillServices(){
    const disc = ov.querySelector('#tk-disc').value;
    const opts = _state.productivity.filter(p => !disc || p.discipline === disc);
    ov.querySelector('#tk-service').innerHTML = '<option value="">— Manual (sem ref) —</option>' +
      opts.map(p => `<option value="${esc(p.service_code)}" data-unit="${esc(p.unit)}" data-hh="${p.hh_per_unit}" data-roles='${esc(JSON.stringify(p.required_roles||{}))}' ${item.service_code===p.service_code?'selected':''}>${esc(p.service_name)} (${p.hh_per_unit} HH/${p.unit})</option>`).join('');
  }
  refillServices();
  ov.querySelector('#tk-disc').onchange = refillServices;

  // Ao escolher serviço da biblioteca, preenche unit/hh/roles automaticamente
  ov.querySelector('#tk-service').onchange = (e)=>{
    const opt = e.target.selectedOptions[0];
    if(!opt || !opt.value) return;
    ov.querySelector('#tk-unit').value = opt.dataset.unit || '';
    ov.querySelector('#tk-hhu').value = opt.dataset.hh || '';
    try {
      const roles = JSON.parse(opt.dataset.roles || '{}');
      ov.querySelector('#tk-roles').value = Object.entries(roles).map(([k,v])=>`${k}:${v}`).join(', ');
      renderRolesList();
    } catch(_){}
    updateCalcBanner();
  };

  // Cálculo automático em tempo real
  function updateCalcBanner(){
    const qty = n(ov.querySelector('#tk-qty').value, 0);
    const hhu = n(ov.querySelector('#tk-hhu').value, 0);
    const hh = qty * hhu;
    if(hh <= 0){ ov.querySelector('#tk-calc-banner').style.display = 'none'; return; }
    // Calcula HH/dia da equipe alocada
    const rolesRaw = ov.querySelector('#tk-roles').value || '';
    let totalPeople = 0;
    rolesRaw.split(',').forEach(p => {
      const [,v] = p.split(':').map(s=>(s||'').trim());
      const q = parseFloat(v);
      if(!isNaN(q)) totalPeople += q;
    });
    const hhDay = totalPeople * 8;
    const days = hhDay > 0 ? Math.ceil(hh / hhDay) : null;
    ov.querySelector('#tk-calc-banner').style.display = 'block';
    ov.querySelector('#tk-calc-text').innerHTML = `${qty.toFixed(2)} × ${hhu.toFixed(3)} HH/un = <strong>${hh.toFixed(1)} HH</strong>${days?` ÷ (${totalPeople} pessoa(s) × 8h) = <strong>${days} dia(s) úteis</strong>`:' (defina a equipe pra calcular dias)'}`;
  }
  ['tk-qty','tk-hhu'].forEach(id => ov.querySelector('#'+id).oninput = updateCalcBanner);
  updateCalcBanner();

  // Botão calcular fim auto
  ov.querySelector('#tk-auto').onclick = ()=>{
    const qty = n(ov.querySelector('#tk-qty').value, 0);
    const hhu = n(ov.querySelector('#tk-hhu').value, 0);
    const hh = qty * hhu;
    if(hh <= 0){ alert('Preencha quantidade e HH/un primeiro'); return; }
    const rolesRaw = ov.querySelector('#tk-roles').value || '';
    let totalPeople = 0;
    rolesRaw.split(',').forEach(p => { const [,v] = p.split(':').map(s=>(s||'').trim()); const q = parseFloat(v); if(!isNaN(q)) totalPeople += q; });
    if(totalPeople <= 0){ alert('Defina a equipe alocada (ex: pedreiro:2)'); return; }
    const days = Math.ceil(hh / (totalPeople * 8));
    const start = new Date(ov.querySelector('#tk-start').value);
    // Adiciona dias úteis (pula sábado/domingo)
    let cur = new Date(start);
    let added = 1;
    while(added < days){
      cur.setDate(cur.getDate() + 1);
      const dow = cur.getDay();
      if(dow !== 0 && dow !== 6) added++;
    }
    ov.querySelector('#tk-finish').value = fmtDate(cur);
    alert(`Calculado: ${days} dia(s) úteis. Fim ajustado pra ${fmtDate(cur)}.`);
  };

  ov.querySelector('#tk-cancel').onclick = ()=> ov.remove();
  ov.querySelector('#tk-save').onclick = async ()=>{
    const name = (ov.querySelector('#tk-name').value||'').trim();
    if(!name){ alert('Nome obrigatório'); return; }
    const start = ov.querySelector('#tk-start').value;
    const finish = ov.querySelector('#tk-finish').value;
    if(!start || !finish){ alert('Datas de início e fim obrigatórias'); return; }
    if(new Date(finish) < new Date(start)){ alert('Fim não pode ser antes do início'); return; }

    const rolesRaw = ov.querySelector('#tk-roles').value || '';
    const roles = {};
    rolesRaw.split(',').forEach(p => {
      const [k,v] = p.split(':').map(s=>(s||'').trim());
      if(k && v && !isNaN(parseFloat(v))) roles[k.toLowerCase()] = parseFloat(v);
    });

    const payload = {
      org_id: w._org.id,
      project_id: _state.project.id,
      name,
      discipline: ov.querySelector('#tk-disc').value || null,
      service_code: ov.querySelector('#tk-service').value || null,
      quantity: n(ov.querySelector('#tk-qty').value, 0),
      unit: ov.querySelector('#tk-unit').value || null,
      hh_per_unit: n(ov.querySelector('#tk-hhu').value, 0) || null,
      planned_start: start,
      planned_finish: finish,
      assigned_roles: roles,
      status: ov.querySelector('#tk-status').value,
      progress_pct: n(ov.querySelector('#tk-prog').value, 0),
      notes: ov.querySelector('#tk-notes').value || null
    };

    let res;
    if(id) res = await sb.from('schedule_tasks').update(payload).eq('id', id);
    else res = await sb.from('schedule_tasks').insert(payload);
    if(res.error){ alert('Erro: '+res.error.message); return; }
    ov.remove();
    await loadAll();
    renderShell(_root);
  };
}

async function delTask(id){
  if(!confirm('Excluir essa tarefa do cronograma?')) return;
  const r = await sb.from('schedule_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if(r.error){ alert('Erro: '+r.error.message); return; }
  await loadAll();
  renderShell(_root);
}


// ============================================================
// IMPORTAR EXCEL/IA — Efetivo ou Parâmetros
// ============================================================

// Configuração por target: colunas esperadas + tabela destino + prompt da IA
const IMPORT_CFG = {
  crew: {
    title: 'Importar Efetivo (mão de obra)',
    table: 'crew_capacity',
    cols: ['role','role_label','quantity','hours_per_day','days_per_week','hourly_cost_brl','notes'],
    labels: { role:'Função (código)', role_label:'Nome', quantity:'Qtd', hours_per_day:'h/dia', days_per_week:'dias/sem', hourly_cost_brl:'R$/h', notes:'Obs' },
    required: ['role','quantity'],
    aliases: {
      'funcao':'role', 'função':'role', 'cargo':'role', 'profissao':'role', 'profissão':'role',
      'nome':'role_label', 'descricao':'role_label', 'descrição':'role_label', 'role':'role',
      'qtd':'quantity', 'quantidade':'quantity', 'numero':'quantity', 'qty':'quantity', 'pessoas':'quantity', 'qntd':'quantity',
      'horas':'hours_per_day', 'horas_dia':'hours_per_day', 'h_dia':'hours_per_day', 'jornada':'hours_per_day',
      'dias':'days_per_week', 'dias_semana':'days_per_week',
      'custo':'hourly_cost_brl', 'salario':'hourly_cost_brl', 'salário':'hourly_cost_brl', 'valor_hora':'hourly_cost_brl', 'reais_hora':'hourly_cost_brl',
      'observacao':'notes', 'observação':'notes', 'obs':'notes'
    },
    aiPrompt: `Voce e ENGENHEIRO/GESTOR DE PLANEJAMENTO SENIOR com 20 anos de experiencia em obras industriais. Analise o documento (foto, PDF, planilha de RH, escala, folha de pagamento, lista de mao de obra) e extraia TODAS as funcoes com qty/h-dia/custo.

RACIOCINIO COMO ENGENHEIRO SENIOR — adapte a QUALQUER formato de tabela:

1) Funcao (role) — snake_case minusculo sem acento. Reconheca variacoes:
   "Pedreiro/PEDREIRO/Pedreiros" -> pedreiro
   "Servente/Auxiliar/Ajudante geral" -> servente
   "Soldador TIG/Soldador eletrodo" -> soldador
   "Caldeireiro/Caldeireiro montador" -> caldereiro
   "Carpinteiro de forma" -> carpinteiro
   "Armador/Ferreiro armador" -> armador
   "Eletricista industrial/predial" -> eletricista
   "Encanador/Bombeiro hidraulico" -> encanador
   "Pintor industrial" -> pintor
   "Jatista/Operador de jato" -> jatista
   "Mestre de obras/Encarregado geral" -> mestre_obra
   "Engenheiro/Eng. residente" -> engenheiro
   "Inspetor de qualidade/solda" -> inspetor
   "Operador de equipamento" -> operador

2) Quantidade — extraia do contexto:
   "Pedreiros: 5" -> 5
   "Equipe de 8 pedreiros" -> 8
   Coluna Qtd/Quantidade/Numero/N/Total -> usa o valor
   Lista de nomes individuais -> CONTE os nomes
   Sem qty explicita mas com nome -> quantity=1
   Ambiguo -> null + notes

3) Horas/dia (hours_per_day):
   "Jornada 8h/44h-sem" -> 8 (default Brasil)
   "Turno 12x36" -> 12
   "Meio expediente" -> 4
   Default: 8

4) Custo/hora (hourly_cost_brl) — CALCULE:
   "R$ 25/h" -> 25
   "R$ 5.500/mes" jornada 8x22 -> 5500/(8*22) = 31.25
   "Salario 2.500 + encargos 80%" -> (2500*1.8)/(8*22) = 25.57
   "CLT R$ 3.000" encargos default 75% -> 3000*1.75/176 = 29.83
   Sem dado -> null

5) Dias/semana (days_per_week): default 5. Adapte ("6/sem" -> 6, "24x7" -> 7).

RETORNE EXATAMENTE:
{ "rows": [ { "role": "snake_case", "role_label": "Nome capitalized", "quantity": numero, "hours_per_day": numero, "days_per_week": numero, "hourly_cost_brl": numero, "notes": "string" } ] }

REGRAS:
- IGNORE total/subtotal/cabecalho-repetido/rodape/assinaturas.
- IGNORE colunas sem relacao com mao de obra.
- Tabela com formato esquisito (celulas mescladas, multi-linha): use raciocinio pra inferir.
- NUNCA invente. Sem dado -> null.
- AGRUPE funcoes iguais (3 linhas de pedreiro -> quantity=3).
- Use experiencia: CLT 44h/sem, 8h/dia, encargos ~75-80% (Brasil).`
  },
  productivity: {
    title: 'Importar Parâmetros de Produtividade (HH)',
    table: 'service_productivity',
    cols: ['service_code','service_name','discipline','unit','hh_per_unit','required_roles_str','notes'],
    labels: { service_code:'Código', service_name:'Nome do serviço', discipline:'Disciplina', unit:'Unidade', hh_per_unit:'HH/un', required_roles_str:'Equipe (formato: pedreiro:2, ajudante:1)', notes:'Obs' },
    required: ['service_code','service_name','discipline','unit','hh_per_unit'],
    aliases: {
      'codigo':'service_code', 'código':'service_code', 'cod':'service_code', 'code':'service_code', 'item':'service_code',
      'nome':'service_name', 'descricao':'service_name', 'descrição':'service_name', 'servico':'service_name', 'serviço':'service_name',
      'disciplina':'discipline', 'area':'discipline', 'área':'discipline',
      'un':'unit', 'unidade':'unit', 'unit':'unit',
      'hh':'hh_per_unit', 'hh_un':'hh_per_unit', 'hh_por_un':'hh_per_unit', 'horas_un':'hh_per_unit', 'h_un':'hh_per_unit', 'produtividade':'hh_per_unit',
      'equipe':'required_roles_str', 'mao_obra':'required_roles_str',
      'observacao':'notes', 'observação':'notes', 'obs':'notes'
    },
    aiPrompt: `Voce e ENGENHEIRO DE PLANEJAMENTO SENIOR com 20 anos de experiencia em SINAPI, TCPO, composicoes de custo industrial e Petrobras N-/M-. Analise o documento e extraia TODOS os servicos com HH/un + equipe.

RACIOCINIO COMO ENGENHEIRO SENIOR — adapte a QUALQUER formato:

1) service_code — snake_case unico:
   "Concretagem fck 25 MPa" -> concretagem_fck25
   "Montagem tubo 6 sch 80" -> montagem_tubo_6in_sch80
   "Lancamento cabo XLPE 16mm2" -> lancamento_cabo_xlpe_16mm2
   Se ja tem codigo SINAPI/TCPO ("92776") use: sinapi_92776

2) service_name — descritivo limpo com especificacao tecnica.

3) discipline — INFIRA pelo contexto:
   "concretagem/alvenaria/reboco/forma/armadura" -> civil
   "tubo/valvula/flange/spool/suporte tubulacao" -> tubulacao
   "cabo/eletroduto/painel/quadro/luminaria" -> eletrica
   "pintura/jato/primer/epoxi/DFT" -> pintura
   "estrutura metalica/viga W/cantoneira/escada" -> caldeiraria
   "tubo PVC/caixa dagua/esgoto/agua fria" -> hidraulica

4) unit — converta:
   "metro/ml" -> m
   "metro quadrado/m²" -> m2
   "metro cubico/m³" -> m3
   "unidade/pç/peca" -> un
   "quilograma" -> kg

5) hh_per_unit — CALCULE/CONVERTA:
   "HH = 1.25/m³" -> 1.25
   "8 horas pra 20 m²" -> 8/20 = 0.4
   "50 m/dia, equipe 4, 8h" -> (4*8)/50 = 0.64
   "1.0 nominal + 15% fator campo" -> 1.0*1.15 = 1.15
   NUNCA invente. Sem dado -> null.

6) required_roles_str — formato "funcao:qtd, funcao:qtd":
   "1 pedreiro + 2 serventes" -> "pedreiro:1, servente:2"
   "Caldeireiro + Soldador + Ajudante" -> "caldereiro:1, soldador:1, ajudante:1"

RETORNE EXATAMENTE:
{ "rows": [ { "service_code": "snake_case", "service_name": "string", "discipline": "civil|tubulacao|eletrica|pintura|caldeiraria|hidraulica", "unit": "m|m2|m3|un|kg|l", "hh_per_unit": numero, "required_roles_str": "string", "notes": "string" } ] }

REGRAS:
- IGNORE total/subtotal/BDI/encargos/cabecalho/rodape.
- IGNORE colunas de preco material — foco e HH e equipe.
- Tabela mistura unidades? Preserve a unidade correta de CADA item.
- NUNCA invente HH. Sem dado -> null.
- AGRUPE duplicatas ou marque variantes em notes.
- PDF celulas mescladas: identifique hierarquia (categoria > subcategoria > servico).`
  }
};

let _impState = { target: null, mode: null, rows: [], cfg: null, file: null };

function openImportModal(target, mode){
  const cfg = IMPORT_CFG[target];
  if(!cfg){ alert('Tipo de import inválido'); return; }
  _impState = { target, mode, rows: [], cfg, file: null };

  const ov = d.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,sans-serif';
  ov.id = 'imp-ov';
  ov.onclick = (e)=>{if(e.target===ov)closeImport();};
  ov.innerHTML = renderImportPhase1();
  d.body.appendChild(ov);
  bindImportPhase1();
}

function closeImport(){
  const ov = d.getElementById('imp-ov');
  if(ov) ov.remove();
  _impState = { target: null, mode: null, rows: [], cfg: null, file: null };
}

function renderImportPhase1(){
  const cfg = _impState.cfg;
  const mode = _impState.mode;
  const accept = mode === 'ai' ? '.pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx' : '.xlsx,.xls,.csv';
  const tip = mode === 'ai'
    ? 'Suba PDF, imagem ou planilha — a IA vai extrair os dados automaticamente.'
    : 'Suba uma planilha Excel/CSV. Vamos identificar as colunas e mapear pros campos certos.';
  return '<div style="background:#fff;border-radius:14px;width:100%;max-width:620px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">'+
    '<div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:12px">'+
      '<div style="width:38px;height:38px;border-radius:10px;background:'+(mode==='ai'?'#1E40AF':'#0F172A')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">'+(mode==='ai'?ico('sparkles',18,'#fff'):ico('spreadsheet',18,'#fff'))+'</div>'+
      '<div style="flex:1"><div style="font-size:15px;font-weight:800;color:#0F172A">'+esc(cfg.title)+'</div><div style="font-size:11.5px;color:#64748B">Fase 1 · '+(mode==='ai'?'Upload pra IA analisar':'Importar planilha')+'</div></div>'+
      '<button onclick="document.getElementById(\'imp-ov\').remove()" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>'+
    '</div>'+
    '<div style="flex:1;overflow:auto;padding:20px 22px">'+
      '<div id="imp-drop" style="border:2px dashed '+(mode==='ai'?'#C4B5FD':'#86EFAC')+';border-radius:12px;padding:36px;text-align:center;cursor:pointer;background:'+(mode==='ai'?'#F5F3FF':'#F0FDF4')+';transition:background .15s">'+
        '<div style="margin-bottom:10px;display:flex;justify-content:center;color:'+(mode==='ai'?'#7C3AED':'#10B981')+'">'+(mode==='ai'?ico('upload',38):ico('spreadsheet',38))+'</div>'+
        '<div style="font-size:14px;font-weight:700;color:'+(mode==='ai'?'#5B21B6':'#065F46')+'">Clique ou arraste o arquivo</div>'+
        '<div style="font-size:11.5px;color:'+(mode==='ai'?'#7C3AED':'#059669')+';margin-top:4px">'+(mode==='ai'?'PDF · PNG · JPG · CSV · XLSX (até 20 MB)':'XLSX · XLS · CSV')+'</div>'+
      '</div>'+
      '<input type="file" id="imp-file" accept="'+accept+'" style="display:none">'+
      '<div style="margin-top:14px;font-size:11.5px;color:#64748B;line-height:1.5">'+esc(tip)+'</div>'+
      '<div id="imp-status" style="margin-top:14px"></div>'+
    '</div>'+
  '</div>';
}

function bindImportPhase1(){
  const drop = d.getElementById('imp-drop');
  const inp = d.getElementById('imp-file');
  if(!drop || !inp) return;
  drop.onclick = ()=> inp.click();
  drop.ondragover = (e)=>{e.preventDefault();drop.style.background='#EDE9FE';};
  drop.ondragleave = ()=>{drop.style.background = _impState.mode==='ai'?'#F5F3FF':'#F0FDF4';};
  drop.ondrop = (e)=>{e.preventDefault();drop.style.background=_impState.mode==='ai'?'#F5F3FF':'#F0FDF4';if(e.dataTransfer.files[0]){inp.files=e.dataTransfer.files;processImportFile();}};
  inp.onchange = processImportFile;
}

async function processImportFile(){
  const inp = d.getElementById('imp-file');
  const file = inp.files && inp.files[0];
  const status = d.getElementById('imp-status');
  if(!file) return;
  _impState.file = file;
  if(file.size > 20*1024*1024){
    status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Arquivo muito grande (max 20 MB)</div>';
    return;
  }
  status.innerHTML='<div style="background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;border-radius:8px;padding:11px 14px;font-size:12.5px"><strong>⏳ Processando...</strong></div>';
  try {
    // Respeita SEMPRE a escolha do usuário (mode='ai' sempre manda pra IA, mode='excel' sempre parse local)
    if(_impState.mode === 'ai'){
      console.log('[planning] Importando via IA (modo escolhido pelo user). Arquivo:', file.name, file.type);
      await parseAIFile(file);
    } else {
      console.log('[planning] Importando via Excel local. Arquivo:', file.name);
      await parseExcelLocal(file);
    }
    if(_impState.rows.length){
      renderImportPhase2();
    } else {
      status.innerHTML='<div style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:8px;padding:11px 14px;font-size:12.5px"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Não foi possível extrair linhas do arquivo. Verifique se tem cabeçalho e dados válidos.</div>';
    }
  } catch(e){
    console.error('[import]', e);
    status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> '+esc(e.message||String(e))+'</div>';
  }
}

async function parseExcelLocal(file){
  if(!w.XLSX){ throw new Error('Biblioteca XLSX não carregada. Recarregue a página.'); }
  const buf = await file.arrayBuffer();
  const wb = w.XLSX.read(buf,{type:'array'});
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = w.XLSX.utils.sheet_to_json(sheet, {defval:''});
  if(!rows.length) throw new Error('Planilha vazia.');
  _impState.rows = mapRowsToCfg(rows);
}

function mapRowsToCfg(rows){
  const cfg = _impState.cfg;
  const aliases = cfg.aliases;
  // Normaliza headers das linhas
  return rows.map(r => {
    const out = {};
    for(const k in r){
      const nk = String(k||'').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s\-]+/g,'_');
      const target = aliases[nk] || (cfg.cols.includes(nk) ? nk : null);
      if(target) out[target] = r[k];
    }
    return out;
  }).filter(r => Object.keys(r).length);
}

async function parseAIFile(file){
  // Converte pra base64
  let mime = file.type;
  let b64;
  if(/\.(xlsx|xls|csv)$/i.test(file.name)){
    // Converte planilha pra CSV e manda como texto
    if(!w.XLSX) throw new Error('Biblioteca XLSX não carregada.');
    const buf = await file.arrayBuffer();
    const wb = w.XLSX.read(buf,{type:'array'});
    const csv = w.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    b64 = btoa(unescape(encodeURIComponent(csv)));
    mime = 'text/csv';
  } else {
    b64 = await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result.split(',')[1]);
      r.onerror=rej;
      r.readAsDataURL(file);
    });
  }

  const {data:{session}} = await sb.auth.getSession();
  if(!session) throw new Error('Sessão expirada — faça login novamente.');

  const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
  const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';
  const resp = await fetch(SB_URL+'/functions/v1/analyze-discipline-doc', {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+session.access_token},
    body: JSON.stringify({
      file: b64, mime,
      discipline_code: 'custom',
      custom_prompt: _impState.cfg.aiPrompt
    })
  });
  const data = await resp.json();
  if(!resp.ok || data.error) throw new Error(data.error || 'HTTP '+resp.status);

  // Procura array "rows" no extracted (ou raiz)
  const ex = data.extracted || data;
  const rows = ex.rows || ex.records || ex.items || [];
  if(!Array.isArray(rows) || !rows.length){
    // tenta achar primeiro array de objetos
    for(const k in ex){
      if(Array.isArray(ex[k]) && ex[k].length && typeof ex[k][0] === 'object'){
        _impState.rows = mapRowsToCfg(ex[k]);
        return;
      }
    }
    throw new Error('IA não encontrou linhas estruturadas no documento.');
  }
  _impState.rows = mapRowsToCfg(rows);
}

function renderImportPhase2(){
  const ov = d.getElementById('imp-ov');
  if(!ov) return;
  const cfg = _impState.cfg;
  const rows = _impState.rows;
  ov.innerHTML = '<div style="background:#fff;border-radius:14px;width:100%;max-width:1080px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">'+
    '<div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:12px">'+
      '<div style="width:38px;height:38px;border-radius:9px;background:#10B981;display:flex;align-items:center;justify-content:center;color:#fff">'+ico("check",20,"#fff")+'</div>'+
      '<div style="flex:1"><div style="font-size:15px;font-weight:800;color:#0F172A">Revisar antes de cadastrar — '+esc(cfg.title)+'</div><div style="font-size:11.5px;color:#64748B">Fase 2 · '+rows.length+' linha(s) detectada(s) · clique pra editar</div></div>'+
      '<button onclick="document.getElementById(\'imp-ov\').remove()" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>'+
    '</div>'+
    '<div style="flex:1;overflow:auto;padding:18px 22px">'+
      '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:11.5px;color:#1E3A8A"><strong style="display:inline-flex;align-items:center;gap:5px">'+ico('edit',12)+' Edite o que precisar.</strong> Linhas marcadas serão cadastradas. Campos obrigatórios: <strong>'+cfg.required.join(', ')+'</strong></div>'+
      '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden"><div style="overflow:auto;max-height:55vh"><table class="ptable">'+
        '<thead><tr><th style="width:60px;text-align:center">#</th>'+cfg.cols.map(col=>'<th>'+esc(cfg.labels[col]||col)+'</th>').join('')+'</tr></thead>'+
        '<tbody>'+rows.map((r,i)=>'<tr>'+
          '<td style="text-align:center;background:#FAFBFC"><input type="checkbox" class="imp-chk" data-i="'+i+'" checked> '+(i+1)+'</td>'+
          cfg.cols.map(col=>'<td style="padding:0"><input type="text" class="imp-cell" data-i="'+i+'" data-k="'+esc(col)+'" value="'+esc(r[col]==null?'':r[col])+'" style="width:100%;border:none;background:transparent;padding:6px 8px;font-size:11.5px;font-family:inherit;outline:none" onfocus="this.style.background=\'#FFFBEB\'" onblur="this.style.background=\'transparent\'"></td>').join('')+
        '</tr>').join('')+'</tbody>'+
      '</table></div></div>'+
      '<div id="imp-status2" style="margin-top:14px"></div>'+
    '</div>'+
    '<div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">'+
      '<button class="pbtn pbtn-g" onclick="document.getElementById(\'imp-ov\').remove()">Cancelar</button>'+
      '<button class="pbtn" id="imp-save">'+ico("check",13,"#fff")+' Cadastrar selecionados ('+rows.length+')</button>'+
    '</div>'+
  '</div>';

  // Bind edição inline
  ov.querySelectorAll('.imp-cell').forEach(inp => {
    inp.oninput = (e)=>{
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      _impState.rows[i][k] = e.target.value;
    };
  });
  ov.querySelector('#imp-save').onclick = saveImport;
}

async function saveImport(){
  const cfg = _impState.cfg;
  const status = d.getElementById('imp-status2');
  const btn = d.getElementById('imp-save');
  const checked = Array.from(d.querySelectorAll('.imp-chk:checked')).map(c=>+c.dataset.i);
  if(!checked.length){ status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Selecione ao menos 1 linha.</div>'; return; }

  btn.disabled = true; btn.style.opacity='.6';
  status.innerHTML='<div style="background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;border-radius:8px;padding:11px 14px;font-size:12.5px">⏳ Cadastrando '+checked.length+' linha(s)...</div>';

  let ok = 0, fail = 0;
  const errs = [];
  for(const i of checked){
    const row = _impState.rows[i];
    // Valida obrigatórios
    const missing = cfg.required.filter(f => !row[f] && row[f] !== 0);
    if(missing.length){ fail++; errs.push('Linha '+(i+1)+': falta '+missing.join(', ')); continue; }
    // Monta payload
    const payload = { org_id: w._org.id };
    if(_impState.target === 'crew') payload.project_id = _state.project.id;
    for(const col of cfg.cols){
      const v = row[col];
      if(v === '' || v == null) continue;
      payload[col] = v;
    }
    // Tipos numéricos
    if(_impState.target === 'crew'){
      payload.quantity = n(payload.quantity, 1);
      payload.hours_per_day = n(payload.hours_per_day, 8);
      payload.days_per_week = n(payload.days_per_week, 5);
      payload.hourly_cost_brl = n(payload.hourly_cost_brl, 0);
      // role label fallback
      if(!payload.role_label) payload.role_label = String(payload.role||'').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
    } else {
      payload.hh_per_unit = n(payload.hh_per_unit, 0);
      // parse required_roles_str pra jsonb
      if(payload.required_roles_str){
        const roles = {};
        String(payload.required_roles_str).split(',').forEach(p=>{
          const [k,v] = p.split(':').map(s=>(s||'').trim());
          if(k && v && !isNaN(parseFloat(v))) roles[k.toLowerCase()] = parseFloat(v);
        });
        payload.required_roles = roles;
        delete payload.required_roles_str;
      }
      payload.source = 'import';
    }

    const res = await sb.from(cfg.table).insert(payload);
    if(res.error){
      // Trata duplicado (UNIQUE) como aviso, não erro fatal
      if(/duplicate|unique/i.test(res.error.message)){
        errs.push('Linha '+(i+1)+': já existe ('+( payload.role||payload.service_code )+')');
      } else {
        fail++; errs.push('Linha '+(i+1)+': '+res.error.message);
      }
    } else {
      ok++;
    }
  }

  if(ok > 0){
    status.innerHTML='<div style="background:#ECFDF5;color:#065F46;border:1px solid #6EE7B7;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><polyline points="20 6 9 17 4 12"/></svg>'+ok+' linha(s) cadastrada(s)!</strong>'+(fail>0||errs.length?'<div style="margin-top:6px;font-size:11px">'+fail+' falha(s)'+(errs.length?': '+esc(errs.slice(0,3).join('; ')):'')+'</div>':'')+'</div>';
    setTimeout(async ()=>{
      d.getElementById('imp-ov').remove();
      await loadAll();
      renderShell(_root);
    }, 1500);
  } else {
    status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Nenhuma linha cadastrada</strong><div style="font-size:11px;margin-top:6px">'+esc(errs.slice(0,3).join('; '))+'</div></div>';
    btn.disabled = false; btn.style.opacity='1';
  }
}


// ============================================================
// Event delegation global pro botao Voltar (sobrevive a re-renderizacoes)
// ============================================================
if(!w.__plBackBound){
  w.__plBackBound = true;
  d.addEventListener('click', function(ev){
    const btn = ev.target && ev.target.closest && ev.target.closest('#pl-back-btn');
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    try {
      const disc = w.__piaHubReopenDisc;
      try { delete w.__piaHubReopenDisc; } catch(_){ w.__piaHubReopenDisc = null; }
      try {
        const ov = d.getElementById('pia-planning-overlay');
        if(ov) ov.remove();
        _root = null;
      } catch(_){}
      if(disc && w.PIAHubUnified && typeof w.PIAHubUnified.openDisc === 'function'){
        w.PIAHubUnified.openDisc(disc);
        return;
      }
      if(w.PIAHubUnified && typeof w.PIAHubUnified.open === 'function'){
        w.PIAHubUnified.open();
        return;
      }
      if(typeof w.goV === 'function'){
        w.goV('panel');
        return;
      }
      history.back();
    } catch(err){
      console.error('[planning] Voltar falhou:', err);
      try { if(typeof w.goV === 'function') w.goV('panel'); else history.back(); } catch(_){ history.back(); }
    }
  }, true);
  console.log('[planning] Event delegation do Voltar registrada (capture phase)');
}

// Expoe API
w.PIAPlanning = {
  open,
  editTask: (typeof openTaskModal === 'function' ? openTaskModal : null),
  reload: async () => { await loadAll(); renderShell(_root); }
};

} catch(e){ console.warn('[planning] init falhou:', e); }
})(window, document);
