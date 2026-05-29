/*! PROJECT.IA - Catalogo de Materiais (Cards + KPIs) v1
 *  Inspirado em SAP MM, Sienge Cadastros, Buildxact, Orçafascio
 *  Multi-tenant via RLS. Tokens v9.
 */
(function(w,d){'use strict';
try {

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
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function n(x){ const v=parseFloat(x); return isNaN(v)?0:v; }
function brl(x){ if(x==null||isNaN(x)) return '—'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)); }
function fmtDate(s){ if(!s) return '—'; try { return new Date(s).toLocaleDateString('pt-BR'); } catch(_){ return '—'; } }

let _state = {
  materials: [],
  suppliers: [],
  view: 'cards',  // 'cards' | 'table'
  filters: { discipline:'', abc:'', status:'ativo', text:'', supplier:'', lowStock:false },
  selectedId: null
};

async function open(){
  const sb = getSb();
  if(!sb){ alert('Sistema ainda nao inicializado.'); return; }
  const prev = d.getElementById('pia-mat-ov'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-mat-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit;display:flex;flex-direction:column';
  d.body.appendChild(ov);
  await loadAll();
  renderShell();
}

async function loadAll(){
  const sb = getSb();
  try {
    const [matR, supR] = await Promise.all([
      sb.from('materials_catalog').select('*').is('deleted_at', null).order('description').limit(2000),
      sb.from('suppliers').select('id,trade_name').is('deleted_at',null).limit(500)
    ]);
    _state.materials = matR.data || [];
    _state.suppliers = supR.data || [];
  } catch(e){
    console.warn('[mat] loadAll', e);
    _state.materials = []; _state.suppliers = [];
  }
}

function applyFilters(mats){
  const f = _state.filters;
  return (mats||[]).filter(m => {
    if(f.discipline && m.discipline !== f.discipline) return false;
    if(f.abc && m.abc_class !== f.abc) return false;
    if(f.status && m.status !== f.status) return false;
    if(f.supplier && m.preferred_supplier_id !== f.supplier) return false;
    if(f.lowStock && !(m.min_stock && m.reorder_point && n(m.reorder_point) > 0)) return false;
    if(f.text){
      const t = f.text.toLowerCase();
      const hay = ((m.code||'') + ' ' + (m.description||'') + ' ' + (m.ncm||'') + ' ' + (m.sap_code||'')).toLowerCase();
      if(!hay.includes(t)) return false;
    }
    return true;
  });
}

function renderShell(){
  const ov = d.getElementById('pia-mat-ov'); if(!ov) return;
  const filtered = applyFilters(_state.materials);
  const totalValue = filtered.reduce((s,m) => s + n(m.last_price || m.unit_price), 0);
  const abcCounts = { A: 0, B: 0, C: 0 };
  filtered.forEach(m => { if(m.abc_class) abcCounts[m.abc_class]++; });
  ov.innerHTML =
    '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<button class="btn bg" onclick="document.getElementById(\'pia-mat-ov\').remove()" style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Catálogo de Materiais</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + filtered.length + ' item(ns) &middot; A:' + abcCounts.A + ' B:' + abcCounts.B + ' C:' + abcCounts.C + '</div></div>'
    + '<div style="flex:1"></div>'
    + '<input id="mt-search" placeholder="Buscar código, descrição, NCM..." value="' + esc(_state.filters.text||'') + '" style="padding:7px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;width:240px">'
    + '<button class="btn bg" id="mt-import"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>Importar Excel</button>'
    + '<button class="btn bp" id="mt-new" style="display:inline-flex;align-items:center;justify-content:center"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Novo material</button>'
    + '<button class="btn bg" id="mt-abc" title="Classificacao ABC tradicional">ABC manual</button>'
    + '<button class="btn bia" id="mt-abc-ai" title="IA: classifica por uso real (Pareto sobre PO history)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>ABC Inteligente</button>'
    + '<button class="btn bg" id="mt-toggle" title="Alternar Cards/Tabela">' + (_state.view==='cards'?'Tabela':'Cards') + '</button>'
    + '</div>'
    + '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:10px 22px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + filterPill('discipline', 'Disciplina', _state.filters.discipline, [['','Todas'],['civil','Civil'],['eletrica','Elétrica'],['hidraulica','Hidráulica'],['mecanica','Mecânica'],['tubulacao','Tubulação'],['instrumentacao','Instrumentação'],['caldeiraria','Caldeiraria'],['pintura','Pintura']])
    + filterPill('abc', 'Classe ABC', _state.filters.abc, [['','Todas'],['A','Classe A'],['B','Classe B'],['C','Classe C']])
    + filterPill('status', 'Status', _state.filters.status, [['','Todos'],['ativo','Ativo'],['em_homologacao','Em homologação'],['descontinuado','Descontinuado'],['bloqueado','Bloqueado']])
    + '</div>'
    + '<div id="mt-body" style="flex:1;overflow-y:auto;padding:18px 22px;background:var(--t1,#F8FAFC)"></div>';
  d.getElementById('mt-search').oninput = e => { _state.filters.text = e.target.value; renderBody(); };
  d.getElementById('mt-new').onclick = () => openMaterialEditor(null);
  d.getElementById('mt-toggle').onclick = () => { _state.view = _state.view==='cards'?'table':'cards'; renderShell(); };
  d.getElementById('mt-import').onclick = openImport;
  d.getElementById('mt-abc').onclick = classifyABC;
  var bai = d.getElementById('mt-abc-ai'); if(bai) bai.onclick = function(){ if(w.PIALazy) w.PIALazy.run('ai-catalog','smartClassifyABC'); else if(w.PIAIACatalog) w.PIAIACatalog.smartClassifyABC(); };
  ov.querySelectorAll('.flt-sel').forEach(sel => {
    sel.onchange = () => { _state.filters[sel.dataset.k] = sel.value; renderShell(); };
  });
  renderBody();
}

function filterPill(key, label, value, opts){
  return '<select class="flt-sel" data-k="' + key + '" style="padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:11.5px;background:var(--t0,#fff);color:var(--t9,#0F172A);font-family:inherit">'
    + opts.map(o => '<option value="' + esc(o[0]) + '"' + (value===o[0]?' selected':'') + '>' + esc(o[1]) + '</option>').join('')
    + '</select>';
}

function renderEmptyCatalog(){
  var classCard = function(cls, color, bg, border, code, desc, abcLabel){
    return '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;opacity:.55">'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + '<div style="width:36px;height:36px;border-radius:6px;background:' + bg + ';border:1px solid ' + border + ';display:flex;align-items:center;justify-content:center;font-weight:700;color:' + color + ';font-size:13px">' + cls + '</div>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-family:ui-monospace,monospace;font-size:10.5px;color:var(--t6,#64748B);font-weight:600">' + code + '</div>'
          + '<div style="font-size:12px;color:var(--t9,#0F172A);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + desc + '</div>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid var(--t2,#F1F5F9)">'
        + '<span style="font-size:10px;color:var(--t6,#64748B);font-weight:600;text-transform:uppercase;letter-spacing:.4px">' + abcLabel + '</span>'
        + '<span style="font-size:11px;color:var(--t7,#475569);font-family:ui-monospace,monospace">R$ \u2014</span>'
      + '</div>'
    + '</div>';
  };
  return ''
    + '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
      + '<div style="width:38px;height:38px;border-radius:8px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
      + '</div>'
      + '<div style="flex:1;min-width:280px">'
        + '<div style="font-size:14px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:3px">Centralize todos os insumos da obra</div>'
        + '<div style="font-size:11.5px;color:var(--t6,#64748B);line-height:1.5">C\u00f3digo interno, NCM, SAP, c\u00f3digo SINAPI, classifica\u00e7\u00e3o ABC, hist\u00f3rico de pre\u00e7os, fornecedores preferidos e estoque m\u00ednimo \u2014 tudo num lugar, integrado ao Or\u00e7amento e \u00e0s Compras.</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-shrink:0">'
        + '<button class="btn bg" id="mt-empty-import"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>Importar Excel</button>'
        + '<button class="btn bg" id="mt-empty-new">Cadastrar 1\u00ba material</button>'
      + '</div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--t6,#94A3B8);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin:4px 4px 8px">Pr\u00e9via do layout dos cards</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">'
      + classCard('A', '#991B1B', '#FEF2F2', '#FECACA', 'COD-001', 'Tubo a\u00e7o carbono 6" Sch 40', 'Classe A \u00b7 cr\u00edtico')
      + classCard('B', '#92400E', '#FFFBEB', '#FDE68A', 'COD-002', 'Flange RF 4" Sch 80', 'Classe B \u00b7 m\u00e9dio')
      + classCard('C', '#166534', '#F0FDF4', '#BBF7D0', 'COD-003', 'Parafuso UNC 1/2" x 2"', 'Classe C \u00b7 baixo giro')
    + '</div>';
}

function renderBody(){
  const host = d.getElementById('mt-body'); if(!host) return;
  const filtered = applyFilters(_state.materials);
  if(filtered.length === 0){
    host.innerHTML = renderEmptyCatalog();
    var btnNew = d.getElementById('mt-empty-new');
    if(btnNew) btnNew.onclick = function(){ openMaterialEditor(null); };
    var btnImp = d.getElementById('mt-empty-import');
    if(btnImp) btnImp.onclick = function(){ var b = d.getElementById('mt-import'); if(b) b.click(); };
    return;
  }
  if(_state.view === 'cards') renderCards(host, filtered);
  else renderTable(host, filtered);
}

function renderCards(host, mats){
  host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'
    + mats.map(m => {
      const supName = m.preferred_supplier_id && (_state.suppliers.find(s => s.id === m.preferred_supplier_id) || {}).trade_name;
      const statusColor = m.status==='ativo'?'#10B981':m.status==='descontinuado'?'#94A3B8':m.status==='em_homologacao'?'#F59E0B':'#EF4444';
      const statusLabel = m.status==='ativo'?'Ativo':m.status==='descontinuado'?'Descontinuado':m.status==='em_homologacao'?'Em homologação':'Bloqueado';
      const abcColor = m.abc_class==='A'?'#DC2626':m.abc_class==='B'?'#F59E0B':m.abc_class==='C'?'#10B981':'#94A3B8';
      return '<div class="mt-card" data-id="' + m.id + '" style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;padding:0;overflow:hidden;cursor:pointer;transition:all .12s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.08)\';this.style.borderColor=\'var(--accent,#1D4ED8)\'" onmouseout="this.style.boxShadow=\'\';this.style.borderColor=\'var(--t3,#E5E7EB)\'">'
        + (m.photo_url ? '<div style="height:120px;background:var(--t1,#F8FAFC) url(' + esc(m.photo_url) + ') center/cover no-repeat;border-bottom:1px solid var(--t3,#E5E7EB)"></div>' : '<div style="height:80px;background:linear-gradient(135deg,var(--t1,#F8FAFC) 0%,var(--t2,#F1F5F9) 100%);display:flex;align-items:center;justify-content:center;color:var(--t6,#64748B);font-size:30px;font-weight:700">' + (m.description||'?').charAt(0).toUpperCase() + '</div>')
        + '<div style="padding:11px 13px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:5px">'
        + '<div style="font-family:ui-monospace,monospace;font-size:10px;color:var(--t6,#64748B);font-weight:600">' + esc(m.code||'(sem cód)') + '</div>'
        + (m.abc_class ? '<span style="background:' + abcColor + ';color:#fff;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:8px">' + m.abc_class + '</span>' : '')
        + '</div>'
        + '<div style="font-size:12.5px;font-weight:600;color:var(--t9,#0F172A);line-height:1.35;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(m.description||'(sem descrição)') + '</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        + '<div style="font-size:11px;color:var(--t6,#64748B)">' + esc(m.unit||'un') + (m.discipline?' &middot; ' + esc(m.discipline):'') + '</div>'
        + '<div style="font-size:12.5px;font-weight:700;color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(n(m.last_price||m.unit_price)) + '</div>'
        + '</div>'
        + (supName ? '<div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:4px">Forn. pref: <strong>' + esc(supName) + '</strong></div>' : '')
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span style="font-size:9.5px;background:' + statusColor + '22;color:' + statusColor + ';padding:2px 7px;border-radius:8px;font-weight:700">' + statusLabel.toUpperCase() + '</span>'
        + (m.lead_time_days ? '<span style="font-size:10px;color:var(--t6,#64748B)">' + m.lead_time_days + 'd lead</span>' : '')
        + '</div>'
        + '</div></div>';
    }).join('')
    + '</div>';
  host.querySelectorAll('.mt-card').forEach(card => {
    card.onclick = () => openMaterialDetail(card.dataset.id);
  });
}

function renderTable(host, mats){
  host.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;overflow:hidden"><table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Código</th><th>Descrição</th><th>Un</th><th>Disc.</th><th>ABC</th><th style="text-align:right">Preço</th><th>Forn. pref</th><th>Status</th></tr></thead><tbody>'
    + mats.map(m => {
      const supName = m.preferred_supplier_id && (_state.suppliers.find(s => s.id === m.preferred_supplier_id) || {}).trade_name;
      return '<tr class="mt-row" data-id="' + m.id + '" style="cursor:pointer"><td style="font-family:ui-monospace,monospace;color:var(--t6,#64748B);font-size:11px">' + esc(m.code||'') + '</td><td><strong>' + esc(m.description||'') + '</strong></td><td>' + esc(m.unit||'') + '</td><td>' + esc(m.discipline||'—') + '</td><td>' + (m.abc_class||'—') + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(m.last_price||m.unit_price)) + '</td><td>' + esc(supName||'—') + '</td><td>' + esc(m.status||'') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  host.querySelectorAll('.mt-row').forEach(r => r.onclick = () => openMaterialDetail(r.dataset.id));
}

async function openMaterialDetail(id){
  const m = _state.materials.find(x => x.id === id);
  if(!m) return;
  const sb = getSb();
  const [hR, sR] = await Promise.all([
    sb.from('material_price_history').select('*').eq('material_id', id).order('recorded_date',{ascending:false}).limit(20),
    sb.from('suppliers').select('id,trade_name').is('deleted_at',null).limit(500)
  ]);
  const history = hR.data || [];
  const supName = m.preferred_supplier_id && (sR.data || []).find(s => s.id === m.preferred_supplier_id)?.trade_name;
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:780px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    + '<div><div style="font-size:16px;font-weight:700;color:var(--t9,#0F172A)">' + esc(m.description||'') + '</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;font-family:ui-monospace,monospace">' + esc(m.code||'') + (m.ncm?' &middot; NCM ' + esc(m.ncm):'') + (m.sap_code?' &middot; SAP ' + esc(m.sap_code):'') + '</div></div>'
    + '<div style="display:flex;gap:6px"><button class="btn bg" id="md-edit">Editar</button><button id="md-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div></div>'
    + '<div style="display:flex;gap:0;border-bottom:1px solid var(--t3,#E5E7EB);padding:0 18px">'
    + ['geral','historico','fornecedores','documentos'].map((tab,i)=>{
        const labels = { geral:'Geral', historico:'Histórico de preços ('+history.length+')', fornecedores:'Fornecedores', documentos:'Documentos' };
        return '<button class="md-tab" data-tab="' + tab + '" style="border:none;background:transparent;padding:12px 14px;cursor:pointer;font-weight:600;font-size:12.5px;color:' + (i===0?'var(--t9)':'var(--t6)') + ';border-bottom:3px solid ' + (i===0?'var(--accent,#1D4ED8)':'transparent') + ';font-family:inherit">' + labels[tab] + '</button>';
      }).join('')
    + '</div>'
    + '<div id="md-body" style="flex:1;overflow-y:auto;padding:18px 22px"></div></div>';
  d.body.appendChild(ov);
  d.getElementById('md-close').onclick = ()=> ov.remove();
  d.getElementById('md-edit').onclick = ()=> { ov.remove(); openMaterialEditor(m); };
  const render = (tab) => {
    ov.querySelectorAll('.md-tab').forEach(b => {
      const act = b.dataset.tab === tab;
      b.style.color = act ? 'var(--t9)' : 'var(--t6)';
      b.style.borderBottomColor = act ? 'var(--accent,#1D4ED8)' : 'transparent';
    });
    const body = d.getElementById('md-body');
    if(tab === 'geral') body.innerHTML = renderGeral(m, supName);
    else if(tab === 'historico') body.innerHTML = renderHistorico(history);
    else if(tab === 'fornecedores') body.innerHTML = renderFornecedores(m, sR.data || []);
    else if(tab === 'documentos') body.innerHTML = renderDocumentos(m);
  };
  ov.querySelectorAll('.md-tab').forEach(b => b.onclick = ()=> render(b.dataset.tab));
  render('geral');
}

function renderGeral(m, supName){
  const rows = [
    ['Código', m.code], ['NCM', m.ncm], ['SAP', m.sap_code], ['SINAPI', m.sinapi_code],
    ['Unidade', m.unit], ['Disciplina', m.discipline], ['Categoria', m.category],
    ['Tipo', m.material_type], ['Diâmetro', m.diameter_in], ['Schedule', m.schedule],
    ['Classe pressão', m.pressure_class], ['Peso/un (kg)', m.weight_kg_per_unit||m.weight_per_unit],
    ['Preço último', brl(n(m.last_price||m.unit_price))], ['Data último preço', fmtDate(m.last_price_date)],
    ['Lead time (dias)', m.lead_time_days], ['Fornecedor preferido', supName],
    ['Estoque mínimo', m.min_stock], ['Ponto de pedido', m.reorder_point],
    ['Classe ABC', m.abc_class], ['Status', m.status]
  ];
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'
    + rows.filter(r => r[1] != null && r[1] !== '').map(r => '<div style="padding:8px 10px;background:var(--t1,#F8FAFC);border-radius:7px"><div style="font-size:10px;font-weight:700;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px">' + esc(r[0]) + '</div><div style="font-size:12.5px;color:var(--t9,#0F172A);margin-top:2px;font-weight:600">' + esc(String(r[1])) + '</div></div>').join('')
    + '</div>' + (m.notes ? '<div style="margin-top:14px;padding:11px 14px;background:var(--t1,#F8FAFC);border-left:3px solid var(--accent,#1D4ED8);border-radius:6px;font-size:12px"><strong>Notas:</strong><br>' + esc(m.notes) + '</div>' : '');
}

function renderHistorico(history){
  if(history.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Sem histórico de preços registrado.</div>';
  return '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Data</th><th>Fornecedor</th><th style="text-align:right">Preço unit</th><th>Origem</th></tr></thead><tbody>'
    + history.map(h => '<tr><td>' + fmtDate(h.recorded_date) + '</td><td>' + esc(h.supplier_name||'—') + '</td><td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(n(h.unit_price)) + '</td><td><span style="background:var(--t1,#F8FAFC);color:var(--t9,#0F172A);padding:2px 8px;border-radius:8px;font-size:10.5px">' + esc(h.source||'—') + '</span></td></tr>').join('')
    + '</tbody></table>';
}

function renderFornecedores(m, suppliers){
  return '<div style="padding:20px;text-align:center;color:var(--t6,#64748B)">Histórico cruzado de fornecedores deste material — disponível após primeiras compras registradas via POs.</div>';
}

function renderDocumentos(m){
  return '<div style="display:flex;flex-direction:column;gap:8px">'
    + (m.photo_url ? '<a href="' + esc(m.photo_url) + '" target="_blank" style="padding:11px 14px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);border-radius:8px;text-decoration:none;color:var(--t9,#0F172A);font-size:12.5px">📸 Foto do material</a>' : '')
    + (m.datasheet_url ? '<a href="' + esc(m.datasheet_url) + '" target="_blank" style="padding:11px 14px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);border-radius:8px;text-decoration:none;color:var(--t9,#0F172A);font-size:12.5px">📄 Datasheet técnico</a>' : '')
    + (!m.photo_url && !m.datasheet_url ? '<div style="padding:20px;text-align:center;color:var(--t6,#64748B)">Nenhum documento anexado.</div>' : '')
    + '</div>';
}

async function openMaterialEditor(material){
  const isEdit = !!material;
  const m = material || {};
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9750;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  const supOpts = '<option value="">— sem preferido —</option>' + _state.suppliers.map(s => '<option value="' + esc(s.id) + '"' + (m.preferred_supplier_id===s.id?' selected':'') + '>' + esc(s.trade_name) + '</option>').join('');
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A)">' + (isEdit?'Editar material':'Novo material') + '</div></div><button id="me-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div>'
    + '<div style="flex:1;overflow-y:auto;padding:14px 22px">'
    + '<div style="display:grid;grid-template-columns:120px 1fr;gap:10px;margin-bottom:8px"><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Código *</label><input id="me-code" value="' + esc(m.code||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:ui-monospace,monospace;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Descrição *</label><input id="me-desc" value="' + esc(m.description||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:8px"><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">NCM</label><input id="me-ncm" value="' + esc(m.ncm||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:ui-monospace,monospace;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">SAP</label><input id="me-sap" value="' + esc(m.sap_code||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:ui-monospace,monospace;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">SINAPI</label><input id="me-sinapi" value="' + esc(m.sinapi_code||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:ui-monospace,monospace;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Un</label><input id="me-unit" value="' + esc(m.unit||'un') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:8px"><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Disciplina</label><select id="me-disc" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"><option value="">—</option>' + ['civil','eletrica','hidraulica','mecanica','tubulacao','instrumentacao','caldeiraria','pintura'].map(d2 => '<option value="' + d2 + '"' + (m.discipline===d2?' selected':'') + '>' + d2 + '</option>').join('') + '</select></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Status</label><select id="me-status" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px">' + [['ativo','Ativo'],['em_homologacao','Em homologação'],['descontinuado','Descontinuado'],['bloqueado','Bloqueado']].map(o => '<option value="' + o[0] + '"' + ((m.status||'ativo')===o[0]?' selected':'') + '>' + o[1] + '</option>').join('') + '</select></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Classe ABC</label><select id="me-abc" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"><option value="">— (auto)</option><option value="A"' + (m.abc_class==='A'?' selected':'') + '>A</option><option value="B"' + (m.abc_class==='B'?' selected':'') + '>B</option><option value="C"' + (m.abc_class==='C'?' selected':'') + '>C</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:8px"><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Último preço R$</label><input id="me-price" type="number" step="0.01" value="' + n(m.last_price||m.unit_price) + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:ui-monospace,monospace;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Lead time (d)</label><input id="me-lead" type="number" value="' + (m.lead_time_days||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Estoque mín</label><input id="me-minstk" type="number" step="0.01" value="' + (m.min_stock||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Ponto pedido</label><input id="me-rop" type="number" step="0.01" value="' + (m.reorder_point||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div></div>'
    + '<div style="margin-bottom:8px"><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Fornecedor preferido</label><select id="me-sup" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px">' + supOpts + '</select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px"><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Foto URL</label><input id="me-photo" value="' + esc(m.photo_url||'') + '" placeholder="https://..." style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div><div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Datasheet URL</label><input id="me-ds" value="' + esc(m.datasheet_url||'') + '" placeholder="https://..." style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px"></div></div>'
    + '<div style="margin-bottom:8px"><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Notas</label><textarea id="me-notes" rows="2" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12px;margin-top:3px;resize:vertical">' + esc(m.notes||'') + '</textarea></div>'
    + '</div>'
    + '<div style="padding:12px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;gap:8px">'
    + (isEdit ? '<button class="btn bg" id="me-delete" style="color:#B91C1C">Excluir material</button>' : '<div></div>')
    + '<div style="display:flex;gap:8px"><button class="btn bg" id="me-cancel">Cancelar</button><button class="btn bp" id="me-save">' + (isEdit?'Salvar':'Criar') + '</button></div>'
    + '</div></div>';
  d.body.appendChild(ov);
  d.getElementById('me-close').onclick = ()=> ov.remove();
  d.getElementById('me-cancel').onclick = ()=> ov.remove();
  if(isEdit){
    d.getElementById('me-delete').onclick = async ()=>{
      if(!confirm('Excluir "' + (m.description||'') + '" do catálogo?')) return;
      const sb = getSb();
      const u = await sb.from('materials_catalog').update({ deleted_at: new Date().toISOString() }).eq('id', m.id);
      if(u.error){ alert('Erro: ' + u.error.message); return; }
      ov.remove();
      await loadAll();
      renderShell();
    };
  }
  d.getElementById('me-save').onclick = async ()=>{
    const code = d.getElementById('me-code').value.trim();
    const desc = d.getElementById('me-desc').value.trim();
    if(!code || !desc){ alert('Código e descrição obrigatórios.'); return; }
    const orgId = (w._org && w._org.id) || null;
    const payload = {
      org_id: orgId,
      code: code, description: desc.slice(0,500),
      ncm: d.getElementById('me-ncm').value.trim() || null,
      sap_code: d.getElementById('me-sap').value.trim() || null,
      sinapi_code: d.getElementById('me-sinapi').value.trim() || null,
      unit: d.getElementById('me-unit').value.trim() || 'un',
      discipline: d.getElementById('me-disc').value || null,
      status: d.getElementById('me-status').value || 'ativo',
      abc_class: d.getElementById('me-abc').value || null,
      last_price: n(d.getElementById('me-price').value) || null,
      unit_price: n(d.getElementById('me-price').value) || null,
      lead_time_days: parseInt(d.getElementById('me-lead').value) || null,
      min_stock: n(d.getElementById('me-minstk').value) || null,
      reorder_point: n(d.getElementById('me-rop').value) || null,
      preferred_supplier_id: d.getElementById('me-sup').value || null,
      photo_url: d.getElementById('me-photo').value.trim() || null,
      datasheet_url: d.getElementById('me-ds').value.trim() || null,
      notes: d.getElementById('me-notes').value.trim() || null
    };
    const sb = getSb();
    let res;
    if(isEdit) res = await sb.from('materials_catalog').update(payload).eq('id', m.id);
    else { payload.last_price_date = new Date().toISOString().slice(0,10); res = await sb.from('materials_catalog').insert(payload); }
    if(res.error){ alert('Erro: ' + res.error.message); return; }
    ov.remove();
    await loadAll();
    renderShell();
  };
}

async function classifyABC(){
  if(!confirm('Classificar materiais em ABC automaticamente? Top 20% = A, próximos 30% = B, restante = C.')) return;
  const sb = getSb();
  const sorted = _state.materials.slice().sort((a,b) => n(b.last_price||b.unit_price) - n(a.last_price||a.unit_price));
  const total = sorted.length;
  const aCount = Math.ceil(total * 0.2);
  const bCount = Math.ceil(total * 0.3);
  const updates = sorted.map((m,i) => {
    const cls = i < aCount ? 'A' : i < aCount + bCount ? 'B' : 'C';
    return { id: m.id, abc_class: cls };
  });
  let ok = 0;
  for(const u of updates){
    const r = await sb.from('materials_catalog').update({ abc_class: u.abc_class }).eq('id', u.id);
    if(!r.error) ok++;
  }
  alert(ok + ' material(is) classificado(s) por valor.');
  await loadAll();
  renderShell();
}

// ============================================================
// IMPORT - Excel/CSV (parser direto) ou PDF (via IA)
// ============================================================
function openImport(){
  var prev = d.getElementById('pia-mat-imp-ov'); if(prev) prev.remove();
  var ov = d.createElement('div');
  ov.id = 'pia-mat-imp-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9870;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
  ov.innerHTML = ''
    + '<div style="background:var(--t0,#fff);border-radius:10px;max-width:560px;width:100%;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(0,0,0,.18)">'
      + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)">'
        + '<div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Importar materiais</div>'
        + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Excel (.xlsx) ou CSV - parser direto. PDF - leitura via IA. Colunas esperadas: <strong>code, description, unit, category, discipline, ncm, sap_code, unit_price</strong> (apenas description e obrigatoria).</div>'
      + '</div>'
      + '<div style="padding:18px 22px">'
        + '<label style="border:1.5px dashed var(--t3,#E5E7EB);border-radius:8px;padding:20px;text-align:center;cursor:pointer;display:block;background:var(--t1,#F8FAFC)">'
          + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
          + '<div style="font-size:13px;font-weight:600;color:var(--t9,#0F172A)">Selecionar arquivo</div>'
          + '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:3px">.xlsx, .csv, .pdf</div>'
          + '<input id="mat-imp-file" type="file" accept=".xlsx,.csv,.pdf,image/*" style="display:none">'
        + '</label>'
        + '<div id="mat-imp-info" style="margin-top:10px;font-size:11.5px;color:var(--t6,#64748B);min-height:18px"></div>'
      + '</div>'
      + '<div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px">'
        + '<button class="btn bg" id="mat-imp-x">Cancelar</button>'
        + '<button class="btn bp" id="mat-imp-go" disabled>Processar</button>'
      + '</div>'
    + '</div>';
  d.body.appendChild(ov);
  d.getElementById('mat-imp-x').onclick = function(){ ov.remove(); };
  var _f = null;
  d.getElementById('mat-imp-file').onchange = function(e){
    _f = e.target.files[0]; if(!_f) return;
    d.getElementById('mat-imp-info').textContent = _f.name + ' (' + Math.round(_f.size/1024) + ' KB)';
    d.getElementById('mat-imp-go').disabled = false;
  };
  d.getElementById('mat-imp-go').onclick = async function(){
    if(!_f) return;
    var b = d.getElementById('mat-imp-go'); b.disabled = true; b.textContent = 'Processando...';
    try {
      var name = _f.name.toLowerCase();
      var rows = [];
      if(name.endsWith('.csv')) rows = await parseCsv(_f);
      else if(name.endsWith('.xlsx') || name.endsWith('.xls')) rows = await parseXlsx(_f);
      else if(name.endsWith('.pdf') || (_f.type||'').indexOf('image/')===0) rows = await parsePdfViaAI(_f);
      else throw new Error('Formato nao suportado: use .xlsx, .csv ou .pdf');
      if(!rows.length) throw new Error('Arquivo vazio ou colunas nao reconhecidas.');
      var saved = await bulkInsert(rows);
      ov.remove();
      alert(saved + ' material(is) importado(s) com sucesso.');
      await loadAll(); renderShell();
    } catch(e){ alert('Erro: ' + (e.message || e)); b.disabled = false; b.textContent = 'Processar'; }
  };
}

function parseCsv(file){
  return new Promise(function(res, rej){
    var r = new FileReader();
    r.onload = function(){
      try {
        var txt = String(r.result || '');
        var lines = txt.split(/\r?\n/).filter(function(l){ return l.trim(); });
        if(lines.length < 2) return res([]);
        var sep = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
        var headers = lines[0].split(sep).map(function(h){ return normalizeHeader(h); });
        var rows = lines.slice(1).map(function(line){
          var cells = line.split(sep);
          var obj = {}; headers.forEach(function(h,i){ obj[h] = (cells[i]||'').trim().replace(/^"|"$/g,''); });
          return obj;
        }).filter(function(o){ return o.description || o.descricao; });
        res(rows);
      } catch(e){ rej(e); }
    };
    r.onerror = rej; r.readAsText(file, 'utf-8');
  });
}

async function parseXlsx(file){
  if(typeof XLSX === 'undefined'){
    await new Promise(function(res, rej){
      var s = d.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = function(){ rej(new Error('Falha ao carregar SheetJS')); };
      d.head.appendChild(s);
    });
  }
  var buf = await file.arrayBuffer();
  var wb = XLSX.read(buf, { type: 'array' });
  var ws = wb.Sheets[wb.SheetNames[0]];
  var arr = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  return arr.map(function(o){
    var m = {}; Object.keys(o).forEach(function(k){ m[normalizeHeader(k)] = o[k]; });
    return m;
  }).filter(function(o){ return o.description || o.descricao; });
}

async function parsePdfViaAI(file){
  if(!w.PIAAIRouter) throw new Error('IA indisponivel pra ler PDF.');
  var b64 = await w.PIAAIRouter.fileToBase64(file);
  var prompt = 'Voce e analista de cadastro de materiais. Extraia TODOS os materiais visiveis em JSON entre ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###: {"materials":[{"code":"...","description":"...","unit":"un","category":"...","discipline":"...","ncm":"...","sap_code":"...","unit_price":null}]}. Regras: nunca invente codigo. description obrigatorio.';
  var r = await w.PIAAIRouter.call('analyze-discipline-doc', { file: b64, mime: file.type || 'application/pdf', discipline_code: 'custom', custom_prompt: prompt }, { event: 'materials_import_pdf', tables: ['materials_catalog'] });
  if(!r.ok) throw new Error(r.error || 'IA falhou');
  var ex = (r.data && r.data.extracted) || r.data || {};
  return Array.isArray(ex.materials) ? ex.materials : [];
}

function normalizeHeader(h){
  var k = String(h||'').toLowerCase().trim()
    .replace(/[\u00e1\u00e0\u00e2\u00e3]/g,'a').replace(/[\u00e9\u00ea]/g,'e')
    .replace(/[\u00ed\u00ee]/g,'i').replace(/[\u00f3\u00f4\u00f5]/g,'o')
    .replace(/[\u00fa]/g,'u').replace(/[\u00e7]/g,'c').replace(/\s+/g,'_');
  var map = { 'descricao':'description', 'desc':'description', 'codigo':'code', 'cod':'code', 'unidade':'unit', 'un':'unit', 'categoria':'category', 'disciplina':'discipline', 'preco':'unit_price', 'preco_unitario':'unit_price', 'preco_unit':'unit_price', 'valor':'unit_price', 'ncm':'ncm', 'sap':'sap_code', 'codigo_sap':'sap_code' };
  return map[k] || k;
}

async function bulkInsert(rows){
  var sb = getSb(); var orgId = (w._org && w._org.id) || null;
  var ok = 0;
  for(var i = 0; i < rows.length; i++){
    var r = rows[i];
    var desc = String(r.description || r.descricao || '').trim();
    if(!desc) continue;
    var payload = {
      org_id: orgId,
      code: String(r.code || r.codigo || ('AUTO-' + Date.now() + '-' + ok)).slice(0,60),
      description: desc.slice(0, 500),
      unit: String(r.unit || r.unidade || 'un').slice(0, 20),
      category: r.category ? String(r.category).slice(0,80) : null,
      discipline: r.discipline ? String(r.discipline).slice(0,40) : null,
      ncm: r.ncm ? String(r.ncm).slice(0,30) : null,
      sap_code: r.sap_code ? String(r.sap_code).slice(0,60) : null,
      unit_price: parseFloat(r.unit_price) || null,
      status: 'ativo'
    };
    try {
      var existing = await sb.from('materials_catalog').select('id').eq('org_id', orgId).eq('code', payload.code).is('deleted_at', null).maybeSingle();
      if(existing && existing.data){
        await sb.from('materials_catalog').update(payload).eq('id', existing.data.id);
      } else {
        await sb.from('materials_catalog').insert(payload);
      }
      ok++;
    } catch(e){ console.warn('[mat-import] falhou:', payload.code, e); }
  }
  return ok;
}

w.PIAMaterialsCatalog = { open };

} catch(e){ console.error('[materials-catalog] init falhou:', e); }
})(window, document);
