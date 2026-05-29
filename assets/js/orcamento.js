/*! PROJECT.IA - Orcamento v10 - hierarquia em arvore
 *  4 niveis: capitulo > grupo > subgrupo > linha
 *  WBS auto-gerado, drag-drop, subtotais recursivos, templates
 */
(function(w,d){'use strict';
try {

const BDI_DEFAULT = { admin: 5, lucro: 10, riscos: 2, impostos: 8.65, financeiro: 1 };
const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';
function getSb(){
  if(w.sb) return w.sb;
  if(w.supabase && typeof w.supabase.createClient === 'function'){
    if(w.__pia_sb){ w.sb = w.__pia_sb; return w.sb; }
    try { w.sb = w.__pia_sb = w.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey:'sb-toapdhfouuedaexgqlsv-auth-token', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }); return w.sb; } catch(_){}
  }
  return null;
}
function n(x){ const v = parseFloat(x); return isNaN(v) ? 0 : v; }
function brl(x){ if(x==null||isNaN(x)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)); }
function pct(x){ if(x==null||isNaN(x)) return '0%'; return Number(x).toFixed(1).replace('.',',')+'%'; }
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const DISCIPLINES_OPTS = [
  ['civil','Civil'],['eletrica','Eletrica'],['hidraulica','Hidraulica'],
  ['pintura','Pintura'],['caldeiraria','Caldeiraria'],['tubulacao','Tubulacao'],
  ['mecanica','Mecanica'],['instrumentacao','Instrumentacao']
];

let _state = {
  project: null,
  budget: null,
  items: [],         // todos os items (capitulo, grupo, subgrupo, linha) — flat
  tree: [],          // items organizados em arvore (root)
  compositions: [],
  view: 'bom',
  filterDisc: 'todas',
  filterText: '',
  expandedItemId: null,
  scheduleTasks: [],
  curvaS: [],
  evmKpi: null,
  templates: [],
  collapsed: new Set(),  // ids de capitulos/grupos colapsados
  mode: 'tree'        // 'tree' | 'flat'
};

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

// ============================================================
// OPEN — entry point
// ============================================================
async function open(){
  const sb = getSb();
  let pid = getProjectId();
  if(!pid && Array.isArray(w.projects) && w.projects[0]) pid = w.projects[0].id;
  if(!pid){
    for(let i=0;i<10;i++){
      await new Promise(r => setTimeout(r, 200));
      if(Array.isArray(w.projects) && w.projects[0]){ pid = w.projects[0].id; break; }
    }
  }
  if(!pid){
    try {
      const r = await sb.from('projects').select('id,name,code').is('deleted_at',null).order('created_at',{ascending:false});
      if(r.data && r.data.length){ await openProjectPicker(r.data); return; }
      alert('Nenhum projeto encontrado nessa organizacao. Crie um projeto primeiro.'); return;
    } catch(e){ alert('Nao foi possivel carregar projetos: ' + (e.message||e)); return; }
  }
  _state.project = { id: pid, name: getProjectName() };
  const prev = d.getElementById('pia-orc-overlay');
  if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-orc-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit;display:flex;flex-direction:column';
  d.body.appendChild(ov);
  await loadAll();
  renderShell();
}

async function openProjectPicker(projects){
  return new Promise(resolve => {
    const ov = d.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px';
    ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)"><div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A)">Selecione um projeto</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Escolha em qual projeto quer trabalhar o orcamento</div></div><button id="pia-orc-pk-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div><div id="pia-orc-pk-list" style="flex:1;overflow-y:auto;padding:10px 14px"></div></div>';
    d.body.appendChild(ov);
    d.getElementById('pia-orc-pk-list').innerHTML = projects.map(p =>
      '<button data-pid="' + p.id + '" class="orc-pk-item" style="display:block;width:100%;text-align:left;background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:11px 14px;margin:6px 0;cursor:pointer;font-family:inherit"><div style="font-size:13.5px;font-weight:700;color:var(--t9,#0F172A)">' + esc(p.name||'(sem nome)') + '</div>' + (p.code ? '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px;font-family:ui-monospace,monospace">' + esc(p.code) + '</div>' : '') + '</button>'
    ).join('');
    ov.querySelectorAll('.orc-pk-item').forEach(btn => {
      btn.onclick = () => {
        const sel = projects.find(x => String(x.id) === String(btn.dataset.pid));
        if(sel){ try { w._curProject={id:sel.id,name:sel.name}; w.curProj=sel.id; localStorage.setItem('pia.curProj', sel.id); } catch(_){} }
        ov.remove(); resolve(sel);
        setTimeout(()=> open(), 50);
      };
    });
    d.getElementById('pia-orc-pk-close').onclick = ()=>{ ov.remove(); resolve(null); };
    ov.onclick = e =>{ if(e.target===ov){ ov.remove(); resolve(null); } };
  });
}

// ============================================================
// LOAD ALL — busca budget + items + composicoes + templates
// ============================================================
async function loadAll(){
  const sb = getSb();
  const orgId = (w._org && w._org.id) || null;
  const pid = _state.project.id;
  let budgetR = await sb.from('budgets').select('*').eq('project_id', pid).order('created_at', { ascending: false }).limit(1);
  let budget = (budgetR.data || []).filter(b => !b.deleted_at)[0];
  if(!budget){
    const today = new Date();
    const ymd = today.toISOString().slice(0,10).replace(/-/g,'');
    const rnd = Math.floor(Math.random()*900 + 100);
    const ins = await sb.from('budgets').insert({
      org_id: orgId, project_id: pid,
      budget_number: 'ORC-' + ymd + '-' + rnd,
      title: 'Orcamento principal - ' + _state.project.name,
      issue_date: today.toISOString().slice(0,10),
      status: 'rascunho',
      bdi: BDI_DEFAULT
    }).select().single();
    if(ins.error){
      budget = { id: null, org_id: orgId, project_id: pid, title: 'Orcamento (nao salvo)', bdi: { ...BDI_DEFAULT }, status: 'rascunho', total_amount: 0, final_amount: 0 };
    } else { budget = ins.data; }
  }
  _state.budget = budget;
  if(!budget.bdi || (typeof budget.bdi === 'object' && Object.keys(budget.bdi).length === 0)) budget.bdi = { ...BDI_DEFAULT };
  // Items
  if(budget.id){
    const itemsR = await sb.from('budget_items').select('*').eq('budget_id', budget.id).is('deleted_at', null).order('display_order',{ascending:true,nullsFirst:false});
    _state.items = itemsR.data || [];
  } else { _state.items = []; }
  buildTree();
  // Composicoes da base
  try {
    const compsR = await sb.from('compositions').select('id,code,description,unit,discipline,base_price,source').eq('is_active', true).order('discipline').order('code').limit(2000);
    _state.compositions = compsR.data || [];
  } catch(_){}
  // Templates
  try {
    const tpR = await sb.from('budget_templates').select('id,name,description,category,structure,is_system').order('is_system',{ascending:false}).order('name');
    _state.templates = tpR.data || [];
  } catch(_){}
  // Schedule tasks (comparativo) + Curva S
  try {
    const tR = await sb.from('schedule_tasks').select('*').eq('project_id', pid).is('deleted_at', null);
    _state.scheduleTasks = tR.data || [];
  } catch(_){}
  await loadCurvaS();
}

async function loadCurvaS(){
  _state.curvaS = []; _state.evmKpi = null;
  const sb = getSb();
  const bid = _state.budget && _state.budget.id;
  if(!bid) return;
  try {
    const [cR, kR] = await Promise.all([
      sb.rpc('budget_curva_s', { p_budget_id: bid }),
      sb.rpc('budget_evm_snapshot', { p_budget_id: bid })
    ]);
    _state.curvaS = Array.isArray(cR.data) ? cR.data : [];
    _state.evmKpi = (kR.data && kR.data[0]) || null;
  } catch(_){}
}

// ============================================================
// TREE — build, calc subtotals, WBS code
// ============================================================
function buildTree(){
  const items = _state.items || [];
  const byId = {};
  items.forEach(it => { it._children = []; byId[it.id] = it; });
  const roots = [];
  items.forEach(it => {
    if(it.parent_id && byId[it.parent_id]) byId[it.parent_id]._children.push(it);
    else roots.push(it);
  });
  // Ordena por display_order (fallback item_order)
  const sortFn = (a,b) => (a.display_order ?? a.item_order ?? 999) - (b.display_order ?? b.item_order ?? 999);
  roots.sort(sortFn);
  items.forEach(it => it._children.sort(sortFn));
  _state.tree = roots;
  // Calcula subtotais recursivos
  roots.forEach(calcSubtotal);
  // Atualiza WBS codes
  generateWBS(roots, '');
}
function calcSubtotal(node){
  if(node.item_type === 'linha'){
    node._subtotal = n(node.total_price);
    return node._subtotal;
  }
  node._subtotal = (node._children||[]).reduce((s,c) => s + calcSubtotal(c), 0);
  return node._subtotal;
}
function generateWBS(nodes, prefix){
  nodes.forEach((node, i) => {
    let code;
    if(node.item_type === 'capitulo') code = String(i+1).padStart(2,'0');
    else if(node.item_type === 'grupo') code = prefix + '.' + String(i+1).padStart(2,'0');
    else if(node.item_type === 'subgrupo') code = prefix + '.' + String(i+1).padStart(3,'0');
    else code = prefix + '.' + String(i+1).padStart(3,'0');
    node._wbs = code;
    if(node._children && node._children.length) generateWBS(node._children, code);
  });
}
function calcTotals(){
  const items = _state.items || [];
  const subtotal = items
    .filter(i => i.item_type === 'linha')
    .reduce((s,i) => s + n(i.total_price), 0);
  const bdi = (_state.budget && _state.budget.bdi) || BDI_DEFAULT;
  const bdiTotalPct = n(bdi.admin) + n(bdi.lucro) + n(bdi.riscos) + n(bdi.impostos) + n(bdi.financeiro);
  const bdiValue = subtotal * (bdiTotalPct / 100);
  const final = subtotal + bdiValue;
  return { subtotal, bdiTotalPct, bdiValue, final };
}

// ============================================================
// SHELL — overlay header + tabs
// ============================================================
function renderShell(){
  const ov = d.getElementById('pia-orc-overlay');
  if(!ov) return;
  const totals = calcTotals();
  const v = _state.view;
  ov.innerHTML =
    '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<button class="btn bg" onclick="document.getElementById(\'pia-orc-overlay\').remove()" style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Orcamento do Projeto</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Projeto: <strong>' + esc(_state.project.name) + '</strong> &middot; Subtotal ' + brl(totals.subtotal) + ' &middot; BDI ' + pct(totals.bdiTotalPct) + ' &middot; <strong>Total ' + brl(totals.final) + '</strong></div></div>'
    + '<div style="flex:1"></div>'
    + '<button class="btn bia" id="orc-import-ia" title="Importar orçamento de PDF/foto via IA"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>IA Import</button>'
    + '<button class="btn bg" id="orc-export-xlsx" title="Exportar Excel">Excel</button>'
    + '<button class="btn bg" id="orc-export-pdf" title="Exportar PDF">PDF</button>'
    + '</div>'
    + '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:0 22px;display:flex;gap:0;overflow-x:auto">'
    + tab('bom','Composicoes (BOM)', v) + tab('insumos','Insumos', v) + tab('bdi','BDI &amp; Impostos', v)
    + tab('cronograma','Cronograma Fisico-Financeiro', v) + tab('curva-abc','Curva ABC', v) + tab('comparativo','Comparativo', v)
    + '</div>'
    + '<div id="orc-body" style="flex:1;overflow:auto;padding:18px 22px;background:var(--t1,#F8FAFC)"></div>';
  ov.querySelectorAll('.orc-tab').forEach(b => b.onclick = ()=>{ _state.view = b.dataset.view; renderShell(); });
  d.getElementById('orc-export-xlsx').onclick = exportXLSX;
  d.getElementById('orc-export-csv').onclick = exportCSV;
  d.getElementById('orc-export-pdf').onclick = exportPDF;
  d.getElementById('orc-import-ia').onclick = openImportIA;
  const body = d.getElementById('orc-body');
  if(v === 'bom') renderBOM(body);
  else if(v === 'insumos') renderInsumos(body);
  else if(v === 'bdi') renderBDI(body);
  else if(v === 'cronograma') renderCronograma(body);
  else if(v === 'curva-abc') renderCurvaABC(body);
  else if(v === 'comparativo') renderComparativo(body);
}
function tab(id, label, cur){
  return '<button class="orc-tab" data-view="' + id + '" style="border:none;background:transparent;padding:13px 16px;cursor:pointer;font-weight:600;font-size:13px;color:' + (cur===id?'var(--t9)':'var(--t6)') + ';border-bottom:3px solid ' + (cur===id?'var(--accent,#1D4ED8)':'transparent') + ';font-family:inherit;white-space:nowrap">' + label + '</button>';
}

// ============================================================
// BOM VIEW — arvore hierarquica
// ============================================================
function renderBOM(el){
  const totals = calcTotals();
  const items = _state.items || [];
  const hasItems = items.length > 0;

  // Header com botoes principais
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div><div style="font-size:13.5px;font-weight:700;color:var(--t9,#0F172A)">Estrutura do orcamento</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + items.filter(i=>i.item_type==='linha').length + ' linha(s) &middot; ' + items.filter(i=>i.item_type==='capitulo').length + ' capitulo(s) &middot; Total: <strong style="color:var(--t9,#0F172A)">' + brl(totals.final) + '</strong></div></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button id="orc-tpl" class="btn bg" title="Aplicar template">Templates</button>'
    + '<button id="orc-add-cap" class="btn bp">+ Novo capitulo</button>'
    + '<button id="orc-add-comp" class="btn bg">Adicionar da Base</button>'
    + '<button id="orc-toggle-mode" class="btn bg" title="Alternar entre arvore e lista plana">' + (_state.mode==='tree'?'Lista':'Arvore') + '</button>'
    + '</div></div>';

  // Container da arvore
  if(!hasItems){
    el.insertAdjacentHTML('beforeend',
      '<div style="background:var(--t0,#fff);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;padding:48px;text-align:center">'
      + '<div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:6px">Orcamento vazio</div>'
      + '<div style="font-size:12.5px;color:var(--t6,#64748B);max-width:520px;margin:0 auto 14px">Crie capitulos e grupos pra organizar seu orcamento, ou aplique um template pra comecar com a estrutura padrao da industria.</div>'
      + '<div style="display:inline-flex;gap:8px"><button id="orc-empty-tpl" class="btn bp">Aplicar template</button><button id="orc-empty-cap" class="btn bg">Comecar do zero</button></div>'
      + '</div>');
    const tpEl = d.getElementById('orc-empty-tpl'); if(tpEl) tpEl.onclick = openTemplates;
    const capEl = d.getElementById('orc-empty-cap'); if(capEl) capEl.onclick = () => addNode(null, 'capitulo');
  } else {
    const treeHost = d.createElement('div');
    treeHost.id = 'orc-tree';
    treeHost.style.cssText = 'background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;overflow:hidden';
    el.appendChild(treeHost);
    if(_state.mode === 'tree') renderTree(treeHost);
    else renderFlat(treeHost);
  }

  // Wire-up
  const a1 = d.getElementById('orc-tpl');     if(a1) a1.onclick = openTemplates;
  const a2 = d.getElementById('orc-add-cap'); if(a2) a2.onclick = () => addNode(null, 'capitulo');
  const a3 = d.getElementById('orc-add-comp');if(a3) a3.onclick = openAddFromBase;
  const a4 = d.getElementById('orc-toggle-mode'); if(a4) a4.onclick = () => { _state.mode = (_state.mode==='tree'?'flat':'tree'); renderShell(); };
}

function renderTree(host){
  const totals = calcTotals();
  const grandTotal = totals.final;
  let html = '';
  (_state.tree || []).forEach(node => {
    html += renderNode(node, 0, grandTotal);
  });
  host.innerHTML = html;
  wireTreeEvents(host);
}

function renderNode(node, depth, grandTotal){
  const isLine = node.item_type === 'linha';
  const isCollapsed = _state.collapsed.has(node.id);
  const hasChildren = (node._children || []).length > 0;
  const subtotal = node._subtotal || 0;
  const pctTotal = grandTotal > 0 ? (subtotal / grandTotal * 100) : 0;

  if(isLine){
    return renderLineNode(node, depth);
  }

  // Header de capitulo/grupo/subgrupo
  const colors = {
    capitulo: { bg: 'rgba(29,78,216,.08)', border: 'var(--accent,#1D4ED8)', fg: 'var(--t9,#0F172A)' },
    grupo:    { bg: 'rgba(124,58,237,.06)', border: '#7C3AED', fg: 'var(--t9,#0F172A)' },
    subgrupo: { bg: 'rgba(100,116,139,.05)', border: 'var(--t6,#64748B)', fg: 'var(--t9,#0F172A)' }
  };
  const c = colors[node.item_type] || colors.subgrupo;
  const indent = depth * 18;

  let html = '<div class="orc-node" data-id="' + node.id + '" data-type="' + node.item_type + '" data-parent="' + (node.parent_id||'') + '" draggable="true" style="border-bottom:1px solid var(--t3,#E5E7EB)">'
    + '<div class="orc-node-head" style="padding:10px 14px 10px ' + (14+indent) + 'px;background:' + c.bg + ';border-left:3px solid ' + c.border + ';display:flex;align-items:center;gap:10px;cursor:default">'
    + '<button class="orc-toggle" data-id="' + node.id + '" title="' + (isCollapsed?'Expandir':'Recolher') + '" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:20px;height:20px;padding:0;display:flex;align-items:center;justify-content:center">'
    + (hasChildren ? (isCollapsed ? '&#9656;' : '&#9662;') : '&middot;')
    + '</button>'
    + '<span style="font-family:ui-monospace,monospace;font-size:10.5px;color:var(--t6,#64748B);min-width:60px">' + (node._wbs || '') + '</span>'
    + '<span style="flex:1;font-size:' + (node.item_type==='capitulo'?'13.5':'12.5') + 'px;font-weight:' + (node.item_type==='capitulo'?'800':'700') + ';color:' + c.fg + ';' + (node.item_type==='capitulo'?'text-transform:uppercase;letter-spacing:.3px':'') + '">' + esc(node.description||'(sem nome)') + '</span>'
    + '<span style="font-size:11px;color:var(--t6,#64748B);font-family:ui-monospace,monospace">' + pct(pctTotal) + '</span>'
    + '<span style="font-size:12.5px;font-weight:700;color:' + c.fg + ';font-family:ui-monospace,monospace;min-width:120px;text-align:right">' + brl(subtotal) + '</span>'
    + '<div style="display:flex;gap:4px">'
    + actionBtn(node.id, 'addChild', 'Adicionar', '&#43;')
    + actionBtn(node.id, 'edit', 'Editar nome', '&#9998;')
    + actionBtn(node.id, 'dup', 'Duplicar', '&#10063;')
    + actionBtn(node.id, 'del', 'Excluir', '&#10005;')
    + '</div>'
    + '</div>';

  if(!isCollapsed && hasChildren){
    html += '<div class="orc-children">';
    node._children.forEach(child => { html += renderNode(child, depth + 1, grandTotal); });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function actionBtn(id, action, title, glyph){
  return '<button class="orc-act" data-id="' + id + '" data-act="' + action + '" title="' + title + '" style="background:transparent;border:1px solid transparent;cursor:pointer;color:var(--t6,#64748B);width:24px;height:24px;border-radius:5px;padding:0;font-size:12px;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background=\'var(--t1,#F8FAFC)\';this.style.borderColor=\'var(--t3,#E5E7EB)\'" onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'transparent\'">' + glyph + '</button>';
}

function renderLineNode(node, depth){
  const indent = depth * 18;
  return '<div class="orc-node orc-line" data-id="' + node.id + '" data-type="linha" data-parent="' + (node.parent_id||'') + '" draggable="true" style="border-bottom:1px solid var(--t2,#F1F5F9)">'
    + '<div class="orc-line-row" style="padding:8px 14px 8px ' + (14+indent) + 'px;display:grid;grid-template-columns:50px 1fr 70px 50px 100px 110px auto;gap:10px;align-items:center;font-size:12.5px">'
    + '<span style="font-family:ui-monospace,monospace;font-size:10px;color:var(--t6,#64748B)">' + (node._wbs || '') + '</span>'
    + '<span style="color:var(--t9,#0F172A);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(node.description||'') + '">' + esc(node.description||'(sem nome)') + (node.code ? ' <span style="color:var(--t6,#64748B);font-family:ui-monospace,monospace;font-size:10px">[' + esc(node.code) + ']</span>' : '') + '</span>'
    + '<span style="text-align:right;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + n(node.qty).toFixed(2) + '</span>'
    + '<span style="color:var(--t6,#64748B);font-size:11px">' + esc(node.unit||'un') + '</span>'
    + '<span style="text-align:right;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + brl(n(node.unit_price)) + '</span>'
    + '<span style="text-align:right;font-family:ui-monospace,monospace;font-weight:700;color:var(--t9,#0F172A)">' + brl(n(node.total_price)) + '</span>'
    + '<div style="display:flex;gap:4px;justify-content:flex-end">'
    + actionBtn(node.id, 'edit', 'Editar linha', '&#9998;')
    + actionBtn(node.id, 'dup', 'Duplicar', '&#10063;')
    + actionBtn(node.id, 'del', 'Excluir', '&#10005;')
    + '</div>'
    + '</div></div>';
}

function renderFlat(host){
  const items = _state.items || [];
  const lines = items.filter(i => i.item_type === 'linha');
  if(lines.length === 0){
    host.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhuma linha. Adicione capitulos e linhas pra ver aqui em modo plano.</div>';
    return;
  }
  let html = '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="text-align:left">WBS</th><th style="text-align:left">Descricao</th><th style="text-align:right">Qtd</th><th>Un</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th><th></th></tr></thead><tbody>';
  lines.forEach(l => {
    html += '<tr><td style="font-family:ui-monospace,monospace;font-size:10.5px;color:var(--t6,#64748B)">' + (l._wbs||'') + '</td>'
      + '<td>' + esc(l.description||'') + '</td>'
      + '<td style="text-align:right;font-family:ui-monospace,monospace">' + n(l.qty).toFixed(2) + '</td>'
      + '<td>' + esc(l.unit||'un') + '</td>'
      + '<td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(l.unit_price)) + '</td>'
      + '<td style="text-align:right;font-family:ui-monospace,monospace;font-weight:700">' + brl(n(l.total_price)) + '</td>'
      + '<td style="text-align:right">' + actionBtn(l.id, 'edit', 'Editar', '&#9998;') + actionBtn(l.id, 'del', 'Excluir', '&#10005;') + '</td></tr>';
  });
  html += '</tbody></table>';
  host.innerHTML = html;
  wireTreeEvents(host);
}

function wireTreeEvents(host){
  // Toggle collapse
  host.querySelectorAll('.orc-toggle').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.id;
      if(_state.collapsed.has(id)) _state.collapsed.delete(id);
      else _state.collapsed.add(id);
      renderShell();
    };
  });
  // Acoes
  host.querySelectorAll('.orc-act').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.id;
      const act = b.dataset.act;
      const node = (_state.items||[]).find(x => x.id === id);
      if(!node) return;
      if(act === 'addChild') addChildPicker(node);
      else if(act === 'edit') editNode(node);
      else if(act === 'dup') duplicateNode(node);
      else if(act === 'del') deleteNode(node);
    };
  });
  // Drag-drop nativo HTML5
  host.querySelectorAll('.orc-node').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', el.dataset.id);
      el.style.opacity = '.5';
    });
    el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.style.background = 'rgba(29,78,216,.05)';
    });
    el.addEventListener('dragleave', () => { el.style.background = ''; });
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.style.background = '';
      const draggedId = e.dataTransfer.getData('text/plain');
      const targetId = el.dataset.id;
      if(!draggedId || draggedId === targetId) return;
      await moveNode(draggedId, targetId);
    });
  });
}

// ============================================================
// ACTIONS — add, edit, duplicate, delete, move
// ============================================================
function nextOrder(parentId){
  const items = _state.items || [];
  const siblings = items.filter(x => (x.parent_id||null) === (parentId||null));
  const max = siblings.reduce((m,x) => Math.max(m, x.display_order||0), 0);
  return max + 10;
}

async function addNode(parentId, type){
  const name = prompt(type === 'capitulo' ? 'Nome do capitulo:' : type === 'grupo' ? 'Nome do grupo:' : type === 'subgrupo' ? 'Nome do subgrupo:' : 'Descricao da linha:');
  if(!name || !name.trim()) return;
  const sb = getSb();
  const b = _state.budget;
  if(!b || !b.id){ alert('Salve o orcamento antes (clique em qualquer aba e volte).'); return; }
  const row = {
    budget_id: b.id,
    parent_id: parentId,
    item_type: type,
    description: name.trim().slice(0, 500),
    item_order: nextOrder(parentId),
    display_order: nextOrder(parentId),
    qty: type === 'linha' ? 1 : 0,
    unit: type === 'linha' ? 'un' : '',
    unit_price: 0
  };
  const ins = await sb.from('budget_items').insert(row).select().single();
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  await loadAll();
  renderShell();
}

async function addChildPicker(parentNode){
  // Mostra menu pra escolher: subgrupo, linha, ou outra opcao
  const opts = [];
  if(parentNode.item_type === 'capitulo'){
    opts.push({key:'grupo', label:'+ Grupo'});
    opts.push({key:'linha', label:'+ Linha (direto, sem grupo)'});
  } else if(parentNode.item_type === 'grupo'){
    opts.push({key:'subgrupo', label:'+ Subgrupo'});
    opts.push({key:'linha', label:'+ Linha'});
  } else {
    opts.push({key:'linha', label:'+ Linha'});
  }
  // Modal simples
  return new Promise(resolve => {
    const ov = d.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
    ov.onclick = e => { if(e.target===ov){ ov.remove(); resolve(null); } };
    ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:10px;padding:18px;max-width:360px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.18)"><div style="font-size:13.5px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:4px">Adicionar dentro de</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-bottom:14px">' + esc(parentNode.description||'') + '</div><div style="display:flex;flex-direction:column;gap:6px">' + opts.map(o => '<button data-k="' + o.key + '" class="btn bg" style="text-align:left;padding:10px 14px">' + o.label + '</button>').join('') + '</div></div>';
    d.body.appendChild(ov);
    ov.querySelectorAll('[data-k]').forEach(b => {
      b.onclick = async () => {
        ov.remove();
        const type = b.dataset.k;
        if(type === 'linha') await openLineEditor(null, parentNode.id);
        else await addNode(parentNode.id, type);
        resolve(null);
      };
    });
  });
}

async function openLineEditor(existingNode, parentId){
  const isEdit = !!existingNode;
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  const cur = existingNode || { description:'', qty:1, unit:'un', unit_price:0, code:'', discipline:'', month_index:'' };
  const discOpts = DISCIPLINES_OPTS.map(o => '<option value="' + o[0] + '"' + (cur.discipline===o[0]?' selected':'') + '>' + o[1] + '</option>').join('');
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:560px;width:100%;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A)">' + (isEdit?'Editar linha':'Nova linha') + '</div><button id="le-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div>'
    + '<div style="display:grid;grid-template-columns:120px 1fr;gap:10px">'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Codigo</label><input id="le-code" value="' + esc(cur.code||'') + '" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px;font-family:ui-monospace,monospace"></div>'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Descricao *</label><input id="le-desc" value="' + esc(cur.description||'') + '" required style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 90px 1fr 100px;gap:10px;margin-top:10px">'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Quantidade</label><input id="le-qty" type="number" step="0.01" value="' + n(cur.qty) + '" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px;font-family:ui-monospace,monospace"></div>'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Un</label><input id="le-unit" value="' + esc(cur.unit||'un') + '" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px"></div>'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Preco unit (R$)</label><input id="le-price" type="number" step="0.01" value="' + n(cur.unit_price) + '" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px;font-family:ui-monospace,monospace"></div>'
    + '<div><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Mes</label><input id="le-month" type="number" min="1" value="' + (cur.month_index||'') + '" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px;font-family:ui-monospace,monospace"></div>'
    + '</div>'
    + '<div style="margin-top:10px"><label style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Disciplina</label><select id="le-disc" style="width:100%;padding:9px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;margin-top:4px"><option value="">—</option>' + discOpts + '</select></div>'
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--t3,#E5E7EB)"><button id="le-cancel" class="btn bg">Cancelar</button><button id="le-save" class="btn bp">' + (isEdit?'Salvar':'Adicionar') + '</button></div>'
    + '</div>';
  d.body.appendChild(ov);
  d.getElementById('le-close').onclick = ()=> ov.remove();
  d.getElementById('le-cancel').onclick = ()=> ov.remove();
  d.getElementById('le-save').onclick = async ()=>{
    const sb = getSb();
    const b = _state.budget;
    const desc = d.getElementById('le-desc').value.trim();
    if(!desc){ alert('Descricao obrigatoria.'); return; }
    const payload = {
      description: desc.slice(0,500),
      qty: n(d.getElementById('le-qty').value) || 0,
      unit: (d.getElementById('le-unit').value || 'un').slice(0,20),
      unit_price: n(d.getElementById('le-price').value) || 0,
      code: d.getElementById('le-code').value.trim() || null,
      discipline: d.getElementById('le-disc').value || null,
      month_index: parseInt(d.getElementById('le-month').value) || null
    };
    if(isEdit){
      const u = await sb.from('budget_items').update(payload).eq('id', existingNode.id);
      if(u.error){ alert('Erro: ' + u.error.message); return; }
    } else {
      payload.budget_id = b.id;
      payload.parent_id = parentId;
      payload.item_type = 'linha';
      payload.item_order = nextOrder(parentId);
      payload.display_order = nextOrder(parentId);
      const ins = await sb.from('budget_items').insert(payload);
      if(ins.error){ alert('Erro: ' + ins.error.message); return; }
    }
    ov.remove();
    await loadAll();
    renderShell();
  };
}

async function editNode(node){
  if(node.item_type === 'linha') return openLineEditor(node, node.parent_id);
  const newName = prompt('Novo nome:', node.description||'');
  if(newName == null) return;
  const sb = getSb();
  const u = await sb.from('budget_items').update({ description: newName.trim().slice(0,500) }).eq('id', node.id);
  if(u.error){ alert('Erro: ' + u.error.message); return; }
  await loadAll();
  renderShell();
}

async function duplicateNode(node){
  const sb = getSb();
  const payload = {
    budget_id: node.budget_id,
    parent_id: node.parent_id,
    item_type: node.item_type,
    description: (node.description||'') + ' (copia)',
    qty: node.qty, unit: node.unit, unit_price: node.unit_price,
    code: node.code, discipline: node.discipline, month_index: node.month_index,
    item_order: nextOrder(node.parent_id),
    display_order: nextOrder(node.parent_id)
  };
  const ins = await sb.from('budget_items').insert(payload).select().single();
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  // Se tem filhos, replica recursivo
  if(node._children && node._children.length){
    for(const child of node._children){
      await duplicateRecursive(child, ins.data.id);
    }
  }
  await loadAll();
  renderShell();
}
async function duplicateRecursive(node, newParentId){
  const sb = getSb();
  const payload = {
    budget_id: node.budget_id, parent_id: newParentId, item_type: node.item_type,
    description: node.description, qty: node.qty, unit: node.unit, unit_price: node.unit_price,
    code: node.code, discipline: node.discipline, month_index: node.month_index,
    item_order: node.item_order, display_order: node.display_order
  };
  const ins = await sb.from('budget_items').insert(payload).select().single();
  if(ins.error || !ins.data) return;
  if(node._children && node._children.length){
    for(const child of node._children) await duplicateRecursive(child, ins.data.id);
  }
}

async function deleteNode(node){
  const descendants = countDescendants(node);
  const msg = node.item_type === 'linha'
    ? 'Excluir linha "' + (node.description||'') + '"?'
    : 'Excluir "' + (node.description||'') + '" e ' + descendants + ' item(ns) abaixo? Acao em cascata, nao pode ser desfeita.';
  if(!confirm(msg)) return;
  const sb = getSb();
  const d_ = await sb.from('budget_items').delete().eq('id', node.id);
  if(d_.error){ alert('Erro: ' + d_.error.message); return; }
  await loadAll();
  renderShell();
}
function countDescendants(node){
  let n = 0;
  (node._children||[]).forEach(c => { n++; n += countDescendants(c); });
  return n;
}

async function moveNode(draggedId, targetId){
  const items = _state.items || [];
  const dragged = items.find(x => x.id === draggedId);
  const target = items.find(x => x.id === targetId);
  if(!dragged || !target) return;
  // Nao pode mover dentro de si mesmo (loop)
  if(isDescendant(target, draggedId)) { alert('Nao da pra mover um item pra dentro dele mesmo.'); return; }
  // Define novo parent: se target eh container (capitulo/grupo/subgrupo) -> vira filho dele
  // Se target eh linha -> vira irmao (mesmo parent)
  const newParent = (target.item_type === 'linha') ? target.parent_id : target.id;
  // Validacao de tipos (linha so dentro de grupo/subgrupo, grupo so dentro de capitulo, etc)
  if(!canBeChildOf(dragged.item_type, newParent ? items.find(x=>x.id===newParent).item_type : null)){
    alert('Hierarquia invalida: ' + dragged.item_type + ' nao pode ficar dentro de ' + (newParent?items.find(x=>x.id===newParent).item_type:'raiz') + '.');
    return;
  }
  const sb = getSb();
  const u = await sb.from('budget_items').update({ parent_id: newParent, display_order: nextOrder(newParent) }).eq('id', draggedId);
  if(u.error){ alert('Erro: ' + u.error.message); return; }
  await loadAll();
  renderShell();
}
function isDescendant(node, ancestorId){
  if(node.id === ancestorId) return true;
  return (node._children||[]).some(c => isDescendant(c, ancestorId));
}
function canBeChildOf(childType, parentType){
  if(parentType === null){
    return childType === 'capitulo';  // raiz so aceita capitulo
  }
  const allowed = {
    capitulo: ['grupo','linha'],
    grupo: ['subgrupo','linha'],
    subgrupo: ['linha']
  };
  return (allowed[parentType] || []).includes(childType);
}

// ============================================================
// TEMPLATES — aplicar/salvar estrutura
// ============================================================
async function openTemplates(){
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  const tpls = _state.templates || [];
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:620px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A)">Templates de orcamento</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + tpls.length + ' template(s) disponivel(eis)</div></div><button id="tp-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div>'
    + '<div style="flex:1;overflow-y:auto;padding:12px 16px">'
    + tpls.map(t => '<button data-tid="' + t.id + '" class="tp-item" style="display:block;width:100%;text-align:left;background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:12px 14px;margin:6px 0;cursor:pointer;font-family:inherit"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:13.5px;font-weight:700;color:var(--t9,#0F172A)">' + esc(t.name) + '</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px">' + esc(t.description||'') + '</div></div>' + (t.is_system ? '<span style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);color:var(--t6,#64748B);font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:10px">SISTEMA</span>' : '') + '</div></button>').join('')
    + '</div>'
    + '<div style="padding:14px 18px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><button id="tp-save" class="btn bg" title="Salva a estrutura atual como template reusavel">Salvar atual como template</button><button id="tp-cancel" class="btn bg">Cancelar</button></div>'
    + '</div>';
  d.body.appendChild(ov);
  d.getElementById('tp-close').onclick = ()=> ov.remove();
  d.getElementById('tp-cancel').onclick = ()=> ov.remove();
  d.getElementById('tp-save').onclick = ()=> { ov.remove(); saveAsTemplate(); };
  ov.querySelectorAll('.tp-item').forEach(b => {
    b.onclick = async () => {
      const t = tpls.find(x => x.id === b.dataset.tid);
      if(!t) return;
      if(!confirm('Aplicar template "' + t.name + '"? Os itens existentes do orcamento serao preservados; o template sera adicionado abaixo.')) return;
      ov.remove();
      await applyTemplate(t);
    };
  });
}

async function applyTemplate(template){
  const sb = getSb();
  const b = _state.budget;
  if(!b || !b.id) return;
  const structure = Array.isArray(template.structure) ? template.structure : [];
  let order = nextOrder(null);
  for(const cap of structure){
    await insertTemplateNode(cap, null, order);
    order += 10;
  }
  await loadAll();
  renderShell();
}
async function insertTemplateNode(node, parentId, order){
  const sb = getSb();
  const payload = {
    budget_id: _state.budget.id,
    parent_id: parentId,
    item_type: node.type || 'grupo',
    description: node.name || '(sem nome)',
    item_order: order,
    display_order: order,
    qty: 0, unit: '', unit_price: 0
  };
  const ins = await sb.from('budget_items').insert(payload).select().single();
  if(ins.error || !ins.data) return;
  const newId = ins.data.id;
  const children = node.children || [];
  let childOrder = 10;
  for(const c of children){
    await insertTemplateNode(c, newId, childOrder);
    childOrder += 10;
  }
}

async function saveAsTemplate(){
  const name = prompt('Nome do template:');
  if(!name) return;
  const description = prompt('Descricao (opcional):') || '';
  const orgId = (w._org && w._org.id) || _state.budget.org_id;
  const structure = treeToStructure(_state.tree);
  const sb = getSb();
  const ins = await sb.from('budget_templates').insert({
    org_id: orgId, name: name.trim(), description: description.trim(),
    category: 'custom', structure: structure, is_system: false,
    created_by: (w._user && w._user.id) || null
  });
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  (window.PIAToast ? PIAToast('Template salvo.','success') : alert('Template salvo.'));
  await loadAll();
}
function treeToStructure(nodes){
  return (nodes||[]).filter(n => n.item_type !== 'linha').map(n => ({
    type: n.item_type,
    name: n.description,
    children: treeToStructure(n._children || [])
  }));
}

// ============================================================
// ADICIONAR DA BASE — modal para escolher composicoes
// ============================================================
async function openAddFromBase(){
  const comps = _state.compositions || [];
  if(comps.length === 0){ alert('Nenhuma composicao na base. Va em Suprimentos > Base de Composicoes pra cadastrar.'); return; }
  // Pergunta destino na arvore primeiro
  const container = await pickContainer();
  if(!container) return;
  // Mostra modal de composicoes
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:720px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)"><div style="padding:16px 20px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A)">Adicionar da Base</div><div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">Destino: <strong>' + esc(container.description||'raiz') + '</strong></div></div><button id="ab-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div><div style="padding:10px 16px;border-bottom:1px solid var(--t3,#E5E7EB)"><input id="ab-search" placeholder="Buscar por descricao, codigo, disciplina..." style="width:100%;padding:8px 12px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px"></div><div id="ab-list" style="flex:1;overflow-y:auto;padding:8px 16px"></div></div>';
  d.body.appendChild(ov);
  const list = d.getElementById('ab-list');
  const renderList = (q) => {
    const filtered = q ? comps.filter(c => (c.description||'').toLowerCase().includes(q) || (c.code||'').toLowerCase().includes(q) || (c.discipline||'').toLowerCase().includes(q)).slice(0,200) : comps.slice(0,200);
    list.innerHTML = filtered.map(c => '<button data-cid="' + c.id + '" class="ab-item" style="display:block;width:100%;text-align:left;background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:7px;padding:9px 12px;margin:4px 0;cursor:pointer;font-family:inherit"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;color:var(--t9,#0F172A);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.description||'(sem nome)') + '</div><div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:2px;font-family:ui-monospace,monospace">' + esc(c.code||'') + ' &middot; ' + esc(c.discipline||'') + ' &middot; ' + esc(c.unit||'un') + '</div></div><div style="font-size:12px;font-weight:700;color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(n(c.base_price)) + '</div></div></button>').join('') || '<div style="padding:20px;text-align:center;color:var(--t6,#64748B);font-size:12px">Nenhum resultado.</div>';
    list.querySelectorAll('.ab-item').forEach(b => {
      b.onclick = async ()=>{
        const c = comps.find(x => x.id === b.dataset.cid);
        if(!c) return;
        const qty = parseFloat(prompt('Quantidade de "' + (c.description||'') + '" (' + (c.unit||'un') + '):', '1') || '0');
        if(isNaN(qty) || qty <= 0) return;
        const sb = getSb();
        const ins = await sb.from('budget_items').insert({
          budget_id: _state.budget.id, parent_id: container.id,
          item_type: 'linha', description: c.description, qty: qty,
          unit: c.unit||'un', unit_price: n(c.base_price), code: c.code||null,
          discipline: c.discipline||null, composition_id: c.id,
          item_order: nextOrder(container.id), display_order: nextOrder(container.id)
        });
        if(ins.error){ alert('Erro: ' + ins.error.message); return; }
        ov.remove();
        await loadAll();
        renderShell();
      };
    });
  };
  renderList('');
  d.getElementById('ab-search').oninput = e => renderList((e.target.value||'').toLowerCase());
  d.getElementById('ab-close').onclick = ()=> ov.remove();
}

async function pickContainer(){
  // Lista de containers (capitulo/grupo/subgrupo) pra escolher destino
  const containers = (_state.items||[]).filter(i => i.item_type !== 'linha');
  if(containers.length === 0){
    alert('Crie pelo menos um capitulo ou grupo primeiro pra organizar.');
    return null;
  }
  return new Promise(resolve => {
    const ov = d.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9810;display:flex;align-items:center;justify-content:center;padding:24px';
    ov.onclick = e => { if(e.target===ov){ ov.remove(); resolve(null); } };
    ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:480px;width:100%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)"><div style="padding:16px 20px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A)">Onde colocar?</div><div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">Escolha o capitulo/grupo destino</div></div><div id="pc-list" style="flex:1;overflow-y:auto;padding:8px 14px"></div></div>';
    d.body.appendChild(ov);
    d.getElementById('pc-list').innerHTML = containers.map(c => {
      const icon = c.item_type==='capitulo'?'&#128193;':c.item_type==='grupo'?'&#128194;':'&#128195;';
      const depth = c.item_type==='capitulo'?0:c.item_type==='grupo'?1:2;
      return '<button data-cid="' + c.id + '" class="pc-item" style="display:block;width:100%;text-align:left;background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:7px;padding:8px 12px;margin:4px 0 4px ' + (depth*16) + 'px;cursor:pointer;font-family:inherit;font-size:12.5px;color:var(--t9,#0F172A)"><span style="margin-right:6px">' + icon + '</span>' + esc(c._wbs||'') + ' &mdash; ' + esc(c.description||'') + '</button>';
    }).join('');
    ov.querySelectorAll('.pc-item').forEach(b => {
      b.onclick = ()=>{ ov.remove(); resolve(containers.find(x => x.id === b.dataset.cid)); };
    });
  });
}

// ============================================================
// INSUMOS — placeholder (mantem compatibilidade)
// ============================================================
function renderInsumos(el){
  el.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;padding:24px;text-align:center;color:var(--t6,#64748B)"><div style="font-weight:700;color:var(--t9,#0F172A);font-size:13px">Insumos detalhados</div><div style="font-size:12px;margin-top:6px">Detalhamento por insumo de cada composicao. Em construcao na proxima versao.</div></div>';
}

// ============================================================
// BDI
// ============================================================
function renderBDI(el){
  const bdi = _state.budget.bdi || BDI_DEFAULT;
  const totals = calcTotals();
  el.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;padding:18px;max-width:640px">'
    + '<div style="font-size:13.5px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:14px">Composicao do BDI (Beneficios e Despesas Indiretas)</div>'
    + ['admin','lucro','riscos','impostos','financeiro'].map(k => {
        const labels = {admin:'Administracao',lucro:'Lucro',riscos:'Riscos',impostos:'Impostos',financeiro:'Financeiro'};
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--t2,#F1F5F9)"><div style="font-size:12.5px;color:var(--t9,#0F172A);font-weight:600">' + labels[k] + '</div><div style="display:flex;align-items:center;gap:6px"><input type="number" step="0.01" id="bdi-' + k + '" value="' + n(bdi[k]) + '" style="width:90px;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:12.5px;text-align:right;font-family:ui-monospace,monospace"><span style="color:var(--t6,#64748B);font-size:12px">%</span></div></div>';
      }).join('')
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 4px;border-top:2px solid var(--t3,#E5E7EB);margin-top:6px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A)">BDI total</div>'
    + '<div style="font-size:14px;font-weight:800;color:var(--accent,#1D4ED8);font-family:ui-monospace,monospace">' + pct(totals.bdiTotalPct) + '</div></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><div style="font-size:11.5px;color:var(--t6,#64748B)">Subtotal sem BDI</div><div style="font-size:12px;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + brl(totals.subtotal) + '</div></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><div style="font-size:11.5px;color:var(--t6,#64748B)">BDI aplicado</div><div style="font-size:12px;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + brl(totals.bdiValue) + '</div></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--t3,#E5E7EB);margin-top:6px"><div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A)">Total com BDI</div><div style="font-size:14px;font-weight:800;color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(totals.final) + '</div></div>'
    + '<div style="text-align:right;margin-top:12px"><button id="bdi-save" class="btn bp">Salvar BDI</button></div>'
    + '</div>';
  d.getElementById('bdi-save').onclick = async ()=>{
    const newBdi = {
      admin: n(d.getElementById('bdi-admin').value),
      lucro: n(d.getElementById('bdi-lucro').value),
      riscos: n(d.getElementById('bdi-riscos').value),
      impostos: n(d.getElementById('bdi-impostos').value),
      financeiro: n(d.getElementById('bdi-financeiro').value)
    };
    const sb = getSb();
    const u = await sb.from('budgets').update({ bdi: newBdi }).eq('id', _state.budget.id);
    if(u.error){ alert('Erro: ' + u.error.message); return; }
    _state.budget.bdi = newBdi;
    (window.PIAToast ? PIAToast('BDI salvo.','success') : alert('BDI salvo.'));
    renderShell();
  };
}

// ============================================================
// CRONOGRAMA (Curva S) — herda da v9, mas agora respeita capitulos
// ============================================================
function renderCronograma(el){
  const items = _state.items || [];
  const lines = items.filter(i => i.item_type === 'linha');
  const totals = calcTotals();
  const curva = _state.curvaS || [];
  const kpi = _state.evmKpi || null;
  if(lines.length === 0){
    el.innerHTML = '<div style="background:var(--t0,#fff);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;padding:48px;text-align:center"><div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:6px">Curva S indisponivel</div><div style="font-size:12.5px;color:var(--t6,#64748B);max-width:460px;margin:0 auto">Adicione linhas com mes previsto pra gerar a curva.</div></div>';
    return;
  }
  let curvaUse = curva;
  if(!curvaUse.length){
    const maxMonth = Math.max(6, ...lines.map(i => i.month_index || 0));
    const months = Array.from({length: maxMonth}, (_, i) => i + 1);
    let acc = 0;
    curvaUse = months.map(m => {
      const custo = lines.filter(i => i.month_index === m).reduce((s,i) => s + n(i.total_price), 0);
      const venda = custo * (1 + totals.bdiTotalPct/100);
      acc += venda;
      return { mes:m, previsto_custo:custo, previsto_venda:venda, previsto_venda_acum:acc, realizado_fisico_pct:0, realizado_financeiro:0, realizado_financeiro_acum:0 };
    });
  }
  const bac = kpi ? n(kpi.bac) : totals.final;
  el.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;padding:16px;margin-bottom:14px"><div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:10px">Curva S — Previsto vs Realizado &middot; Total venda: <strong>' + brl(bac) + '</strong></div><div style="position:relative;height:300px"><canvas id="orc-chart-curva"></canvas></div></div>'
    + '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;overflow:hidden"><table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Mes</th><th style="text-align:right">Previsto venda</th><th style="text-align:right">Previsto acum.</th><th style="text-align:right">% acum.</th></tr></thead><tbody>'
    + curvaUse.map(r => {
      const pctAcum = bac>0 ? (n(r.previsto_venda_acum)/bac*100) : 0;
      return '<tr><td><strong>Mes ' + r.mes + '</strong></td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(r.previsto_venda) + '</td><td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(r.previsto_venda_acum) + '</td><td style="text-align:right;font-family:ui-monospace,monospace;color:var(--accent,#1D4ED8)">' + pct(pctAcum) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  setTimeout(()=> drawCurvaChart(curvaUse, bac), 80);
}
function drawCurvaChart(curva, bac){
  if(!w.Chart) return;
  const canvas = d.getElementById('orc-chart-curva'); if(!canvas) return;
  if(canvas._chart) try { canvas._chart.destroy(); } catch(_){}
  canvas._chart = new w.Chart(canvas, {
    type: 'bar',
    data: { labels: curva.map(r => 'Mes '+r.mes), datasets: [
      { type:'bar', label:'Previsto mensal', data: curva.map(r => n(r.previsto_venda)), backgroundColor:'rgba(29,78,216,.55)', borderRadius:4 },
      { type:'line', label:'Previsto acumulado', data: curva.map(r => n(r.previsto_venda_acum)), borderColor:'#D97706', backgroundColor:'rgba(217,119,6,.08)', fill:true, tension:.3, borderWidth:2 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top' } } }
  });
}

// ============================================================
// CURVA ABC — so sobre linhas
// ============================================================
function renderCurvaABC(el){
  const lines = (_state.items||[]).filter(i => i.item_type === 'linha').slice().sort((a,b) => n(b.total_price) - n(a.total_price));
  const total = lines.reduce((s,i) => s + n(i.total_price), 0);
  if(lines.length === 0){
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Sem linhas pra classificar.</div>';
    return;
  }
  let acc = 0;
  const enriched = lines.map(i => { acc += n(i.total_price); const p = total>0 ? (acc/total*100) : 0; return { ...i, _pctAcc:p, _classif: p<=80?'A':p<=95?'B':'C' }; });
  el.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;overflow:hidden"><table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>#</th><th>Codigo</th><th>Descricao</th><th>Class.</th><th style="text-align:right">Total</th><th style="text-align:right">% acum.</th></tr></thead><tbody>' + enriched.map((i,idx) => '<tr><td>' + (idx+1) + '</td><td style="font-family:ui-monospace,monospace">' + esc(i.code||'') + '</td><td>' + esc(i.description||'') + '</td><td><span style="background:' + (i._classif==='A'?'#FEE2E2':i._classif==='B'?'#FEF3C7':'#D1FAE5') + ';color:' + (i._classif==='A'?'#991B1B':i._classif==='B'?'#92400E':'#065F46') + ';padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:700">' + i._classif + '</span></td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(i.total_price)) + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + pct(i._pctAcc) + '</td></tr>').join('') + '</tbody></table></div>';
}


// ============================================================
// ============================================================
// IMPORT IA — delega pro modulo ai-orcamento.js lazy-loaded
// ============================================================
function openImportIA(){
  var b = _state.budget;
  if(!b || !b.id){ alert('Salve o orcamento antes (clique em qualquer aba e volte).'); return; }
  var projectId = (_state.project && _state.project.id) || (b.project_id) || null;
  if(w.PIALazy){
    w.PIALazy.run('ai-orcamento', 'open', b.id, projectId).catch(function(e){
      console.error('[orcamento] ai-orcamento falhou:', e);
      alert('Nao foi possivel carregar IA do Orcamento. Recarregue a pagina (Ctrl+Shift+R).');
    });
  } else if(w.PIAIAOrcamento){
    w.PIAIAOrcamento.open(b.id, projectId);
  } else {
    alert('Sistema de IA ainda carregando. Aguarde 2s e clique novamente.');
  }
}

// EXPORTACOES (Excel, CSV, PDF) - restauradas do backup
// ============================================================
async function exportXLSX(){
  if(typeof w.XLSX === 'undefined'){ alert('Biblioteca XLSX nao carregada'); return; }
  const items = _state.items || [];
  const totals = calcTotals();
  const bdi = _state.budget.bdi || BDI_DEFAULT;
  const rows = [
    ['ORCAMENTO - ' + (_state.budget.title || '')],
    ['Projeto', _state.project.name],
    ['Data emissao', _state.budget.issue_date || ''],
    [''],
    ['#','Codigo','Descricao','Disciplina','Qtd','Unidade','Custo unit (R$)','Total (R$)','Mes']
  ];
  items.forEach((it,i) => rows.push([i+1, it.code||'', it.description||'', it.discipline||'', n(it.qty), it.unit||'', n(it.unit_price), n(it.total_price), it.month_index||'']));
  rows.push(['']);
  rows.push(['', '', '', '', '', '', 'SUBTOTAL', totals.subtotal]);
  rows.push(['', '', '', '', '', '', 'BDI Admin '+pct(n(bdi.admin)), totals.subtotal * n(bdi.admin)/100]);
  rows.push(['', '', '', '', '', '', 'BDI Lucro '+pct(n(bdi.lucro)), totals.subtotal * n(bdi.lucro)/100]);
  rows.push(['', '', '', '', '', '', 'BDI Riscos '+pct(n(bdi.riscos)), totals.subtotal * n(bdi.riscos)/100]);
  rows.push(['', '', '', '', '', '', 'BDI Impostos '+pct(n(bdi.impostos)), totals.subtotal * n(bdi.impostos)/100]);
  rows.push(['', '', '', '', '', '', 'BDI Financeiro '+pct(n(bdi.financeiro)), totals.subtotal * n(bdi.financeiro)/100]);
  rows.push(['', '', '', '', '', '', 'TOTAL COM BDI', totals.final]);
  const ws = w.XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:5},{wch:14},{wch:50},{wch:14},{wch:10},{wch:8},{wch:14},{wch:14},{wch:6}];
  const wb = w.XLSX.utils.book_new();
  w.XLSX.utils.book_append_sheet(wb, ws, 'Orcamento');
  w.XLSX.writeFile(wb, 'orcamento_'+(_state.project.name||'projeto').replace(/[^a-z0-9]/gi,'_')+'.xlsx');
}

function exportCSV(){
  const items = _state.items || [];
  const totals = calcTotals();
  const sep = ';';
  let csv = '#;Codigo;Descricao;Disciplina;Qtd;Unidade;Custo Unit (R$);Total (R$);Mes\n';
  items.forEach((it,i) => csv += [i+1, it.code||'', '"'+(it.description||'').replace(/"/g,'""')+'"', it.discipline||'', n(it.qty), it.unit||'', n(it.unit_price).toFixed(2), n(it.total_price).toFixed(2), it.month_index||''].join(sep) + '\n');
  csv += '\n;;;;;;SUBTOTAL;' + totals.subtotal.toFixed(2) + '\n';
  csv += ';;;;;;BDI ('+pct(totals.bdiTotalPct)+');' + totals.bdiValue.toFixed(2) + '\n';
  csv += ';;;;;;TOTAL FINAL;' + totals.final.toFixed(2) + '\n';
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orcamento_'+(_state.project.name||'projeto').replace(/[^a-z0-9]/gi,'_')+'.csv'; a.click();
}

async function exportPDF(){
  if(!w.jspdf && !w.jsPDF){
    await new Promise((res,rej) => {
      const s = d.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      d.head.appendChild(s);
    });
  }
  const jsPDF = (w.jspdf && w.jspdf.jsPDF) || w.jsPDF;
  if(!jsPDF){ alert('Falha ao carregar jsPDF'); return; }
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const W = 210, H = 297, M = 15;
  const NAVY = [30, 58, 138], LIGHT = [241, 245, 249], TEXT = [15, 23, 42], GREY = [100, 116, 139];
  const items = _state.items || [];
  const totals = calcTotals();
  const bdi = _state.budget.bdi || BDI_DEFAULT;

  // Cabecalho
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('ORCAMENTO COMERCIAL', M, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.text(_state.project.name || 'Projeto', M, 19.5);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString('pt-BR'), W - M, 19.5, { align: 'right' });

  // Tabela de itens
  let y = 34;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text('Itens do orcamento', M, y);
  y += 5;

  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(M, y, W - 2*M, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text('#', M + 2, y + 4);
  doc.text('Descricao', M + 10, y + 4);
  doc.text('Qtd', M + 110, y + 4, { align:'right' });
  doc.text('Unit', M + 130, y + 4, { align:'right' });
  doc.text('Total', M + 160, y + 4, { align:'right' });
  doc.text('Mes', M + 178, y + 4, { align:'right' });
  y += 8;

  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.setFont('helvetica','normal');
  items.forEach((it, i) => {
    if(y > H - 50){ doc.addPage(); y = M; }
    const desc = (it.description||'').slice(0, 60);
    doc.text(String(i+1), M + 2, y);
    doc.text(desc, M + 10, y);
    doc.text(String(n(it.qty).toFixed(2)), M + 110, y, { align:'right' });
    doc.text(brl(n(it.unit_price)), M + 130, y, { align:'right' });
    doc.text(brl(n(it.total_price)), M + 160, y, { align:'right' });
    doc.text(String(it.month_index||'-'), M + 178, y, { align:'right' });
    y += 5;
  });

  // Totais (com BDI)
  if(y > H - 60){ doc.addPage(); y = M; }
  y += 4;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.line(M, y, W - M, y);
  y += 6;
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.text('Subtotal (custo direto)', M, y);
  doc.text(brl(totals.subtotal), W - M, y, { align:'right' });
  y += 5;
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  ['admin','lucro','riscos','impostos','financeiro'].forEach(k => {
    doc.text('BDI ' + k + ' (' + pct(n(bdi[k])) + ')', M + 4, y);
    doc.text(brl(totals.subtotal * n(bdi[k]) / 100), W - M, y, { align:'right' });
    y += 4.5;
  });
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  y += 2;
  doc.text('TOTAL COM BDI', M, y);
  doc.text(brl(totals.final), W - M, y, { align:'right' });

  // Rodape
  doc.setFontSize(7);
  doc.setFont('helvetica','normal');
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text('Documento gerado por PROJECT.IA - ' + new Date().toLocaleString('pt-BR'), W/2, H - 8, { align:'center' });

const fname = 'orcamento_' + (_state.project.name || 'projeto').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
  doc.save(fname);
}

async function renderComparativo(el){
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t6,#64748B);font-size:12px">Carregando comparativo...</div>';
  var sb = getSb(); var b = _state.budget;
  if(!b || !sb){ el.innerHTML = '<div style="padding:20px">Sem orcamento ativo.</div>'; return; }
  var projectId = (b.project_id) || (_state.project && _state.project.id) || null;
  try {
    var items = _state.items || [];
    var lines = items.filter(function(i){ return i.item_type === 'linha'; });
    // 1) Agrega orcamento por disciplina
    var byDisc = {};
    lines.forEach(function(l){
      var disc = (l.discipline || '(sem disciplina)').toLowerCase();
      if(!byDisc[disc]) byDisc[disc] = { qty:0, valor:0, hh_orcado:0, linhas:0 };
      byDisc[disc].linhas++;
      byDisc[disc].qty += n(l.qty);
      byDisc[disc].valor += n(l.qty) * n(l.unit_price);
      try { if(l.meta && l.meta.hh_coefficient_estimate) byDisc[disc].hh_orcado += n(l.qty) * n(l.meta.hh_coefficient_estimate); } catch(_){}
    });
    // 2) Planejado + realizado
    var planParams = []; var realizadoHH = {};
    if(projectId){
      var ppR = await sb.from('productivity_params').select('discipline,activity,planned_hh,planned_qty,unit').eq('project_id', projectId).limit(500);
      planParams = (ppR && ppR.data) || [];
      var drtR = await sb.from('daily_report_team').select('hours_worked,hours_overtime,role,daily_report:daily_reports(project_id,discipline,report_date)').limit(2000);
      var drt = (drtR && drtR.data) || [];
      drt.forEach(function(t){
        if(!t.daily_report || t.daily_report.project_id !== projectId) return;
        var disc = (t.daily_report.discipline || '(sem disciplina)').toLowerCase();
        if(!realizadoHH[disc]) realizadoHH[disc] = 0;
        realizadoHH[disc] += n(t.hours_worked) + n(t.hours_overtime);
      });
    }
    var planByDisc = {};
    planParams.forEach(function(p){
      var disc = (p.discipline || '(sem disciplina)').toLowerCase();
      if(!planByDisc[disc]) planByDisc[disc] = { hh:0, qty:0 };
      planByDisc[disc].hh += n(p.planned_hh);
      planByDisc[disc].qty += n(p.planned_qty);
    });
    // 3) Linhas de comparacao
    var allDiscs = {};
    Object.keys(byDisc).forEach(function(k){ allDiscs[k] = true; });
    Object.keys(planByDisc).forEach(function(k){ allDiscs[k] = true; });
    Object.keys(realizadoHH).forEach(function(k){ allDiscs[k] = true; });
    var rows = [];
    var totOrc = 0, totHHOrc = 0, totHHPlan = 0, totHHReal = 0;
    Object.keys(allDiscs).forEach(function(disc){
      var orc = byDisc[disc] || { qty:0, valor:0, hh_orcado:0, linhas:0 };
      var plan = planByDisc[disc] || { hh:0, qty:0 };
      var real = realizadoHH[disc] || 0;
      var cpi = (orc.hh_orcado > 0 && real > 0) ? (orc.hh_orcado / real) : null;
      var spi = (plan.hh > 0 && real > 0) ? (real / plan.hh) : null;
      var varHHPlan = (orc.hh_orcado > 0 && plan.hh > 0) ? ((plan.hh - orc.hh_orcado) / orc.hh_orcado * 100) : null;
      rows.push({ disc: disc, orc: orc, plan: plan, real: real, cpi: cpi, spi: spi, varHHPlan: varHHPlan });
      totOrc += orc.valor; totHHOrc += orc.hh_orcado; totHHPlan += plan.hh; totHHReal += real;
    });
    rows.sort(function(a,b){ return b.orc.valor - a.orc.valor; });
    // 4) Helpers de render
    var kpi = function(label, val, sub, color){
      return '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:14px 16px;flex:1;min-width:180px">'
        + '<div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + label + '</div>'
        + '<div style="font-size:18px;font-weight:700;color:' + (color||'var(--t9,#0F172A)') + ';font-family:ui-monospace,monospace">' + val + '</div>'
        + (sub ? '<div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:3px">' + sub + '</div>' : '')
        + '</div>';
    };
    var pctFmt = function(v){ if(v == null || isNaN(v)) return '-'; return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; };
    var idxFmt = function(v){ if(v == null) return '-'; return v.toFixed(2); };
    var idxColor = function(v){ if(v == null) return 'var(--t6,#64748B)'; if(v >= 1) return '#047857'; if(v >= 0.85) return '#92400E'; return '#991B1B'; };
    var thStyle = 'padding:8px 12px;font-size:10px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px';
    var realColor = totHHReal > totHHOrc * 1.05 ? '#991B1B' : (totHHReal > 0 ? '#047857' : null);

    var kpiBar = ''
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">'
        + kpi('Valor orcado', brl(totOrc), lines.length + ' linhas', null)
        + kpi('HH orcado', totHHOrc.toFixed(0) + ' h', 'somatorio das linhas', null)
        + kpi('HH planejado', totHHPlan.toFixed(0) + ' h', planParams.length + ' params', null)
        + kpi('HH realizado', totHHReal.toFixed(0) + ' h', 'somatorio RDO', realColor)
      + '</div>';

    if(rows.length === 0){
      el.innerHTML = kpiBar + '<div style="background:var(--t0,#fff);border:1px dashed var(--t3,#E5E7EB);border-radius:8px;padding:32px;text-align:center"><div style="font-size:13px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:4px">Sem dados de comparacao ainda</div><div style="font-size:11.5px;color:var(--t6,#64748B)">Cadastre orcamento + parametros de produtividade no Planning + RDOs do dia pra ver o comparativo.</div></div>';
      return;
    }

    var headerHtml = ''
      + '<div style="padding:12px 16px;border-bottom:1px solid var(--t3,#E5E7EB)">'
        + '<div style="font-size:13px;font-weight:600;color:var(--t9,#0F172A)">Comparativo por disciplina</div>'
        + '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">Orcado x Planejado x Realizado (HH)</div>'
      + '</div>';

    var tableHead = ''
      + '<thead><tr style="background:var(--t1,#F8FAFC)">'
        + '<th style="text-align:left;' + thStyle + '">Disciplina</th>'
        + '<th style="text-align:right;' + thStyle + '">Linhas</th>'
        + '<th style="text-align:right;' + thStyle + '">Valor orcado</th>'
        + '<th style="text-align:right;' + thStyle + '">HH orcado</th>'
        + '<th style="text-align:right;' + thStyle + '">HH planejado</th>'
        + '<th style="text-align:right;' + thStyle + '">Var Plan</th>'
        + '<th style="text-align:right;' + thStyle + '">HH realizado</th>'
        + '<th style="text-align:center;' + thStyle + '" title="CPI = HH orcado / HH realizado">CPI</th>'
        + '<th style="text-align:center;' + thStyle + '" title="SPI = HH realizado / HH planejado">SPI</th>'
      + '</tr></thead>';

    var rowsHtml = rows.map(function(r){
      var varColor = r.varHHPlan == null ? 'var(--t6,#64748B)' : r.varHHPlan > 10 ? '#991B1B' : r.varHHPlan < -10 ? '#047857' : 'var(--t8,#1E293B)';
      return '<tr style="border-bottom:1px solid var(--t2,#F1F5F9)">'
        + '<td style="padding:8px 12px;color:var(--t9,#0F172A);font-weight:600;text-transform:capitalize">' + esc(r.disc) + '</td>'
        + '<td style="padding:8px 12px;text-align:right;color:var(--t7,#475569);font-family:ui-monospace,monospace">' + r.orc.linhas + '</td>'
        + '<td style="padding:8px 12px;text-align:right;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + brl(r.orc.valor) + '</td>'
        + '<td style="padding:8px 12px;text-align:right;font-family:ui-monospace,monospace;color:var(--t7,#475569)">' + r.orc.hh_orcado.toFixed(0) + ' h</td>'
        + '<td style="padding:8px 12px;text-align:right;font-family:ui-monospace,monospace;color:var(--t7,#475569)">' + r.plan.hh.toFixed(0) + ' h</td>'
        + '<td style="padding:8px 12px;text-align:right;font-family:ui-monospace,monospace;color:' + varColor + '">' + pctFmt(r.varHHPlan) + '</td>'
        + '<td style="padding:8px 12px;text-align:right;font-family:ui-monospace,monospace;color:var(--t9,#0F172A)">' + r.real.toFixed(0) + ' h</td>'
        + '<td style="padding:8px 12px;text-align:center"><span style="display:inline-block;min-width:42px;padding:2px 8px;border-radius:5px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);font-family:ui-monospace,monospace;font-weight:600;color:' + idxColor(r.cpi) + '">' + idxFmt(r.cpi) + '</span></td>'
        + '<td style="padding:8px 12px;text-align:center"><span style="display:inline-block;min-width:42px;padding:2px 8px;border-radius:5px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);font-family:ui-monospace,monospace;font-weight:600;color:' + idxColor(r.spi) + '">' + idxFmt(r.spi) + '</span></td>'
      + '</tr>';
    }).join('');

    var legenda = '<div style="margin-top:14px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);border-radius:6px;padding:10px 14px;font-size:11px;color:var(--t7,#475569);line-height:1.5"><strong style="color:var(--t9,#0F172A)">Legenda:</strong> <strong>Var Plan</strong> = variacao entre HH planejado e HH orcado (positivo = planejamento pediu mais HH que orcado, alerta). <strong>CPI</strong> &gt;=1 dentro do custo. <strong>SPI</strong> &gt;=1 no prazo. Verde &gt;=1.0, amarelo 0.85-1.0, vermelho &lt;0.85.</div>';

    el.innerHTML = kpiBar
      + '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;overflow:hidden">'
      + headerHtml
      + '<table style="width:100%;border-collapse:collapse;font-size:11.5px">' + tableHead + '<tbody>' + rowsHtml + '</tbody></table>'
      + '</div>'
      + legenda;
  } catch(e){ console.error('[orcamento.comparativo]', e); el.innerH