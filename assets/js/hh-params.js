/*! PROJECT.IA - hh-params v1
 *  Gerenciador de Parâmetros HH com 2 scopes:
 *  - Planejamento (HH real, usado no HUB)
 *  - Orçamento (HH com margem, usado na venda)
 *  Permite duplicar Planejamento → Orçamento com fator de margem.
 */
(function(w,d){'use strict';
try {

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtN(n,dec){if(n==null||isNaN(n))return '—';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||4}).format(Number(n));}

function getOrgId(){return (w._org && w._org.id) || null;}

let _scope = 'planning';
let _rows = [];

const COLS = [
  {f:'label',         l:'Perfil',         w:160, edit:'text', required:true},
  {f:'process',       l:'Processo',       w:100, edit:'select', opts:['SMAW','GTAW','SAW','FCAW','GMAW','Híbrido','Manual']},
  {f:'material',      l:'Material',       w:90,  edit:'select', opts:['CS','SS','Galv','Inox','Alumínio','Cobre','Outro']},
  {f:'diameter_min_in',l:'Ø min (pol)',    w:75,  edit:'num'},
  {f:'diameter_max_in',l:'Ø max (pol)',    w:75,  edit:'num'},
  {f:'schedule',      l:'Schedule',       w:80,  edit:'text'},
  {f:'hh_per_meter',  l:'HH/m',           w:80,  edit:'num'},
  {f:'hh_per_joint',  l:'HH/junta',       w:85,  edit:'num'},
  {f:'hh_per_support',l:'HH/suporte',     w:90,  edit:'num'},
  {f:'hh_per_flange', l:'HH/flange',      w:85,  edit:'num'},
  {f:'factor_inox',   l:'Fator inox',     w:80,  edit:'num'},
  {f:'factor_galv',   l:'Fator galv',     w:80,  edit:'num'},
  {f:'factor_field',  l:'Fator campo',    w:90,  edit:'num'},
  {f:'is_default',    l:'Default',        w:75,  edit:'bool'}
];

function open(){
  const orgId = getOrgId();
  if(!orgId){ alert('Organização não identificada.'); return; }
  let ov = d.getElementById('pia-hh-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-hh-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9660;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = renderShell();
  if(w.PIAShell && w.PIAShell.inlineWrap(ov, 'hh-params', 'tab-prod')){} else { d.body.appendChild(ov); }
  wire();
  loadAndRender();
}

function renderShell(){
  return `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:1200px;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative;overflow:hidden">

      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#06B6D4 0%,#0EA5E9 100%);display:flex;align-items:center;justify-content:center;font-size:22px">⏱️</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800;letter-spacing:-.2px">Parâmetros HH</div>
          <div style="font-size:11.5px;opacity:.7;margin-top:1px">Coeficientes de produtividade · planejamento (HH real) vs orçamento (HH com margem)</div>
        </div>
        <button id="pia-hh-close" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>

      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;background:#fff;border:1px solid #E2E8F0;border-radius:9px;padding:3px;gap:2px">
          <button class="pia-hh-scope" data-s="planning" style="background:${_scope==='planning'?'#10B981':'transparent'};color:${_scope==='planning'?'#fff':'#475569'};border:none;padding:8px 18px;border-radius:7px;cursor:pointer;font-size:12.5px;font-weight:700">📐 Planejamento</button>
          <button class="pia-hh-scope" data-s="budget"   style="background:${_scope==='budget'?'#F59E0B':'transparent'};color:${_scope==='budget'?'#fff':'#475569'};border:none;padding:8px 18px;border-radius:7px;cursor:pointer;font-size:12.5px;font-weight:700">💰 Orçamento</button>
        </div>
        <button id="pia-hh-add" class="btn bp">+ Novo perfil</button>
        <button id="pia-hh-dup"  class="btn bg">⎘ Duplicar planning → budget</button>
        <span id="pia-hh-count" style="margin-left:auto;font-size:11.5px;color:#64748B;font-weight:600"></span>
      </div>

      <div id="pia-hh-hint" style="padding:10px 22px;background:${_scope==='budget'?'#FFFBEB':'#EFF6FF'};border-bottom:1px solid ${_scope==='budget'?'#FDE68A':'#BFDBFE'};font-size:11.5px;color:${_scope==='budget'?'#92400E':'#1E40AF'}">
        ${_scope==='planning' ? '📐 Modo Planejamento — esses HH são usados pelo HUB Planejador para gerar cronograma e dimensionar equipe.' :
          '💰 Modo Orçamento — esses HH são usados pelo módulo de Orçamento. Tipicamente 15-25% maiores que o planejamento para cobrir contingências e margem.'}
      </div>

      <div id="pia-hh-body" style="flex:1;overflow:auto"></div>
    </div>
  `;
}

function wire(){
  d.getElementById('pia-hh-close').onclick = ()=> d.getElementById('pia-hh-ov').remove();
  d.getElementById('pia-hh-add').onclick = ()=> openForm();
  d.getElementById('pia-hh-dup').onclick = ()=> openDuplicateDialog();
  d.querySelectorAll('.pia-hh-scope').forEach(b=>{
    b.onclick = ()=>{
      _scope = b.dataset.s;
      const ov = d.getElementById('pia-hh-ov');
      ov.innerHTML = renderShell();
      wire(); loadAndRender();
    };
  });
}

async function loadAndRender(){
  const body = d.getElementById('pia-hh-body');
  body.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8">⏳ Carregando...</div>';
  try {
    if(!w.sb) throw new Error('Supabase não inicializado');
    const orgId = getOrgId();
    const {data, error} = await w.sb.from('productivity_params')
      .select('*').eq('org_id', orgId).eq('scope', _scope)
      .order('label').order('process');
    if(error) throw error;
    _rows = data || [];
    renderRows();
  } catch(e){
    body.innerHTML = `<div style="padding:30px;text-align:center;color:#991B1B"><div style="font-size:32px">⚠️</div><div style="font-weight:600">Erro</div><div style="font-size:12px;color:#64748B;margin-top:4px">${esc(e.message||e)}</div></div>`;
  }
}

function renderRows(){
  const body = d.getElementById('pia-hh-body');
  d.getElementById('pia-hh-count').textContent = _rows.length + ' parâmetros';

  if(_rows.length === 0){
    const msg = _scope === 'budget'
      ? 'Nenhum parâmetro HH de orçamento. Clique em <strong>⎘ Duplicar planning → budget</strong> para criar a partir dos perfis de planejamento.'
      : 'Nenhum parâmetro HH de planejamento. Clique em <strong>+ Novo perfil</strong>.';
    body.innerHTML = `<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:46px">📋</div><div style="font-weight:600;color:#475569;margin-top:8px">Sem registros</div><div style="font-size:12.5px;margin-top:6px;max-width:480px;margin-left:auto;margin-right:auto">${msg}</div></div>`;
    return;
  }

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<thead style="position:sticky;top:0;background:#fff;z-index:1"><tr style="border-bottom:2px solid #E2E8F0;color:#475569">';
  COLS.forEach(c => {
    html += `<th style="text-align:left;padding:10px 11px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;min-width:${c.w}px">${esc(c.l)}</th>`;
  });
  html += '<th style="width:90px"></th></tr></thead><tbody>';

  _rows.forEach(r => {
    html += `<tr data-id="${esc(r.id)}" style="border-bottom:1px solid #F1F5F9" onmouseover="this.style.background='#FAFBFD'" onmouseout="this.style.background=''">`;
    COLS.forEach(c => {
      const v = r[c.f];
      let cell = '';
      if(c.edit === 'bool'){ cell = v ? '<span style="color:#10B981;font-weight:700">✓</span>' : '—'; }
      else if(c.edit === 'num'){ cell = `<span style="font-family:'JetBrains Mono',monospace">${fmtN(v,4)}</span>`; }
      else { cell = esc(v||'—'); }
      html += `<td style="padding:9px 11px">${cell}</td>`;
    });
    html += `<td style="padding:9px 8px;text-align:center;white-space:nowrap">
      <button onclick="PIAHHParams.editRow('${esc(r.id)}')" title="Editar" style="background:transparent;border:none;cursor:pointer;color:#64748B;font-size:14px;padding:4px 6px;border-radius:5px">✎</button>
      <button onclick="PIAHHParams.deleteRow('${esc(r.id)}')" title="Excluir" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;font-size:14px;padding:4px 6px;border-radius:5px">🗑</button>
    </td></tr>`;
  });
  html += '</tbody></table>';
  body.innerHTML = html;
}

function openForm(existing){
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9750;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};

  let fields = '';
  COLS.forEach(c => {
    const val = existing ? (existing[c.f]==null?'':existing[c.f]) : '';
    const req = c.required ? ' required' : '';
    if(c.edit === 'select'){
      const opts = (c.opts||[]).map(o => `<option value="${esc(o)}" ${o==val?'selected':''}>${esc(o)}</option>`).join('');
      fields += `<div style="margin-bottom:9px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><select id="hh-fld-${c.f}" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"><option value="">—</option>${opts}</select></div>`;
    } else if(c.edit === 'bool'){
      fields += `<div style="margin-bottom:9px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="hh-fld-${c.f}" ${val?'checked':''} style="width:16px;height:16px;cursor:pointer"><label for="hh-fld-${c.f}" style="font-size:12.5px;color:#334155;cursor:pointer">${esc(c.l)}</label></div>`;
    } else if(c.edit === 'num'){
      fields += `<div style="margin-bottom:9px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><input id="hh-fld-${c.f}" type="number" step="any" value="${esc(val)}"${req} style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;font-family:'JetBrains Mono',monospace"></div>`;
    } else {
      fields += `<div style="margin-bottom:9px"><label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">${esc(c.l)}</label><input id="hh-fld-${c.f}" type="text" value="${esc(val)}"${req} style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px"></div>`;
    }
  });

  const scopeColor = _scope==='budget' ? '#F59E0B' : '#10B981';
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:800;color:#0F172A">${existing?'Editar':'Novo'} parâmetro HH</div>
          <div style="font-size:11.5px;color:${scopeColor};font-weight:700;margin-top:2px">${_scope==='budget'?'💰 Orçamento (com margem)':'📐 Planejamento (HH real)'}</div>
        </div>
        <button class="hh-form-close" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">${fields}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E2E8F0">
        <button class="hh-form-close" style="background:#F1F5F9;color:#334155;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Cancelar</button>
        <button id="hh-form-save" style="background:${scopeColor};color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700">Salvar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.hh-form-close').forEach(b => b.onclick = ()=>ov.remove());
  d.getElementById('hh-form-save').onclick = async ()=>{
    const payload = {scope: _scope, org_id: getOrgId()};
    COLS.forEach(c => {
      const el = d.getElementById('hh-fld-'+c.f);
      if(!el) return;
      if(c.edit === 'bool') payload[c.f] = el.checked;
      else if(c.edit === 'num'){ const n = parseFloat(el.value); payload[c.f] = isNaN(n)?null:n; }
      else { payload[c.f] = el.value.trim() || null; }
    });
    try {
      let res;
      if(existing){
        res = await w.sb.from('productivity_params').update(payload).eq('id', existing.id);
      } else {
        res = await w.sb.from('productivity_params').insert(payload);
      }
      if(res.error) throw res.error;
      ov.remove();
      loadAndRender();
    } catch(e){ alert('Erro: '+(e.message||e)); }
  };
}

async function editRow(id){
  const r = _rows.find(x=>x.id===id);
  if(r) openForm(r);
}

async function deleteRow(id){
  const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir perfil HH", "O perfil de produtividade será removido.", "Excluir") : Promise.resolve(confirm("Excluir perfil HH?")));
  if(!_ok) return;
  try {
    const {error} = await w.sb.from('productivity_params').delete().eq('id', id);
    if(error) throw error;
    loadAndRender();
  } catch(e){ alert('Erro: '+(e.message||e)); }
}

async function openDuplicateDialog(){
  const orgId = getOrgId();
  // Buscar perfis de planning disponíveis
  const {data} = await w.sb.from('productivity_params')
    .select('label').eq('org_id', orgId).eq('scope', 'planning');
  const labels = Array.from(new Set((data||[]).map(r=>r.label).filter(Boolean)));
  if(labels.length === 0){
    alert('Nenhum perfil de planejamento encontrado. Crie um perfil planning primeiro.');
    return;
  }

  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9760;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:500px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:800;color:#0F172A">Duplicar planning → budget</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px">Cria perfil de Orçamento aplicando margem aos HH de Planejamento</div>
        </div>
        <button class="hh-dup-close" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Perfil de origem (planejamento)</label>
        <select id="hh-dup-src" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px">
          ${labels.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Margem (%)</label>
        <input id="hh-dup-margin" type="number" step="1" value="20" min="0" max="100" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px;font-family:'JetBrains Mono',monospace">
        <div style="font-size:10.5px;color:#94A3B8;margin-top:3px">Ex: 20% → HH do orçamento será 1,20× o do planejamento</div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;display:block;margin-bottom:4px">Novo label (opcional)</label>
        <input id="hh-dup-label" type="text" placeholder="Auto: 'Perfil X (orçamento +20%)'" style="width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:13px">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E2E8F0">
        <button class="hh-dup-close" style="background:#F1F5F9;color:#334155;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Cancelar</button>
        <button id="hh-dup-go" class="btn bg">⎘ Duplicar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.hh-dup-close').forEach(b => b.onclick = ()=>ov.remove());
  d.getElementById('hh-dup-go').onclick = async ()=>{
    const src = d.getElementById('hh-dup-src').value;
    const margin = parseFloat(d.getElementById('hh-dup-margin').value || '20');
    const newLabel = d.getElementById('hh-dup-label').value.trim() || null;
    const factor = 1 + (margin/100);
    try {
      const {data, error} = await w.sb.rpc('duplicate_hh_to_budget', {
        p_org_id: orgId, p_source_label: src, p_factor: factor, p_new_label: newLabel
      });
      if(error) throw error;
      ov.remove();
      alert('✓ '+data+' perfis criados em Orçamento (+'+margin+'%)');
      _scope = 'budget';
      const main = d.getElementById('pia-hh-ov');
      if(main){ main.innerHTML = renderShell(); wire(); loadAndRender(); }
    } catch(e){ alert('Erro: '+(e.message||e)); }
  };
}

w.PIAHHParams = { open, editRow, deleteRow };

} catch(e){ console.warn('[hh-params] init falhou:', e); }
})(window, document);
