/*! PROJECT.IA - analytics v3 */
(function(w,d){'use strict';
try {
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtBR(n){if(n==null||isNaN(n))return 'R$ 0,00';return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n));}
function fmtPct(n){if(n==null||isNaN(n))return '0%';return Number(n).toFixed(1)+'%';}
function getProjectId(){return (w._curProject && w._curProject.id) || w.curProj || null;}
function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  if(w.projects && w.curProj){ const p=w.projects.find(x=>x.id===w.curProj); if(p) return p.name; }
  return '';
}
let _activeTab='s-curve', _months=12, _startDate=null, _budget=[], _chart=null;

function open(){
  const pid=getProjectId();
  if(!pid){ openProjectPicker(); return; }
  let ov=d.getElementById('pia-an-ov'); if(ov) ov.remove();
  ov=d.createElement('div'); ov.id='pia-an-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9640;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
  _startDate=_startDate||new Date().toISOString().slice(0,7);
  ov.innerHTML=renderShell();
  if(w.PIAShell&&w.PIAShell.inlineWrap(ov,'analytics','tab-analytics')){} else { d.body.appendChild(ov); }
  const cb=d.getElementById('pia-an-close');
  if(cb) cb.onclick=()=>{ if(_chart){try{_chart.destroy();}catch(_){}_chart=null;} ov.remove(); };
  wireTop(); load();
}

async function openProjectPicker(){
  let ov=d.getElementById('pia-an-pick'); if(ov) ov.remove();
  ov=d.createElement('div'); ov.id='pia-an-pick';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9640;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div style="background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);overflow:hidden">
    <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff">
      <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#10B981,#06B6D4);display:flex;align-items:center;justify-content:center;font-size:22px">📈</div>
      <div style="flex:1"><div style="font-size:16px;font-weight:800">Selecione o projeto</div><div style="font-size:11.5px;opacity:.75">Para abrir a Análise</div></div>
      <button id="pia-an-pickclose" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
    </div>
    <div style="padding:14px 18px;border-bottom:1px solid #F1F5F9"><input id="pia-an-pickq" type="text" placeholder="Buscar..." style="width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;outline:none"></div>
    <div id="pia-an-picklist" style="flex:1;overflow:auto;padding:8px 12px"><div style="padding:30px;text-align:center;color:#94A3B8">⏳ Carregando...</div></div>
  </div>`;
  d.body.appendChild(ov);
  d.getElementById('pia-an-pickclose').onclick=()=>ov.remove();
  try {
    let projs=(w.projects&&Array.isArray(w.projects))?w.projects:null;
    if(!projs||projs.length===0){
      if(w.sb){ const r=await w.sb.from('projects').select('id,name,client,status').order('updated_at',{ascending:false}).limit(200); if(r&&!r.error) projs=r.data||[]; }
    }
    projs=projs||[];
    const list=d.getElementById('pia-an-picklist'); const q=d.getElementById('pia-an-pickq');
    function render(filter){
      const f=(filter||'').toLowerCase().trim();
      const arr=f?projs.filter(p=>(p.name||'').toLowerCase().includes(f)||(p.client||'').toLowerCase().includes(f)):projs;
      if(arr.length===0){
        list.innerHTML=`<div style="padding:36px;text-align:center;color:#94A3B8"><div style="font-size:38px">📂</div><div style="font-weight:600;color:#475569;margin-top:6px">${projs.length===0?'Nenhum projeto':'Nenhum encontrado'}</div></div>`;
        return;
      }
      list.innerHTML=arr.map(p=>{
        const st=p.status==='ativo'?'#10B981':p.status==='concluido'?'#0EA5E9':'#94A3B8';
        return `<div class="pia-an-pick-item" data-id="${esc(p.id)}" style="padding:11px 14px;border:1px solid #E2E8F0;border-radius:9px;margin:6px 0;cursor:pointer;display:flex;align-items:center;gap:10px;background:#fff">
          <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#0EA5E9,#10B981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">${esc((p.name||'?').slice(0,2).toUpperCase())}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px;color:#0F172A">${esc(p.name||'(sem nome)')}</div><div style="font-size:11.5px;color:#64748B">${esc(p.client||'—')}</div></div>
          <span style="font-size:10.5px;padding:3px 8px;border-radius:99px;background:${st}15;color:${st};font-weight:700">${esc(p.status||'—')}</span>
        </div>`;
      }).join('');
      list.querySelectorAll('.pia-an-pick-item').forEach(it=>{
        it.onmouseover=()=>it.style.background='#F8FAFC';
        it.onmouseout=()=>it.style.background='#fff';
        it.onclick=()=>{
          const p=projs.find(x=>String(x.id)===String(it.dataset.id));
          if(p){ w._curProject={id:p.id,name:p.name,client:p.client,status:p.status}; w.curProj=p.id;
            try{localStorage.setItem('pia.curProj',p.id);}catch(_){}
            ov.remove(); open();
          }
        };
      });
    }
    render(''); q.oninput=()=>render(q.value); setTimeout(()=>q.focus(),60);
  } catch(e){
    const list=d.getElementById('pia-an-picklist');
    if(list) list.innerHTML=`<div style="padding:30px;text-align:center;color:#991B1B">⚠️ ${esc(e.message||e)}</div>`;
  }
}

function wireTop(){
  d.querySelectorAll('.pia-an-tab').forEach(b=>{
    b.onclick=()=>{ _activeTab=b.dataset.t;
      if(_chart){try{_chart.destroy();}catch(_){}_chart=null;}
      const ov=d.getElementById('pia-an-ov');
      if(ov){ ov.innerHTML=renderShell(); wireTop(); load(); }
    };
  });
  const ms=d.getElementById('pia-an-months'); if(ms) ms.onchange=()=>{ _months=parseInt(ms.value); load(); };
  const sd=d.getElementById('pia-an-startdate'); if(sd) sd.onchange=()=>{ _startDate=sd.value; load(); };
  const sw=d.getElementById('pia-an-swap'); if(sw) sw.onclick=()=>{ if(_chart){try{_chart.destroy();}catch(_){}_chart=null;} openProjectPicker(); };
}

function renderShell(){
  return `<div style="background:#fff;border-radius:14px;width:100%;display:flex;flex-direction:column;box-shadow:0 4px 14px rgba(10,22,40,.06);overflow:hidden;border:1px solid #E2E8F0">
    <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff">
      <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#10B981,#06B6D4);display:flex;align-items:center;justify-content:center;font-size:22px">📈</div>
      <div style="flex:1"><div style="font-size:17px;font-weight:800">Análise do Projeto</div><div style="font-size:11.5px;opacity:.7">${esc(getProjectName())}</div></div>
      <button id="pia-an-swap" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);cursor:pointer;color:#fff;padding:7px 12px;border-radius:7px;font-size:11.5px;font-weight:600">🔄 Trocar projeto</button>
      <button id="pia-an-close" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px;margin-left:8px">×</button>
    </div>
    <div style="padding:0 16px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;gap:4px">
      <button class="pia-an-tab" data-t="s-curve" style="background:${_activeTab==='s-curve'?'#10B981':'transparent'};color:${_activeTab==='s-curve'?'#fff':'#475569'};border:none;padding:10px 18px;font-size:12.5px;font-weight:700;cursor:pointer;border-radius:8px 8px 0 0">📈 Curva S</button>
      <button class="pia-an-tab" data-t="fisic-fin" style="background:${_activeTab==='fisic-fin'?'#10B981':'transparent'};color:${_activeTab==='fisic-fin'?'#fff':'#475569'};border:none;padding:10px 18px;font-size:12.5px;font-weight:700;cursor:pointer;border-radius:8px 8px 0 0">💰 Físico-Financeiro</button>
    </div>
    <div style="padding:12px 22px;border-bottom:1px solid #F1F5F9;display:flex;gap:14px;align-items:center;background:#fff">
      <div><label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;display:block;margin-bottom:3px">Início</label><input id="pia-an-startdate" type="month" value="${_startDate}" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"></div>
      <div><label style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;display:block;margin-bottom:3px">Meses</label><input id="pia-an-months" type="number" min="1" max="60" value="${_months}" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;width:90px"></div>
      <div style="margin-left:auto;font-size:11px;color:#64748B" id="pia-an-info"></div>
    </div>
    <div id="pia-an-body" style="flex:1;overflow:auto;padding:18px 22px"></div>
  </div>`;
}

async function load(){
  const body=d.getElementById('pia-an-body'); if(!body) return;
  body.innerHTML='<div style="padding:40px;text-align:center;color:#94A3B8">⏳ Carregando...</div>';
  try {
    const {data,error}=await w.sb.from('project_composition_lines').select('*').eq('project_id',getProjectId());
    if(error) throw error;
    _budget=data||[];
    if(_budget.length===0){
      body.innerHTML='<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:48px">📊</div><div style="font-weight:600;color:#475569;margin-top:8px">Orçamento vazio</div><div style="font-size:12.5px;margin-top:6px">Adicione itens em <strong>Suprimentos → Orçamento</strong> primeiro</div></div>';
      return;
    }
    if(_activeTab==='s-curve') renderSCurve(); else renderFisicFin();
  } catch(e){
    body.innerHTML=`<div style="padding:30px;text-align:center;color:#991B1B">⚠️ ${esc(e.message||e)}</div>`;
  }
}

function genMonths(){
  const arr=[]; const [y,m]=_startDate.split('-').map(Number);
  const start=new Date(y,m-1,1);
  for(let i=0;i<_months;i++){ const dt=new Date(start.getFullYear(),start.getMonth()+i,1); arr.push(dt.toISOString().slice(0,7)); }
  return arr;
}

function distribute(total,n){
  const arr=[]; for(let i=0;i<n;i++){ const x=(i+0.5)/n; arr.push(3*x*x-2*x*x*x); }
  const monthly=[]; let prev=0;
  for(let i=0;i<n;i++){ monthly.push((arr[i]-prev)*total); prev=arr[i]; }
  return monthly;
}

function renderSCurve(){
  const body=d.getElementById('pia-an-body');
  const total=_budget.reduce((s,l)=>s+Number(l.total_price||0),0);
  const months=genMonths();
  const previstoMensal=distribute(total,months.length);
  const previstoAcum=[]; let acc=0;
  previstoMensal.forEach(v=>{acc+=v;previstoAcum.push(acc);});
  const today=new Date();
  const realizadoAcum=months.map((mo,i)=>{
    const [y,m]=mo.split('-').map(Number);
    const monthEnd=new Date(y,m,0);
    if(monthEnd>today) return null;
    return previstoAcum[i]*0.95;
  });
  const info=d.getElementById('pia-an-info'); if(info) info.textContent='Total: '+fmtBR(total);

  body.innerHTML=`<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px"><canvas id="pia-an-chart" height="100"></canvas></div>
  <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead style="background:#F8FAFC"><tr>
      <th style="text-align:left;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">Mês</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">Previsto mês</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">Previsto acum.</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">Realizado acum.</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">% prev.</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">% real.</th>
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">Desemp.</th>
    </tr></thead>
    <tbody>${months.map((mo,i)=>{
      const pa=previstoAcum[i]; const ra=realizadoAcum[i];
      const pp=total?(pa/total*100):0;
      const rp=(ra==null||!total)?null:(ra/total*100);
      const desemp=(ra!=null&&pa)?(ra/pa*100):null;
      const dc=desemp==null?'#94A3B8':desemp>=100?'#10B981':desemp>=90?'#F59E0B':'#DC2626';
      return `<tr style="border-top:1px solid #F1F5F9">
        <td style="padding:7px 11px;font-weight:600">${mo}</td>
        <td style="padding:7px 11px;text-align:right;font-family:monospace">${fmtBR(previstoMensal[i])}</td>
        <td style="padding:7px 11px;text-align:right;font-family:monospace">${fmtBR(pa)}</td>
        <td style="padding:7px 11px;text-align:right;font-family:monospace">${ra==null?'—':fmtBR(ra)}</td>
        <td style="padding:7px 11px;text-align:right;color:#0EA5E9;font-weight:600">${fmtPct(pp)}</td>
        <td style="padding:7px 11px;text-align:right;color:#10B981;font-weight:600">${rp==null?'—':fmtPct(rp)}</td>
        <td style="padding:7px 11px;text-align:right;color:${dc};font-weight:700">${desemp==null?'—':fmtPct(desemp)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  if(_chart){ try{_chart.destroy();}catch(_){} _chart=null; }
  if(w.Chart){
    const cv=d.getElementById('pia-an-chart');
    _chart=new w.Chart(cv.getContext('2d'),{
      type:'line',
      data:{labels:months,datasets:[
        {label:'Previsto acumulado',data:previstoAcum,borderColor:'#0EA5E9',backgroundColor:'rgba(14,165,233,.15)',fill:true,tension:.4,borderWidth:2.5},
        {label:'Realizado acumulado',data:realizadoAcum,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,.15)',fill:false,tension:.4,borderWidth:2.5,borderDash:[5,3]}
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,animation:{duration:300},
        plugins:{legend:{position:'top'},tooltip:{callbacks:{label:(ctx)=>ctx.dataset.label+': '+fmtBR(ctx.parsed.y)}}},
        scales:{y:{ticks:{callback:v=>'R$ '+(v/1000).toFixed(0)+'k',font:{size:10}},grid:{color:'#F1F5F9'}},x:{ticks:{font:{size:10}}}}
      }
    });
  }
}

function renderFisicFin(){
  const body=d.getElementById('pia-an-body');
  const months=genMonths();
  const grouped={};
  _budget.forEach(l=>{grouped[l.discipline]=(grouped[l.discipline]||0)+Number(l.total_price||0);});
  const discNames=Object.keys(grouped).sort();
  const total=Object.values(grouped).reduce((a,b)=>a+b,0);
  const DM={tubulacao:'#DC2626',mecanica:'#EA580C',eletrica:'#EAB308',instrumentacao:'#A855F7',civil:'#0EA5E9',hidraulica:'#06B6D4',pintura:'#EC4899',caldeiraria:'#84CC16',isolamento:'#14B8A6',seguranca:'#10B981'};
  const matrix={};
  discNames.forEach(disc=>{matrix[disc]=distribute(grouped[disc],months.length);});
  const totalMensal=months.map((_,i)=>discNames.reduce((s,d)=>s+matrix[d][i],0));
  const totalAcum=[]; let acc=0;
  totalMensal.forEach(v=>{acc+=v;totalAcum.push(acc);});
  const info=d.getElementById('pia-an-info'); if(info) info.textContent='Total: '+fmtBR(total)+' · '+months.length+' meses';
  let html=`<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:${200+months.length*100}px">
    <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1"><tr>
      <th style="text-align:left;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase;min-width:180px">Disciplina</th>
      ${months.map(m=>`<th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase">${m}</th>`).join('')}
      <th style="text-align:right;padding:9px 11px;font-size:10.5px;font-weight:700;color:#0F172A;text-transform:uppercase;background:#F1F5F9">Total</th>
    </tr></thead><tbody>`;
  discNames.forEach(disc=>{
    const c=DM[disc]||'#64748B'; const td=grouped[disc];
    html+=`<tr style="border-top:1px solid #F1F5F9">
      <td style="padding:7px 11px;border-left:3px solid ${c};font-weight:600;color:${c}">${esc(disc).toUpperCase()}</td>
      ${matrix[disc].map(v=>`<td style="padding:7px 11px;text-align:right;font-family:monospace">${fmtBR(v)}</td>`).join('')}
      <td style="padding:7px 11px;text-align:right;font-weight:700;background:#F8FAFC;font-family:monospace">${fmtBR(td)}</td>
    </tr>`;
  });
  html+=`<tr style="background:#F1F5F9;border-top:2px solid #CBD5E1">
    <td style="padding:9px 11px;font-weight:800;color:#0F172A">TOTAL</td>
    ${totalMensal.map(v=>`<td style="padding:9px 11px;text-align:right;font-weight:800;font-family:monospace">${fmtBR(v)}</td>`).join('')}
    <td style="padding:9px 11px;text-align:right;font-weight:800;background:#0F172A;color:#fff;font-family:monospace">${fmtBR(total)}</td>
  </tr>
  <tr style="background:#0F172A;color:#fff">
    <td style="padding:9px 11px;font-weight:800">ACUMULADO</td>
    ${totalAcum.map(v=>`<td style="padding:9px 11px;text-align:right;font-family:monospace;font-weight:700">${fmtBR(v)}</td>`).join('')}
    <td></td>
  </tr>`;
  html+=`</tbody></table></div>`;
  body.innerHTML=html;
}

w.PIAAnalytics={ open };
} catch(e){ console.warn('[analytics] init falhou:',e); }
})(window,document);
