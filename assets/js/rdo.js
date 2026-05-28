/*! PROJECT.IA - rdo v1
 *  Diário de Obra (RDO) industrial
 *  - HHT por disciplina (própria/terceira)
 *  - Atividades por disciplina
 *  - Eventos (paralisação, quase-acidente, anomalia)
 *  - Fotos georreferenciadas
 *  - Geração PDF
 */
(function(w,d){'use strict';
try {

const DISCS = ['Civil','Tubulação','Mecânica','Elétrica','Instrumentação','Hidráulica','Pintura','Caldeiraria','Segurança'];
const WEATHER = ['Limpo','Nublado','Chuva fraca','Chuva forte','Sol forte','Frio','Quente'];
const EVENT_TYPES = [
  {v:'paralisacao',l:'Paralisação',c:'#DC2626',ic:'⏸'},
  {v:'quase_acidente',l:'Quase acidente',c:'#F59E0B',ic:'⚠'},
  {v:'anomalia',l:'Anomalia',c:'#EA580C',ic:'🔧'},
  {v:'liberacao_pendente',l:'Liberação pendente',c:'#8B5CF6',ic:'⏳'},
  {v:'observacao',l:'Observação',c:'#0EA5E9',ic:'📝'},
  {v:'equipamento_mobilizado',l:'Equipamento mobilizado',c:'#10B981',ic:'🚜'}
];

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtBR(d){if(!d)return '';return new Date(d).toLocaleDateString('pt-BR');}
function getProjectId(){return (w._curProject && w._curProject.id) || w.curProj || null;}
function getOrgId(){return (w._org && w._org.id) || null;}
function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  if(w.projects && w.curProj){
    const p = w.projects.find(x=>x.id===w.curProj);
    if(p) return p.name;
  }
  return '';
}

let _reports = [];
let _current = null;

async function openProjectPicker(){
  let ov = d.getElementById('pia-rdo-pick');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-rdo-pick';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9640;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `<div style="background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);overflow:hidden">
    <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff">
      <div style="width:42px;height:42px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:22px">📋</div>
      <div style="flex:1"><div style="font-size:16px;font-weight:800">Selecione o projeto</div><div style="font-size:11.5px;opacity:.85">Para abrir o Diário de Obra (RDO)</div></div>
      <button id="pia-rdo-pickclose" style="background:rgba(255,255,255,.18);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
    </div>
    <div style="padding:14px 18px;border-bottom:1px solid #F1F5F9">
      <input id="pia-rdo-pickq" type="text" placeholder="Buscar projeto..." style="width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div id="pia-rdo-picklist" style="flex:1;overflow:auto;padding:8px 12px">
      <div style="padding:30px;text-align:center;color:#94A3B8">⏳ Carregando...</div>
    </div>
  </div>`;
  d.body.appendChild(ov);
  d.getElementById('pia-rdo-pickclose').onclick = ()=> ov.remove();
  try {
    let projs = (w.projects && Array.isArray(w.projects)) ? w.projects : null;
    if(!projs || projs.length === 0){
      if(w.sb){
        const r = await w.sb.from('projects').select('id,name,client,status').order('updated_at',{ascending:false}).limit(200);
        if(r && !r.error) projs = r.data || [];
      }
    }
    projs = projs || [];
    const list = d.getElementById('pia-rdo-picklist');
    const q = d.getElementById('pia-rdo-pickq');
    function render(filter){
      const f = (filter||'').toLowerCase().trim();
      const arr = f ? projs.filter(p => (p.name||'').toLowerCase().includes(f) || (p.client||'').toLowerCase().includes(f)) : projs;
      if(arr.length === 0){
        list.innerHTML = `<div style="padding:36px;text-align:center;color:#94A3B8"><div style="font-size:38px">📂</div><div style="font-weight:600;color:#475569;margin-top:6px">${projs.length===0?'Nenhum projeto cadastrado':'Nenhum projeto encontrado'}</div><div style="font-size:12px;margin-top:4px">${projs.length===0?'Crie um projeto em Geral → Projetos primeiro':'Tente outra busca'}</div></div>`;
        return;
      }
      list.innerHTML = arr.map(p => {
        const st = p.status==='ativo'?'#10B981': p.status==='concluido'?'#0EA5E9':'#94A3B8';
        return `<div class="pia-rdo-pick-item" data-id="${esc(p.id)}" style="padding:11px 14px;border:1px solid #E2E8F0;border-radius:9px;margin:6px 0;cursor:pointer;display:flex;align-items:center;gap:10px;background:#fff">
          <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">${esc((p.name||'?').slice(0,2).toUpperCase())}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13.5px;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name||'(sem nome)')}</div>
            <div style="font-size:11.5px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.client||'—')}</div>
          </div>
          <span style="font-size:10.5px;padding:3px 8px;border-radius:99px;background:${st}15;color:${st};font-weight:700;text-transform:uppercase">${esc(p.status||'—')}</span>
        </div>`;
      }).join('');
      list.querySelectorAll('.pia-rdo-pick-item').forEach(it => {
        it.onmouseover = ()=> it.style.background = '#FFFBEB';
        it.onmouseout = ()=> it.style.background = '#fff';
        it.onclick = ()=>{
          const id = it.dataset.id;
          const p = projs.find(x => String(x.id) === String(id));
          if(p){
            w._curProject = { id: p.id, name: p.name, client: p.client, status: p.status };
            w.curProj = p.id;
            try { localStorage.setItem('pia.curProj', p.id); } catch(_){}
            ov.remove();
            openList();
          }
        };
      });
    }
    render('');
    q.oninput = ()=> render(q.value);
    setTimeout(()=> q.focus(), 60);
  } catch(e){
    const list = d.getElementById('pia-rdo-picklist');
    if(list) list.innerHTML = `<div style="padding:30px;text-align:center;color:#991B1B">⚠️ ${esc(e.message||e)}</div>`;
  }
}

function openList(){
  const pid = getProjectId();
  if(!pid){ openProjectPicker(); return; }
  let ov = d.getElementById('pia-rdo-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-rdo-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9640;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:1200px;height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative;overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#F59E0B 0%,#EA580C 100%);display:flex;align-items:center;justify-content:center;font-size:22px">📋</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800">Diário de Obra (RDO)</div>
          <div style="font-size:11.5px;opacity:.7">${esc(getProjectName())}</div>
        </div>
        <button id="pia-rdo-photo" title="Encarregado preencheu em papel? Envie a foto e a IA cadastra" style="background:#7C3AED;color:#fff;border:none;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px">📷 RDO por foto</button>
        <button id="pia-rdo-new" style="background:#10B981;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">+ Novo RDO</button>
        <button id="pia-rdo-close" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>
      <div id="pia-rdo-list" style="flex:1;overflow-y:auto;padding:0"></div>
    </div>
  `;
  if(w.PIAShell && w.PIAShell.inlineWrap(ov, 'rdo', 'tab-rdo-new')){} else { d.body.appendChild(ov); }
  d.getElementById('pia-rdo-close').onclick = ()=> ov.remove();
  d.getElementById('pia-rdo-new').onclick = ()=> openEditor(null);
  d.getElementById('pia-rdo-photo').onclick = ()=> openHandwrittenRDO();
  loadList();
}

async function loadList(){
  const wrap = d.getElementById('pia-rdo-list');
  wrap.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8">⏳ Carregando...</div>';
  try {
    const {data, error} = await w.sb.from('daily_reports')
      .select('*').eq('project_id', getProjectId())
      .order('report_date', {ascending:false}).limit(100);
    if(error) throw error;
    _reports = (data||[]).filter(r => !r.deleted_at);
    renderList();
  } catch(e){
    wrap.innerHTML = `<div style="padding:30px;text-align:center;color:#991B1B">⚠️ ${esc(e.message||e)}</div>`;
  }
}

function renderList(){
  const wrap = d.getElementById('pia-rdo-list');
  if(_reports.length === 0){
    wrap.innerHTML = '<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:48px">📋</div><div style="font-weight:600;color:#475569;margin-top:8px">Nenhum RDO criado</div><div style="font-size:12.5px;margin-top:6px">Clique em <strong>+ Novo RDO</strong> pra começar</div></div>';
    return;
  }
  let html = '<div style="padding:14px 22px">';
  _reports.forEach(r => {
    const stColors = {draft:'#94A3B8',submitted:'#0EA5E9',approved:'#10B981',rejected:'#DC2626'};
    const stLabels = {draft:'Rascunho',submitted:'Enviado',approved:'Aprovado',rejected:'Rejeitado'};
    const c = stColors[r.status]||'#94A3B8';
    html += `
      <div onclick="PIARDO.open('${esc(r.id)}')" style="background:#fff;border:1px solid #E2E8F0;border-left:3px solid ${c};border-radius:10px;padding:14px 16px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .15s" onmouseover="this.style.borderColor='${c}';this.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'" onmouseout="this.style.borderColor='#E2E8F0';this.style.boxShadow=''">
        <div style="flex-shrink:0;text-align:center;min-width:60px">
          <div style="font-size:24px;font-weight:800;color:${c}">${r.report_number||'—'}</div>
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase">Nº RDO</div>
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#0F172A">${fmtBR(r.report_date)}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px">${esc(r.responsible_engineer||'(sem responsável)')} · ${esc(r.weather||'')}</div>
        </div>
        <div>
          <span style="background:${c}1A;color:${c};padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700">${stLabels[r.status]||r.status}</span>
        </div>
      </div>
    `;
  });
  html += '</div>';
  wrap.innerHTML = html;
}

async function open(id){
  const r = _reports.find(x=>x.id===id);
  if(r) openEditor(r);
}

async function openEditor(existing){
  _current = existing || {
    report_date: new Date().toISOString().slice(0,10),
    morning_status:'Trabalhado', afternoon_status:'Trabalhado',
    weather:'Limpo', status:'draft',
    disciplina:'industrial', discipline_data:{}
  };
  if(!_current.disciplina) _current.disciplina = 'industrial';
  if(!_current.discipline_data) _current.discipline_data = {};
  // PERF: se já existe, pré-carrega TODAS as sub-tabelas em paralelo (1 round-trip)
  if(_current.id){
    const id = _current.id;
    const [wf, ac, ev, ph] = await Promise.all([
      w.sb.from('daily_report_workforce').select('*').eq('daily_report_id', id),
      w.sb.from('daily_report_activities').select('*').eq('daily_report_id', id),
      w.sb.from('daily_report_events').select('*').eq('daily_report_id', id),
      w.sb.from('daily_report_photos').select('*').eq('daily_report_id', id)
    ]);
    _current._workforce = wf.data || [];
    _current._activities = ac.data || [];
    _current._events = ev.data || [];
    _current._photos = ph.data || [];
  }
  let ov = d.getElementById('pia-rdo-edit-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-rdo-edit-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9650;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:1100px;height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.3);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#F59E0B 0%,#EA580C 100%);color:#fff">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800">${existing?'Editar':'Novo'} RDO</div>
          <div style="font-size:11.5px;opacity:.85">${esc(getProjectName())}</div>
        </div>
        <button id="rdo-save" style="background:#fff;color:#EA580C;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">💾 Salvar</button>
        <button id="rdo-xls" style="background:#10B981;color:#fff;border:none;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">📥 Excel</button>
        <button id="rdo-pdf" style="background:rgba(255,255,255,.15);color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">📄 PDF</button>
        <button id="rdo-cancel" style="background:rgba(255,255,255,.15);color:#fff;border:none;cursor:pointer;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>
      <div id="rdo-tabs" style="padding:0 16px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;gap:4px"></div>
      <div id="rdo-body" style="flex:1;overflow-y:auto;padding:18px 22px"></div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('rdo-cancel').onclick = ()=> ov.remove();
  d.getElementById('rdo-save').onclick = saveReport;
  d.getElementById('rdo-pdf').onclick = exportPDF;
  const xb = d.getElementById('rdo-xls'); if(xb) xb.onclick = exportExcel;
  renderTabs();
  showTab('geral');
}

const TABS = [
  {id:'geral', label:'📋 Geral'},
  {id:'pcp', label:'📅 Plano do dia (PCP)'},
  {id:'disciplina', label:'🎯 Específico'},
  {id:'workforce', label:'👷 Mão de obra (HHT)'},
  {id:'activities', label:'🛠 Atividades'},
  {id:'events', label:'⚠ Eventos'},
  {id:'photos', label:'📸 Fotos'}
];
let _activeTab = 'geral';

function renderTabs(){
  const wrap = d.getElementById('rdo-tabs');
  wrap.innerHTML = TABS.map(t => {
    const active = t.id === _activeTab;
    return `<button onclick="PIARDO.showTab('${t.id}')" style="background:${active?'#EA580C':'transparent'};color:${active?'#fff':'#475569'};border:none;padding:9px 16px;font-size:12.5px;font-weight:700;cursor:pointer;border-radius:8px 8px 0 0;border-bottom:3px solid ${active?'#EA580C':'transparent'}">${t.label}</button>`;
  }).join('');
}

function showTab(id){
  _activeTab = id;
  renderTabs();
  const body = d.getElementById('rdo-body');
  if(id==='geral') body.innerHTML = renderGeral();
  else if(id==='pcp') renderPCPTab(body);
  else if(id==='disciplina') renderDisciplineTab(body);
  else if(id==='workforce') renderWorkforceTab(body);
  else if(id==='activities') renderActivitiesTab(body);
  else if(id==='events') renderEventsTab(body);
  else if(id==='photos') renderPhotosTab(body);
}

/* ============================================================
   ABA PCP — Pacotes planejados pra hoje (auto)
   ============================================================ */
async function renderPCPTab(body){
  body.innerHTML = '<div style="padding:30px;text-align:center;color:#94A3B8">⏳ Buscando pacotes planejados...</div>';
  const r = _current || {};
  const dateStr = r.report_date || fmtToday();
  const pid = getProjectId();
  if(!pid || !w.PIAPCP){
    body.innerHTML = '<div style="padding:30px;text-align:center;color:#94A3B8"><div style="font-size:42px">📅</div><div style="font-weight:600;color:#475569;margin-top:8px">PCP não disponível</div><div style="font-size:12px;margin-top:4px">Acesse Engenharia → PCP — Plano Semanal pra criar pacotes</div></div>';
    return;
  }
  const pacotes = await w.PIAPCP.packagesForDay(pid, dateStr);
  if(pacotes.length === 0){
    body.innerHTML = `<div style="padding:30px;text-align:center;color:#94A3B8">
      <div style="font-size:42px">📅</div>
      <div style="font-weight:600;color:#475569;margin-top:8px">Nenhum pacote planejado para ${esc(dateStr)}</div>
      <div style="font-size:12px;margin-top:4px">Crie pacotes em <strong>Engenharia → PCP</strong> e atribua um dia planejado</div>
    </div>`;
    return;
  }
  if(!r.meta) r.meta = {};
  if(!r.meta.pcp_results) r.meta.pcp_results = {};

  body.innerHTML = `
    <div style="padding:14px 18px;background:#EFF6FF;border-bottom:1px solid #DBEAFE">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">📅</div>
        <div style="flex:1">
          <div style="font-weight:800;color:#1E40AF;font-size:14px">${pacotes.length} pacotes planejados para ${esc(dateStr)}</div>
          <div style="font-size:11.5px;color:#3B82F6">Marque cada um como concluído, parcial ou não-concluído. Se não concluiu, indique a causa (CNC).</div>
        </div>
      </div>
    </div>
    <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
      ${pacotes.map(p => renderPCPRow(p, r.meta.pcp_results[p.id])).join('')}
    </div>
    <div style="padding:0 18px 18px">
      <button id="rdo-pcp-save" style="width:100%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;border:none;padding:11px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">💾 Salvar status dos pacotes</button>
    </div>
  `;
  body.querySelectorAll('.rdo-pcp-status').forEach(sel => {
    sel.onchange = ()=>{
      const id = sel.dataset.id;
      const cncBox = body.querySelector('.rdo-pcp-cnc[data-id="'+id+'"]');
      if(cncBox) cncBox.style.display = (sel.value === 'partial' || sel.value === 'not_done') ? 'grid' : 'none';
    };
  });
  d.getElementById('rdo-pcp-save').onclick = async ()=>{
    const sb = w.sb;
    if(!sb){ alert('Supabase não inicializado'); return; }
    let saved = 0;
    for(const p of pacotes){
      const sel  = body.querySelector('.rdo-pcp-status[data-id="'+p.id+'"]');
      const cnc  = body.querySelector('.rdo-pcp-cnccause[data-id="'+p.id+'"]');
      const obs  = body.querySelector('.rdo-pcp-cncobs[data-id="'+p.id+'"]');
      const hh   = body.querySelector('.rdo-pcp-hh[data-id="'+p.id+'"]');
      if(!sel || !sel.value) continue;
      const status = sel.value;
      const cncCause = (status==='partial'||status==='not_done') ? (cnc?cnc.value:null) : null;
      const cncObs   = (status==='partial'||status==='not_done') ? (obs?obs.value:null) : null;
      const hhReal   = hh ? parseFloat(hh.value)||0 : 0;
      if((status==='partial'||status==='not_done') && !cncCause){ alert('Selecione a causa para o pacote: '+p.descricao); return; }
      const ok = await w.PIAPCP.setStatus(p.id, status, cncCause, cncObs, r.id, hhReal);
      if(ok){
        saved++;
        r.meta.pcp_results[p.id] = { status, cncCause, cncObs, hhReal };
      }
    }
    // Salva também no RDO
    if(r.id){
      await sb.from('daily_reports').update({ meta: r.meta }).eq('id', r.id);
    }
    alert('✅ '+saved+' pacote(s) atualizado(s).');
  };
}

function renderPCPRow(p, prev){
  const status = prev && prev.status || p.status || '';
  const cncCause = prev && prev.cncCause || p.cnc_cause || '';
  const cncObs   = prev && prev.cncObs   || p.cnc_obs   || '';
  const hhReal   = prev && prev.hhReal   || p.hh_real   || '';
  const showCnc = (status==='partial' || status==='not_done');
  const CNC = (w.PIAPCP && w.PIAPCP.CNC) || [];
  return `
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px">
      <div style="display:flex;align-items:start;gap:10px;margin-bottom:8px">
        <div style="font-size:11px;color:#64748B">
          <div style="font-weight:700;color:#0F172A;font-size:13px">${esc(p.descricao||'')}</div>
          <div style="margin-top:2px">${esc(p.disciplina||'')} ${p.frente?'· '+esc(p.frente):''} ${p.hh_prev?'· HH prev: <strong>'+p.hh_prev+'h</strong>':''} ${p.equipe?'· 👷 '+esc(p.equipe):''}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;margin-bottom:6px">
        <select class="rdo-pcp-status" data-id="${esc(p.id)}" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px;background:#fff">
          <option value="">— marque o resultado —</option>
          <option value="done"     ${status==='done'?'selected':''}>✅ Concluído</option>
          <option value="partial"  ${status==='partial'?'selected':''}>◐ Parcial</option>
          <option value="not_done" ${status==='not_done'?'selected':''}>❌ Não-concluído</option>
        </select>
        <input class="rdo-pcp-hh" data-id="${esc(p.id)}" type="number" min="0" step="0.5" placeholder="HH real" value="${hhReal||''}" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px">
      </div>
      <div class="rdo-pcp-cnc" data-id="${esc(p.id)}" style="display:${showCnc?'grid':'none'};grid-template-columns:1fr 1fr;gap:8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:8px;margin-top:6px">
        <select class="rdo-pcp-cnccause" data-id="${esc(p.id)}" style="padding:6px 8px;border:1px solid #FECACA;border-radius:6px;font-size:12px;background:#fff">
          <option value="">— causa CNC —</option>
          ${CNC.map(c => `<option value="${c.id}" ${cncCause===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
        </select>
        <input class="rdo-pcp-cncobs" data-id="${esc(p.id)}" type="text" placeholder="Observação (opcional)" value="${esc(cncObs)}" style="padding:6px 8px;border:1px solid #FECACA;border-radius:6px;font-size:12px;background:#fff">
      </div>
    </div>
  `;
}

function renderGeral(){
  const r = _current;
  const statusOpts = ['Trabalhado','Parado','Parcialmente parado'];
  const opt = (sel,arr) => arr.map(o=>`<option ${sel==o?'selected':''}>${esc(o)}</option>`).join('');
  const opt2 = (sel) => '<option value="">—</option>' + WEATHER.map(o=>`<option ${sel==o?'selected':''}>${esc(o)}</option>`).join('');
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Nº RDO</label>
        <input id="rg-num" type="number" value="${r.report_number||''}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Data *</label>
        <input id="rg-date" type="date" value="${esc(r.report_date)}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Clima</label>
        <select id="rg-weather" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px">${opt2(r.weather)}</select></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Temperatura ambiente (°C)</label>
        <input id="rg-temp" type="number" step="0.5" value="${r.ambient_temp_c||''}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Status</label>
        <select id="rg-status" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px">
          <option value="draft" ${r.status==='draft'?'selected':''}>Rascunho</option>
          <option value="submitted" ${r.status==='submitted'?'selected':''}>Enviado</option>
          <option value="approved" ${r.status==='approved'?'selected':''}>Aprovado</option>
        </select></div>
      <div></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Manhã</label>
        <select id="rg-morn" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"><option value="">—</option>${opt(r.morning_status,statusOpts)}</select></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Tarde</label>
        <select id="rg-aft" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"><option value="">—</option>${opt(r.afternoon_status,statusOpts)}</select></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Noite</label>
        <select id="rg-night" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"><option value="">—</option>${opt(r.night_status,statusOpts)}</select></div>
      <div style="grid-column:1/3"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Responsável técnico</label>
        <input id="rg-resp" type="text" value="${esc(r.responsible_engineer||'')}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">CREA</label>
        <input id="rg-crea" type="text" value="${esc(r.responsible_crea||'')}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px"></div>
      <div style="grid-column:1/4"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Observações gerais</label>
        <textarea id="rg-notes" rows="4" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;resize:vertical">${esc(r.notes||'')}</textarea></div>
    </div>
  `;
}

// ============================================================
// DISCIPLINAS — campos específicos por área
// ============================================================
const DISCIPLINES = [
  {v:'industrial',     l:'Industrial (geral)',   c:'#0F172A', ic:'🏭'},
  {v:'tubulacao',      l:'Tubulação',            c:'#DC2626', ic:'🔧'},
  {v:'mecanica',       l:'Mecânica',             c:'#EA580C', ic:'⚙️'},
  {v:'eletrica',       l:'Elétrica',             c:'#EAB308', ic:'⚡'},
  {v:'instrumentacao', l:'Instrumentação',       c:'#A855F7', ic:'📡'},
  {v:'civil',          l:'Civil',                c:'#0EA5E9', ic:'🏗️'},
  {v:'hidraulica',     l:'Hidráulica',           c:'#06B6D4', ic:'💧'},
  {v:'pintura',        l:'Pintura',              c:'#EC4899', ic:'🎨'},
  {v:'caldeiraria',    l:'Caldeiraria',          c:'#84CC16', ic:'🔥'},
  {v:'seguranca',      l:'Segurança',            c:'#10B981', ic:'🦺'}
];

const DISCIPLINE_FIELDS = {
  industrial: [
    {k:'hh_total',           l:'HH total trabalhado',          t:'number', u:'h'},
    {k:'avanco_pct',         l:'Avanço geral do dia',          t:'number', u:'%'},
    {k:'frente_servico',     l:'Frente(s) de serviço',         t:'text'}
  ],
  tubulacao: [
    {k:'juntas_soldadas',    l:'Juntas soldadas',              t:'number', u:'un'},
    {k:'juntas_inspecionadas',l:'Juntas inspecionadas (END)',  t:'number', u:'un'},
    {k:'metros_soldagem',    l:'Metros de soldagem',           t:'number', u:'m'},
    {k:'isos_avancados',     l:'ISOs com avanço',              t:'number', u:'un'},
    {k:'reaperto_torque',    l:'Reaperto/torque (juntas)',     t:'number', u:'un'},
    {k:'th_realizado',       l:'Teste hidrostático realizado', t:'text'},
    {k:'pressao_th_bar',     l:'Pressão TH (bar)',             t:'number', u:'bar'}
  ],
  mecanica: [
    {k:'equip_montados',     l:'Equipamentos montados',        t:'number', u:'un'},
    {k:'alinhamentos',       l:'Alinhamentos realizados',      t:'number', u:'un'},
    {k:'pre_commissioning',  l:'Pré-comissionamentos',         t:'number', u:'un'},
    {k:'observacoes_mec',    l:'Observações técnicas',         t:'textarea'}
  ],
  eletrica: [
    {k:'metros_cabo',        l:'Metros de cabo passados',      t:'number', u:'m'},
    {k:'eletrodutos_m',      l:'Eletrodutos instalados',       t:'number', u:'m'},
    {k:'paineis_montados',   l:'Painéis/quadros montados',     t:'number', u:'un'},
    {k:'lampadas_inst',      l:'Luminárias instaladas',        t:'number', u:'un'},
    {k:'spda_haste',         l:'Hastes SPDA cravadas',         t:'number', u:'un'},
    {k:'megada_realizada',   l:'Megagem realizada (MΩ)',       t:'text'}
  ],
  instrumentacao: [
    {k:'instr_calibrados',   l:'Instrumentos calibrados',      t:'number', u:'un'},
    {k:'malhas_testadas',    l:'Malhas testadas (loop check)', t:'number', u:'un'},
    {k:'tubing_m',           l:'Tubing instalado',             t:'number', u:'m'}
  ],
  civil: [
    {k:'m3_concreto',        l:'Volume de concreto (m³)',      t:'number', u:'m³'},
    {k:'fck',                l:'fck (MPa)',                    t:'number', u:'MPa'},
    {k:'slump',              l:'Slump (mm)',                   t:'number', u:'mm'},
    {k:'kg_aco',             l:'Aço CA-50/60 (kg)',            t:'number', u:'kg'},
    {k:'m2_forma',           l:'Forma armada (m²)',            t:'number', u:'m²'},
    {k:'fck_corpos_prova',   l:'CPs moldados',                 t:'number', u:'un'},
    {k:'cura',               l:'Cura (dias)',                  t:'number', u:'d'}
  ],
  hidraulica: [
    {k:'metros_tubo_hid',    l:'Metros de tubo PVC/PEX/PPR',   t:'number', u:'m'},
    {k:'pontos_hid',         l:'Pontos hidráulicos',           t:'number', u:'un'},
    {k:'teste_estanqueidade',l:'Teste estanqueidade (bar)',    t:'number', u:'bar'}
  ],
  pintura: [
    {k:'m2_aplicado',        l:'Área aplicada (m²)',           t:'number', u:'m²'},
    {k:'demaos',             l:'Nº de demãos',                 t:'number', u:''},
    {k:'esp_seca_um',        l:'Espessura seca média (µm)',    t:'number', u:'µm'},
    {k:'tinta_consumida_l',  l:'Tinta consumida (L)',          t:'number', u:'L'},
    {k:'jato_areia_m2',      l:'Jateamento (m²)',              t:'number', u:'m²'},
    {k:'tipo_tinta',         l:'Tipo de tinta',                t:'text'},
    {k:'sa',                 l:'Padrão jato (Sa)',             t:'text'}
  ],
  caldeiraria: [
    {k:'kg_estrutura',       l:'Aço estrutural montado (kg)',  t:'number', u:'kg'},
    {k:'pecas_fabricadas',   l:'Peças fabricadas',             t:'number', u:'un'},
    {k:'kg_solda_consumido', l:'Eletrodo/arame consumido',     t:'number', u:'kg'},
    {k:'corte_m',            l:'Corte de chapa (m)',           t:'number', u:'m'}
  ],
  seguranca: [
    {k:'hhe_treinamento',    l:'HHE de treinamento',           t:'number', u:'h'},
    {k:'das_emitido',        l:'DAS / PT emitidas',            t:'number', u:'un'},
    {k:'incidentes',         l:'Incidentes registrados',       t:'number', u:'un'},
    {k:'epis_trocados',      l:'EPIs trocados',                t:'number', u:'un'},
    {k:'dds_realizado',      l:'DDS realizado (tema)',         t:'text'},
    {k:'aspectos_ambientais',l:'Aspectos ambientais',          t:'textarea'}
  ]
};

function renderDisciplineTab(body){
  if(!_current.discipline_data) _current.discipline_data = {};
  const disc = _current.disciplina || 'industrial';
  const meta = DISCIPLINES.find(x=>x.v===disc) || DISCIPLINES[0];
  const fields = DISCIPLINE_FIELDS[disc] || DISCIPLINE_FIELDS.industrial;

  const selectorOpts = DISCIPLINES.map(d =>
    `<option value="${d.v}" ${disc===d.v?'selected':''}>${d.ic} ${esc(d.l)}</option>`
  ).join('');

  const fieldsHtml = fields.map(f => {
    const val = _current.discipline_data[f.k] != null ? _current.discipline_data[f.k] : '';
    const id = `dd-${f.k}`;
    let input;
    if(f.t === 'textarea'){
      input = `<textarea id="${id}" rows="3" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;resize:vertical">${esc(val)}</textarea>`;
    } else {
      const type = f.t === 'number' ? 'number' : 'text';
      const step = f.t === 'number' ? 'step="0.01"' : '';
      input = `<input id="${id}" type="${type}" ${step} value="${esc(val)}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px">`;
    }
    const unit = f.u ? `<span style="color:#94A3B8;font-size:11px;margin-left:6px">${esc(f.u)}</span>` : '';
    const wide = f.t === 'textarea' ? ';grid-column:1/-1' : '';
    return `<div style="display:flex;flex-direction:column${wide}">
      <label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;margin-bottom:4px">${esc(f.l)}${unit}</label>
      ${input}
    </div>`;
  }).join('');

  body.innerHTML = `
    <div style="background:linear-gradient(135deg,${meta.c}15,${meta.c}05);border:1px solid ${meta.c}30;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px">
      <div style="font-size:32px">${meta.ic}</div>
      <div style="flex:1">
        <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Disciplina do RDO</div>
        <select id="dd-disc" style="width:100%;max-width:340px;padding:9px 12px;border:1px solid ${meta.c}50;border-radius:8px;font-size:13.5px;font-weight:700;color:${meta.c};background:#fff">${selectorOpts}</select>
      </div>
    </div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:18px">
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:14px">📊 Indicadores específicos — ${esc(meta.l)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">${fieldsHtml}</div>
    </div>
    <div style="margin-top:12px;padding:10px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:11.5px;color:#92400E">
      💡 Os indicadores são salvos junto com o RDO e aparecem no Excel/PDF de exportação.
    </div>
  `;

  // Wire seletor de disciplina (re-render ao trocar)
  d.getElementById('dd-disc').onchange = (e)=>{
    // Salva valores atuais antes de trocar
    fields.forEach(f => {
      const el = d.getElementById('dd-'+f.k);
      if(el) _current.discipline_data[f.k] = (f.t==='number' && el.value!=='') ? Number(el.value) : el.value;
    });
    _current.disciplina = e.target.value;
    renderDisciplineTab(body);
  };

  // Wire campos pra salvar em _current.discipline_data em real-time
  fields.forEach(f => {
    const el = d.getElementById('dd-'+f.k);
    if(el) el.onchange = ()=>{
      _current.discipline_data[f.k] = (f.t==='number' && el.value!=='') ? Number(el.value) : el.value;
    };
  });
}

// ============================================================
// EXPORT EXCEL profissional
// ============================================================
function exportExcel(){
  if(!w.PIAExcel){ alert('Módulo Excel ainda carregando.'); return; }
  const r = _current;
  const disc = r.disciplina || 'industrial';
  const meta = DISCIPLINES.find(x=>x.v===disc) || DISCIPLINES[0];
  const dd = r.discipline_data || {};
  const fields = DISCIPLINE_FIELDS[disc] || [];

  // Linhas de cabeçalho (dados gerais)
  const generalRows = [
    { Campo: 'Nº RDO',               Valor: r.report_number || '—' },
    { Campo: 'Data',                 Valor: r.report_date || '—' },
    { Campo: 'Disciplina',           Valor: meta.l },
    { Campo: 'Clima',                Valor: r.weather || '—' },
    { Campo: 'Temperatura (°C)',     Valor: r.ambient_temp_c || '—' },
    { Campo: 'Status manhã',         Valor: r.morning_status || '—' },
    { Campo: 'Status tarde',         Valor: r.afternoon_status || '—' },
    { Campo: 'Status noite',         Valor: r.night_status || '—' },
    { Campo: 'Responsável técnico',  Valor: r.responsible_engineer || '—' },
    { Campo: 'CREA',                 Valor: r.responsible_crea || '—' },
    { Campo: 'Status RDO',           Valor: r.status || '—' },
    { Campo: 'Observações',          Valor: r.notes || '' }
  ];
  // Campos específicos da disciplina
  fields.forEach(f => {
    const v = dd[f.k];
    if(v != null && v !== ''){
      generalRows.push({ Campo: f.l + (f.u?' ('+f.u+')':''), Valor: v });
    }
  });

  w.PIAExcel.exportData(generalRows, {
    filename: 'RDO_'+(r.report_number||'novo')+'_'+disc,
    title: 'Diário de Obra (RDO) — '+meta.l,
    subtitle: 'RDO Nº ' + (r.report_number || '—') + ' • ' + (r.report_date || ''),
    project: getProjectName(),
    columns: ['Campo','Valor'],
    sheetName: 'RDO Geral'
  });
}

function renderWorkforceTab(body){
  // PERF: usa cache pré-carregado em openEditor
  if(!_current._workforce) _current._workforce = [];
  renderWorkforce(body);
}

function renderWorkforce(body){
  const wf = _current._workforce || [];
  const total = wf.reduce((s,r)=>s+Number(r.hh_worked||0),0);
  const own = wf.filter(r=>r.workforce_type==='propria').reduce((s,r)=>s+Number(r.hh_worked||0),0);
  const third = total - own;
  body.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:1;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#1E40AF;font-weight:700;text-transform:uppercase">HHT Total</div><div style="font-size:22px;font-weight:800;color:#1E40AF">${total.toFixed(1)} h</div></div>
      <div style="flex:1;background:#ECFDF5;border:1px solid #6EE7B7;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#065F46;font-weight:700;text-transform:uppercase">Própria</div><div style="font-size:22px;font-weight:800;color:#065F46">${own.toFixed(1)} h</div></div>
      <div style="flex:1;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#92400E;font-weight:700;text-transform:uppercase">Terceirizada</div><div style="font-size:22px;font-weight:800;color:#92400E">${third.toFixed(1)} h</div></div>
    </div>
    <button onclick="PIARDO.addWorkforce()" class="btn bp" style="margin-bottom:12px">+ Adicionar mão de obra</button>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#F8FAFC;color:#475569"><th style="text-align:left;padding:8px 11px;font-weight:700;font-size:10.5px;text-transform:uppercase">Tipo</th><th style="text-align:left;padding:8px 11px">Disciplina</th><th style="text-align:left;padding:8px 11px">Função</th><th style="text-align:right;padding:8px 11px">Pessoas</th><th style="text-align:right;padding:8px 11px">HH</th><th></th></tr></thead><tbody id="rdo-wf-body">
    ${wf.map((r,i)=>`<tr style="border-bottom:1px solid #F1F5F9">
      <td style="padding:7px 11px"><span style="background:${r.workforce_type==='propria'?'#D1FAE5':'#FEF3C7'};color:${r.workforce_type==='propria'?'#065F46':'#92400E'};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600">${r.workforce_type==='propria'?'Própria':'Terceira'}</span></td>
      <td style="padding:7px 11px">${esc(r.discipline||'—')}</td>
      <td style="padding:7px 11px">${esc(r.role||'—')}</td>
      <td style="padding:7px 11px;text-align:right">${r.people_count||1}</td>
      <td style="padding:7px 11px;text-align:right;font-family:monospace;font-weight:700">${Number(r.hh_worked||0).toFixed(1)}</td>
      <td style="padding:7px 11px;text-align:center"><button onclick="PIARDO.delWorkforce(${i})" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;font-size:14px">🗑</button></td>
    </tr>`).join('')}
    </tbody></table>
  `;
}

function addWorkforce(){
  const wt = prompt('Tipo (propria/terceira):','propria');
  if(!wt) return;
  const disc = prompt('Disciplina (ex: Tubulação, Civil):','');
  const role = prompt('Função (ex: Soldador, Eletricista):','');
  const people = parseInt(prompt('Quantidade de pessoas:','1') || '1');
  const hh = parseFloat(prompt('HH trabalhada (total dessa linha):','8') || '0');
  _current._workforce = _current._workforce || [];
  _current._workforce.push({workforce_type:wt, discipline:disc, role:role, people_count:people, hh_worked:hh});
  renderWorkforce(d.getElementById('rdo-body'));
}
function delWorkforce(i){
  _current._workforce.splice(i,1);
  renderWorkforce(d.getElementById('rdo-body'));
}

function renderActivitiesTab(body){
  if(!_current._activities) _current._activities = [];
  renderActivities(body);
}

function renderActivities(body){
  const acts = _current._activities || [];
  body.innerHTML = `
    <button onclick="PIARDO.addActivity()" class="btn bp" style="margin-bottom:12px">+ Adicionar atividade</button>
    <div>${acts.length===0 ? '<div style="padding:30px;text-align:center;color:#94A3B8">Nenhuma atividade registrada</div>' : acts.map((a,i)=>`
      <div style="background:#fff;border:1px solid #E2E8F0;border-left:3px solid #0EA5E9;border-radius:9px;padding:11px 14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <div style="font-size:11px;font-weight:700;color:#0EA5E9;text-transform:uppercase">${esc(a.discipline||'Geral')}</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${a.progress_pct ? `<span style="background:#ECFDF5;color:#065F46;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700">${a.progress_pct}%</span>` : ''}
            <button onclick="PIARDO.delActivity(${i})" style="background:transparent;border:none;cursor:pointer;color:#94A3B8">🗑</button>
          </div>
        </div>
        <div style="font-size:13px;color:#0F172A">${esc(a.description)}</div>
        ${a.location ? `<div style="font-size:11.5px;color:#64748B;margin-top:3px">📍 ${esc(a.location)}</div>` : ''}
      </div>
    `).join('')}</div>
  `;
}
function addActivity(){
  const disc = prompt('Disciplina:','Tubulação');
  const desc = prompt('Descrição da atividade:','');
  if(!desc) return;
  const loc = prompt('Local:','');
  const pct = parseFloat(prompt('% de avanço:','') || 'NaN');
  _current._activities = _current._activities || [];
  _current._activities.push({discipline:disc, description:desc, location:loc, progress_pct:isNaN(pct)?null:pct});
  renderActivities(d.getElementById('rdo-body'));
}
function delActivity(i){ _current._activities.splice(i,1); renderActivities(d.getElementById('rdo-body')); }

function renderEventsTab(body){
  if(!_current._events) _current._events = [];
  renderEvents(body);
}

function renderEvents(body){
  const evs = _current._events || [];
  body.innerHTML = `
    <button onclick="PIARDO.addEvent()" style="background:#DC2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;margin-bottom:12px">+ Registrar evento</button>
    <div>${evs.length===0 ? '<div style="padding:30px;text-align:center;color:#94A3B8">Nenhum evento registrado</div>' : evs.map((e,i)=>{
      const t = EVENT_TYPES.find(x=>x.v===e.event_type) || {l:e.event_type,c:'#64748B',ic:'•'};
      return `<div style="background:#fff;border:1px solid #E2E8F0;border-left:3px solid ${t.c};border-radius:9px;padding:11px 14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <div style="font-size:11.5px;font-weight:700;color:${t.c}">${t.ic} ${esc(t.l)} ${e.severity?`· ${esc(e.severity).toUpperCase()}`:''}</div>
          <button onclick="PIARDO.delEvent(${i})" style="background:transparent;border:none;cursor:pointer;color:#94A3B8">🗑</button>
        </div>
        <div style="font-size:13px;color:#0F172A">${esc(e.description)}</div>
        ${e.duration_hours ? `<div style="font-size:11.5px;color:#64748B;margin-top:3px">⏱ ${e.duration_hours}h</div>` : ''}
      </div>`;
    }).join('')}</div>
  `;
}
function addEvent(){
  const typeOpts = EVENT_TYPES.map((t,i)=>`${i+1}=${t.l}`).join(', ');
  const tIdx = parseInt(prompt('Tipo do evento:\n'+typeOpts, '1') || '1') - 1;
  const t = EVENT_TYPES[tIdx];
  if(!t) return;
  const desc = prompt('Descrição:','');
  if(!desc) return;
  const sev = prompt('Severidade (baixa/media/alta/critica):','media');
  const dur = parseFloat(prompt('Duração (horas, se aplicável):','') || 'NaN');
  _current._events = _current._events || [];
  _current._events.push({event_type:t.v, description:desc, severity:sev, duration_hours:isNaN(dur)?null:dur});
  renderEvents(d.getElementById('rdo-body'));
}
function delEvent(i){ _current._events.splice(i,1); renderEvents(d.getElementById('rdo-body')); }

function renderPhotosTab(body){
  if(!_current._photos) _current._photos = [];
  const photos = _current._photos;
  body.innerHTML = `
    <input type="file" id="rdo-photo-in" accept="image/*" multiple style="display:none">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <button onclick="document.getElementById('rdo-photo-in').click()" style="background:#8B5CF6;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">📸 Adicionar fotos</button>
      <div style="font-size:11.5px;color:#64748B;padding:8px 12px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px">💡 Click em <strong>🤖 Analisar IA</strong> em cada foto pra IA identificar atividades, EPIs, equipamentos e sugerir preenchimento</div>
    </div>
    <div id="rdo-photos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
    ${photos.length===0?'<div style="grid-column:1/-1;padding:30px;text-align:center;color:#94A3B8">Nenhuma foto adicionada</div>':''}
    ${photos.map((p,i)=>`<div style="position:relative;border-radius:9px;overflow:hidden;border:1px solid #E2E8F0;background:#fff">
      <img src="${esc(p.photo_url)}" style="width:100%;height:160px;object-fit:cover;display:block">
      <div style="padding:8px 10px">
        ${p.caption?`<div style="font-size:11.5px;color:#475569;margin-bottom:6px;line-height:1.4">${esc(p.caption)}</div>`:''}
        <button onclick="PIARDO.analyzePhoto(${i})" style="width:100%;background:linear-gradient(135deg,#7C3AED 0%,#06B6D4 100%);color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px">🤖 Analisar com IA</button>
      </div>
      <button onclick="PIARDO.delPhoto(${i})" style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,.6);color:#fff;border:none;width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:14px">×</button>
    </div>`).join('')}
    </div>
  `;
  d.getElementById('rdo-photo-in').onchange = handlePhotoUpload;
}

// ============================================================
// IA por foto — Gemini Vision via edge function analyze-rdo-photo
// ============================================================
async function analyzePhoto(idx){
  const photo = _current._photos[idx];
  if(!photo || !photo.photo_url){ alert('Foto inválida.'); return; }
  // Modal de progresso
  let ov = d.getElementById('rdo-ai-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'rdo-ai-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.75);z-index:9700;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = `<div style="background:#fff;border-radius:14px;width:100%;max-width:680px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.3);overflow:hidden">
    <div style="padding:14px 22px;background:linear-gradient(135deg,#7C3AED 0%,#06B6D4 100%);color:#fff;display:flex;align-items:center;gap:12px">
      <div style="width:42px;height:42px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:22px">🤖</div>
      <div style="flex:1"><div style="font-weight:800;font-size:16px">IA analisando a foto</div><div style="font-size:11.5px;opacity:.9">Gemini Vision • Foto ${idx+1}</div></div>
      <button id="rdo-ai-close" style="background:rgba(255,255,255,.18);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
    </div>
    <div id="rdo-ai-body" style="flex:1;overflow:auto;padding:18px 22px">
      <div style="text-align:center;padding:40px"><div style="font-size:38px;margin-bottom:10px">⏳</div><div style="font-weight:700;color:#475569">Analisando foto com Gemini Vision...</div><div style="font-size:12px;color:#94A3B8;margin-top:4px">Identificando atividades, EPIs, equipamentos e segurança</div></div>
    </div>
  </div>`;
  d.body.appendChild(ov);
  d.getElementById('rdo-ai-close').onclick = ()=> ov.remove();

  // Chama a edge function
  try {
    const sb = w.sb;
    if(!sb){ throw new Error('Supabase não inicializado'); }
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ throw new Error('Sessão expirada — faça login novamente'); }
    const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
    const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';
    const resp = await fetch(SB_URL + '/functions/v1/analyze-rdo-photo', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({
        image_base64: photo.photo_url,
        mime_type: 'image/jpeg',
        disciplina: _current.disciplina || 'industrial',
        project_name: getProjectName()
      })
    });
    const data = await resp.json();
    if(!resp.ok || data.error){
      d.getElementById('rdo-ai-body').innerHTML = `<div style="padding:20px;background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;color:#991B1B">⚠️ ${esc(data.error || 'Erro HTTP '+resp.status)}</div>`;
      return;
    }
    showAnalysisResult(ov, idx, data.analysis);
  } catch(e){
    d.getElementById('rdo-ai-body').innerHTML = `<div style="padding:20px;background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;color:#991B1B">⚠️ ${esc(e.message || e)}</div>`;
  }
}

function showAnalysisResult(ov, photoIdx, a){
  const body = d.getElementById('rdo-ai-body');
  const epi = a.epi_observed || {};
  const epiList = Object.keys(epi).filter(k => epi[k] !== null).map(k => {
    const ok = epi[k] === true;
    const icon = ok ? '✅' : '❌';
    const color = ok ? '#10B981' : '#DC2626';
    return `<span style="display:inline-block;padding:4px 9px;border-radius:99px;background:${color}15;color:${color};font-size:11px;font-weight:700;margin:3px">${icon} ${k.replace(/_/g,' ')}</span>`;
  }).join('');
  const score = Number(a.safety_score)||0;
  const scoreColor = score >= 8 ? '#10B981' : score >= 5 ? '#F59E0B' : '#DC2626';
  const concerns = (a.safety_concerns||[]).map(c => `<li style="margin:3px 0;color:#991B1B">${esc(c)}</li>`).join('');
  const equip = (a.equipment_visible||[]).map(e => `<span style="display:inline-block;padding:3px 9px;border-radius:99px;background:#F1F5F9;color:#475569;font-size:11px;font-weight:600;margin:2px">${esc(e)}</span>`).join('');
  const recs = (a.recommendations||[]).map(r => `<li style="margin:3px 0;color:#075985">${esc(r)}</li>`).join('');
  const indicators = a.discipline_indicators || {};
  const indicHtml = Object.keys(indicators).map(k => `<tr><td style="padding:4px 9px;font-size:11.5px;color:#64748B;border-bottom:1px solid #F1F5F9">${esc(k.replace(/_/g,' '))}</td><td style="padding:4px 9px;font-size:12.5px;font-weight:600;color:#0F172A;border-bottom:1px solid #F1F5F9">${esc(String(indicators[k]))}</td></tr>`).join('');

  body.innerHTML = `
    <div style="background:linear-gradient(135deg,${scoreColor}15,${scoreColor}05);border:1px solid ${scoreColor}40;border-radius:10px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:14px">
      <div style="width:60px;height:60px;border-radius:50%;background:${scoreColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800">${score}/10</div>
      <div style="flex:1">
        <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">Score de Segurança</div>
        <div style="font-size:14px;color:#0F172A;margin-top:2px">${score>=8?'✓ Boas práticas observadas':score>=5?'⚠️ Atenção a alguns pontos':'⚠️ Riscos identificados — revisar'}</div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:5px">Atividade detectada</div>
      <div style="font-size:14px;font-weight:600;color:#0F172A">${esc(a.activity_detected || '—')}</div>
      ${a.workforce_count!=null?`<div style="font-size:11.5px;color:#475569;margin-top:6px">👷 ${a.workforce_count} pessoa(s) visível(eis)</div>`:''}
    </div>

    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:8px">EPIs Observados</div>
      <div>${epiList || '<span style="color:#94A3B8;font-size:12px">Nada identificado</span>'}</div>
    </div>

    ${equip ? `<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:8px">Equipamentos/Materiais visíveis</div>
      <div>${equip}</div>
    </div>` : ''}

    ${indicHtml ? `<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:8px">Indicadores da disciplina</div>
      <table style="width:100%;border-collapse:collapse">${indicHtml}</table>
    </div>` : ''}

    ${concerns ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;margin-bottom:6px">⚠️ Preocupações de segurança</div>
      <ul style="margin:0;padding-left:20px">${concerns}</ul>
    </div>` : ''}

    ${recs ? `<div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#075985;text-transform:uppercase;margin-bottom:6px">💡 Recomendações</div>
      <ul style="margin:0;padding-left:20px">${recs}</ul>
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-top:18px">
      <button id="rdo-ai-apply" style="flex:1;background:#10B981;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">✓ Aplicar sugestões ao RDO</button>
      <button id="rdo-ai-cancel" style="background:#F1F5F9;color:#475569;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Fechar</button>
    </div>
  `;

  d.getElementById('rdo-ai-cancel').onclick = ()=> ov.remove();
  d.getElementById('rdo-ai-apply').onclick = ()=>{
    // Aplicar legenda na foto
    if(a.caption){ _current._photos[photoIdx].caption = a.caption; }
    // Mesclar indicators no discipline_data
    if(a.discipline_indicators){
      _current.discipline_data = Object.assign({}, _current.discipline_data, a.discipline_indicators);
    }
    // Se identificou atividade, adicionar nas observações se vazio
    if(a.activity_detected && !_current.notes){
      _current.notes = '🤖 IA: ' + a.activity_detected + (a.recommendations && a.recommendations[0] ? ' • Rec: ' + a.recommendations[0] : '');
    }
    // Workforce count: adicionar entrada se não houver
    if(a.workforce_count && (!_current._workforce || _current._workforce.length===0)){
      _current._workforce = _current._workforce || [];
      _current._workforce.push({ trabalhadores: a.workforce_count, categoria: 'Identificado pela IA', hht: 0 });
    }
    ov.remove();
    (window.PIAToast ? PIAToast('Sugestões aplicadas ao RDO. Revise antes de salvar.','success') : alert('Sugestões aplicadas.'));
    // Re-render a aba atual
    const body = d.getElementById('rdo-body');
    if(_activeTab==='photos') renderPhotosTab(body);
    else if(_activeTab==='disciplina') renderDisciplineTab(body);
    else if(_activeTab==='geral') body.innerHTML = renderGeral();
  };
}

async function handlePhotoUpload(e){
  const files = Array.from(e.target.files);
  for(const f of files){
    const reader = new FileReader();
    await new Promise((res)=>{
      reader.onload = ()=>{
        _current._photos = _current._photos || [];
        _current._photos.push({photo_url: reader.result, caption: f.name, taken_at: new Date().toISOString()});
        res();
      };
      reader.readAsDataURL(f);
    });
  }
  renderPhotosTab(d.getElementById('rdo-body'));
}
function delPhoto(i){ _current._photos.splice(i,1); renderPhotosTab(d.getElementById('rdo-body')); }

async function saveReport(){
  const r = _current;
  // Coleta valores da aba geral se está sendo editada agora
  if(d.getElementById('rg-date')){
    r.report_number = parseInt(d.getElementById('rg-num').value) || null;
    r.report_date = d.getElementById('rg-date').value;
    r.weather = d.getElementById('rg-weather').value;
    r.ambient_temp_c = parseFloat(d.getElementById('rg-temp').value) || null;
    r.status = d.getElementById('rg-status').value;
    r.morning_status = d.getElementById('rg-morn').value || null;
    r.afternoon_status = d.getElementById('rg-aft').value || null;
    r.night_status = d.getElementById('rg-night').value || null;
    r.responsible_engineer = d.getElementById('rg-resp').value.trim() || null;
    r.responsible_crea = d.getElementById('rg-crea').value.trim() || null;
    r.notes = d.getElementById('rg-notes').value.trim() || null;
  }

  const payload = {
    org_id: getOrgId(), project_id: getProjectId(),
    report_number: r.report_number, report_date: r.report_date,
      disciplina: _current.disciplina || 'industrial',
      discipline_data: _current.discipline_data || {},
    weather: r.weather, ambient_temp_c: r.ambient_temp_c,
    morning_status: r.morning_status, afternoon_status: r.afternoon_status, night_status: r.night_status,
    responsible_engineer: r.responsible_engineer, responsible_crea: r.responsible_crea,
    notes: r.notes, status: r.status,
    updated_at: new Date().toISOString()
  };

  try {
    let rep;
    if(r.id){
      const {data, error} = await w.sb.from('daily_reports').update(payload).eq('id', r.id).select().single();
      if(error) throw error; rep = data;
    } else {
      const {data, error} = await w.sb.from('daily_reports').insert(payload).select().single();
      if(error) throw error; rep = data;
      r.id = rep.id;
    }

    // Sub-tabelas: deleta tudo e insere de novo (idempotente)
    if(r._workforce !== undefined){
      await w.sb.from('daily_report_workforce').delete().eq('daily_report_id', r.id);
      if(r._workforce.length){
        await w.sb.from('daily_report_workforce').insert(r._workforce.map(x => ({...x, daily_report_id: r.id})));
      }
    }
    if(r._activities !== undefined){
      await w.sb.from('daily_report_activities').delete().eq('daily_report_id', r.id);
      if(r._activities.length){
        await w.sb.from('daily_report_activities').insert(r._activities.map(x => ({...x, daily_report_id: r.id})));
      }
    }
    if(r._events !== undefined){
      await w.sb.from('daily_report_events').delete().eq('daily_report_id', r.id);
      if(r._events.length){
        await w.sb.from('daily_report_events').insert(r._events.map(x => ({...x, daily_report_id: r.id})));
      }
    }
    if(r._photos !== undefined){
      await w.sb.from('daily_report_photos').delete().eq('daily_report_id', r.id);
      if(r._photos.length){
        await w.sb.from('daily_report_photos').insert(r._photos.map(x => ({...x, daily_report_id: r.id})));
      }
    }

    (window.PIAToast ? PIAToast('RDO salvo','success') : alert('RDO salvo'));
    d.getElementById('pia-rdo-edit-ov').remove();
    loadList();
  } catch(e){ alert('Erro ao salvar: '+(e.message||e)); }
}

function exportPDF(){
  if(!w.jspdf){ alert('jsPDF não carregado'); return; }
  const {jsPDF} = w.jspdf;
  const r = _current;
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const pw = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(15,23,42); pdf.rect(0,0,pw,28,'F');
  pdf.setTextColor(255,255,255); pdf.setFontSize(15); pdf.setFont('helvetica','bold');
  pdf.text('RELATÓRIO DIÁRIO DE OBRA (RDO)', 14, 14);
  pdf.setFontSize(10); pdf.setFont('helvetica','normal');
  pdf.text('Nº ' + (r.report_number||'—') + ' · ' + fmtBR(r.report_date), 14, 21);
  pdf.text(getProjectName(), pw-14, 21, {align:'right'});

  let y = 38;
  pdf.setTextColor(15,23,42); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
  pdf.text('Informações gerais', 14, y); y+=6;
  pdf.setFontSize(9); pdf.setFont('helvetica','normal');
  const info = [
    ['Clima', r.weather||'—'],
    ['Temperatura', r.ambient_temp_c?r.ambient_temp_c+'°C':'—'],
    ['Manhã', r.morning_status||'—'],
    ['Tarde', r.afternoon_status||'—'],
    ['Noite', r.night_status||'—'],
    ['Responsável', r.responsible_engineer||'—'],
    ['CREA', r.responsible_crea||'—']
  ];
  info.forEach(([k,v]) => { pdf.setFont('helvetica','bold'); pdf.text(k+':', 14, y); pdf.setFont('helvetica','normal'); pdf.text(String(v), 60, y); y+=5; });
  y += 4;

  const wf = r._workforce||[];
  if(wf.length){
    pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Mão de obra (HHT)', 14, y); y+=6;
    pdf.setFontSize(8); pdf.text('TIPO', 14, y); pdf.text('DISC.', 40, y); pdf.text('FUNÇÃO', 70, y); pdf.text('PESS.', 130, y); pdf.text('HH', 160, y); y+=4;
    pdf.line(14,y-1,pw-14,y-1); pdf.setFont('helvetica','normal');
    let totalHH = 0;
    wf.forEach(w => {
      if(y>275){pdf.addPage();y=20;}
      pdf.text(w.workforce_type, 14, y);
      pdf.text((w.discipline||'-').slice(0,12), 40, y);
      pdf.text((w.role||'-').slice(0,20), 70, y);
      pdf.text(String(w.people_count||1), 130, y);
      pdf.text(Number(w.hh_worked||0).toFixed(1), 160, y);
      y+=4.5; totalHH += Number(w.hh_worked||0);
    });
    pdf.setFont('helvetica','bold'); pdf.text('TOTAL: '+totalHH.toFixed(1)+' h', 14, y+2); y+=10;
  }

  const acts = r._activities||[];
  if(acts.length){
    if(y>250){pdf.addPage();y=20;}
    pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Atividades realizadas', 14, y); y+=6;
    pdf.setFontSize(9);
    acts.forEach(a => {
      if(y>275){pdf.addPage();y=20;}
      pdf.setFont('helvetica','bold'); pdf.text('• '+(a.discipline||'Geral')+(a.progress_pct?' ('+a.progress_pct+'%)':''), 14, y); y+=4;
      pdf.setFont('helvetica','normal');
      const lines = pdf.splitTextToSize(a.description, pw-30);
      lines.forEach(ln => { if(y>275){pdf.addPage();y=20;} pdf.text(ln, 18, y); y+=4; });
      y+=2;
    });
  }

  const evs = r._events||[];
  if(evs.length){
    if(y>250){pdf.addPage();y=20;}
    pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Eventos', 14, y); y+=6;
    pdf.setFontSize(9);
    evs.forEach(e => {
      if(y>275){pdf.addPage();y=20;}
      const t = EVENT_TYPES.find(x=>x.v===e.event_type) || {l:e.event_type};
      pdf.setFont('helvetica','bold'); pdf.text('• '+t.l+(e.severity?' ('+e.severity+')':''), 14, y); y+=4;
      pdf.setFont('helvetica','normal');
      const lines = pdf.splitTextToSize(e.description, pw-30);
      lines.forEach(ln => { if(y>275){pdf.addPage();y=20;} pdf.text(ln, 18, y); y+=4; });
      y+=2;
    });
  }

  if(r.notes){
    if(y>245){pdf.addPage();y=20;}
    pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Observações', 14, y); y+=6;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(r.notes, pw-28);
    lines.forEach(ln => { if(y>275){pdf.addPage();y=20;} pdf.text(ln, 14, y); y+=4; });
  }

  pdf.save('RDO_'+(r.report_number||'novo')+'_'+(r.report_date||'')+'.pdf');
}

/* ============================================================
   RDO via FOTO MANUSCRITA — encarregado preenche em papel,
   engenheiro envia a foto e a IA cadastra automaticamente
   ============================================================ */
async function openHandwrittenRDO(){
  const pid = getProjectId();
  if(!pid){ openProjectPicker(); return; }
  let ov = d.getElementById('pia-rdo-handw');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-rdo-handw';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.6);backdrop-filter:blur(4px);z-index:9645;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:880px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:22px">📷</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800">RDO por Foto Manuscrita</div>
          <div style="font-size:11.5px;opacity:.85">Envie a foto do RDO preenchido à mão · a IA extrai e cadastra</div>
        </div>
        <button id="pia-rdo-handw-close" style="background:rgba(255,255,255,.18);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>
      <div id="pia-rdo-handw-body" style="flex:1;overflow:auto;padding:18px 22px">
        <div style="background:#F5F3FF;border:1px dashed #C4B5FD;border-radius:10px;padding:32px;text-align:center;margin-bottom:14px">
          <div style="font-size:42px">📷</div>
          <div style="font-weight:700;color:#5B21B6;margin-top:6px;font-size:14px">Envie até 6 fotos do RDO em papel</div>
          <div style="font-size:11.5px;color:#7C3AED;margin-top:4px">Boas fotos: bem iluminadas, sem reflexo, página inteira no quadro</div>
          <input type="file" id="pia-rdo-handw-file" accept="image/*" multiple style="display:none">
          <button id="pia-rdo-handw-pick" style="margin-top:14px;background:#7C3AED;color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Selecionar fotos</button>
        </div>
        <div id="pia-rdo-handw-preview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:14px"></div>
        <div id="pia-rdo-handw-result"></div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;display:flex;gap:10px;background:#F8FAFC">
        <button id="pia-rdo-handw-cancel" style="background:#fff;color:#475569;border:1px solid #E2E8F0;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px">Cancelar</button>
        <div style="flex:1"></div>
        <button id="pia-rdo-handw-analyze" disabled style="background:#A78BFA;color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:not-allowed;font-weight:700;font-size:12.5px;opacity:.6">🤖 Analisar fotos</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('pia-rdo-handw-close').onclick = ()=> ov.remove();
  d.getElementById('pia-rdo-handw-cancel').onclick = ()=> ov.remove();
  const fileInput = d.getElementById('pia-rdo-handw-file');
  d.getElementById('pia-rdo-handw-pick').onclick = ()=> fileInput.click();

  let imgs = []; // {b64, mime, dataUrl, name}
  fileInput.onchange = async ()=>{
    const files = Array.from(fileInput.files || []);
    if(files.length === 0) return;
    for(const f of files){
      if(imgs.length >= 6){ alert('Máximo 6 fotos por análise'); break; }
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = ()=> res(r.result);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl);
        if(!m) continue;
        imgs.push({ mime: m[1], b64: m[2], dataUrl, name: f.name });
      } catch(e){ console.warn('upload', e); }
    }
    renderHandwPreview(imgs);
    const btn = d.getElementById('pia-rdo-handw-analyze');
    btn.disabled = imgs.length === 0;
    btn.style.opacity = imgs.length === 0 ? '.6' : '1';
    btn.style.background = imgs.length === 0 ? '#A78BFA' : '#7C3AED';
    btn.style.cursor = imgs.length === 0 ? 'not-allowed' : 'pointer';
  };

  d.getElementById('pia-rdo-handw-analyze').onclick = async ()=>{
    if(imgs.length === 0) return;
    const result = d.getElementById('pia-rdo-handw-result');
    result.innerHTML = '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:24px;text-align:center;color:#475569"><div style="font-size:32px">🤖</div><div style="font-weight:700;margin-top:6px">Analisando fotos com IA...</div><div style="font-size:11.5px;margin-top:4px;color:#94A3B8">Isso leva 10-30 segundos</div></div>';
    const btn = d.getElementById('pia-rdo-handw-analyze');
    btn.disabled = true; btn.style.opacity = '.6'; btn.style.cursor = 'wait';
    try {
      const url = (w.SUPABASE_URL || '') + '/functions/v1/analyze-rdo-handwritten';
      const session = await w.sb.auth.getSession();
      const token = session?.data?.session?.access_token;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||w.SUPABASE_KEY||'') },
        body: JSON.stringify({ images: imgs.map(i => ({mime:i.mime, b64:i.b64})) })
      });
      const data = await resp.json();
      if(!data.ok) throw new Error(data.error || 'Falha na análise');
      renderHandwExtracted(data.extracted, imgs);
    } catch(e){
      console.error('[RDO Handw]', e);
      result.innerHTML = '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:18px;color:#991B1B"><strong>⚠ Erro:</strong> '+esc(e.message||e)+'</div>';
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
    }
  };
}

function renderHandwPreview(imgs){
  const wrap = d.getElementById('pia-rdo-handw-preview');
  if(!wrap) return;
  if(imgs.length === 0){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = imgs.map((im, i) => `
    <div style="position:relative;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;aspect-ratio:1">
      <img src="${im.dataUrl}" style="width:100%;height:100%;object-fit:cover">
      <button data-i="${i}" class="pia-rdo-handw-rm" style="position:absolute;top:4px;right:4px;background:rgba(15,23,42,.85);color:#fff;border:none;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px">×</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.pia-rdo-handw-rm').forEach(b => b.onclick = ()=>{
    const i = +b.dataset.i;
    imgs.splice(i, 1);
    renderHandwPreview(imgs);
    const btn = d.getElementById('pia-rdo-handw-analyze');
    if(btn){ btn.disabled = imgs.length===0; btn.style.opacity = imgs.length===0?'.6':'1'; btn.style.cursor = imgs.length===0?'not-allowed':'pointer'; btn.style.background = imgs.length===0?'#A78BFA':'#7C3AED'; }
  });
}

function renderHandwExtracted(ex, imgs){
  const result = d.getElementById('pia-rdo-handw-result');
  const e = ex || {};
  const conf = (e.confidence!=null) ? Math.round(e.confidence*100) : null;
  const confCor = conf==null ? '#94A3B8' : (conf>=70 ? '#10B981' : conf>=50 ? '#F59E0B' : '#DC2626');

  result.innerHTML = `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:22px">✅</div>
        <div style="flex:1">
          <div style="font-weight:800;color:#166534">Extração concluída</div>
          <div style="font-size:11.5px;color:#15803D">Revise os dados abaixo e confirme. ${conf!=null?'Confiança da IA: <strong style="color:'+confCor+'">'+conf+'%</strong>':''}</div>
        </div>
      </div>
      ${e.notas_extrator ? `<div style="margin-top:10px;font-size:11.5px;color:#475569;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #E2E8F0"><strong>📝 Notas da IA:</strong> ${esc(e.notas_extrator)}</div>` : ''}
    </div>

    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:10px">
        <div><label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase">Data</label><input id="hw-date" type="date" value="${esc(e.data_relatorio||fmtToday())}" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px;margin-top:3px"></div>
        <div><label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase">Turno</label><select id="hw-turn" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px;margin-top:3px">${['integral','manha','tarde','noite'].map(t=>`<option value="${t}" ${e.turno===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase">Clima</label><input id="hw-weather" type="text" value="${esc(e.clima||'')}" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px;margin-top:3px"></div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase">Equipe / Encarregado</label>
        <input id="hw-team" type="text" value="${esc(e.equipe||'')}" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:12.5px;margin-top:3px">
      </div>

      <div style="margin-bottom:10px">
        <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-bottom:4px">👷 Efetivo</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
          ${['soldadores','ajudantes','encarregados','tecnicos','outros'].map(k=>{
            const v = (e.efetivo && e.efetivo[k]) || 0;
            return `<div><label style="font-size:9.5px;color:#94A3B8;text-transform:capitalize">${k}</label><input id="hw-ef-${k}" type="number" min="0" value="${v}" style="width:100%;padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:12px"></div>`;
          }).join('')}
        </div>
      </div>

      <div style="margin-bottom:10px">
        <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-bottom:4px">⚒️ Atividades (${(e.atividades||[]).length})</div>
        <div id="hw-acts" style="display:flex;flex-direction:column;gap:6px">
          ${(e.atividades||[]).map((a,i)=>`
            <div style="display:grid;grid-template-columns:2fr 1fr 80px 80px 60px;gap:6px;background:#F8FAFC;padding:6px;border-radius:6px">
              <input data-i="${i}" data-k="descricao" value="${esc(a.descricao||'')}" placeholder="Atividade" style="padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px">
              <input data-i="${i}" data-k="disciplina" value="${esc(a.disciplina||'industrial')}" placeholder="Disc." style="padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px">
              <input data-i="${i}" data-k="hh" type="number" value="${a.hh||0}" placeholder="HH" style="padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px">
              <input data-i="${i}" data-k="qty" type="number" value="${a.qty||''}" placeholder="Qtd" style="padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px">
              <input data-i="${i}" data-k="unidade" value="${esc(a.unidade||'')}" placeholder="Un" style="padding:5px 7px;border:1px solid #E2E8F0;border-radius:5px;font-size:11.5px">
            </div>`).join('') || '<div style="font-size:11px;color:#94A3B8;padding:8px;text-align:center">Nenhuma atividade extraída</div>'}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-bottom:4px">⚠️ Ocorrências</div>
          <textarea id="hw-occur" rows="3" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:11.5px;resize:vertical">${esc((e.ocorrencias||[]).join('\n'))}</textarea>
        </div>
        <div>
          <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-bottom:4px">📌 Pendências</div>
          <textarea id="hw-pend" rows="3" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:11.5px;resize:vertical">${esc((e.pendencias||[]).join('\n'))}</textarea>
        </div>
      </div>

      <div>
        <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-bottom:4px">📝 Observações gerais</div>
        <textarea id="hw-obs" rows="2" style="width:100%;padding:6px 8px;border:1px solid #E2E8F0;border-radius:6px;font-size:11.5px;resize:vertical">${esc(e.observacoes_gerais||'')}</textarea>
      </div>
    </div>

    <button id="hw-save" style="width:100%;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:800;font-size:13.5px">💾 Confirmar e cadastrar RDO</button>
  `;

  // Coletar mutações no array de atividades
  result.querySelectorAll('#hw-acts input').forEach(inp => {
    inp.oninput = ()=>{
      const i = +inp.dataset.i, k = inp.dataset.k;
      if(!ex.atividades || !ex.atividades[i]) return;
      ex.atividades[i][k] = (k==='hh'||k==='qty') ? (parseFloat(inp.value)||0) : inp.value;
    };
  });

  d.getElementById('hw-save').onclick = async ()=>{
    const sb = w.sb;
    if(!sb){ alert('Supabase não inicializado'); return; }
    const dataRel = d.getElementById('hw-date').value;
    const total = ['soldadores','ajudantes','encarregados','tecnicos','outros'].reduce((s,k)=> s + (parseInt(d.getElementById('hw-ef-'+k).value)||0), 0);
    const efetivo = {
      soldadores: parseInt(d.getElementById('hw-ef-soldadores').value)||0,
      ajudantes:  parseInt(d.getElementById('hw-ef-ajudantes').value)||0,
      encarregados: parseInt(d.getElementById('hw-ef-encarregados').value)||0,
      tecnicos:   parseInt(d.getElementById('hw-ef-tecnicos').value)||0,
      outros:     parseInt(d.getElementById('hw-ef-outros').value)||0,
      total
    };
    const payload = {
      org_id: w._org && w._org.id,
      project_id: getProjectId(),
      report_date: dataRel || new Date().toISOString().slice(0,10),
      report_number: 'RDO-FOTO-' + Date.now().toString(36).toUpperCase().slice(-6),
      shift: d.getElementById('hw-turn').value || 'integral',
      weather: d.getElementById('hw-weather').value || null,
      status: 'draft',
      workforce: efetivo,
      activities: ex.atividades || [],
      events: [
        ...((d.getElementById('hw-occur').value||'').split('\n').filter(x=>x.trim()).map(t=>({type:'ocorrencia', text: t.trim()}))),
        ...((d.getElementById('hw-pend').value||'').split('\n').filter(x=>x.trim()).map(t=>({type:'pendencia', text: t.trim()})))
      ],
      notes: (d.getElementById('hw-obs').value||'') + '\n\n[Cadastrado via foto manuscrita · IA Gemini Vision]',
      meta: {
        source: 'handwritten_photo',
        equipe: d.getElementById('hw-team').value,
        confidence: ex.confidence,
        notas_ia: ex.notas_extrator,
        materiais: ex.materiais_consumidos,
        equipamentos: ex.equipamentos_utilizados,
        epi: ex.epi_observado
      }
    };
    const r = await sb.from('daily_reports').insert(payload).select().single();
    if(r.error){ alert('Erro: ' + r.error.message); console.error(r.error); return; }
    alert('✅ RDO cadastrado com sucesso!\nNº ' + (r.data.report_number||r.data.id));
    d.getElementById('pia-rdo-handw').remove();
    if(typeof loadList === 'function') loadList();
  };
}

function fmtToday(){ return new Date().toISOString().slice(0,10); }

w.PIARDO = { openList, open, openEditor, showTab, addWorkforce, delWorkforce, addActivity, delActivity, addEvent, delEvent, delPhoto, analyzePhoto, openHandwrittenRDO, openProjectPicker };

} catch(e){ console.warn('[rdo] init falhou:', e); }
})(window, document);
