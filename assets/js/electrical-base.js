/*! PROJECT.IA - electrical-base v1
 *  Base Elétrica Unificada — Cabos, Eletrodutos, Quadros, SPDA, Catálogo
 *  Modal único com tabs internas. Substitui 4 botões da sidebar por 1.
 */
(function(w,d){'use strict';
try {

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtN(n,d){if(n==null||isNaN(n))return '—';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||4}).format(Number(n));}

function getProjectId(){
  return (w._curProject && w._curProject.id) || w.curProj || null;
}
function getOrgId(){
  return (w._org && w._org.id) || null;
}

// ============================================================
// SCHEMAS DAS TABS - cada uma define tabela, colunas, label
// ============================================================
const TABS = [
  {
    id:'cables', label:'Cabos do projeto', icon:'🔌', color:'#EAB308',
    table:'electrical_cables', scopeByProject:true,
    cols:[
      {f:'cable_tag',          l:'TAG',          w:90,  edit:'text', required:true},
      {f:'origin',             l:'Origem',       w:140, edit:'text'},
      {f:'destination',        l:'Destino',      w:140, edit:'text'},
      {f:'function_type',      l:'Função',       w:110, edit:'select', opts:['Força','Comando','Controle','Iluminação','Sinal','MT']},
      {f:'voltage_v',          l:'Tensão (V)',   w:80,  edit:'num'},
      {f:'cable_type',         l:'Tipo',         w:90,  edit:'text', placeholder:'XLPE/EPR/PVC'},
      {f:'conductor_count',    l:'Veias',        w:60,  edit:'num'},
      {f:'cross_section_mm2',  l:'Bitola (mm²)', w:90,  edit:'num'},
      {f:'length_m',           l:'Comp. (m)',    w:80,  edit:'num'},
      {f:'installed',          l:'Instalado',    w:80,  edit:'bool'}
    ],
    addFromCatalog:true
  },
  {
    id:'eletroducts', label:'Eletrodutos', icon:'↗', color:'#06B6D4',
    table:'eletroduct_runs', scopeByProject:true,
    cols:[
      {f:'tag',               l:'TAG',          w:90,  edit:'text', required:true},
      {f:'origin',            l:'Origem',       w:140, edit:'text'},
      {f:'destination',       l:'Destino',      w:140, edit:'text'},
      {f:'diameter_mm',       l:'Ø (mm)',       w:80,  edit:'num'},
      {f:'material',          l:'Material',     w:120, edit:'select', opts:['Galvanizado','PVC rígido','Aço carbono','Inox','Alumínio']},
      {f:'length_m',          l:'Comp. (m)',    w:90,  edit:'num'},
      {f:'length_installed_m',l:'Instalado (m)',w:100, edit:'num'},
      {f:'pct_installed',     l:'% inst',       w:70,  edit:'num'},
      {f:'supports_qty',      l:'Suportes',     w:80,  edit:'num'}
    ]
  },
  {
    id:'panels', label:'Quadros / CCM', icon:'⚡', color:'#F59E0B',
    table:'electrical_panels', scopeByProject:true,
    cols:[
      {f:'tag',                l:'TAG',          w:90,  edit:'text', required:true},
      {f:'name',               l:'Nome',         w:160, edit:'text'},
      {f:'panel_type',         l:'Tipo',         w:110, edit:'select', opts:['QGBT','CCM','Distribuição','Tomadas','Iluminação','UPS','MT']},
      {f:'location',           l:'Local',        w:140, edit:'text'},
      {f:'voltage_v',          l:'Tensão (V)',   w:80,  edit:'num'},
      {f:'current_a',          l:'Corrente (A)', w:90,  edit:'num'},
      {f:'short_circuit_ka',   l:'Icc (kA)',     w:80,  edit:'num'},
      {f:'ip_rating',          l:'IP',           w:70,  edit:'text', placeholder:'IP54'},
      {f:'manufacturer',       l:'Fabricante',   w:120, edit:'text'},
      {f:'status',             l:'Status',       w:100, edit:'select', opts:['Projetado','Fabricado','Instalado','Energizado','Operação','Inspeção']}
    ]
  },
  {
    id:'spda', label:'SPDA / Aterramento', icon:'🌩', color:'#A855F7',
    table:'electrical_grounding', scopeByProject:true,
    cols:[
      {f:'location',                l:'Local',                w:160, edit:'text', required:true},
      {f:'spda_type',               l:'Tipo SPDA',            w:110, edit:'select', opts:['Franklin','Gaiola Faraday','PDA','Aterramento elétrico','Malha']},
      {f:'measurement_date',        l:'Data medição',         w:110, edit:'date'},
      {f:'measured_resistance_ohm', l:'Resist. medida (Ω)',   w:120, edit:'num'},
      {f:'required_resistance_ohm', l:'Resist. requerida (Ω)',w:130, edit:'num'},
      {f:'soil_resistivity_ohm_m',  l:'Resistividade (Ω·m)',  w:120, edit:'num'},
      {f:'measurement_instrument',  l:'Instrumento',          w:130, edit:'text'},
      {f:'result',                  l:'Resultado',            w:100, edit:'select', opts:['Aprovado','Reprovado','Pendente']},
      {f:'responsible_engineer',    l:'Resp. técnico',        w:140, edit:'text'}
    ]
  },
  {
    id:'catalog', label:'Catálogo de Cabos', icon:'📚', color:'#8B5CF6',
    table:'cable_specs_catalog', scopeByProject:false, readonly:true,
    cols:[
      {f:'manufacturer',      l:'Fabricante',    w:120, edit:'text'},
      {f:'product_line',      l:'Linha',         w:140, edit:'text'},
      {f:'cable_type',        l:'Tipo',          w:100, edit:'text'},
      {f:'voltage_rating',    l:'Classe Vn',     w:90,  edit:'text'},
      {f:'cross_section_mm2', l:'Bitola (mm²)',  w:100, edit:'num'},
      {f:'conductor_count',   l:'Veias',         w:60,  edit:'num'},
      {f:'ampacity_air_a',    l:'Iz ar (A)',     w:80,  edit:'num'},
      {f:'ampacity_ground_a', l:'Iz solo (A)',   w:80,  edit:'num'},
      {f:'resistance_ohm_km', l:'R (Ω/km)',      w:80,  edit:'num'},
      {f:'outer_diameter_mm', l:'Ø ext (mm)',    w:80,  edit:'num'},
      {f:'standard',          l:'Norma',         w:120, edit:'text'}
    ],
    hint:'Catálogo de referência — selecione uma spec e clique em "Usar no projeto" pra criar uma linha em Cabos do Projeto'
  }
];

let _activeTab = 'cables';
let _rows = [];
let _filter = '';

function open(initialTab){
  if(initialTab) _activeTab = initialTab;
  let ov = d.getElementById('pia-elec-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-elec-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9620;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};

  ov.innerHTML = renderShell();
  if(w.PIAShell && w.PIAShell.inlineWrap(ov, 'electrical', 'tab-elec-base')){} else { d.body.appendChild(ov); }

  d.getElementById('pia-elec-close').onclick = ()=> ov.remove();
  wireUp();
  loadAndRender();
}

function tabMeta(id){ return TABS.find(t=>t.id===id) || TABS[0]; }

function renderShell(){
  const tabs = TABS.map(t => {
    const active = t.id === _activeTab;
    return `<button class="pia-elec-tab" data-tab="${t.id}" style="background:${active?t.color:'transparent'};color:${active?'#fff':'#475569'};border:none;padding:9px 16px;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;border-radius:8px 8px 0 0;transition:all .15s;border-bottom:3px solid ${active?t.color:'transparent'}">${t.icon} ${esc(t.label)}</button>`;
  }).join('');

  return `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:1320px;height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative;overflow:hidden">

      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#EAB308 0%,#F59E0B 100%);display:flex;align-items:center;justify-content:center;font-size:22px">⚡</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800;letter-spacing:-.2px">Base Elétrica</div>
          <div style="font-size:11.5px;opacity:.7;margin-top:1px">Cabos · Eletrodutos · Quadros · SPDA · Catálogo</div>
        </div>
        <button id="pia-elec-close" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>

      <div style="padding:0 16px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;gap:4px;align-items:flex-end">${tabs}</div>

      <div style="padding:12px 22px;border-bottom:1px solid #F1F5F9;display:flex;gap:10px;align-items:center;background:#fff">
        <div style="flex:1;position:relative">
          <input id="pia-elec-search" placeholder="Filtrar por qualquer coluna..." style="width:100%;padding:8px 12px 8px 34px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;outline:none">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94A3B8">🔍</span>
        </div>
        <button id="pia-elec-add" class="btn bp">+ Novo</button>
        <button id="pia-elec-refresh" style="background:#F1F5F9;color:#334155;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">↻</button>
        <span id="pia-elec-count" style="font-size:11.5px;color:#64748B;font-weight:600"></span>
      </div>

      <div id="pia-elec-hint" style="padding:0"></div>
      <div id="pia-elec-body" style="flex:1;overflow:auto"></div>
    </div>
  `;
}

function wireUp(){
  d.querySelectorAll('.pia-elec-tab').forEach(b => {
    b.onclick = ()=>{
      _activeTab = b.dataset.tab;
      _filter = '';
      // Re-render shell (mantém estado dos tabs)
      d.getElementById('pia-elec-ov').innerHTML = renderShell();
      wireUp();
      loadAndRender();
    };
  });
  d.getElementById('pia-elec-search').oninput = (e)=>{ _filter = e.target.value.toLowerCase().trim(); renderRows(); };
  d.getElementById('pia-elec-add').onclick = ()=> openForm();
  d.getElementById('pia-elec-refresh').onclick = ()=> loadAndRender();
}

async function loadAndRender(){
  const meta = tabMeta(_activeTab);
  const body = d.getElementById('pia-elec-body');
  body.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8">⏳ Carregando...</div>';

  if(meta.hint){
    d.getElementById('pia-elec-hint').innerHTML = `<div style="padding:9px 22px;background:#FFFBEB;border-bottom:1px solid #FDE68A;font-size:11.5px;color:#92400E">💡 ${esc(meta.hint)}</div>`;
  } else {
    d.getElementById('pia-elec-hint').innerHTML = '';
  }

  if(meta.readonly){
    d.getElementById('pia-elec-add').style.display = 'none';
  } else {
    d.getElementById('pia-elec-add').style.display = '';
  }

  try {
    if(!w.sb) throw new Error('Supabase não inicializado');
    let q = w.sb.from(meta.table).select('*').limit(500);
    if(meta.scopeByProject){
      const pid = getProjectId();
      if(!pid){
        body.innerHTML = '<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:46px">📋</div><div style="font-weight:600;color:#475569;margin-top:8px">Selecione um projeto</div><div style="font-size:12px;margin-top:4px">Sidebar → Obra → Projetos</div></div>';
        return;
      }
      q = q.eq('project_id', pid);
    }
    q = q.order('created_at', {ascending:false});
    const {data, error} = await q;
    if(error) throw error;
    _rows = (data||[]).filter(r => !r.deleted_at);
    renderRows();
  } catch(e){
    body.innerHTML = `<div style="padding:30px;text-align:center;color:#991B1B"><div style="font-size:32px">⚠️</div><div style="font-weight:600">Erro</div><div style="font-size:12px;color:#64748B;margin-top:4px">${esc(e.message||e)}</div></div>`;
  }
}

function renderRows(){
  const meta = tabMeta(_activeTab);
  const body = d.getElementById('pia-elec-body');

  let rows = _rows.slice();
  if(_filter){
    rows = rows.filter(r => meta.cols.some(c => String(r[c.f]||'').toLowerCase().includes(_filter)));
  }

  d.getElementById('pia-elec-count').textContent = rows.length + (rows.length === 1 ? ' registro' : ' registros');

  if(rows.length === 0){
    body.innerHTML = `<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:46px">📋</div><div style="font-weight:600;color:#475569;margin-top:8px">Sem registros</div><div style="font-size:12px;margin-top:4px">${meta.readonly ? 'Catálogo vazio' : 'Clique em + Novo pra começar'}</div></div>`;
    return;
  }

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<thead style="position:sticky;top:0;background:#fff;z-index:1"><tr style="border-bottom:2px solid #E2E8F0;color:#475569">';
  meta.cols.forEach(c => {
    html += `<th style="text-align:left;padding:10px 11px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;width:${c.w}px">${esc(c.l)}</th>`;
  });
  html += '<th style="width:90px"></th></tr></thead><tbody>';

  rows.forEach(r => {
    html += `<tr data-id="${esc(r.id)}" style="border-bottom:1px solid #F1F5F9;transition:background .1s" onmouseover="this.style.background='#FAFBFD'" onmouseout="this.style.background=''">`;
    meta.cols.forEach(c => {
      const v = r[c.f];
      let cell = '';
      if(c.edit === 'bool'){
        cell = v ? '<span style="color:#10B981;font-weight:700">✓ Sim</span>' : '<span style="color:#94A3B8">—</span>';
      } else if(c.edit === 'num'){
        cell = `<span style="font-family:'JetBrains Mono',monospace">${fmtN(v,2)}</span>`;
      } else if(c.edit === 'date' && v){
        cell = new Date(v).toLocaleDateString('pt-BR');
      } else if(c.edit === 'select'){
        const colors = {'Aprovado':'#10B981','OK':'#10B981','Energizado':'#10B981','Operação':'#10B981','Reprovado':'#DC2626','Pendente':'#F59E0B','Projetado':'#94A3B8'};
        const cc = colors[v] || '#475569';
        cell = v ? `<span style="background:${cc}1A;color:${cc};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600">${esc(v)}</span>` : '<span style="color:#CBD5E1">—</span>';
      } else {
        cell = esc(v||'—');
      }
      html += `<td style="padding:9px 11px;color:#1E293B">${cell}</td>`;
    });

    let actions = '';
    if(meta.readonly && meta.id === 'catalog'){
      actions = `<button onclick="PIAElectricalBase.useFromCatalog('${esc(r.id)}')" title="Usar este no projeto" style="background:#8B5CF6;color:#fff;border:none;padding:5px 9px;border-radius:6px;cursor:pointer;font-size:10.5px;font-weight:700">Usar →</button>`;
    } else if(!meta.readonly){
      actions = `<button onclick="PIAElectricalBase.editRow('${esc(r.id)}')" title="Editar" style="background:transparent;border:none;cursor:pointer;color:#64748B;font-size:14px;padding:4px 6px;border-radius:5px" onmouseover="this.style.background='#E0F2FE';this.style.color='#0369A1'" onmouseout="this.style.background='transparent';this.style.color='#64748B'">✎</button>
        <button onclick="PIAElectricalBase.deleteRow('${esc(r.id)}')" title="Excluir" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;font-size:14px;padding:4px 6px;border-radius:5px" onmouseover="this.style.background='#FEE2E2';this.style.color='#DC2626'" onmouseout="this.style.background='transparent';this.style.color='#94A3B8'">🗑</button>`;
    }
    html += `<td style="padding:9px 8px;text-align:center;white-space:nowrap">${actions}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  body.innerHTML = html;
}

function openForm(existing){
  const meta = tabMeta(_activeTab);
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};

  let fields = '';
  meta.cols.forEach(c => {
    const val = existing ? (existing[c.f]==null?'':existing[c.f]) : '';
    const req = c.required ? ' required' : '';
    if(c.edit === 'select'){
      const opts = (c.opts||[]).map(o => `<option value="${esc(o)}" ${o==val?'selected':''}>${esc(o)}</option>`).join('');
      fields += `<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><select id="fld-${c.f}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"><option value="">— Selecione —</option>${opts}</select></div>`;
    } else if(c.edit === 'bool'){
      fields += `<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="fld-${c.f}" ${val?'checked':''} style="width:16px;height:16px;cursor:pointer"><label for="fld-${c.f}" style="font-size:12.5px;color:#334155;cursor:pointer">${esc(c.l)}</label></div>`;
    } else if(c.edit === 'date'){
      fields += `<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><input id="fld-${c.f}" type="date" value="${esc(val)}"${req} style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"></div>`;
    } else if(c.edit === 'num'){
      fields += `<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><input id="fld-${c.f}" type="number" step="any" value="${esc(val)}"${req} style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;font-family:'JetBrains Mono',monospace"></div>`;
    } else {
      fields += `<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><input id="fld-${c.f}" type="text" value="${esc(val)}" placeholder="${esc(c.placeholder||'')}"${req} style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"></div>`;
    }
  });

  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:580px;width:100%;max-height:88vh;overflow-y:auto;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:800;color:#0F172A">${existing?'Editar':'Novo'} — ${esc(meta.label)}</div>
        </div>
        <button class="elec-form-close" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>
      ${fields}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E2E8F0">
        <button class="elec-form-close" style="background:#F1F5F9;color:#334155;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Cancelar</button>
        <button id="elec-form-save" style="background:${meta.color};color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">Salvar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.elec-form-close').forEach(b => b.onclick = ()=>ov.remove());
  d.getElementById('elec-form-save').onclick = async ()=>{
    const payload = {};
    meta.cols.forEach(c => {
      const el = d.getElementById('fld-'+c.f);
      if(!el) return;
      if(c.edit === 'bool') payload[c.f] = el.checked;
      else if(c.edit === 'num'){ const n = parseFloat(el.value); payload[c.f] = isNaN(n)?null:n; }
      else { payload[c.f] = el.value.trim() || null; }
    });
    if(meta.scopeByProject){ payload.project_id = getProjectId(); payload.org_id = getOrgId(); }

    try {
      let res;
      if(existing){
        res = await w.sb.from(meta.table).update(payload).eq('id', existing.id);
      } else {
        res = await w.sb.from(meta.table).insert(payload);
      }
      if(res.error) throw res.error;
      ov.remove();
      loadAndRender();
    } catch(e){ alert('Erro: ' + (e.message||e)); }
  };
}

async function editRow(id){
  const r = _rows.find(x=>x.id===id);
  if(r) openForm(r);
}
async function deleteRow(id){
  const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir registro", "Este registro será removido. Esta ação não pode ser desfeita.", "Excluir") : Promise.resolve(confirm("Excluir registro?")));
  if(!_ok) return;
  try {
    const meta = tabMeta(_activeTab);
    // soft-delete se a tabela tiver deleted_at
    const r = _rows.find(x=>x.id===id);
    const hasSoftDelete = r && ('deleted_at' in r);
    let res;
    if(hasSoftDelete){
      res = await w.sb.from(meta.table).update({deleted_at: new Date().toISOString()}).eq('id', id);
    } else {
      res = await w.sb.from(meta.table).delete().eq('id', id);
    }
    if(res.error) throw res.error;
    loadAndRender();
  } catch(e){ alert('Erro: ' + (e.message||e)); }
}

async function useFromCatalog(catId){
  const spec = _rows.find(x=>x.id===catId);
  if(!spec){ alert('Spec não encontrada'); return; }
  const pid = getProjectId();
  if(!pid){ alert('Selecione um projeto primeiro'); return; }
  const tag = prompt('TAG do novo cabo no projeto (ex: CB-001):', '');
  if(!tag) return;
  const payload = {
    org_id: getOrgId(),
    project_id: pid,
    cable_tag: tag,
    cable_type: spec.cable_type,
    conductor_count: spec.conductor_count,
    cross_section_mm2: spec.cross_section_mm2,
    voltage_v: parseInt(spec.voltage_rating) || null,
    notes: 'Selecionado do catálogo: '+(spec.manufacturer||'')+' '+(spec.product_line||'')
  };
  try {
    const {error} = await w.sb.from('electrical_cables').insert(payload);
    if(error) throw error;
    alert('✓ Cabo criado no projeto a partir do catálogo. Abra a aba "Cabos do projeto" pra completar.');
    _activeTab = 'cables';
    d.getElementById('pia-elec-ov').innerHTML = renderShell();
    wireUp();
    loadAndRender();
  } catch(e){ alert('Erro: '+(e.message||e)); }
}

w.PIAElectricalBase = { open, editRow, deleteRow, useFromCatalog };

} catch(e){ console.warn('[electrical-base] init falhou:', e); }
})(window, document);
