/*! PROJECT.IA - budget v1
 *  Orçamento do Projeto baseado na Base de Composições
 *  - Lista consolidada por disciplina + totais
 *  - Editor inline (qtd, preço unit, comentário)
 *  - Curva ABC visual (Pareto)
 *  - Pizza de distribuição por disciplina
 *  - Exportar PDF / Excel / CSV
 */
(function(w,d){'use strict';
try {

const DISC_META = {
  tubulacao:     {l:'Tubulação',      c:'#DC2626', ic:'🔧'},
  mecanica:      {l:'Mecânica',       c:'#EA580C', ic:'⚙️'},
  eletrica:      {l:'Elétrica',       c:'#EAB308', ic:'⚡'},
  instrumentacao:{l:'Instrumentação', c:'#A855F7', ic:'📡'},
  civil:         {l:'Civil',          c:'#0EA5E9', ic:'🏗️'},
  hidraulica:    {l:'Hidráulica',     c:'#06B6D4', ic:'💧'},
  pintura:       {l:'Pintura',        c:'#EC4899', ic:'🎨'},
  caldeiraria:   {l:'Caldeiraria',    c:'#84CC16', ic:'🔥'},
  isolamento:    {l:'Isolamento',     c:'#14B8A6', ic:'❄️'},
  seguranca:     {l:'Segurança',      c:'#10B981', ic:'🦺'}
};

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtBR(n){if(n==null||isNaN(n))return 'R$ 0,00';return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n));}
function fmtN(n,d){if(n==null||isNaN(n))return '0';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||4}).format(Number(n));}
function fmtPct(n){if(n==null||isNaN(n))return '0%';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Number(n))+'%';}

let _lines = [];
let _projectId = null;
let _projectName = null;
let _chartABC = null;
let _chartPie = null;

function getProjectId(){
  return (w._curProject && w._curProject.id) || w.curProj || null;
}
function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  if(w.projects && w.curProj){
    const p = w.projects.find(x=>x.id===w.curProj);
    if(p) return p.name;
  }
  return null;
}

async function fetchLines(){
  if(!w.sb) throw new Error('Supabase não inicializado');
  if(!_projectId) throw new Error('Selecione um projeto primeiro');
  const {data, error} = await w.sb.from('project_composition_lines')
    .select('*').eq('project_id', _projectId).order('discipline').order('created_at');
  if(error) throw error;
  _lines = data || [];
  return _lines;
}

function open(){
  _projectId = getProjectId();
  _projectName = getProjectName();
  if(!_projectId){
    alert('Selecione um projeto primeiro (sidebar → Obra → Projetos).');
    return;
  }

  let ov = d.getElementById('pia-budget-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-budget-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9650;overflow:auto;font-family:inherit;display:flex;flex-direction:column';

  ov.innerHTML = renderShell();
  if(w.PIAShell && w.PIAShell.inlineWrap(ov, 'budget', 'tab-budget')){} else { d.body.appendChild(ov); }

  d.getElementById('pia-bud-close').onclick = ()=> ov.remove();
  d.getElementById('pia-bud-add').onclick = ()=> openAddItem();
  d.getElementById('pia-bud-recalc').onclick = ()=> recalcABC();
  d.getElementById('pia-bud-hh').onclick = ()=> { if(w.PIAHHParams) w.PIAHHParams.open(); else alert('Carregando módulo HH...'); };
  d.getElementById('pia-bud-pdf').onclick = ()=> exportPDF();
  d.getElementById('pia-bud-xlsx').onclick = ()=> exportExcel();
  d.getElementById('pia-bud-csv').onclick = ()=> exportCSV();

  loadAndRender();
}

function renderShell(){
  return `
      <div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0">
        <button id="pia-bud-close" class="btn bg" style="display:inline-flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar
        </button>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Orçamento do Projeto</div>
          <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Projeto: <strong>${esc(_projectName||'(sem nome)')}</strong></div>
        </div>
        <div style="flex:1"></div>
        <button id="pia-bud-hh"     class="btn bg" title="Editar parâmetros HH">HH</button>
        <button id="pia-bud-recalc" class="btn bg" title="Recalcular Curva ABC">Recalcular ABC</button>
        <button id="pia-bud-pdf"    class="btn bg" title="Exportar PDF">PDF</button>
        <button id="pia-bud-xlsx"   class="btn bg" title="Exportar Excel">Excel</button>
        
        <button id="pia-bud-add"    class="btn bp">+ Adicionar item</button>
      </div>

      <div id="pia-bud-kpis" style="padding:14px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:var(--t0,#fff);flex-shrink:0"></div>

      <div style="flex:1;display:grid;grid-template-columns:1fr 380px;gap:0;overflow:hidden">

        <div id="pia-bud-lines" style="overflow-y:auto;padding:0">
          <div style="padding:40px;text-align:center;color:#94A3B8">⏳ Carregando linhas do orçamento...</div>
        </div>

        <div style="border-left:1px solid #E2E8F0;background:#FAFBFD;padding:14px;overflow-y:auto">
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📊 Curva ABC (Pareto)</div>
          <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:10px;margin-bottom:14px">
            <canvas id="pia-bud-chart-abc" height="180"></canvas>
          </div>
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🥧 Distribuição por disciplina</div>
          <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:10px">
            <canvas id="pia-bud-chart-pie" height="220"></canvas>
          </div>
          <div id="pia-bud-disc-legend" style="margin-top:10px;font-size:11.5px"></div>
        </div>

      </div>
  `;
}

async function loadAndRender(){
  try {
    await fetchLines();
    renderKPIs();
    renderLines();
    setTimeout(()=>{ renderChartABC(); renderChartPie(); }, 50);
  } catch(e){
    d.getElementById('pia-bud-lines').innerHTML = `<div style="padding:40px;text-align:center;color:#991B1B"><div style="font-size:38px;margin-bottom:8px">⚠️</div><div style="font-weight:600">Erro ao carregar</div><div style="font-size:12px;margin-top:4px;color:#64748B">${esc(e.message||e)}</div></div>`;
  }
}

function totals(){
  const total = _lines.reduce((s,l)=>s+Number(l.total_price||0),0);
  const byDisc = {};
  const byABC = {A:0,B:0,C:0};
  _lines.forEach(l=>{
    const v = Number(l.total_price||0);
    byDisc[l.discipline] = (byDisc[l.discipline]||0) + v;
    if(l.abc_class) byABC[l.abc_class] = (byABC[l.abc_class]||0) + v;
  });
  return {total, byDisc, byABC};
}

function renderKPIs(){
  const t = totals();
  const nLines = _lines.length;
  const nDisc = Object.keys(t.byDisc).length;
  const aPct = t.total ? (t.byABC.A/t.total*100) : 0;
  const html = `
    <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #E2E8F0;border-left:3px solid #10B981">
      <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">Total geral</div>
      <div style="font-size:22px;font-weight:800;color:#0F172A;margin-top:3px;font-family:'JetBrains Mono',monospace">${fmtBR(t.total)}</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #E2E8F0;border-left:3px solid #06B6D4">
      <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">Linhas / Disciplinas</div>
      <div style="font-size:22px;font-weight:800;color:#0F172A;margin-top:3px">${nLines} <span style="font-size:13px;color:#64748B;font-weight:600">/ ${nDisc}</span></div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #E2E8F0;border-left:3px solid #DC2626">
      <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">Classe A (80% do custo)</div>
      <div style="font-size:22px;font-weight:800;color:#0F172A;margin-top:3px">${fmtPct(aPct)} <span style="font-size:12px;color:#64748B;font-weight:600">${fmtBR(t.byABC.A)}</span></div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #E2E8F0;border-left:3px solid #8B5CF6">
      <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">Maior disciplina</div>
      <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:3px">${(()=>{
        const entries = Object.entries(t.byDisc).sort((a,b)=>b[1]-a[1]);
        if(!entries.length) return '—';
        const [d,v] = entries[0];
        const meta = DISC_META[d]||{l:d,c:'#64748B'};
        return `<span style="color:${meta.c}">${meta.ic} ${esc(meta.l)}</span><div style="font-size:11px;color:#64748B;margin-top:2px;font-family:'JetBrains Mono',monospace">${fmtBR(v)} (${fmtPct(v/t.total*100)})</div>`;
      })()}</div>
    </div>
  `;
  d.getElementById('pia-bud-kpis').innerHTML = html;
}

function renderLines(){
  const wrap = d.getElementById('pia-bud-lines');
  if(_lines.length === 0){
    wrap.innerHTML = `
      <div style="padding:60px 40px;text-align:center;color:#94A3B8">
        <div style="font-size:54px;margin-bottom:14px">📋</div>
        <div style="font-size:16px;font-weight:700;color:#475569">Orçamento vazio</div>
        <div style="font-size:13px;margin-top:6px;color:#64748B;max-width:380px;margin-left:auto;margin-right:auto;line-height:1.5">Comece adicionando itens da Base de Composições. Você pode buscar por disciplina, código ou palavra-chave.</div>
        <button onclick="PIABudget.openAddItem()" style="margin-top:18px;background:#10B981;color:#fff;border:none;padding:11px 22px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">+ Adicionar primeiro item</button>
      </div>
    `;
    return;
  }

  const grouped = {};
  _lines.forEach(l => { (grouped[l.discipline]=grouped[l.discipline]||[]).push(l); });

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12.5px">';
  html += `<thead style="position:sticky;top:0;background:#fff;z-index:1">
    <tr style="border-bottom:2px solid #E2E8F0;color:#475569">
      <th style="text-align:left;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">ABC</th>
      <th style="text-align:left;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">Descrição</th>
      <th style="text-align:center;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">Un</th>
      <th style="text-align:right;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">Qtd</th>
      <th style="text-align:right;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">R$/un</th>
      <th style="text-align:right;padding:11px 12px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">Total</th>
      <th style="width:60px"></th>
    </tr>
  </thead><tbody>`;

  Object.keys(grouped).sort().forEach(discKey => {
    const meta = DISC_META[discKey] || {l:discKey, c:'#64748B', ic:'•'};
    const items = grouped[discKey];
    const subtotal = items.reduce((s,l)=>s+Number(l.total_price||0),0);

    html += `<tr style="background:${meta.c}14;border-top:2px solid ${meta.c}">
      <td colspan="5" style="padding:8px 12px;font-weight:800;font-size:12px;color:${meta.c};letter-spacing:.3px">${meta.ic}  ${esc(meta.l).toUpperCase()}  ·  ${items.length} ${items.length===1?'linha':'linhas'}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:800;color:${meta.c};font-family:'JetBrains Mono',monospace">${fmtBR(subtotal)}</td>
      <td></td>
    </tr>`;

    items.forEach(l => {
      const abcColor = l.abc_class === 'A' ? '#DC2626' : l.abc_class === 'B' ? '#F59E0B' : '#94A3B8';
      const abcBadge = l.abc_class ? `<span style="background:${abcColor}1A;color:${abcColor};padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:800">${l.abc_class}</span>` : '<span style="color:#CBD5E1">—</span>';
      html += `
        <tr data-line="${esc(l.id)}" style="border-bottom:1px solid #F1F5F9;transition:background .1s" onmouseover="this.style.background='#FAFBFD'" onmouseout="this.style.background=''">
          <td style="padding:9px 12px">${abcBadge}</td>
          <td style="padding:9px 12px;color:#1E293B;line-height:1.35">${esc(l.description)}</td>
          <td style="padding:9px 12px;text-align:center;color:#475569">${esc(l.unit)}</td>
          <td style="padding:9px 12px;text-align:right">
            <input type="number" step="0.0001" value="${l.quantity}" data-field="quantity" data-line="${esc(l.id)}" style="width:90px;padding:5px 7px;border:1px solid transparent;border-radius:6px;text-align:right;font-size:12px;font-family:'JetBrains Mono',monospace;background:transparent" onfocus="this.style.borderColor='#10B981';this.style.background='#fff'" onblur="this.style.borderColor='transparent';this.style.background='transparent';PIABudget.saveEdit(this)">
          </td>
          <td style="padding:9px 12px;text-align:right">
            <input type="number" step="0.01" value="${l.unit_price}" data-field="unit_price" data-line="${esc(l.id)}" style="width:110px;padding:5px 7px;border:1px solid transparent;border-radius:6px;text-align:right;font-size:12px;font-family:'JetBrains Mono',monospace;background:transparent" onfocus="this.style.borderColor='#10B981';this.style.background='#fff'" onblur="this.style.borderColor='transparent';this.style.background='transparent';PIABudget.saveEdit(this)">
          </td>
          <td style="padding:9px 12px;text-align:right;font-weight:700;color:#0F172A;font-family:'JetBrains Mono',monospace" data-total-cell="${esc(l.id)}">${fmtBR(l.total_price)}</td>
          <td style="padding:9px 8px;text-align:center">
            <button onclick="PIABudget.deleteLine('${esc(l.id)}')" title="Excluir" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;font-size:16px;padding:4px 8px;border-radius:5px;transition:all .1s" onmouseover="this.style.background='#FEE2E2';this.style.color='#DC2626'" onmouseout="this.style.background='transparent';this.style.color='#94A3B8'">🗑</button>
          </td>
        </tr>
      `;
    });
  });

  // Linha total geral
  const total = _lines.reduce((s,l)=>s+Number(l.total_price||0),0);
  html += `<tr style="background:#0F172A;color:#fff;border-top:3px solid #1E293B">
    <td colspan="5" style="padding:12px 14px;font-weight:800;font-size:13px;letter-spacing:.4px">💰  TOTAL GERAL</td>
    <td style="padding:12px 14px;text-align:right;font-weight:800;font-size:15px;font-family:'JetBrains Mono',monospace">${fmtBR(total)}</td>
    <td></td>
  </tr>`;

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function renderChartABC(){
  if(!w.Chart){ console.warn('[budget] Chart.js indisponível'); return; }
  const cv = d.getElementById('pia-bud-chart-abc');
  if(!cv) return;
  if(_chartABC){ _chartABC.destroy(); _chartABC = null; }

  const sorted = _lines.slice().sort((a,b)=>Number(b.total_price)-Number(a.total_price)).slice(0,15);
  if(sorted.length === 0){
    cv.parentElement.innerHTML = '<div style="padding:40px;text-align:center;color:#CBD5E1;font-size:12px">Sem dados</div>';
    return;
  }
  const labels = sorted.map((l,i)=>`#${i+1}`);
  const values = sorted.map(l=>Number(l.total_price));
  let cum = 0;
  const grand = _lines.reduce((s,l)=>s+Number(l.total_price||0),0) || 1;
  const cumul = values.map(v => { cum += v; return (cum/grand*100); });
  const colors = sorted.map(l => l.abc_class === 'A' ? '#DC2626' : l.abc_class === 'B' ? '#F59E0B' : '#94A3B8');

  _chartABC = new w.Chart(cv.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'R$', data:values, backgroundColor:colors, borderRadius:4, yAxisID:'y' },
        { label:'% acumulado', data:cumul, type:'line', borderColor:'#0F172A', backgroundColor:'transparent', pointRadius:3, pointBackgroundColor:'#0F172A', tension:.2, yAxisID:'y1' }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:{duration:300},
      plugins: { legend:{display:false}, tooltip:{callbacks:{
        label:(ctx)=>{
          if(ctx.datasetIndex===0){
            const ln = sorted[ctx.dataIndex];
            return ['Total: '+fmtBR(ctx.parsed.y), (ln.description||'').slice(0,40)];
          }
          return fmtPct(ctx.parsed.y);
        }
      }} },
      scales: {
        y: { ticks:{callback:v=>'R$ '+(v/1000).toFixed(0)+'k',font:{size:9}}, grid:{color:'#F1F5F9'} },
        y1:{ position:'right', ticks:{callback:v=>v+'%',font:{size:9}}, grid:{display:false}, min:0, max:100 },
        x: { ticks:{font:{size:9}}, grid:{display:false} }
      }
    }
  });
}

function renderChartPie(){
  if(!w.Chart){ return; }
  const cv = d.getElementById('pia-bud-chart-pie');
  if(!cv) return;
  if(_chartPie){ _chartPie.destroy(); _chartPie = null; }

  const t = totals();
  const entries = Object.entries(t.byDisc).sort((a,b)=>b[1]-a[1]);
  if(entries.length === 0){
    cv.parentElement.innerHTML = '<div style="padding:40px;text-align:center;color:#CBD5E1;font-size:12px">Sem dados</div>';
    return;
  }

  _chartPie = new w.Chart(cv.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: entries.map(([d])=>{ const m=DISC_META[d]||{l:d}; return m.l; }),
      datasets: [{
        data: entries.map(([_,v])=>v),
        backgroundColor: entries.map(([d])=>{ const m=DISC_META[d]||{c:'#64748B'}; return m.c; }),
        borderWidth: 2, borderColor: '#fff'
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:{duration:300},
      plugins: {
        legend: { display:false },
        tooltip: { callbacks: { label: (ctx)=>fmtBR(ctx.parsed) + ' (' + fmtPct(ctx.parsed/t.total*100) + ')' } }
      },
      cutout: '60%'
    }
  });

  const legend = d.getElementById('pia-bud-disc-legend');
  legend.innerHTML = entries.map(([dk,v])=>{
    const m = DISC_META[dk]||{l:dk,c:'#64748B',ic:'•'};
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #F1F5F9">
      <span style="width:10px;height:10px;border-radius:3px;background:${m.c};flex-shrink:0"></span>
      <span style="flex:1;color:#334155">${m.ic} ${esc(m.l)}</span>
      <span style="font-weight:700;color:#0F172A;font-family:'JetBrains Mono',monospace;font-size:11px">${fmtBR(v)}</span>
      <span style="color:#64748B;font-size:10.5px;min-width:42px;text-align:right">${fmtPct(v/t.total*100)}</span>
    </div>`;
  }).join('');
}

async function saveEdit(input){
  const lineId = input.dataset.line;
  const field = input.dataset.field;
  let value = parseFloat(input.value);
  if(isNaN(value) || value < 0){ value = 0; input.value = 0; }
  const line = _lines.find(l => l.id === lineId);
  if(!line) return;
  if(Number(line[field]) === value) return;
  try {
    const upd = {};
    upd[field] = value;
    upd.updated_at = new Date().toISOString();
    const {error} = await w.sb.from('project_composition_lines').update(upd).eq('id', lineId);
    if(error) throw error;
    line[field] = value;
    line.total_price = Number(line.quantity||0) * Number(line.unit_price||0);
    const cell = d.querySelector('[data-total-cell="'+lineId+'"]');
    if(cell) cell.textContent = fmtBR(line.total_price);
    await recalcABCSilent();
    renderKPIs(); renderChartABC(); renderChartPie();
  } catch(e){
    alert('Erro ao salvar: '+(e.message||e));
    await loadAndRender();
  }
}

async function deleteLine(id){
  const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir linha", "Esta linha será removida do orçamento.", "Excluir") : Promise.resolve(confirm("Excluir linha?")));
  if(!_ok) return;
  try {
    const {error} = await w.sb.from('project_composition_lines').delete().eq('id', id);
    if(error) throw error;
    _lines = _lines.filter(l => l.id !== id);
    await recalcABCSilent();
    renderKPIs(); renderLines(); renderChartABC(); renderChartPie();
  } catch(e){ alert('Erro ao excluir: '+(e.message||e)); }
}

async function recalcABCSilent(){
  try { await w.sb.rpc('calc_project_abc', {p_project_id: _projectId}); await fetchLines(); }
  catch(_){}
}
async function recalcABC(){
  try {
    await w.sb.rpc('calc_project_abc', {p_project_id: _projectId});
    await loadAndRender();
  } catch(e){ alert('Erro ao recalcular ABC: '+(e.message||e)); }
}

function openAddItem(){
  if(w.PIACompositions && typeof w.PIACompositions.open === 'function'){
    w.PIACompositions.open();
    // Quando o usuário fechar o modal de composições, recarregar
    const checkClose = setInterval(()=>{
      if(!d.getElementById('pia-comp-ov')){
        clearInterval(checkClose);
        loadAndRender();
      }
    }, 600);
  } else {
    alert('Base de Composições ainda carregando.');
  }
}

// ============ EXPORTS ============

function exportCSV(){
  if(_lines.length === 0){ alert('Orçamento vazio.'); return; }
  const sep = ';';
  let csv = 'Classe ABC' + sep + 'Disciplina' + sep + 'Código' + sep + 'Descrição' + sep + 'Unidade' + sep + 'Quantidade' + sep + 'Preço unit (R$)' + sep + 'Total (R$)\n';
  _lines.forEach(l => {
    const code = (l.composition_id && w.PIACompositions) ? '' : '';
    const row = [
      l.abc_class || '',
      DISC_META[l.discipline]?.l || l.discipline,
      '',
      '"' + (l.description||'').replace(/"/g,'""') + '"',
      l.unit || '',
      String(l.quantity||0).replace('.',','),
      String(l.unit_price||0).replace('.',','),
      String(l.total_price||0).replace('.',',')
    ].join(sep);
    csv += row + '\n';
  });
  const total = _lines.reduce((s,l)=>s+Number(l.total_price||0),0);
  csv += sep.repeat(7) + String(total).replace('.',',') + '\n';

  downloadFile(csv, 'orcamento_'+slug(_projectName||'projeto')+'.csv', 'text/csv;charset=utf-8;');
}

function exportExcel(){
  if(_lines.length === 0){ alert('Orçamento vazio.'); return; }
  if(!w.XLSX){ alert('Biblioteca XLSX não carregada'); return; }

  const rows = [
    ['ORÇAMENTO DO PROJETO', '', '', '', '', '', '', ''],
    [_projectName || 'Projeto', '', '', '', '', '', '', new Date().toLocaleDateString('pt-BR')],
    [],
    ['Classe ABC', 'Disciplina', 'Descrição', 'Unidade', 'Quantidade', 'Preço unit (R$)', 'Total (R$)']
  ];

  const grouped = {};
  _lines.forEach(l => { (grouped[l.discipline]=grouped[l.discipline]||[]).push(l); });

  Object.keys(grouped).sort().forEach(discKey => {
    const meta = DISC_META[discKey] || {l:discKey};
    const items = grouped[discKey];
    const sub = items.reduce((s,l)=>s+Number(l.total_price||0),0);
    rows.push(['', '— ' + meta.l + ' —', '', '', '', '', sub]);
    items.forEach(l => {
      rows.push([
        l.abc_class||'', meta.l, l.description||'', l.unit||'',
        Number(l.quantity||0), Number(l.unit_price||0), Number(l.total_price||0)
      ]);
    });
  });

  const total = _lines.reduce((s,l)=>s+Number(l.total_price||0),0);
  rows.push([]);
  rows.push(['', '', '', '', '', 'TOTAL GERAL', total]);

  const ws = w.XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:10},{wch:18},{wch:60},{wch:8},{wch:14},{wch:18},{wch:18}];

  const wb = w.XLSX.utils.book_new();
  w.XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');
  w.XLSX.writeFile(wb, 'orcamento_'+slug(_projectName||'projeto')+'.xlsx');
}

function exportPDF(){
  if(_lines.length === 0){ alert('Orçamento vazio.'); return; }
  if(!w.jspdf){ alert('jsPDF não carregado'); return; }
  const { jsPDF } = w.jspdf;
  const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const pw = pdf.internal.pageSize.getWidth();
  let y = 16;

  // Cabeçalho
  pdf.setFillColor(15,23,42);
  pdf.rect(0, 0, pw, 28, 'F');
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(16); pdf.setFont('helvetica','bold');
  pdf.text('PROJECT.IA', 14, 12);
  pdf.setFontSize(10); pdf.setFont('helvetica','normal');
  pdf.text('Orçamento do Projeto', 14, 19);
  pdf.setFontSize(8);
  pdf.text(new Date().toLocaleDateString('pt-BR') + ' · ' + new Date().toLocaleTimeString('pt-BR'), pw - 14, 19, {align:'right'});

  y = 36;
  pdf.setTextColor(15,23,42);
  pdf.setFontSize(13); pdf.setFont('helvetica','bold');
  pdf.text(_projectName || 'Projeto', 14, y);
  y += 9;

  // KPIs
  const t = totals();
  pdf.setFillColor(240,253,244);
  pdf.rect(14, y-4, pw-28, 14, 'F');
  pdf.setFontSize(9); pdf.setFont('helvetica','normal');
  pdf.setTextColor(100,116,139);
  pdf.text('TOTAL GERAL', 18, y);
  pdf.setFontSize(14); pdf.setFont('helvetica','bold');
  pdf.setTextColor(16,185,129);
  pdf.text(fmtBR(t.total), 18, y+6);
  pdf.setFontSize(9); pdf.setFont('helvetica','normal');
  pdf.setTextColor(100,116,139);
  pdf.text(_lines.length + ' linhas · ' + Object.keys(t.byDisc).length + ' disciplinas', pw-18, y+5, {align:'right'});
  y += 18;

  // Tabela por disciplina
  const grouped = {};
  _lines.forEach(l => { (grouped[l.discipline]=grouped[l.discipline]||[]).push(l); });

  Object.keys(grouped).sort().forEach(discKey => {
    const meta = DISC_META[discKey] || {l:discKey, c:'#64748B'};
    const items = grouped[discKey];
    const sub = items.reduce((s,l)=>s+Number(l.total_price||0),0);

    if(y > 260){ pdf.addPage(); y = 16; }

    // Header da disciplina
    pdf.setFillColor(hex2rgb(meta.c,.12));
    pdf.rect(14, y, pw-28, 7, 'F');
    pdf.setFontSize(10); pdf.setFont('helvetica','bold');
    pdf.setTextColor(hex2rgb(meta.c));
    pdf.text(meta.l.toUpperCase()+' ('+items.length+')', 16, y+5);
    pdf.text(fmtBR(sub), pw-16, y+5, {align:'right'});
    y += 9;

    pdf.setFontSize(7.5); pdf.setFont('helvetica','bold');
    pdf.setTextColor(100,116,139);
    pdf.text('ABC', 16, y);
    pdf.text('Descrição', 26, y);
    pdf.text('Un', 122, y);
    pdf.text('Qtd', 138, y, {align:'right'});
    pdf.text('R$/un', 162, y, {align:'right'});
    pdf.text('Total', pw-16, y, {align:'right'});
    y += 4;
    pdf.setDrawColor(226,232,240);
    pdf.line(14, y-1, pw-14, y-1);

    pdf.setFontSize(7.5); pdf.setFont('helvetica','normal');
    pdf.setTextColor(30,41,59);

    items.forEach(l => {
      if(y > 280){ pdf.addPage(); y = 16; }
      pdf.text(l.abc_class || '-', 16, y);
      const desc = (l.description||'').slice(0,52);
      pdf.text(desc, 26, y);
      pdf.text(l.unit||'-', 122, y);
      pdf.text(fmtN(l.quantity,2), 138, y, {align:'right'});
      pdf.text(fmtBR(l.unit_price), 162, y, {align:'right'});
      pdf.setFont('helvetica','bold');
      pdf.text(fmtBR(l.total_price), pw-16, y, {align:'right'});
      pdf.setFont('helvetica','normal');
      y += 4.5;
    });
    y += 4;
  });

  // Total final
  if(y > 270){ pdf.addPage(); y = 20; }
  pdf.setFillColor(15,23,42);
  pdf.rect(14, y, pw-28, 12, 'F');
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(12); pdf.setFont('helvetica','bold');
  pdf.text('TOTAL GERAL', 18, y+8);
  pdf.text(fmtBR(t.total), pw-18, y+8, {align:'right'});

  pdf.setFontSize(7); pdf.setFont('helvetica','italic');
  pdf.setTextColor(148,163,184);
  const total_pages = pdf.internal.getNumberOfPages();
  for(let i=1; i<=total_pages; i++){
    pdf.setPage(i);
    pdf.text('Página '+i+' de '+total_pages, pw/2, pdf.internal.pageSize.getHeight()-6, {align:'center'});
    pdf.text('Gerado por PROJECT.IA · Composições baseadas em SINAPI + TCPO + Petrobras + ABNT', pw/2, pdf.internal.pageSize.getHeight()-2.5, {align:'center'});
  }

  pdf.save('orcamento_'+slug(_projectName||'projeto')+'.pdf');
}

function hex2rgb(hex, alpha){
  const c = hex.replace('#','');
  const r = parseInt(c.substr(0,2),16);
  const g = parseInt(c.substr(2,2),16);
  const b = parseInt(c.substr(4,2),16);
  if(alpha !== undefined){
    // mistura com branco
    const a = alpha;
    return [
      Math.round(r*a + 255*(1-a)),
      Math.round(g*a + 255*(1-a)),
      Math.round(b*a + 255*(1-a))
    ];
  }
  return [r,g,b];
}

function slug(s){
  return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'projeto';
}

function downloadFile(content, filename, type){
  const blob = new Blob([content], {type});
  const a = d.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

w.PIABudget = {
  open, openAddItem, saveEdit, deleteLine,
  exportPDF, exportExcel, exportCSV, recalcABC
};

} catch(e){ console.warn('[budget] init falhou:', e); }
})(window, document);
