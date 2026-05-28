/*! PROJECT.IA - budget-extras v1
 *  Funcionalidades adicionais do Orçamento:
 *  - Item 6: Auto-vincular IA (isos → orçamento)
 *  - Item 7: Import BOM Excel/CSV
 *  - Item 8: Comentários inline
 *  - Item 9: Comparativo Planning × Budget HH
 */
(function(w,d){'use strict';
try {

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtBR(n){if(n==null||isNaN(n))return 'R$ 0,00';return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n));}
function fmtN(n,dec){if(n==null||isNaN(n))return '0';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||4}).format(Number(n));}
function getProjectId(){return (w._curProject && w._curProject.id) || w.curProj || null;}
function getOrgId(){return (w._org && w._org.id) || null;}

// ============================================================
// Item 6: Auto-vincular IA — puxa isos do projeto pro orçamento
// ============================================================
async function autoLinkIsosToBudget(){
  const pid = getProjectId();
  if(!pid){ alert('Selecione um projeto'); return; }
  if(!confirm('Buscar todos os isométricos cadastrados e adicionar automaticamente ao orçamento?\n\nA IA agrupará juntas por diâmetro/material e criará linhas usando as composições de soldagem.')) return;

  try {
    // 1. Pega todas as folhas iso do projeto
    const {data:sheets, error} = await w.sb.from('isometric_sheets')
      .select('*').eq('project_id', pid).is('deleted_at', null);
    if(error) throw error;
    if(!sheets || !sheets.length){ alert('Nenhum isométrico encontrado nesse projeto.'); return; }

    // 2. Pega juntas e materiais (se existem)
    const {data:joints} = await w.sb.from('joints')
      .select('*').in('sheet_id', sheets.map(s=>s.id));
    const {data:materials} = await w.sb.from('isometric_materials')
      .select('*').in('sheet_id', sheets.map(s=>s.id));

    // 3. Pega base de composições
    const {data:comps} = await w.sb.from('compositions').select('id,code,description,unit,base_price,discipline').eq('discipline','tubulacao');

    // 4. Resolve: agrupa juntas por diâmetro e mapeia pra composição
    const linesByCode = {};
    (joints||[]).forEach(j => {
      const dia = j.diameter_inches || j.diameter || null;
      if(!dia) return;
      // mapear pra código de composição correspondente
      const code = mapDiameterToWeldCode(dia);
      if(!code) return;
      const c = comps.find(c=>c.code===code);
      if(!c) return;
      linesByCode[c.id] = (linesByCode[c.id]||0) + 1;
    });

    // Materiais → linhas separadas (se houver)
    (materials||[]).forEach(m => {
      const code = m.description || m.item || '';
      // Aqui poderia ter um mapping mais sofisticado
    });

    if(Object.keys(linesByCode).length === 0){
      alert('Não foi possível mapear juntas pra composições. Verifique se há juntas cadastradas com diâmetro.');
      return;
    }

    // 5. Insere linhas no orçamento
    const orgId = getOrgId();
    const inserts = [];
    for(const [compId, qty] of Object.entries(linesByCode)){
      const c = comps.find(c=>c.id===compId);
      if(!c) continue;
      inserts.push({
        org_id: orgId, project_id: pid,
        composition_id: compId, discipline: c.discipline,
        description: c.description, unit: c.unit,
        quantity: qty, unit_price: c.base_price || 0
      });
    }

    const {error:insErr} = await w.sb.from('project_composition_lines').insert(inserts);
    if(insErr) throw insErr;
    await w.sb.rpc('calc_project_abc', {p_project_id: pid});
    alert('✓ '+inserts.length+' linhas criadas a partir de '+sheets.length+' isométricos');
    if(w.PIABudget) w.PIABudget.open();
  } catch(e){
    alert('Erro: '+(e.message||e));
  }
}

function mapDiameterToWeldCode(diaInches){
  const d = parseFloat(diaInches);
  if(isNaN(d)) return null;
  if(d<=0.5) return 'PIA.SOLD.001';
  if(d<=0.75) return 'PIA.SOLD.002';
  if(d<=1) return 'PIA.SOLD.003';
  if(d<=2) return 'PIA.SOLD.004';
  if(d<=3) return 'PIA.SOLD.005';
  if(d<=4) return 'PIA.SOLD.006';
  if(d<=6) return 'PIA.SOLD.007';
  if(d<=8) return 'PIA.SOLD.008';
  if(d<=10) return 'PIA.SOLD.009';
  return 'PIA.SOLD.010';
}

// ============================================================
// Item 7: Import BOM (Excel/CSV)
// ============================================================
function openBOMImport(){
  const pid = getProjectId();
  if(!pid){ alert('Selecione um projeto'); return; }
  const ov = d.createElement('div');
  ov.id = 'pia-bom-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9760;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:600px;width:100%;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div><div style="font-size:16px;font-weight:800;color:#0F172A">📥 Importar BOM (Excel/CSV)</div>
        <div style="font-size:11.5px;color:#64748B;margin-top:2px">Suba uma planilha com quantitativos e o sistema cria as linhas do orçamento</div></div>
        <button class="bom-close" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:11px 14px;font-size:12px;color:#1E40AF;margin-bottom:14px">
        <strong>Formato esperado (colunas):</strong><br>
        <code style="background:#fff;padding:1px 5px;border-radius:4px">disciplina | descrição | unidade | quantidade | preço_unit</code>
      </div>
      <input id="bom-file" type="file" accept=".csv,.xlsx,.xls" style="width:100%;padding:14px;border:2px dashed #8B5CF6;border-radius:9px;background:#F5F3FF;cursor:pointer;font-size:12.5px">
      <div id="bom-preview" style="margin-top:14px;max-height:300px;overflow-y:auto"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E2E8F0">
        <button class="bom-close" style="background:#F1F5F9;color:#334155;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Cancelar</button>
        <button id="bom-import" disabled style="background:#10B981;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;opacity:.5">Importar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.bom-close').forEach(b => b.onclick = ()=>ov.remove());
  let _parsed = [];
  d.getElementById('bom-file').onchange = async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = w.XLSX.read(buf, {type:'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = w.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
      if(rows.length < 2){ alert('Arquivo vazio'); return; }
      // Assume header row: disciplina, descrição, unidade, quantidade, preço_unit
      const data = rows.slice(1).filter(r => r[0] && r[1]).map(r => ({
        discipline: String(r[0]).toLowerCase().trim(),
        description: String(r[1]).trim(),
        unit: String(r[2]||'un').trim(),
        quantity: parseFloat(r[3]) || 0,
        unit_price: parseFloat(r[4]) || 0
      }));
      _parsed = data;
      d.getElementById('bom-preview').innerHTML = `
        <div style="font-size:11.5px;font-weight:700;color:#475569;margin-bottom:6px">${data.length} linhas detectadas:</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;background:#fff;border:1px solid #E2E8F0;border-radius:7px;overflow:hidden">
          <thead style="background:#F8FAFC"><tr><th style="text-align:left;padding:6px 9px">Disc.</th><th style="text-align:left;padding:6px 9px">Descrição</th><th>Un</th><th>Qtd</th><th>R$/un</th></tr></thead>
          <tbody>${data.slice(0,10).map(r => `<tr style="border-top:1px solid #F1F5F9"><td style="padding:5px 9px">${esc(r.discipline)}</td><td style="padding:5px 9px">${esc(r.description.slice(0,50))}</td><td style="padding:5px 9px;text-align:center">${esc(r.unit)}</td><td style="padding:5px 9px;text-align:right">${fmtN(r.quantity,2)}</td><td style="padding:5px 9px;text-align:right">${fmtBR(r.unit_price)}</td></tr>`).join('')}</tbody>
        </table>
        ${data.length>10?`<div style="font-size:11px;color:#94A3B8;margin-top:5px">... e mais ${data.length-10} linhas</div>`:''}
      `;
      const btn = d.getElementById('bom-import');
      btn.disabled = false; btn.style.opacity = '1';
    } catch(err){ alert('Erro ao ler arquivo: '+err.message); }
  };
  d.getElementById('bom-import').onclick = async ()=>{
    if(!_parsed.length) return;
    try {
      const orgId = getOrgId();
      const inserts = _parsed.map(r => ({...r, org_id: orgId, project_id: pid}));
      const {error} = await w.sb.from('project_composition_lines').insert(inserts);
      if(error) throw error;
      await w.sb.rpc('calc_project_abc', {p_project_id: pid});
      alert('✓ '+inserts.length+' linhas importadas');
      ov.remove();
      if(w.PIABudget) w.PIABudget.open();
    } catch(e){ alert('Erro: '+(e.message||e)); }
  };
}

// ============================================================
// Item 8: Comentários inline em linha do orçamento
// ============================================================
async function openComments(budgetLineId){
  const {data:line} = await w.sb.from('project_composition_lines').select('description').eq('id', budgetLineId).single();
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9770;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <div style="padding:16px 20px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:start">
        <div><div style="font-size:15px;font-weight:800;color:#0F172A">💬 Comentários</div>
        <div style="font-size:11.5px;color:#64748B;margin-top:2px">${esc((line&&line.description||'').slice(0,60))}</div></div>
        <button class="cm-close" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>
      <div id="cm-list" style="flex:1;overflow-y:auto;padding:14px 20px;min-height:200px"></div>
      <div style="padding:12px 20px;border-top:1px solid #E2E8F0;display:flex;gap:8px">
        <textarea id="cm-input" rows="2" placeholder="Escreva um comentário..." style="flex:1;padding:8px 11px;border:1px solid #E2E8F0;border-radius:7px;font-size:12.5px;resize:none;font-family:inherit"></textarea>
        <button id="cm-send" style="background:#0EA5E9;color:#fff;border:none;padding:8px 16px;border-radius:7px;cursor:pointer;font-size:12.5px;font-weight:700">Enviar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.cm-close').forEach(b => b.onclick = ()=>ov.remove());

  async function loadComments(){
    const {data} = await w.sb.from('budget_line_comments').select('*').eq('budget_line_id', budgetLineId).order('created_at');
    const list = d.getElementById('cm-list');
    if(!data || data.length===0){ list.innerHTML = '<div style="text-align:center;color:#94A3B8;padding:30px">Sem comentários ainda</div>'; return; }
    list.innerHTML = data.map(c => `
      <div style="background:#F8FAFC;border-radius:9px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:4px">
          <strong>${esc(c.user_name||'Usuário')}</strong>
          <span>${new Date(c.created_at).toLocaleString('pt-BR')}</span>
        </div>
        <div style="font-size:12.5px;color:#1E293B;white-space:pre-wrap">${esc(c.comment)}</div>
      </div>
    `).join('');
    list.scrollTop = list.scrollHeight;
  }
  loadComments();

  d.getElementById('cm-send').onclick = async ()=>{
    const inp = d.getElementById('cm-input');
    const txt = inp.value.trim();
    if(!txt) return;
    try {
      await w.sb.from('budget_line_comments').insert({
        budget_line_id: budgetLineId,
        user_id: w._user?.id,
        user_name: w._user?.email || 'Usuário',
        comment: txt
      });
      inp.value = '';
      loadComments();
    } catch(e){ alert('Erro: '+(e.message||e)); }
  };
}

// ============================================================
// Item 9: Comparativo Planning × Budget HH
// ============================================================
async function openHHCompare(){
  const orgId = getOrgId();
  if(!orgId){ alert('Organização não identificada'); return; }
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9670;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:1280px;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#10B981 0%,#F59E0B 100%);display:flex;align-items:center;justify-content:center;font-size:22px">⚖️</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800">HH Planejamento × Orçamento</div>
          <div style="font-size:11.5px;opacity:.7">Comparativo lado a lado dos coeficientes de produtividade</div>
        </div>
        <button class="hhc-close" style="background:rgba(255,255,255,.10);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>
      <div id="hhc-body" style="flex:1;overflow:auto;padding:18px 22px"></div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.hhc-close').forEach(b => b.onclick = ()=>ov.remove());

  try {
    const {data} = await w.sb.from('productivity_params').select('*').eq('org_id', orgId);
    const planning = (data||[]).filter(r => r.scope==='planning');
    const budget = (data||[]).filter(r => r.scope==='budget');
    const body = d.getElementById('hhc-body');

    if(planning.length === 0){
      body.innerHTML = '<div style="padding:60px;text-align:center;color:#94A3B8"><div style="font-size:48px">⏱</div><div style="font-weight:600;color:#475569;margin-top:8px">Sem parâmetros HH ainda</div><div style="font-size:12.5px;margin-top:6px">Crie em <strong>Orçamento → ⏱ HH</strong></div></div>';
      return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;font-size:11.5px;background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden">
      <thead><tr style="background:#F8FAFC;color:#475569">
        <th style="text-align:left;padding:9px 11px;font-weight:700;font-size:10.5px;text-transform:uppercase">Perfil</th>
        <th style="text-align:left;padding:9px 11px">Processo</th>
        <th style="text-align:left;padding:9px 11px">Material</th>
        <th colspan="2" style="text-align:center;padding:9px 11px;background:#ECFDF5;color:#065F46">HH/m</th>
        <th colspan="2" style="text-align:center;padding:9px 11px;background:#FFFBEB;color:#92400E">HH/junta</th>
        <th colspan="2" style="text-align:center;padding:9px 11px;background:#EFF6FF;color:#1E40AF">HH/suporte</th>
        <th colspan="2" style="text-align:center;padding:9px 11px;background:#FAF5FF;color:#6B21A8">HH/flange</th>
      </tr>
      <tr style="background:#F8FAFC;font-size:10px;color:#64748B">
        <th></th><th></th><th></th>
        <th style="padding:5px 7px">Plan</th><th style="padding:5px 7px">Orç</th>
        <th style="padding:5px 7px">Plan</th><th style="padding:5px 7px">Orç</th>
        <th style="padding:5px 7px">Plan</th><th style="padding:5px 7px">Orç</th>
        <th style="padding:5px 7px">Plan</th><th style="padding:5px 7px">Orç</th>
      </tr></thead><tbody>`;

    planning.forEach(p => {
      const b = budget.find(x => x.label && p.label && x.label.startsWith(p.label.split(' (')[0]));
      const cell = (pv, bv) => {
        if(pv==null && bv==null) return '<td></td><td></td>';
        const diff = (pv && bv) ? ((bv-pv)/pv*100) : null;
        return `<td style="padding:7px 9px;text-align:right;font-family:monospace">${pv!=null?fmtN(pv,4):'—'}</td>
                <td style="padding:7px 9px;text-align:right;font-family:monospace;font-weight:${bv?700:400};color:${diff>0?'#F59E0B':'#64748B'}">${bv!=null?fmtN(bv,4):'—'}${diff?`<div style="font-size:9.5px;color:${diff>0?'#92400E':'#10B981'}">+${diff.toFixed(0)}%</div>`:''}</td>`;
      };
      html += `<tr style="border-top:1px solid #F1F5F9">
        <td style="padding:7px 11px;font-weight:600">${esc(p.label||'—')}</td>
        <td style="padding:7px 11px">${esc(p.process||'—')}</td>
        <td style="padding:7px 11px">${esc(p.material||'—')}</td>
        ${cell(p.hh_per_meter, b?.hh_per_meter)}
        ${cell(p.hh_per_joint, b?.hh_per_joint)}
        ${cell(p.hh_per_support, b?.hh_per_support)}
        ${cell(p.hh_per_flange, b?.hh_per_flange)}
      </tr>`;
    });
    html += '</tbody></table>';
    body.innerHTML = html;
  } catch(e){
    d.getElementById('hhc-body').innerHTML = `<div style="padding:30px;text-align:center;color:#991B1B">⚠️ ${esc(e.message||e)}</div>`;
  }
}

w.PIABudgetExtras = { autoLinkIsosToBudget, openBOMImport, openComments, openHHCompare };

} catch(e){ console.warn('[budget-extras] init falhou:', e); }
})(window, document);
