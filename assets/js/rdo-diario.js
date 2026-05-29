/*! PROJECT.IA - Modulo RDO Diario
 *  Diario de Obra na sidebar > Planejamento
 *  Padrao visual: tokens nativos do v9 (var(--t0), .btn, .ptable, .pst)
 *  PDF mantem cor azul escuro #1E3A8A como design profissional
 */
(function(w, d){'use strict';
try {

const sb = new Proxy({}, {
  get(_, prop){
    if(!w.sb){ throw new Error('Supabase nao inicializado. Faca login.'); }
    const val = w.sb[prop];
    return typeof val === 'function' ? val.bind(w.sb) : val;
  }
});

function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function n(v, def){ const x=parseFloat(v); return isFinite(x)?x:(def==null?0:def); }

const ROLES_COMUNS = [
  ['pedreiro','Pedreiro'],['servente','Servente'],['carpinteiro','Carpinteiro'],
  ['armador','Armador'],['ajudante','Ajudante'],['caldereiro','Caldereiro'],
  ['soldador','Soldador'],['montador','Montador'],['eletricista','Eletricista'],
  ['encanador','Encanador'],['pintor','Pintor'],['jatista','Jatista'],
  ['inspetor','Inspetor'],['azulejista','Azulejista'],['operador','Operador'],
  ['engenheiro','Engenheiro'],['mestre_obra','Mestre de obra']
];

const WEATHER = [
  ['bom','Bom'],['nublado','Nublado'],['chuvoso','Chuvoso'],
  ['instavel','Instável'],['impraticavel','Impraticável']
];

const EVENT_TYPES = [
  ['atraso','Atraso'],['interferencia','Interferência'],
  ['mudanca_projeto','Mudança de projeto'],['acidente','Acidente / Incidente'],
  ['visita','Visita técnica'],['paralisacao','Paralisação'],
  ['nao_conformidade','Não conformidade'],['outro','Outro']
];

function labelOf(arr, val){ const r = arr.find(x => x[0] === val); return r ? r[1] : val; }

let _state = { project: null, rdos: [] };
let _edit = null;

function getProjectId(){
  if(w._curProject && w._curProject.id) return w._curProject.id;
  if(w.curProj) return w.curProj;
  try { return localStorage.getItem('pia.curProj'); } catch(_){ return null; }
}
function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  const ps = w.projects || [];
  const id = getProjectId();
  const p = ps.find(x => String(x.id) === String(id));
  return p ? p.name : 'Projeto';
}

async function open(){
  let pid = getProjectId();
  if(!pid && Array.isArray(w.projects) && w.projects[0]) pid = w.projects[0].id;
  if(!pid){
    if(typeof w.toast === 'function') w.toast('Selecione um projeto primeiro','warn');
    else alert('Selecione um projeto primeiro');
    return;
  }
  _state.project = { id: pid, name: getProjectName() };

  const prev = d.getElementById('pia-rdo-overlay');
  if(prev) prev.remove();

  // Overlay fullscreen com fundo neutro do v9 — sem modal, sem gradient
  const ov = d.createElement('div');
  ov.id = 'pia-rdo-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit';
  d.body.appendChild(ov);

  await loadRDOs();
  renderShell();
}

async function loadRDOs(){
  const pid = _state.project.id;
  const { data, error } = await sb.from('daily_reports').select('*').eq('project_id', pid).is('deleted_at', null).order('report_date', { ascending: false });
  if(error){ console.error('[rdo-diario] load error:', error); }
  _state.rdos = data || [];
}

function renderShell(){
  const ov = d.getElementById('pia-rdo-overlay');
  if(!ov) return;
  const rdos = _state.rdos || [];
  ov.innerHTML = `
    <div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn bg" onclick="document.getElementById('pia-rdo-overlay').remove()" style="display:inline-flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Voltar
      </button>
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Relatorio Diario de Obra</div>
        <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Projeto: <strong>${esc(_state.project.name)}</strong></div>
      </div>
      <div style="flex:1"></div>
      <button class="btn bg" id="rdo-pdf-blank">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        PDF em branco
      </button>
      <button class="btn bia" id="rdo-ia-photo" title="Ler RDO escrito a mão via foto + IA">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>
        IA Foto Manuscrita
      </button>
      <button class="btn bp" id="rdo-new">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo RDO
      </button>
    </div>

    <div style="padding:18px 22px">

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px">
        <div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:12px;padding:14px;box-shadow:var(--sh-1,0 1px 2px rgba(15,23,42,.04))">
          <div style="font-size:10.5px;text-transform:uppercase;color:var(--t6,#64748B);font-weight:600;letter-spacing:.5px">Total RDOs</div>
          <div style="font-size:28px;font-weight:900;color:var(--t9,#0F172A);margin-top:4px;font-family:ui-monospace,monospace;letter-spacing:-.5px">${rdos.length}</div>
          <div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">registros neste projeto</div>
        </div>
        <div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:12px;padding:14px;box-shadow:var(--sh-1,0 1px 2px rgba(15,23,42,.04))">
          <div style="font-size:10.5px;text-transform:uppercase;color:var(--t6,#64748B);font-weight:600;letter-spacing:.5px">Aprovados</div>
          <div style="font-size:28px;font-weight:900;color:var(--success,#10B981);margin-top:4px;font-family:ui-monospace,monospace;letter-spacing:-.5px">${rdos.filter(r=>r.status==='approved').length}</div>
          <div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">finalizados</div>
        </div>
        <div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:12px;padding:14px;box-shadow:var(--sh-1,0 1px 2px rgba(15,23,42,.04))">
          <div style="font-size:10.5px;text-transform:uppercase;color:var(--t6,#64748B);font-weight:600;letter-spacing:.5px">Rascunhos</div>
          <div style="font-size:28px;font-weight:900;color:#F59E0B;margin-top:4px;font-family:ui-monospace,monospace;letter-spacing:-.5px">${rdos.filter(r=>r.status!=='approved').length}</div>
          <div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">aguardando aprovacao</div>
        </div>
        <div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:12px;padding:14px;box-shadow:var(--sh-1,0 1px 2px rgba(15,23,42,.04))">
          <div style="font-size:10.5px;text-transform:uppercase;color:var(--t6,#64748B);font-weight:600;letter-spacing:.5px">Ultimo registro</div>
          <div style="font-size:18px;font-weight:700;color:var(--t9,#0F172A);margin-top:8px">${rdos[0] ? new Date(rdos[0].report_date+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
          <div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">data mais recente</div>
        </div>
      </div>

      <div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:12px;overflow:hidden;box-shadow:var(--sh-1,0 1px 2px rgba(15,23,42,.04))">
        <div style="overflow:auto;max-height:62vh">
          <table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr>
              <th>Nº</th><th>Data</th><th>Manha</th><th>Tarde</th><th>Responsavel</th><th>Status</th><th style="text-align:right">Acoes</th>
            </tr></thead>
            <tbody>${rdos.length ? rdos.map(rowRDO).join('') :
              '<tr><td colspan="7" style="padding:50px;text-align:center;color:var(--t6,#64748B);font-size:13px">Nenhum RDO cadastrado. Clique em <strong>+ Novo RDO</strong> para comecar.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  d.getElementById('rdo-new').onclick = ()=> openModal(null);
  d.getElementById('rdo-pdf-blank').onclick = ()=> generatePDF(null, 'blank');
  var bia = d.getElementById('rdo-ia-photo');
  if(bia) bia.onclick = function(){
    var pid = (_state.project && _state.project.id) || (w._curProject && w._curProject.id) || null;
    if(!pid){ alert('Selecione um projeto antes de usar a IA.'); return; }
    if(w.PIALazy) w.PIALazy.run('ai-rdo','openFromPhoto', pid).catch(function(e){ console.error('[rdo-ia]', e); alert('Não foi possível carregar a IA. Ctrl+Shift+R.'); });
    else if(w.PIAIARdo) w.PIAIARdo.openFromPhoto(pid);
    else alert('Sistema de IA ainda inicializando. Tente novamente em 2s.');
  };
  ov.querySelectorAll('[data-rdo-edit]').forEach(b => b.onclick = ()=> openModal(b.dataset.rdoEdit));
  ov.querySelectorAll('[data-rdo-pdf]').forEach(b => b.onclick = ()=> generatePDF(b.dataset.rdoPdf, 'filled'));
  ov.querySelectorAll('[data-rdo-del]').forEach(b => b.onclick = ()=> delRDO(b.dataset.rdoDel));
}

function rowRDO(r){
  const statusBadge = r.status === 'approved'
    ? '<span class="pst" style="background:#D1FAE5;color:#065F46">Aprovado</span>'
    : '<span class="pst" style="background:#FEF3C7;color:#92400E">Rascunho</span>';
  return '<tr>'+
    '<td><strong>#'+(r.report_number||'—')+'</strong></td>'+
    '<td>'+new Date(r.report_date+'T00:00:00').toLocaleDateString('pt-BR')+'</td>'+
    '<td>'+labelOf(WEATHER, r.morning_status||'—')+'</td>'+
    '<td>'+labelOf(WEATHER, r.afternoon_status||'—')+'</td>'+
    '<td>'+esc(r.responsible_engineer||'—')+'</td>'+
    '<td>'+statusBadge+'</td>'+
    '<td style="text-align:right;white-space:nowrap">'+
      '<button class="btn bg" data-rdo-pdf="'+r.id+'" title="Gerar PDF" style="padding:5px 9px;font-size:11px;margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>'+
      '<button class="btn bg" data-rdo-edit="'+r.id+'" title="Editar" style="padding:5px 9px;font-size:11px;margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
      '<button class="btn" data-rdo-del="'+r.id+'" title="Excluir" style="padding:5px 9px;font-size:11px;background:#FEE2E2;color:#991B1B;border:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>'+
    '</td>'+
  '</tr>';
}

async function delRDO(id){
  const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir RDO", "Este Relatório Diário de Obra será removido junto com efetivo, atividades e ocorrências.", "Excluir") : Promise.resolve(confirm("Excluir RDO?")));
  if(!_ok) return;
  const { error } = await sb.from('daily_reports').update({deleted_at: new Date().toISOString()}).eq('id', id);
  if(error){ alert('Erro: '+error.message); return; }
  await loadRDOs();
  renderShell();
}

// ============================================================
// MODAL DE CRIACAO / EDICAO (segue padrao dos modais do v9)
// ============================================================
async function openModal(id){
  let rdo, workforce = [], activities = [], events = [];
  if(id){
    rdo = { ...(_state.rdos.find(x => x.id === id)) };
    if(!rdo.id){ alert('RDO nao encontrado'); return; }
    const [wfR, acR, evR] = await Promise.all([
      sb.from('daily_report_workforce').select('*').eq('daily_report_id', id),
      sb.from('daily_report_activities').select('*').eq('daily_report_id', id),
      sb.from('daily_report_events').select('*').eq('daily_report_id', id)
    ]);
    workforce = wfR.data || [];
    activities = acR.data || [];
    events = evR.data || [];
  } else {
    try {
      const cc = await sb.from('crew_capacity').select('*').eq('project_id', _state.project.id).is('deleted_at', null);
      workforce = (cc.data||[]).map(c => ({
        role: c.role, people_count: n(c.quantity),
        hh_worked: n(c.quantity) * n(c.hours_per_day, 8),
        workforce_type: 'direta'
      }));
    } catch(_){}
    rdo = {
      id: null,
      report_date: new Date().toISOString().slice(0,10),
      report_number: ((_state.rdos||[]).reduce((m,r)=>Math.max(m, r.report_number||0), 0)) + 1,
      ambient_temp_c: null,
      morning_status: 'bom',
      afternoon_status: 'bom',
      night_status: '',
      responsible_engineer: '',
      responsible_crea: '',
      notes: '',
      status: 'draft'
    };
  }
  _edit = { rdo, workforce, activities, events };
  renderModal();
}

function renderModal(){
  const { rdo } = _edit;
  let m = d.getElementById('pia-rdo-modal');
  if(m) m.remove();
  m = d.createElement('div');
  m.id = 'pia-rdo-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9700;display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;font-family:inherit';
  m.innerHTML = `
    <div style="background:var(--t0,#fff);border-radius:12px;max-width:1000px;width:100%;box-shadow:0 24px 56px rgba(15,23,42,.25);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:12px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">${rdo.id ? 'Editar' : 'Novo'} RDO #${rdo.report_number}</div>
          <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">${esc(_state.project.name)}</div>
        </div>
        <div style="flex:1"></div>
        <button id="r-x" class="btn bg" style="padding:6px 10px;font-size:18px;line-height:1">×</button>
      </div>

      <div style="padding:20px 22px;max-height:74vh;overflow:auto;background:var(--t1,#F8FAFC)">

        <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">1. Identificacao</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:20px;background:var(--t0,#fff);padding:14px;border:1px solid var(--t3,#E5E7EB);border-radius:10px">
          <div><label style="font-size:11px;color:var(--t7,#334155);font-weight:600;display:block;margin-bottom:4px">Data</label><input type="date" id="r-date" value="${rdo.report_date}" class="rdo-inp"></div>
          <div><label style="font-size:11px;color:var(--t7,#334155);font-weight:600;display:block;margin-bottom:4px">Nº do RDO</label><input type="number" id="r-num" value="${rdo.report_number||''}" class="rdo-inp"></div>
          <div><label style="font-size:11px;color:var(--t7,#334155);font-weight:600;display:block;margin-bottom:4px">Temperatura (°C)</label><input type="number" id="r-temp" step="0.1" value="${rdo.ambient_temp_c||''}" class="rdo-inp" placeholder="25"></div>
          <div><label style="font-size:11px;color:var(--t7,#334155);font-weight:600;display:block;margin-bottom:4px">Engenheiro responsavel</label><input type="text" id="r-eng" value="${esc(rdo.responsible_engineer||'')}" class="rdo-inp" placeholder="Nome completo"></div>
          <div><label style="font-size:11px;color:var(--t7,#334155);font-weight:600;display:block;margin-bottom:4px">CREA</label><input type="text" id="r-crea" value="${esc(rdo.responsible_crea||'')}" class="rdo-inp" placeholder="CREA-XX 000000"></div>
        </div>

        <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">2. Condicoes climaticas</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
          ${['morning','afternoon','night'].map((per,i) => {
            const lbl = ['Manha','Tarde','Noite'][i];
            const cur = rdo[per+'_status'] || '';
            return `<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;padding:12px">
              <div style="font-size:11px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:6px">${lbl}</div>
              <select id="r-${per}" class="rdo-inp" style="cursor:pointer">
                <option value="">— sem registro —</option>
                ${WEATHER.map(w => '<option value="'+w[0]+'"'+(cur===w[0]?' selected':'')+'>'+w[1]+'</option>').join('')}
              </select>
            </div>`;
          }).join('')}
        </div>

        <div style="display:flex;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;flex:1">3. Efetivo do dia</div>
          <button id="r-add-wf" class="btn bp" style="padding:5px 11px;font-size:11px">+ Adicionar funcao</button>
        </div>
        <div id="r-wf-list" style="margin-bottom:20px"></div>

        <div style="display:flex;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;flex:1">4. Atividades realizadas</div>
          <button id="r-add-act" class="btn bp" style="padding:5px 11px;font-size:11px">+ Adicionar atividade</button>
        </div>
        <div id="r-act-list" style="margin-bottom:20px"></div>

        <div style="display:flex;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;flex:1">5. Ocorrencias e eventos</div>
          <button id="r-add-ev" class="btn bp" style="padding:5px 11px;font-size:11px">+ Adicionar ocorrencia</button>
        </div>
        <div id="r-ev-list" style="margin-bottom:20px"></div>

        <div style="font-size:11px;font-weight:700;color:var(--t7,#334155);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">6. Observacoes gerais</div>
        <textarea id="r-notes" class="rdo-inp" rows="3" placeholder="Notas adicionais, instrucoes, lembretes..." style="resize:vertical;background:var(--t0,#fff)">${esc(rdo.notes||'')}</textarea>
      </div>

      <div style="background:var(--t0,#fff);border-top:1px solid var(--t3,#E5E7EB);padding:12px 22px;display:flex;justify-content:flex-end;gap:8px">
        <button id="r-cancel" class="btn bg">Cancelar</button>
        <button id="r-save-draft" class="btn bg">Salvar rascunho</button>
        <button id="r-save-ok" class="btn bp">Salvar e aprovar</button>
      </div>
    </div>
    <style>
      .rdo-inp{padding:7px 10px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:12.5px;font-family:inherit;outline:none;width:100%;background:var(--t0,#fff);color:var(--t9,#0F172A)}
      .rdo-inp:focus{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
    </style>`;
  d.body.appendChild(m);

  renderWfList(); renderActList(); renderEvList();

  d.getElementById('r-x').onclick = closeModal;
  d.getElementById('r-cancel').onclick = closeModal;
  d.getElementById('r-save-draft').onclick = ()=> saveRDO('draft');
  d.getElementById('r-save-ok').onclick = ()=> saveRDO('approved');
  d.getElementById('r-add-wf').onclick = ()=>{ _edit.workforce.push({role:'pedreiro',people_count:1,hh_worked:8,workforce_type:'direta'}); renderWfList(); };
  d.getElementById('r-add-act').onclick = ()=>{ _edit.activities.push({description:'',location:'',progress_pct:null}); renderActList(); };
  d.getElementById('r-add-ev').onclick = ()=>{ _edit.events.push({event_type:'atraso',severity:'media',description:'',responsible:''}); renderEvList(); };
}

function closeModal(){
  const m = d.getElementById('pia-rdo-modal');
  if(m) m.remove();
  _edit = null;
}

function renderWfList(){
  const el = d.getElementById('r-wf-list');
  if(!el) return;
  const wf = _edit.workforce;
  if(!wf.length){ el.innerHTML = '<div style="background:var(--t0,#fff);border:1px dashed var(--t4,#CBD5E1);border-radius:8px;padding:16px;text-align:center;color:var(--t6,#64748B);font-size:12px">Nenhuma funcao registrada. Use + para adicionar.</div>'; return; }
  el.innerHTML = wf.map((w,i) => '<div style="display:grid;grid-template-columns:1.5fr .7fr .7fr 1fr 36px;gap:8px;align-items:end;margin-bottom:8px;background:var(--t0,#fff);padding:10px;border:1px solid var(--t3,#E5E7EB);border-radius:8px">'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Funcao</label><select data-wf-role="'+i+'" class="rdo-inp">'+ROLES_COMUNS.map(r => '<option value="'+r[0]+'"'+(w.role===r[0]?' selected':'')+'>'+r[1]+'</option>').join('')+'</select></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Qtd.</label><input type="number" data-wf-count="'+i+'" value="'+(w.people_count||0)+'" class="rdo-inp" min="0"></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">HH total</label><input type="number" step="0.5" data-wf-hh="'+i+'" value="'+(w.hh_worked||0)+'" class="rdo-inp" min="0"></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Tipo</label><select data-wf-type="'+i+'" class="rdo-inp">'+
      '<option value="direta"'+(w.workforce_type==='direta'?' selected':'')+'>Direta</option>'+
      '<option value="indireta"'+(w.workforce_type==='indireta'?' selected':'')+'>Indireta</option>'+
      '<option value="terceiro"'+(w.workforce_type==='terceiro'?' selected':'')+'>Terceiro</option>'+
    '</select></div>'+
    '<button data-wf-del="'+i+'" class="btn" style="height:34px;padding:0;background:#FEE2E2;color:#991B1B;border:none;font-size:16px">×</button>'+
  '</div>').join('');
  el.querySelectorAll('[data-wf-role]').forEach(s => s.onchange = ()=>{ _edit.workforce[+s.dataset.wfRole].role = s.value; });
  el.querySelectorAll('[data-wf-count]').forEach(s => s.oninput = ()=>{ _edit.workforce[+s.dataset.wfCount].people_count = +s.value; });
  el.querySelectorAll('[data-wf-hh]').forEach(s => s.oninput = ()=>{ _edit.workforce[+s.dataset.wfHh].hh_worked = +s.value; });
  el.querySelectorAll('[data-wf-type]').forEach(s => s.onchange = ()=>{ _edit.workforce[+s.dataset.wfType].workforce_type = s.value; });
  el.querySelectorAll('[data-wf-del]').forEach(b => b.onclick = ()=>{ _edit.workforce.splice(+b.dataset.wfDel, 1); renderWfList(); });
}

function renderActList(){
  const el = d.getElementById('r-act-list');
  if(!el) return;
  const ac = _edit.activities;
  if(!ac.length){ el.innerHTML = '<div style="background:var(--t0,#fff);border:1px dashed var(--t4,#CBD5E1);border-radius:8px;padding:16px;text-align:center;color:var(--t6,#64748B);font-size:12px">Nenhuma atividade registrada.</div>'; return; }
  el.innerHTML = ac.map((a,i) => '<div style="display:grid;grid-template-columns:2fr 1fr .7fr 36px;gap:8px;align-items:end;margin-bottom:8px;background:var(--t0,#fff);padding:10px;border:1px solid var(--t3,#E5E7EB);border-radius:8px">'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Descricao da atividade</label><input type="text" data-ac-desc="'+i+'" value="'+esc(a.description||'')+'" class="rdo-inp" placeholder="Ex: Concretagem da laje L3"></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Local / frente</label><input type="text" data-ac-loc="'+i+'" value="'+esc(a.location||'')+'" class="rdo-inp" placeholder="Bloco A - 2 pav."></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">% avanco</label><input type="number" min="0" max="100" data-ac-pct="'+i+'" value="'+(a.progress_pct||'')+'" class="rdo-inp" placeholder="0-100"></div>'+
    '<button data-ac-del="'+i+'" class="btn" style="height:34px;padding:0;background:#FEE2E2;color:#991B1B;border:none;font-size:16px">×</button>'+
  '</div>').join('');
  el.querySelectorAll('[data-ac-desc]').forEach(s => s.oninput = ()=>{ _edit.activities[+s.dataset.acDesc].description = s.value; });
  el.querySelectorAll('[data-ac-loc]').forEach(s => s.oninput = ()=>{ _edit.activities[+s.dataset.acLoc].location = s.value; });
  el.querySelectorAll('[data-ac-pct]').forEach(s => s.oninput = ()=>{ _edit.activities[+s.dataset.acPct].progress_pct = s.value ? +s.value : null; });
  el.querySelectorAll('[data-ac-del]').forEach(b => b.onclick = ()=>{ _edit.activities.splice(+b.dataset.acDel, 1); renderActList(); });
}

function renderEvList(){
  const el = d.getElementById('r-ev-list');
  if(!el) return;
  const ev = _edit.events;
  if(!ev.length){ el.innerHTML = '<div style="background:#F0FDF4;border:1px dashed #86EFAC;border-radius:8px;padding:16px;text-align:center;color:#16A34A;font-size:12px">Nenhuma ocorrencia registrada (dia tranquilo!)</div>'; return; }
  el.innerHTML = ev.map((e,i) => '<div style="display:grid;grid-template-columns:1fr .8fr 2fr 1fr 36px;gap:8px;align-items:end;margin-bottom:8px;background:var(--t0,#fff);padding:10px;border:1px solid var(--t3,#E5E7EB);border-left:3px solid #F59E0B;border-radius:8px">'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Tipo</label><select data-ev-type="'+i+'" class="rdo-inp">'+EVENT_TYPES.map(t => '<option value="'+t[0]+'"'+(e.event_type===t[0]?' selected':'')+'>'+t[1]+'</option>').join('')+'</select></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Severidade</label><select data-ev-sev="'+i+'" class="rdo-inp">'+
      '<option value="baixa"'+(e.severity==='baixa'?' selected':'')+'>Baixa</option>'+
      '<option value="media"'+(e.severity==='media'?' selected':'')+'>Media</option>'+
      '<option value="alta"'+(e.severity==='alta'?' selected':'')+'>Alta</option>'+
      '<option value="critica"'+(e.severity==='critica'?' selected':'')+'>Critica</option>'+
    '</select></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Descricao</label><input type="text" data-ev-desc="'+i+'" value="'+esc(e.description||'')+'" class="rdo-inp"></div>'+
    '<div><label style="font-size:10px;color:var(--t7,#334155);font-weight:600">Responsavel</label><input type="text" data-ev-resp="'+i+'" value="'+esc(e.responsible||'')+'" class="rdo-inp"></div>'+
    '<button data-ev-del="'+i+'" class="btn" style="height:34px;padding:0;background:#FEE2E2;color:#991B1B;border:none;font-size:16px">×</button>'+
  '</div>').join('');
  el.querySelectorAll('[data-ev-type]').forEach(s => s.onchange = ()=>{ _edit.events[+s.dataset.evType].event_type = s.value; });
  el.querySelectorAll('[data-ev-sev]').forEach(s => s.onchange = ()=>{ _edit.events[+s.dataset.evSev].severity = s.value; });
  el.querySelectorAll('[data-ev-desc]').forEach(s => s.oninput = ()=>{ _edit.events[+s.dataset.evDesc].description = s.value; });
  el.querySelectorAll('[data-ev-resp]').forEach(s => s.oninput = ()=>{ _edit.events[+s.dataset.evResp].responsible = s.value; });
  el.querySelectorAll('[data-ev-del]').forEach(b => b.onclick = ()=>{ _edit.events.splice(+b.dataset.evDel, 1); renderEvList(); });
}

async function saveRDO(status){
  const { rdo, workforce, activities, events } = _edit;
  const orgId = (w._org && w._org.id) || null;
  const userId = (w._user && w._user.id) || null;
  const payload = {
    org_id: orgId,
    project_id: _state.project.id,
    report_date: d.getElementById('r-date').value,
    report_number: +d.getElementById('r-num').value || null,
    ambient_temp_c: parseFloat(d.getElementById('r-temp').value) || null,
    morning_status: d.getElementById('r-morning').value || null,
    afternoon_status: d.getElementById('r-afternoon').value || null,
    night_status: d.getElementById('r-night').value || null,
    responsible_engineer: d.getElementById('r-eng').value || null,
    responsible_crea: d.getElementById('r-crea').value || null,
    notes: d.getElementById('r-notes').value || null,
    status: status,
    created_by: userId
  };
  if(status === 'approved'){
    payload.approved_at = new Date().toISOString();
    payload.approved_by = userId;
  }

  let savedId;
  if(rdo.id){
    const { error } = await sb.from('daily_reports').update(payload).eq('id', rdo.id);
    if(error){ alert('Erro: '+error.message); return; }
    savedId = rdo.id;
    await Promise.all([
      sb.from('daily_report_workforce').delete().eq('daily_report_id', savedId),
      sb.from('daily_report_activities').delete().eq('daily_report_id', savedId),
      sb.from('daily_report_events').delete().eq('daily_report_id', savedId)
    ]);
  } else {
    const { data, error } = await sb.from('daily_reports').insert(payload).select('id').single();
    if(error){ alert('Erro: '+error.message); return; }
    savedId = data.id;
  }

  const wfRows = workforce.filter(x => x.people_count > 0).map(x => ({daily_report_id:savedId, role:x.role, people_count:x.people_count, hh_worked:x.hh_worked, workforce_type:x.workforce_type}));
  const acRows = activities.filter(x => (x.description||'').trim()).map(x => ({daily_report_id:savedId, description:x.description, location:x.location||null, progress_pct:x.progress_pct}));
  const evRows = events.filter(x => (x.description||'').trim()).map(x => ({daily_report_id:savedId, event_type:x.event_type, severity:x.severity, description:x.description, responsible:x.responsible||null}));
  if(wfRows.length) await sb.from('daily_report_workforce').insert(wfRows);
  if(acRows.length) await sb.from('daily_report_activities').insert(acRows);
  if(evRows.length) await sb.from('daily_report_events').insert(evRows);

  closeModal();
  await loadRDOs();
  renderShell();
  if(typeof w.toast === 'function') w.toast('RDO salvo com sucesso','success');
}

// ============================================================
// PDF — mantem cor azul escuro como design profissional do documento
// ============================================================
async function generatePDF(rdoId, mode){
  if(!w.jspdf && !w.jsPDF) await loadJsPDFLib();
  const jsPDF = (w.jspdf && w.jspdf.jsPDF) || w.jsPDF;
  if(!jsPDF){ alert('Biblioteca PDF nao disponivel'); return; }

  let rdo = null, workforce = [], activities = [], events = [];
  if(mode === 'filled' && rdoId){
    rdo = _state.rdos.find(r => r.id === rdoId);
    if(!rdo){ alert('RDO nao encontrado'); return; }
    const [wfR, acR, evR] = await Promise.all([
      sb.from('daily_report_workforce').select('*').eq('daily_report_id', rdoId),
      sb.from('daily_report_activities').select('*').eq('daily_report_id', rdoId),
      sb.from('daily_report_events').select('*').eq('daily_report_id', rdoId)
    ]);
    workforce = wfR.data || [];
    activities = acR.data || [];
    events = evR.data || [];
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 15;
  const NAVY = [30, 58, 138];
  const LIGHT = [241, 245, 249];
  const TEXT = [15, 23, 42];
  const GREY = [100, 116, 139];

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('RELATORIO DIARIO DE OBRA', M, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('PROJECT.IA - Sistema de Engenharia', M, 18);
  doc.text('Documento de controle de obra', M, 23);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text(mode === 'blank' ? 'Nº #_____' : ('Nº #' + (rdo.report_number||'____')), W - M, 18, { align: 'right' });

  let y = 36;

  function sectionTitle(t){
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(M, y, W - 2*M, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(t, M + 3, y + 5);
    y += 10;
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  }
  function field(label, value, x, w, h){
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
    doc.setFontSize(7); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 2, y + 3);
    doc.setFontSize(10); doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.setFont('helvetica', 'bold');
    if(value) doc.text(String(value), x + 2, y + h - 2);
  }

  sectionTitle('1. IDENTIFICACAO DA OBRA');
  const dataStr = mode === 'blank' ? '____ / ____ / ________' : new Date((rdo.report_date||'')+'T00:00:00').toLocaleDateString('pt-BR');
  const dayStr = mode === 'blank' ? '________' : (rdo.report_date ? ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'][new Date(rdo.report_date+'T00:00:00').getDay()] : '');
  field('OBRA', _state.project.name || '', M, 90, 12);
  field('DATA', dataStr, M+90, 35, 12);
  field('TEMPERATURA (C)', mode === 'blank' ? '_______' : (rdo.ambient_temp_c||''), M+125, 30, 12);
  field('DIA SEMANA', dayStr, M+155, 25, 12);
  y += 14;
  field('ENGENHEIRO RESPONSAVEL', mode === 'blank' ? '' : (rdo.responsible_engineer||''), M, 120, 12);
  field('CREA', mode === 'blank' ? '' : (rdo.responsible_crea||''), M+120, 60, 12);
  y += 16;

  sectionTitle('2. CONDICOES CLIMATICAS');
  const periodos = [['MANHA', rdo ? rdo.morning_status : null], ['TARDE', rdo ? rdo.afternoon_status : null], ['NOITE', rdo ? rdo.night_status : null]];
  const cw = (W - 2*M) / 3;
  periodos.forEach((p, i) => {
    const x = M + i * cw;
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, cw - 1, 22);
    doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
    doc.rect(x, y, cw - 1, 6, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(p[0], x + cw/2 - 0.5, y + 4, { align: 'center' });
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    if(mode === 'blank'){
      const opts = ['Bom','Nublado','Chuvoso','Instavel','Impraticavel'];
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      opts.forEach((o, j) => {
        const oy = y + 8 + j * 3;
        doc.rect(x + 3, oy, 2.5, 2.5);
        doc.text(o, x + 7, oy + 2);
      });
    } else {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(p[1] ? labelOf(WEATHER, p[1]) : '—', x + cw/2 - 0.5, y + 15, { align: 'center' });
    }
  });
  y += 26;

  sectionTitle('3. EFETIVO DO DIA');
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(M, y, W - 2*M, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('FUNCAO', M + 3, y + 5);
  doc.text('QTD', M + 90, y + 5);
  doc.text('HH', M + 110, y + 5);
  doc.text('TIPO', M + 130, y + 5);
  doc.text('OBSERVACOES', M + 155, y + 5);
  y += 7;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const wfRows = mode === 'blank' ? new Array(12).fill(null) : workforce;
  wfRows.forEach(wf => {
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
    doc.line(M, y + 5.5, W - M, y + 5.5);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if(wf){
      doc.text(labelOf(ROLES_COMUNS, wf.role) || '', M + 3, y + 4);
      doc.text(String(wf.people_count||''), M + 90, y + 4);
      doc.text(String(wf.hh_worked||''), M + 110, y + 4);
      doc.text(wf.workforce_type || '', M + 130, y + 4);
    }
    y += 5.5;
  });
  y += 4;

  if(y > 220) { doc.addPage(); y = 20; }
  sectionTitle('4. ATIVIDADES REALIZADAS');
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(M, y, W - 2*M, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('DESCRICAO DA ATIVIDADE', M + 3, y + 5);
  doc.text('LOCAL / FRENTE', M + 110, y + 5);
  doc.text('% AVANCO', W - M - 25, y + 5);
  y += 7;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const acRows = mode === 'blank' ? new Array(8).fill(null) : activities;
  acRows.forEach(ac => {
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
    doc.line(M, y + 6, W - M, y + 6);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if(ac){
      const desc = doc.splitTextToSize(ac.description || '', 105);
      doc.text(desc[0] || '', M + 3, y + 4);
      doc.text(ac.location || '', M + 110, y + 4);
      doc.text(ac.progress_pct ? (ac.progress_pct + '%') : '', W - M - 25, y + 4);
    }
    y += 6;
  });
  y += 4;

  if(y > 230) { doc.addPage(); y = 20; }
  sectionTitle('5. OCORRENCIAS E EVENTOS');
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(M, y, W - 2*M, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('TIPO', M + 3, y + 5);
  doc.text('DESCRICAO', M + 40, y + 5);
  doc.text('RESPONSAVEL', M + 140, y + 5);
  y += 7;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const evRows = mode === 'blank' ? new Array(5).fill(null) : events;
  evRows.forEach(ev => {
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
    doc.line(M, y + 7, W - M, y + 7);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if(ev){
      doc.text(labelOf(EVENT_TYPES, ev.event_type) || '', M + 3, y + 4);
      const desc = doc.splitTextToSize(ev.description || '', 95);
      doc.text(desc[0] || '', M + 40, y + 4);
      doc.text(ev.responsible || '', M + 140, y + 4);
    }
    y += 7;
  });
  y += 4;

  if(y > 240) { doc.addPage(); y = 20; }
  sectionTitle('6. OBSERVACOES GERAIS');
  doc.setDrawColor(200, 200, 200);
  doc.rect(M, y, W - 2*M, 30);
  if(mode === 'filled' && rdo && rdo.notes){
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(rdo.notes, W - 2*M - 6);
    doc.text(notes.slice(0, 6), M + 3, y + 5);
  } else {
    for(let i = 0; i < 4; i++){
      doc.setDrawColor(230, 230, 230);
      doc.line(M + 3, y + 8 + i * 6, W - M - 3, y + 8 + i * 6);
    }
  }
  y += 35;

  if(y > 260) { doc.addPage(); y = 20; }
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(M, y, W - 2*M, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('ASSINATURAS', M + 3, y + 5);
  y += 14;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const sw = (W - 2*M - 6) / 2;
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4);
  doc.line(M, y + 14, M + sw, y + 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('ENCARREGADO / RESPONSAVEL TECNICO', M + sw/2, y + 18, { align: 'center' });
  doc.line(M + sw + 6, y + 14, W - M, y + 14);
  doc.text('FISCALIZACAO / CONTRATANTE', M + sw + 6 + sw/2, y + 18, { align: 'center' });

  doc.setFontSize(7); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento gerado por PROJECT.IA - ' + new Date().toLocaleString('pt-BR'), W/2, H - 8, { align: 'center' });

  const fname = 'rdo_' + (rdoId ? rdoId.slice(0,8) : 'em-branco') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
  doc.save(fname);
}

w.openRdoAI = function(projectId){
  var pid = projectId || (w._curProject && w._curProject.id);
  if(w.PIALazy) w.PIALazy.run('ai-rdo','openFromPhoto',pid);
  else if(w.PIAIARdo) w.PIAIARdo.openFromPhoto(pid);
};

w.PIARDODiario = { open };

} catch(e){ console.error('[rdo-diario] init falhou:', e); }
})(window, document);
