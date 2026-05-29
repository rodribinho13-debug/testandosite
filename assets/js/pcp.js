/* ============================================================
   PCP MVP — Planejamento e Controle da Produção
   Weekly Work Plan + PPC + CNC (Causas de Não-Conclusão)
   ============================================================ */
(function(){
'use strict';
const w = window, d = document;

const DISCIPLINAS = [
  {id:'industrial',  nome:'Industrial',     ico:'🏭'},
  {id:'tubulacao',   nome:'Tubulação',      ico:'🔧'},
  {id:'mecanica',    nome:'Mecânica',       ico:'⚙️'},
  {id:'eletrica',    nome:'Elétrica',       ico:'⚡'},
  {id:'instrumentacao', nome:'Instrumentação', ico:'📡'},
  {id:'civil',       nome:'Civil',          ico:'🏗️'},
  {id:'hidraulica',  nome:'Hidráulica',     ico:'💧'},
  {id:'pintura',     nome:'Pintura',        ico:'🎨'},
  {id:'caldeiraria', nome:'Caldeiraria',    ico:'🔥'},
  {id:'seguranca',   nome:'Segurança',      ico:'🦺'}
];

const CNC = [
  {id:'material',     nome:'Falta de material',          cor:'#DC2626'},
  {id:'projeto',      nome:'Falta de projeto/iso',        cor:'#EA580C'},
  {id:'mao_obra',     nome:'Falta de mão-de-obra',        cor:'#D97706'},
  {id:'seguranca',    nome:'PT/PE pendente',              cor:'#CA8A04'},
  {id:'andaime',      nome:'Andaime pendente',            cor:'#9333EA'},
  {id:'clima',        nome:'Clima',                       cor:'#0EA5E9'},
  {id:'retrabalho',   nome:'Retrabalho',                  cor:'#BE185D'},
  {id:'equipamento',  nome:'Equipamento indisponível',    cor:'#7C3AED'},
  {id:'interferencia',nome:'Interferência entre equipes', cor:'#A21CAF'},
  {id:'planejamento', nome:'Falha de planejamento',       cor:'#374151'},
  {id:'outros',       nome:'Outros',                      cor:'#94A3B8'}
];

const STATUS = {
  backlog:    {label:'Backlog',        cor:'#94A3B8', ico:'📥'},
  planned:    {label:'Planejado',      cor:'#3B82F6', ico:'📅'},
  in_progress:{label:'Em andamento',   cor:'#F59E0B', ico:'⏳'},
  done:       {label:'Concluído',      cor:'#10B981', ico:'✅'},
  partial:    {label:'Parcial',        cor:'#F97316', ico:'◐'},
  not_done:   {label:'Não-concluído',  cor:'#DC2626', ico:'❌'}
};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function getSb(){ if(w.sb) return w.sb; if(w.__pia_sb) return (w.sb = w.__pia_sb); try { if(w.supabase && w.SUPABASE_URL && w.SUPABASE_KEY) return (w.sb = w.__pia_sb = w.supabase.createClient(w.SUPABASE_URL, w.SUPABASE_KEY, { auth: { storageKey:'sb-toapdhfouuedaexgqlsv-auth-token', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } })); } catch(_){} return null; }
function getProjectId(){ if(w._curProject && w._curProject.id) return w._curProject.id; if(w.curProj) return w.curProj; try { return localStorage.getItem('pia.curProj'); } catch(_){ return null; } }
function getOrgId(){ return w._org && w._org.id; }
function getUserId(){ return w._user && w._user.id; }
function getProjectName(){ return (w._curProject && w._curProject.name) || '(sem projeto)'; }
function toast(msg, type){ if(w.toast) return w.toast(msg, type); console.log('[PCP toast]', msg); }

// Calcula a segunda da semana (ISO 8601) — Mon=1
function weekStartOf(date){
  const dt = date instanceof Date ? new Date(date) : new Date(date);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}
function fmtDate(d){ const x = d instanceof Date ? d : new Date(d); return x.toISOString().slice(0,10); }
function fmtBR(d){ if(!d) return ''; const x = new Date(d); return ('0'+x.getDate()).slice(-2)+'/'+('0'+(x.getMonth()+1)).slice(-2)+'/'+x.getFullYear(); }

let _curWeek = weekStartOf(new Date());
let _packages = [];
let _curTab = 'week';

async function openPCP(){
  const pid = getProjectId();
  if(!pid){
    if(w.PIARDO && w.PIARDO.openProjectPicker){ w.PIARDO.openProjectPicker(); return; }
    toast('Selecione um projeto primeiro','err'); return;
  }
  let ov = d.getElementById('pia-pcp-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-pcp-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit;display:flex;flex-direction:column';
  ov.innerHTML = `
    <div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0">
      <button class="btn bg" id="pia-pcp-close" style="display:inline-flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Voltar
      </button>
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">PCP — Planejamento e Controle</div>
        <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Projeto: <strong>${esc(getProjectName())}</strong> · Last Planner System</div>
      </div>
    </div>
    <div style="display:flex;gap:0;border-bottom:1px solid var(--t3,#E5E7EB);background:var(--t0,#fff);flex-shrink:0">
      <button class="pcp-tab" data-tab="week"    style="flex:1;padding:13px;border:none;background:transparent;cursor:pointer;font-weight:600;font-size:13px;color:var(--t6,#64748B);border-bottom:3px solid transparent;font-family:inherit">Plano da Semana</button>
      <button class="pcp-tab" data-tab="backlog" style="flex:1;padding:13px;border:none;background:transparent;cursor:pointer;font-weight:600;font-size:13px;color:var(--t6,#64748B);border-bottom:3px solid transparent;font-family:inherit">Backlog</button>
      <button class="pcp-tab" data-tab="kpi"     style="flex:1;padding:13px;border:none;background:transparent;cursor:pointer;font-weight:600;font-size:13px;color:var(--t6,#64748B);border-bottom:3px solid transparent;font-family:inherit">PPC &amp; CNC</button>
    </div>
    <div id="pia-pcp-body" style="flex:1;overflow:auto;padding:18px 22px;background:var(--t1,#F8FAFC)"></div>
  `;
  if(w.PIAShell && w.PIAShell.inlineWrap && w.PIAShell.inlineWrap(ov,'pcp','tab-pcp')){} else { d.body.appendChild(ov); }
  d.getElementById('pia-pcp-close').onclick = ()=> ov.remove();
  d.querySelectorAll('.pcp-tab').forEach(b => {
    b.onclick = ()=> { _curTab = b.dataset.tab; renderActive(); paintTabs(); };
  });
  paintTabs();
  await loadAll();
  renderActive();
}

function paintTabs(){
  d.querySelectorAll('.pcp-tab').forEach(b => {
    const active = b.dataset.tab === _curTab;
    b.style.color = active ? 'var(--t9,#0F172A)' : 'var(--t6,#64748B)';
    b.style.borderBottomColor = active ? 'var(--accent,#1D4ED8)' : 'transparent';
    b.style.background = 'transparent';
  });
}

async function loadAll(){
  const sb = getSb(); const pid = getProjectId();
  if(!sb || !pid){ _packages = []; return; }
  const r = await sb.from('pcp_packages')
    .select('*')
    .eq('project_id', pid)
    .is('deleted_at', null)
    .order('week_start', {ascending:false})
    .order('created_at', {ascending:false})
    .limit(2000);
  if(r.error){ console.error('[PCP] load', r.error); toast('Erro: '+r.error.message,'err'); _packages = []; return; }
  _packages = r.data || [];
}

function renderActive(){
  const body = d.getElementById('pia-pcp-body'); if(!body) return;
  if(_curTab === 'week')    renderWeek(body);
  else if(_curTab === 'backlog') renderBacklog(body);
  else                       renderKPI(body);
}

/* ============================================================
   ABA 1 — PLANO DA SEMANA
   ============================================================ */
function renderWeek(body){
  const wkStart = _curWeek;
  const wkStr = fmtDate(wkStart);
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
  const semana = _packages.filter(p => p.week_start === wkStr);
  const ppc = calcPPC(semana);
  const hhPrev = semana.reduce((s,p)=>s+(+p.hh_prev||0), 0);
  const hhReal = semana.reduce((s,p)=>s+(+p.hh_real||0), 0);

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <button id="pcp-week-prev" style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px">‹</button>
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 16px;font-weight:700;font-size:13.5px;color:#0F172A">
        Semana de ${fmtBR(wkStart)} a ${fmtBR(wkEnd)}
      </div>
      <button id="pcp-week-next" style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px">›</button>
      <button id="pcp-week-today" style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12.5px;font-weight:600">Hoje</button>
      <div style="flex:1"></div>
      <button id="pcp-pkg-new" class="btn bp" style="display:inline-flex;align-items:center;justify-content:center"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Novo Pacote</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
      <div style="background:#fff;border-radius:10px;padding:14px;border:1px solid #E2E8F0">
        <div style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px">PPC da Semana</div>
        <div style="font-size:28px;font-weight:900;color:${ppc==null?'#94A3B8':(ppc>=75?'#10B981':ppc>=60?'#F59E0B':'#DC2626')};margin-top:4px">${ppc==null?'—':ppc+'%'}</div>
        <div style="font-size:11px;color:#64748B">% pacotes concluídos</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:14px;border:1px solid #E2E8F0">
        <div style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px">Pacotes</div>
        <div style="font-size:28px;font-weight:900;color:#0F172A;margin-top:4px">${semana.length}</div>
        <div style="font-size:11px;color:#64748B">planejados nesta semana</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:14px;border:1px solid #E2E8F0">
        <div style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px">HH Previsto</div>
        <div style="font-size:28px;font-weight:900;color:#0F172A;margin-top:4px">${hhPrev.toFixed(0)}</div>
        <div style="font-size:11px;color:#64748B">horas-homem</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:14px;border:1px solid #E2E8F0">
        <div style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px">HH Realizado</div>
        <div style="font-size:28px;font-weight:900;color:#0F172A;margin-top:4px">${hhReal.toFixed(0)}</div>
        <div style="font-size:11px;color:#64748B">${hhPrev>0?'<span style=\"color:'+(hhReal<=hhPrev?'#10B981':'#DC2626')+'\">'+((hhReal/hhPrev*100).toFixed(0))+'% do previsto</span>':'—'}</div>
      </div>
    </div>

    <div id="pcp-week-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px">
      ${renderDays(wkStart, semana)}
    </div>
  `;

  d.getElementById('pcp-week-prev').onclick = ()=>{ _curWeek.setDate(_curWeek.getDate()-7); renderWeek(body); };
  d.getElementById('pcp-week-next').onclick = ()=>{ _curWeek.setDate(_curWeek.getDate()+7); renderWeek(body); };
  d.getElementById('pcp-week-today').onclick = ()=>{ _curWeek = weekStartOf(new Date()); renderWeek(body); };
  d.getElementById('pcp-pkg-new').onclick = ()=> openPackageEditor(null);
  bindPackageCards();
}

function renderDays(wkStart, pkgs){
  const dias = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const today = fmtDate(new Date());
  let html = '';
  for(let i=0; i<7; i++){
    const dt = new Date(wkStart); dt.setDate(dt.getDate()+i);
    const dtStr = fmtDate(dt);
    const isToday = dtStr === today;
    const isWeekend = i >= 5;
    const dayPkgs = pkgs.filter(p => p.planned_date === dtStr);
    const semDia  = i === 0 ? pkgs.filter(p => !p.planned_date) : [];

    html += `
      <div style="background:${isToday?'#FFFBEB':'#fff'};border:${isToday?'2px solid #F59E0B':'1px solid #E2E8F0'};border-radius:10px;padding:10px;min-height:280px">
        <div style="font-weight:800;font-size:12px;color:${isToday?'#92400E':isWeekend?'#94A3B8':'#0F172A'};text-align:center;padding-bottom:8px;border-bottom:1px solid #F1F5F9">
          ${dias[i]} · ${('0'+dt.getDate()).slice(-2)}/${('0'+(dt.getMonth()+1)).slice(-2)}${isToday?' · HOJE':''}
        </div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
          ${(i===0 ? [...semDia, ...dayPkgs] : dayPkgs).map(renderPkgCard).join('') || '<div style="text-align:center;color:#CBD5E1;font-size:11px;padding:20px 0">vazio</div>'}
        </div>
      </div>`;
  }
  return html;
}

function renderPkgCard(p){
  const st = STATUS[p.status] || STATUS.backlog;
  const disc = DISCIPLINAS.find(x=>x.id===p.disciplina) || DISCIPLINAS[0];
  return `
    <div class="pcp-pkg" data-id="${esc(p.id)}" style="background:#fff;border:1px solid #E2E8F0;border-left:3px solid ${st.cor};border-radius:7px;padding:8px;cursor:pointer">
      <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:#64748B;margin-bottom:3px">
        <span>${disc.ico}</span>
        <span style="font-weight:700;color:${st.cor}">${st.ico} ${st.label}</span>
        ${p.hh_prev?`<span style="margin-left:auto;font-weight:700;color:#475569">${p.hh_prev}h</span>`:''}
      </div>
      <div style="font-size:11.5px;color:#0F172A;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.descricao)}</div>
      ${p.equipe?`<div style="font-size:10px;color:#94A3B8;margin-top:3px">👷 ${esc(p.equipe)}</div>`:''}
    </div>`;
}

function bindPackageCards(){
  d.querySelectorAll('.pcp-pkg').forEach(el => {
    el.onclick = ()=> openPackageEditor(el.dataset.id);
  });
}

/* ============================================================
   ABA 2 — BACKLOG
   ============================================================ */
function renderBacklog(body){
  const backlog = _packages.filter(p => p.status === 'backlog');
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
      <div style="font-size:15px;font-weight:800;color:#0F172A">📥 Backlog — Pacotes não planejados</div>
      <div style="background:#FEF3C7;color:#92400E;padding:4px 10px;border-radius:99px;font-size:11.5px;font-weight:700">${backlog.length} pacotes</div>
      <div style="flex:1"></div>
      <button id="pcp-pkg-new-backlog" class="btn bp">+ Novo Pacote</button>
    </div>
    ${backlog.length === 0
      ? '<div style="background:#fff;border-radius:10px;padding:60px;text-align:center;color:#94A3B8"><div style="font-size:48px">📥</div><div style="font-weight:600;color:#475569;margin-top:8px">Backlog vazio</div><div style="font-size:12.5px;margin-top:6px">Crie pacotes pra começar a planejar</div></div>'
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${backlog.map(p => `
            <div class="pcp-pkg" data-id="${esc(p.id)}" style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px;cursor:pointer">
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#64748B;margin-bottom:6px">
                <span>${(DISCIPLINAS.find(x=>x.id===p.disciplina)||DISCIPLINAS[0]).ico}</span>
                <span style="font-weight:700">${esc((DISCIPLINAS.find(x=>x.id===p.disciplina)||DISCIPLINAS[0]).nome)}</span>
                ${p.frente?`<span>·</span><span>${esc(p.frente)}</span>`:''}
                ${p.hh_prev?`<span style="margin-left:auto;background:#EFF6FF;color:#1E40AF;padding:2px 8px;border-radius:99px;font-weight:700">${p.hh_prev}h</span>`:''}
              </div>
              <div style="font-size:13px;color:#0F172A;font-weight:600;line-height:1.4">${esc(p.descricao)}</div>
              ${p.equipe?`<div style="font-size:11px;color:#94A3B8;margin-top:6px">👷 ${esc(p.equipe)}</div>`:''}
            </div>`).join('')}
        </div>`}
  `;
  const btn = d.getElementById('pcp-pkg-new') || d.getElementById('pcp-pkg-new-backlog');
  if(btn) btn.onclick = ()=> openPackageEditor(null);
  bindPackageCards();
}

/* ============================================================
   ABA 3 — KPI (PPC + CNC)
   ============================================================ */
function renderKPI(body){
  // últimas 8 semanas
  const today = new Date();
  const weeks = [];
  for(let i=7; i>=0; i--){
    const dt = new Date(today); dt.setDate(dt.getDate() - i*7);
    weeks.push(fmtDate(weekStartOf(dt)));
  }
  const ppcByWeek = weeks.map(wk => {
    const pkgs = _packages.filter(p => p.week_start === wk);
    return { week: wk, ppc: calcPPC(pkgs), total: pkgs.length };
  });

  // CNC (causas de não-conclusão) — agregado das últimas 8 semanas
  const cncMap = {};
  _packages.forEach(p => {
    if(p.cnc_cause && (p.status === 'partial' || p.status === 'not_done')){
      cncMap[p.cnc_cause] = (cncMap[p.cnc_cause] || 0) + 1;
    }
  });
  const cncArr = Object.entries(cncMap).sort((a,b) => b[1]-a[1]);
  const cncMax = cncArr[0] ? cncArr[0][1] : 1;

  const ppcAtual = ppcByWeek[ppcByWeek.length-1].ppc;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #E2E8F0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div>
            <div style="font-size:11.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px">PPC — Esta semana</div>
            <div style="font-size:42px;font-weight:900;color:${ppcAtual==null?'#94A3B8':(ppcAtual>=75?'#10B981':ppcAtual>=60?'#F59E0B':'#DC2626')};line-height:1">${ppcAtual==null?'—':ppcAtual+'%'}</div>
          </div>
          <div style="font-size:11.5px;text-align:right;color:#64748B">
            <div>Meta: <strong style="color:#10B981">≥ 75%</strong></div>
            <div style="margin-top:4px">Setor: <strong>50-60%</strong></div>
          </div>
        </div>
        <canvas id="pcp-ppc-chart" width="500" height="180"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #E2E8F0">
        <div style="font-size:11.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-bottom:14px">Pareto de Causas de Não-Conclusão (8 sem.)</div>
        ${cncArr.length === 0
          ? '<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:44px">🎯</div><div style="font-weight:600;color:#475569;margin-top:8px">Sem ocorrências</div><div style="font-size:12px;margin-top:4px">Excelente! Todos os pacotes concluídos</div></div>'
          : cncArr.map(([cause, qtd]) => {
              const meta = CNC.find(c=>c.id===cause) || CNC[CNC.length-1];
              const pct = (qtd / cncMax * 100);
              return `<div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                  <span style="color:#0F172A;font-weight:600">${esc(meta.nome)}</span>
                  <span style="color:${meta.cor};font-weight:800">${qtd}</span>
                </div>
                <div style="background:#F1F5F9;border-radius:99px;height:8px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${meta.cor};border-radius:99px"></div>
                </div>
              </div>`;
            }).join('')}
      </div>
    </div>

    <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #E2E8F0">
      <div style="font-size:13.5px;font-weight:800;color:#0F172A;margin-bottom:6px">💡 Como interpretar o PPC</div>
      <div style="font-size:12.5px;color:#475569;line-height:1.55">
        <strong>PPC (Percent Plan Complete)</strong> mede o quanto a obra cumpre o que prometeu fazer na semana. É o KPI mais importante do PCP.
        <ul style="margin:8px 0 0 18px;padding:0">
          <li><strong style="color:#10B981">≥ 75%</strong> — Excelente. Planejamento maduro e equipe confiável.</li>
          <li><strong style="color:#F59E0B">60-74%</strong> — Aceitável. Tem espaço pra melhorar.</li>
          <li><strong style="color:#DC2626">&lt; 60%</strong> — Crítico. Olhe a Pareto de CNC: a causa #1 está te custando produtividade.</li>
        </ul>
        Cada ponto percentual de PPC equivale a ~1,2% de redução de HH total da obra (referência setor montagem industrial).
      </div>
    </div>
  `;

  // Desenha o gráfico
  if(w.Chart){
    try {
      const ctx = d.getElementById('pcp-ppc-chart');
      if(ctx){
        if(ctx._chart) ctx._chart.destroy();
        ctx._chart = new w.Chart(ctx, {
          type: 'line',
          data: {
            labels: ppcByWeek.map(x => x.week.slice(5)),
            datasets: [{
              label: 'PPC %',
              data: ppcByWeek.map(x => x.ppc),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true,
              tension: 0.35,
              pointRadius: 5,
              pointBackgroundColor: ppcByWeek.map(x => x.ppc==null?'#94A3B8':(x.ppc>=75?'#10B981':x.ppc>=60?'#F59E0B':'#DC2626'))
            }, {
              label: 'Meta (75%)',
              data: ppcByWeek.map(()=>75),
              borderColor: '#10B981',
              borderDash: [5,5],
              fill: false,
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100, ticks: { callback:(v)=>v+'%' } } },
            plugins: { legend: { display: true, position:'top', labels:{boxWidth:12, font:{size:11}} } }
          }
        });
      }
    } catch(e){ console.warn('[PCP] chart', e); }
  }
}

function calcPPC(pkgs){
  const avaliados = pkgs.filter(p => p.status==='done' || p.status==='partial' || p.status==='not_done');
  if(avaliados.length === 0) return null;
  const done = avaliados.filter(p => p.status==='done').length;
  return +(100 * done / avaliados.length).toFixed(1);
}

/* ============================================================
   EDITOR DE PACOTE
   ============================================================ */
async function openPackageEditor(id){
  const p = id ? _packages.find(x => x.id === id) : null;
  const isNew = !p;
  let ov = d.getElementById('pia-pcp-edit');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-pcp-edit';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9650;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };

  const cur = p || {
    disciplina:'industrial', descricao:'', hh_prev:0, qty_prev:0,
    unidade:'', equipe:'', frente:'', status:'backlog',
    week_start: fmtDate(_curWeek), planned_date: ''
  };

  ov.innerHTML = `
    <div style="background:var(--t0,#fff);border-radius:12px;width:100%;max-width:700px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 56px rgba(15,23,42,.25);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">${isNew?'Novo pacote de trabalho':'Editar pacote'}</div>
          <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">${esc(getProjectName())}</div>
        </div>
        <button id="pcp-edit-close" class="btn bg" style="padding:6px 10px;font-size:18px;line-height:1">×</button>
      </div>
      <div style="flex:1;overflow:auto;padding:18px 22px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Disciplina</label>
            <select id="pcp-f-disc" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
              ${DISCIPLINAS.map(x => `<option value="${x.id}" ${cur.disciplina===x.id?'selected':''}>${x.ico} ${x.nome}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Frente / Área</label>
            <input id="pcp-f-frente" type="text" value="${esc(cur.frente||'')}" placeholder="ex: ISBL-A, Caldeira #2" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
        </div>

        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Descrição *</label>
          <textarea id="pcp-f-desc" rows="2" placeholder="ex: J-101 a J-115, 6&quot; SCH 80, A335-P11" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px;resize:vertical">${esc(cur.descricao||'')}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">HH previsto</label>
            <input id="pcp-f-hh" type="number" min="0" step="0.5" value="${cur.hh_prev||0}" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Quantidade</label>
            <input id="pcp-f-qty" type="number" min="0" step="0.01" value="${cur.qty_prev||0}" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Unidade</label>
            <input id="pcp-f-un" type="text" value="${esc(cur.unidade||'')}" placeholder="m, m², jt, pç" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Equipe / Responsável</label>
            <input id="pcp-f-eq" type="text" value="${esc(cur.equipe||'')}" placeholder="ex: Equipe A — João Silva" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Status</label>
            <select id="pcp-f-status" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
              ${Object.entries(STATUS).map(([k,v]) => `<option value="${k}" ${cur.status===k?'selected':''}>${v.ico} ${v.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Semana planejada</label>
            <input id="pcp-f-wk" type="date" value="${cur.week_start||''}" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
            <div style="font-size:10px;color:#94A3B8;margin-top:2px">Use a segunda-feira da semana</div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px">Dia planejado</label>
            <input id="pcp-f-pd" type="date" value="${cur.planned_date||''}" style="width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;margin-top:4px">
          </div>
        </div>

        <div id="pcp-f-cnc-box" style="display:${cur.status==='partial'||cur.status==='not_done'?'block':'none'};background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin-bottom:12px">
          <label style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:.4px">Causa de Não-Conclusão (CNC) *</label>
          <select id="pcp-f-cnc" style="width:100%;padding:8px 10px;border:1px solid #FECACA;border-radius:7px;font-size:13px;margin-top:4px">
            <option value="">— selecione —</option>
            ${CNC.map(c => `<option value="${c.id}" ${cur.cnc_cause===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
          </select>
          <input id="pcp-f-cncobs" type="text" placeholder="Observação (opcional)" value="${esc(cur.cnc_obs||'')}" style="width:100%;padding:8px 10px;border:1px solid #FECACA;border-radius:7px;font-size:13px;margin-top:8px">
        </div>
      </div>
      <div style="padding:12px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;gap:8px;background:var(--t0,#fff)">
        ${!isNew?'<button id="pcp-edit-del" class="btn" style="background:#FEE2E2;color:#991B1B;border:none">Excluir</button>':''}
        <div style="flex:1"></div>
        <button id="pcp-edit-cancel" class="btn bg">Cancelar</button>
        <button id="pcp-edit-save" class="btn bp">${isNew?'Criar pacote':'Salvar'}</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('pcp-edit-close').onclick = ()=> ov.remove();
  d.getElementById('pcp-edit-cancel').onclick = ()=> ov.remove();
  d.getElementById('pcp-f-status').onchange = (e)=>{
    const v = e.target.value;
    d.getElementById('pcp-f-cnc-box').style.display = (v==='partial'||v==='not_done') ? 'block' : 'none';
  };
  d.getElementById('pcp-edit-save').onclick = async ()=>{
    const data = {
      disciplina:     d.getElementById('pcp-f-disc').value,
      frente:         d.getElementById('pcp-f-frente').value.trim() || null,
      descricao:      d.getElementById('pcp-f-desc').value.trim(),
      hh_prev:        parseFloat(d.getElementById('pcp-f-hh').value)||0,
      qty_prev:       parseFloat(d.getElementById('pcp-f-qty').value)||0,
      unidade:        d.getElementById('pcp-f-un').value.trim() || null,
      equipe:         d.getElementById('pcp-f-eq').value.trim() || null,
      status:         d.getElementById('pcp-f-status').value,
      week_start:     d.getElementById('pcp-f-wk').value || null,
      planned_date:   d.getElementById('pcp-f-pd').value || null,
      cnc_cause:      null,
      cnc_obs:        null
    };
    if(!data.descricao){ toast('Descrição é obrigatória','err'); return; }
    if(data.status === 'partial' || data.status === 'not_done'){
      data.cnc_cause = d.getElementById('pcp-f-cnc').value || null;
      data.cnc_obs   = d.getElementById('pcp-f-cncobs').value.trim() || null;
      if(!data.cnc_cause){ toast('Selecione a causa de não-conclusão','err'); return; }
    }
    if(data.status === 'done' && !data.completed_date) data.completed_date = fmtDate(new Date());

    const sb = getSb();
    if(!sb){ toast('Supabase não inicializado','err'); return; }
    if(isNew){
      data.org_id     = getOrgId();
      data.project_id = getProjectId();
      data.created_by = getUserId();
      const r = await sb.from('pcp_packages').insert(data).select().single();
      if(r.error){ toast('Erro: '+r.error.message,'err'); console.error(r.error); return; }
      toast('Pacote criado','ok');
    } else {
      const r = await sb.from('pcp_packages').update(data).eq('id', p.id).select().single();
      if(r.error){ toast('Erro: '+r.error.message,'err'); console.error(r.error); return; }
      toast('Pacote atualizado','ok');
    }
    ov.remove();
    await loadAll();
    renderActive();
  };
  if(!isNew){
    d.getElementById('pcp-edit-del').onclick = async ()=>{
      const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir pacote", "Este pacote do PCP será removido.", "Excluir") : Promise.resolve(confirm("Excluir pacote?")));
  if(!_ok) return;
      const sb = getSb();
      const r = await sb.from('pcp_packages').update({ deleted_at: new Date().toISOString() }).eq('id', p.id);
      if(r.error){ toast('Erro: '+r.error.message,'err'); return; }
      toast('Excluído','ok');
      ov.remove();
      await loadAll();
      renderActive();
    };
  }
}

/* ============================================================
   API pública
   ============================================================ */

w.openPcpAI = function(projectId){ var pid = projectId || (w._curProject && w._curProject.id); if(!pid){alert('Selecione projeto.');return;} if(w.PIALazy) w.PIALazy.run('ai-pcp','generateWeeklyPackages',pid); else if(w.PIAIAPcp) w.PIAIAPcp.generateWeeklyPackages(pid); };
w.PIAPCP = {
  open: openPCP,
  loadAll,
  /** retorna pacotes planejados para um dia específico (usado pelo RDO) */
  packagesForDay: async function(projectId, dateStr){
    const sb = getSb(); if(!sb) return [];
    const r = await sb.from('pcp_packages')
      .select('*')
      .eq('project_id', projectId)
      .eq('planned_date', dateStr)
      .is('deleted_at', null)
      .in('status', ['planned','in_progress']);
    if(r.error){ console.error('[PCP] packagesForDay', r.error); return []; }
    return r.data || [];
  },
  /** atualiza status de um pacote (usado pelo RDO ao fechar o dia) */
  setStatus: async function(pkgId, status, cncCause, cncObs, parentRdoId, hhReal){
    const sb = getSb(); if(!sb) return false;
    const upd = { status };
    if(status === 'done') upd.completed_date = fmtDate(new Date());
    if(status === 'partial' || status === 'not_done'){
      upd.cnc_cause = cncCause || null;
      upd.cnc_obs   = cncObs || null;
    }
    if(parentRdoId) upd.parent_rdo_id = parentRdoId;
    if(hhReal != null) upd.hh_real = +hhReal || 0;
    const r