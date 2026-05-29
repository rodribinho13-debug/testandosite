/*! PROJECT.IA - Compras (Kanban RFQ -> PO -> AR) v4
 *  Workflow profissional inspirado em Sienge/Procore/SAP Ariba.
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
function brl(x){ if(x==null||isNaN(x)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)); }
function fmtDate(d){ if(!d) return '—'; try { return new Date(d).toLocaleDateString('pt-BR'); } catch(_){ return '—'; } }

const KANBAN_COLS = [
  { id:'rm',                    label:'Requisição',         color:'#64748B', bg:'rgba(100,116,139,.08)' },
  { id:'rfq',                   label:'Em Cotação',         color:'#0EA5E9', bg:'rgba(14,165,233,.08)' },
  { id:'aguardando_aprovacao',  label:'Aguardando Aprovação', color:'#F59E0B', bg:'rgba(245,158,11,.08)' },
  { id:'aprovado',              label:'Aprovado',           color:'#10B981', bg:'rgba(16,185,129,.08)' },
  { id:'em_transito',           label:'Em Trânsito',        color:'#7C3AED', bg:'rgba(124,58,237,.08)' },
  { id:'recebido',              label:'Recebido',           color:'#1D4ED8', bg:'rgba(29,78,216,.08)' },
  { id:'pago',                  label:'Pago/Fechado',       color:'#0F766E', bg:'rgba(15,118,110,.08)' }
];

let _state = {
  view: 'kanban',
  filters: { project: '', supplier: '', status: '', text: '' },
  cards: [],
  selectedRfq: null
};

async function open(){
  const sb = getSb();
  if(!sb){ alert('Sistema ainda nao inicializado.'); return; }
  const prev = d.getElementById('pia-compras-ov'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-compras-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit;display:flex;flex-direction:column';
  d.body.appendChild(ov);
  await loadCards();
  renderShell();
}

async function loadCards(){
  const sb = getSb();
  try {
    const { data, error } = await sb.from('v_compras_kanban').select('*').order('created_at', { ascending: false }).limit(500);
    if(error) throw error;
    _state.cards = data || [];
  } catch(e){
    console.warn('[compras] loadCards', e);
    _state.cards = [];
  }
}

function applyFilters(cards){
  const f = _state.filters;
  return (cards||[]).filter(c => {
    if(f.project && c.project_id !== f.project) return false;
    if(f.status && c.kanban_status !== f.status) return false;
    if(f.supplier && c.preferred_supplier_id !== f.supplier) return false;
    if(f.text){
      const t = f.text.toLowerCase();
      if(!(c.number||'').toLowerCase().includes(t) && !(c.title||'').toLowerCase().includes(t)) return false;
    }
    return true;
  });
}

function renderShell(){
  const ov = d.getElementById('pia-compras-ov'); if(!ov) return;
  const filtered = applyFilters(_state.cards);
  const totals = filtered.reduce((s,c) => s + n(c.total_estimated), 0);
  ov.innerHTML =
    '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<button class="btn bg" onclick="document.getElementById(\'pia-compras-ov\').remove()" style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Compras (RFQ → PO → AR)</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + filtered.length + ' RFQ(s) &middot; Total estimado: <strong>' + brl(totals) + '</strong></div></div>'
    + '<div style="flex:1"></div>'
    + '<input id="cmp-search" placeholder="Buscar RFQ..." value="' + esc(_state.filters.text||'') + '" style="padding:7px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;width:200px">'
    + '<button class="btn bg" id="cmp-rules">Alçadas</button>'
    + '<button class="btn bia" id="cmp-ai" title="Importar proposta de fornecedor via IA"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>IA Cotação</button>'
    + '<button class="btn bp" id="cmp-new" style="display:inline-flex;align-items:center;justify-content:center"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nova RM</button>'
    + '<button class="btn bg" id="cmp-toggle" title="Alternar Kanban/Lista">' + (_state.view==='kanban'?'Lista':'Kanban') + '</button>'
    + '</div>'
    + '<div id="cmp-body" style="flex:1;overflow:auto;padding:18px 22px;background:var(--t1,#F8FAFC)"></div>';
  d.getElementById('cmp-search').oninput = e => { _state.filters.text = e.target.value; renderBody(); };
  d.getElementById('cmp-new').onclick = openNewRM;
  var bai = d.getElementById('cmp-ai'); if(bai) bai.onclick = function(){ var rfqId = _state.selectedRfq || null; if(w.PIALazy) w.PIALazy.run('ai-quotation','openImport',rfqId); else if(w.PIAIAQuotation) w.PIAIAQuotation.openImport(rfqId); };
  d.getElementById('cmp-rules').onclick = openApprovalRules;
  d.getElementById('cmp-toggle').onclick = () => { _state.view = _state.view==='kanban'?'list':'kanban'; renderShell(); };
  renderBody();
}

function renderBody(){
  const host = d.getElementById('cmp-body'); if(!host) return;
  const filtered = applyFilters(_state.cards);
  if(_state.view === 'kanban') renderKanban(host, filtered);
  else renderList(host, filtered);
}

function renderKanban(host, cards){
  const isEmpty = cards.length === 0;
  // Agrupa por status (vazio se isEmpty, mas mantém estrutura das 7 colunas)
  const byStatus = {};
  KANBAN_COLS.forEach(col => byStatus[col.id] = []);
  cards.forEach(c => { if(byStatus[c.kanban_status]) byStatus[c.kanban_status].push(c); });

  // Banner educativo no topo quando vazio — paleta sóbria, sem gradientes
  const emptyBanner = isEmpty
    ? '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
      + '<div style="width:32px;height:32px;border-radius:6px;background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>'
      + '<div style="flex:1;min-width:240px">'
        + '<div style="font-size:13px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:2px">Fluxo de compras em 7 etapas</div>'
        + '<div style="font-size:11.5px;color:var(--t6,#64748B);line-height:1.45">Crie uma Requisição de Material (RM), solicite cotações, aprove conforme alçada e acompanhe entrega até o pagamento. Arraste cards entre colunas para avançar.</div>'
      + '</div>'
      + '<button class="btn bg" onclick="document.getElementById(\'cmp-new\').click()" style="flex-shrink:0">Criar 1ª RM</button>'
    + '</div>'
    : '';

  host.innerHTML = emptyBanner
    + '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;align-items:flex-start" id="kanban-board">'
    + KANBAN_COLS.map((col, idx) => {
        const items = byStatus[col.id] || [];
        const total = items.reduce((s,c) => s + n(c.total_estimated), 0);
        // Ghost card educativo só na 1ª coluna quando empty
        const ghostHint = (isEmpty && idx === 0)
          ? '<div style="border:1.5px dashed var(--t3,#CBD5E1);border-radius:8px;padding:14px 12px;text-align:center;background:rgba(255,255,255,.5)">'
              + '<div style="font-size:11px;color:var(--t6,#64748B);line-height:1.5">Cards de RM aparecem aqui<br><span style="font-size:10px;opacity:.75">Clique em "+ Nova RM" pra criar</span></div>'
            + '</div>'
          : (items.length === 0 && !isEmpty
            ? '<div style="font-size:10.5px;color:var(--t6,#94A3B8);text-align:center;padding:18px 8px;font-style:italic">— vazio —</div>'
            : '');
        return '<div class="kb-col" data-status="' + col.id + '" style="min-width:280px;width:280px;background:' + col.bg + ';border:1px solid var(--t3,#E5E7EB);border-radius:10px;display:flex;flex-direction:column;flex-shrink:0">'
          + '<div style="padding:10px 12px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:8px">'
          + '<div style="width:8px;height:8px;border-radius:50%;background:' + col.color + '"></div>'
          + '<div style="flex:1;font-size:11px;font-weight:700;color:var(--t9,#0F172A);text-transform:uppercase;letter-spacing:.4px">' + col.label + '</div>'
          + '<span style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);color:var(--t9,#0F172A);font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:10px">' + items.length + '</span>'
          + '</div>'
          + '<div class="kb-list" style="padding:8px;flex:1;overflow-y:auto;max-height:calc(100vh - 240px);min-height:80px">'
          + (items.length > 0 ? items.map(card => renderCard(card, col.color)).join('') : ghostHint)
          + '</div>'
          + (total>0 ? '<div style="padding:8px 12px;border-top:1px solid var(--t3,#E5E7EB);font-size:11px;color:var(--t6,#64748B);text-align:right">Total: <strong style="color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(total) + '</strong></div>' : '')
          + '</div>';
      }).join('')
    + '</div>';
  wireCardEvents(host);
}

function renderCard(c, color){
  const alerts = [];
  if(c.is_overdue) alerts.push('<span style="background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:700">ATRASADO</span>');
  if(c.days_in_status > 7) alerts.push('<span style="background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:700">' + c.days_in_status + 'd PARADO</span>');
  if(c.priority === 'urgente' || c.priority === 'alta') alerts.push('<span style="background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:700">URGENTE</span>');

  return '<div class="kb-card" data-id="' + c.id + '" style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-left:3px solid ' + color + ';border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:all .12s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'\'">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px">'
    + '<div style="font-size:10.5px;font-weight:700;color:var(--t6,#64748B);font-family:ui-monospace,monospace">' + esc(c.number||'(sem nº)') + '</div>'
    + '<div style="font-size:11px;font-weight:700;color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(n(c.total_estimated)) + '</div>'
    + '</div>'
    + '<div style="font-size:12px;color:var(--t9,#0F172A);line-height:1.35;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(c.title||'(sem título)') + '</div>'
    + (c.preferred_supplier_name ? '<div style="font-size:10.5px;color:var(--t6,#64748B);margin-bottom:4px">Forn: <strong style="color:var(--t9,#0F172A)">' + esc(c.preferred_supplier_name) + '</strong></div>' : '')
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10px;color:var(--t6,#64748B)">'
    + '<div>' + (c.responses_count||0) + ' propostas &middot; ' + (c.items_count||0) + ' itens</div>'
    + '<div>' + (c.required_by ? 'Prazo ' + fmtDate(c.required_by) : '') + '</div>'
    + '</div>'
    + (alerts.length ? '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">' + alerts.join('') + '</div>' : '')
    + '</div>';
}

function renderList(host, cards){
  if(cards.length === 0){
    host.innerHTML = '<div style="background:var(--t0,#fff);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;padding:32px;text-align:center;color:var(--t6,#64748B)">Nenhuma RFQ encontrada.</div>';
    return;
  }
  host.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;overflow:hidden"><table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Nº</th><th>Título</th><th>Status</th><th>Fornecedor pref.</th><th>Prazo</th><th style="text-align:right">Valor</th><th>Dias parado</th></tr></thead><tbody>'
    + cards.map(c => {
      const col = KANBAN_COLS.find(x => x.id === c.kanban_status) || KANBAN_COLS[0];
      return '<tr class="kb-row" data-id="' + c.id + '" style="cursor:pointer">'
        + '<td style="font-family:ui-monospace,monospace;color:var(--t6,#64748B);font-size:11px">' + esc(c.number||'') + '</td>'
        + '<td><strong>' + esc(c.title||'') + '</strong></td>'
        + '<td><span style="background:' + col.bg + ';color:' + col.color + ';padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:700">' + col.label + '</span></td>'
        + '<td>' + esc(c.preferred_supplier_name||'—') + '</td>'
        + '<td style="color:' + (c.is_overdue?'#991B1B':'var(--t9,#0F172A)') + '">' + fmtDate(c.required_by) + '</td>'
        + '<td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(n(c.total_estimated)) + '</td>'
        + '<td style="color:' + (c.days_in_status>7?'#92400E':'var(--t6,#64748B)') + '">' + (c.days_in_status||0) + 'd</td>'
        + '</tr>';
    }).join('') + '</tbody></table></div>';
  wireCardEvents(host);
}

function wireCardEvents(host){
  host.querySelectorAll('.kb-card, .kb-row').forEach(el => {
    el.onclick = () => openCardDetail(el.dataset.id);
  });
  // Drag & drop entre colunas (Kanban)
  if(_state.view === 'kanban'){
    host.querySelectorAll('.kb-card').forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.style.opacity = '.5';
      });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    });
    host.querySelectorAll('.kb-col').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.style.background = 'rgba(29,78,216,.05)';
      });
      col.addEventListener('dragleave', () => {
        const c = KANBAN_COLS.find(x => x.id === col.dataset.status);
        col.style.background = c ? c.bg : '';
      });
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        const c = KANBAN_COLS.find(x => x.id === col.dataset.status);
        col.style.background = c ? c.bg : '';
        const id = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        await moveCard(id, newStatus);
      });
    });
  }
}

async function moveCard(id, newStatus){
  const sb = getSb();
  const card = _state.cards.find(c => c.id === id);
  if(!card || card.kanban_status === newStatus) return;
  // Validar transição: aguardando_aprovacao -> aprovado precisa de alçada
  if(newStatus === 'aprovado' && card.kanban_status === 'aguardando_aprovacao'){
    const check = await sb.rpc('check_approval_required', { p_org_id: card.org_id, p_value: n(card.total_estimated), p_user_id: (w._user && w._user.id) || null });
    if(check.data && check.data.required){
      alert('Aprovação requer role: ' + (check.data.required_role || 'admin') + '. Seu role: ' + (check.data.user_role || '—') + '.');
      return;
    }
    const justif = prompt('Justificativa de aprovação (opcional):') || '';
    await sb.from('purchase_approvals').insert({ org_id: card.org_id, entity_type: 'rfq', entity_id: id, approver_user_id: (w._user && w._user.id) || null, decision: 'approved', justification: justif, approved_value: n(card.total_estimated) });
  }
  const u = await sb.from('quotation_requests').update({ kanban_status: newStatus }).eq('id', id);
  if(u.error){ alert('Erro: ' + u.error.message); return; }
  await loadCards();
  renderBody();
}

// ============================================================
// DETAIL MODAL — abre uma RFQ com tabs
// ============================================================
async function openCardDetail(id){
  const sb = getSb();
  const card = _state.cards.find(c => c.id === id);
  if(!card){ alert('RFQ não encontrada.'); return; }
  _state.selectedRfq = card;
  const [itemsR, respsR, timelineR, approvalsR] = await Promise.all([
    sb.from('quotation_items').select('*').eq('rfq_id', id),
    sb.from('quotation_responses').select('*').eq('rfq_id', id),
    sb.from('purchase_timeline').select('*').eq('entity_id', id).eq('entity_type','rfq').order('created_at', { ascending: false }).limit(50),
    sb.from('purchase_approvals').select('*').eq('entity_id', id).eq('entity_type','rfq').order('created_at', { ascending: false })
  ]);
  const items = itemsR.data || [];
  const responses = respsR.data || [];
  const timeline = timelineR.data || [];
  const approvals = approvalsR.data || [];

  const ov = d.createElement('div');
  ov.id = 'pia-rfq-detail';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:1000px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    + '<div><div style="font-size:16px;font-weight:700;color:var(--t9,#0F172A)">' + esc(card.title||'') + '</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px">' + esc(card.number||'') + ' &middot; ' + (KANBAN_COLS.find(c=>c.id===card.kanban_status)?.label || card.kanban_status) + ' &middot; Total estimado: <strong style="color:var(--t9,#0F172A)">' + brl(n(card.total_estimated)) + '</strong></div></div>'
    + '<button id="rfq-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button>'
    + '</div>'
    + '<div style="display:flex;gap:0;border-bottom:1px solid var(--t3,#E5E7EB);padding:0 18px;flex-shrink:0">'
    + ['items','propostas','mapa','timeline','aprovacoes','anexos'].map((tab,i) => {
      const labels = { items:'Itens', propostas:'Propostas ('+responses.length+')', mapa:'Mapa Comparativo', timeline:'Timeline', aprovacoes:'Aprovações ('+approvals.length+')', anexos:'Anexos' };
      return '<button class="rfq-tab" data-tab="' + tab + '" style="border:none;background:transparent;padding:12px 14px;cursor:pointer;font-weight:600;font-size:12.5px;color:' + (i===0?'var(--t9)':'var(--t6)') + ';border-bottom:3px solid ' + (i===0?'var(--accent,#1D4ED8)':'transparent') + ';font-family:inherit;white-space:nowrap">' + labels[tab] + '</button>';
    }).join('')
    + '</div>'
    + '<div id="rfq-body" style="flex:1;overflow-y:auto;padding:18px 22px"></div>'
    + '<div style="padding:14px 18px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
    + '<div style="font-size:11px;color:var(--t6,#64748B)">Criado em ' + fmtDate(card.created_at) + (card.required_by ? ' &middot; Prazo: ' + fmtDate(card.required_by) : '') + '</div>'
    + '<div style="display:flex;gap:6px">'
    + '<button class="btn bg" id="rfq-add-resp">+ Proposta</button>'
    + '<button class="btn bg" id="rfq-add-item">+ Item</button>'
    + '<button class="btn bp" id="rfq-advance">Avançar status</button>'
    + '</div></div>'
    + '</div>';
  d.body.appendChild(ov);
  d.getElementById('rfq-close').onclick = ()=> ov.remove();
  d.getElementById('rfq-add-item').onclick = ()=> addRfqItem(card.id);
  d.getElementById('rfq-add-resp').onclick = ()=> addRfqResponse(card.id, items);
  d.getElementById('rfq-advance').onclick = ()=> advanceStatus(card);

  const renderTab = (tab) => {
    ov.querySelectorAll('.rfq-tab').forEach(b => {
      const act = b.dataset.tab === tab;
      b.style.color = act ? 'var(--t9)' : 'var(--t6)';
      b.style.borderBottomColor = act ? 'var(--accent,#1D4ED8)' : 'transparent';
    });
    const body = d.getElementById('rfq-body');
    if(tab === 'items') body.innerHTML = renderItemsTab(items);
    else if(tab === 'propostas') body.innerHTML = renderPropostasTab(responses);
    else if(tab === 'mapa') body.innerHTML = renderMapaTab(items, responses, card);
    else if(tab === 'timeline') body.innerHTML = renderTimelineTab(timeline);
    else if(tab === 'aprovacoes') body.innerHTML = renderAprovacoesTab(approvals);
    else if(tab === 'anexos') body.innerHTML = renderAnexosTab(card.id);
  };
  ov.querySelectorAll('.rfq-tab').forEach(b => b.onclick = () => renderTab(b.dataset.tab));
  renderTab('items');
}

function renderItemsTab(items){
  if(items.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhum item cadastrado. Clique em "+ Item" pra adicionar.</div>';
  return '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>#</th><th>Descrição</th><th style="text-align:right">Qtd</th><th>Un</th><th style="text-align:right">Preço orçado</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>'
    + items.map((it,i) => '<tr><td>' + (i+1) + '</td><td>' + esc(it.description||'') + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + n(it.quantity).toFixed(2) + '</td><td>' + esc(it.unit||'') + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(it.budget_unit_price)) + '</td><td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(n(it.quantity)*n(it.budget_unit_price)) + '</td></tr>').join('')
    + '</tbody></table>';
}

function renderPropostasTab(responses){
  if(responses.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhuma proposta recebida. Clique em "+ Proposta" pra cadastrar.</div>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">' + responses.map(r => '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:12px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px"><div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A)">' + esc(r.supplier_name||'') + '</div>' + (r.approved ? '<span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">VENCEDOR</span>' : '') + '</div><div style="font-size:11px;color:var(--t6,#64748B);line-height:1.55"><div>Prazo: <strong>' + (r.lead_time_days||'—') + ' dias</strong></div><div>Pagamento: ' + esc(r.payment_terms||'—') + '</div><div>Validade: ' + (r.validity_days||'—') + ' dias</div>' + (r.origin ? '<div>Origem: ' + esc(r.origin) + '</div>' : '') + '</div></div>').join('') + '</div>';
}

function renderMapaTab(items, responses, card){
  if(responses.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Adicione propostas primeiro para gerar o mapa comparativo.</div>';
  if(items.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Adicione itens à RFQ primeiro.</div>';
  // Pré-carrega response_items pra cada resposta
  loadResponseItems(items, responses).then(matrix => {
    const body = d.getElementById('rfq-body');
    if(!body) return;
    body.innerHTML = renderMapaHTML(items, responses, matrix, card);
    wireMapaEvents(items, responses, matrix, card);
  });
  return '<div style="padding:20px;text-align:center;color:var(--t6,#64748B)">Carregando mapa...</div>';
}

async function loadResponseItems(items, responses){
  const sb = getSb();
  const matrix = {}; // {responseId: {itemId: {unit_price, total}}}
  for(const r of responses){
    matrix[r.id] = {};
    const ri = await sb.from('quotation_response_items').select('*').eq('response_id', r.id);
    (ri.data||[]).forEach(x => { matrix[r.id][x.quotation_item_id] = x; });
  }
  return matrix;
}

function renderMapaHTML(items, responses, matrix, card){
  // Totais por fornecedor
  const totals = responses.map(r => items.reduce((s,it) => {
    const cell = matrix[r.id] && matrix[r.id][it.id];
    return s + (cell ? n(cell.unit_price) * n(it.quantity) : 0);
  }, 0));
  // Score automático: menor preço total ganha pontos, prazo curto ganha, histórico (rating do fornecedor)
  const validTotals = totals.filter(t => t > 0);
  const minTotal = validTotals.length ? Math.min(...validTotals) : 0;
  const validLT = responses.filter(r => r.lead_time_days).map(r => r.lead_time_days);
  const minLT = validLT.length ? Math.min(...validLT) : null;
  const scores = responses.map((r, i) => {
    const tot = totals[i];
    if(tot <= 0) return null;
    let priceScore = minTotal > 0 ? (minTotal / tot) * 50 : 0;
    let leadScore = (minLT && r.lead_time_days) ? (minLT / r.lead_time_days) * 30 : 15;
    let histScore = 20; // placeholder — sem rating histórico ainda
    return Math.round(priceScore + leadScore + histScore);
  });
  const maxScore = scores.filter(s => s != null).length ? Math.max(...scores.filter(s => s != null)) : 0;

  let html = '<div style="overflow-x:auto"><table class="ptable" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>';
  html += '<th style="text-align:left;min-width:240px">Item</th>';
  responses.forEach((r, i) => {
    const winner = scores[i] === maxScore && maxScore > 0;
    html += '<th style="text-align:center;min-width:160px;background:' + (winner?'rgba(16,185,129,.08)':'var(--t1,#F8FAFC)') + '">';
    html += '<div style="font-weight:700;color:' + (winner?'#065F46':'var(--t9,#0F172A)') + '">' + esc(r.supplier_name||'') + (winner?' <span style="font-size:10px">★</span>':'') + '</div>';
    html += '<div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:2px;font-weight:500">Prazo: ' + (r.lead_time_days||'—') + 'd</div>';
    html += '</th>';
  });
  html += '</tr></thead><tbody>';

  items.forEach(it => {
    html += '<tr><td><strong>' + esc(it.description||'') + '</strong><div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:2px">' + n(it.quantity).toFixed(2) + ' ' + esc(it.unit||'') + (it.budget_unit_price ? ' &middot; orç: ' + brl(n(it.budget_unit_price)) : '') + '</div></td>';
    // Encontra menor preço da linha (entre as propostas)
    const rowPrices = responses.map(r => {
      const c = matrix[r.id] && matrix[r.id][it.id];
      return c ? n(c.unit_price) : null;
    }).filter(p => p != null && p > 0);
    const minRowPrice = rowPrices.length ? Math.min(...rowPrices) : null;
    responses.forEach(r => {
      const cell = matrix[r.id] && matrix[r.id][it.id];
      const price = cell ? n(cell.unit_price) : null;
      const isMin = price && minRowPrice && Math.abs(price - minRowPrice) < 0.005;
      html += '<td style="text-align:right;background:' + (isMin?'rgba(16,185,129,.06)':'transparent') + '">';
      html += '<input class="mp-cell" data-rid="' + r.id + '" data-iid="' + it.id + '" data-rii="' + (cell?cell.id:'') + '" type="number" step="0.01" value="' + (price?price.toFixed(2):'') + '" placeholder="0,00" style="width:100%;text-align:right;padding:4px 6px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:11.5px;font-family:ui-monospace,monospace;background:var(--t0,#fff)">';
      if(price) html += '<div style="font-size:9.5px;color:var(--t6,#64748B);margin-top:2px">' + brl(price * n(it.quantity)) + '</div>';
      html += '</td>';
    });
    html += '</tr>';
  });
  // Totais
  html += '<tr style="background:var(--t1,#F8FAFC);font-weight:700"><td>TOTAL</td>';
  totals.forEach((t,i) => {
    const winner = scores[i] === maxScore && maxScore > 0;
    html += '<td style="text-align:right;color:' + (winner?'#065F46':'var(--t9,#0F172A)') + ';font-family:ui-monospace,monospace">' + brl(t) + '</td>';
  });
  html += '</tr>';
  // Scores
  html += '<tr><td style="font-size:11px;color:var(--t6,#64748B)">Score</td>';
  scores.forEach((s, i) => {
    const winner = s === maxScore && maxScore > 0;
    html += '<td style="text-align:center"><span style="background:' + (winner?'#D1FAE5':'var(--t1,#F8FAFC)') + ';color:' + (winner?'#065F46':'var(--t6,#64748B)') + ';padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace">' + (s != null ? s : '—') + '/100</span></td>';
  });
  html += '</tr>';
  // Botão selecionar
  html += '<tr><td></td>';
  responses.forEach((r, i) => {
    html += '<td style="text-align:center;padding-top:10px"><button class="mp-select" data-rid="' + r.id + '" data-total="' + totals[i] + '" data-score="' + (scores[i]||0) + '" class="btn bp" style="font-size:11px;padding:6px 10px">Selecionar</button></td>';
  });
  html += '</tr>';
  html += '</tbody></table></div>';
  html += '<div style="margin-top:14px;padding:11px 14px;background:var(--t1,#F8FAFC);border-left:3px solid var(--accent,#1D4ED8);border-radius:6px;font-size:11.5px;color:var(--t9,#0F172A)"><strong>Score:</strong> 50% preço + 30% prazo + 20% histórico do fornecedor. Edite os preços nas células — salva automaticamente.</div>';
  return html;
}

function wireMapaEvents(items, responses, matrix, card){
  const body = d.getElementById('rfq-body');
  if(!body) return;
  // Auto-save ao editar preço
  body.querySelectorAll('.mp-cell').forEach(inp => {
    let timer = null;
    inp.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const sb = getSb();
        const price = parseFloat(inp.value);
        if(isNaN(price) || price < 0) return;
        const rid = inp.dataset.rid;
        const iid = inp.dataset.iid;
        const rii = inp.dataset.rii;
        const item = items.find(x => x.id === iid);
        const total = price * n(item.quantity);
        if(rii){
          await sb.from('quotation_response_items').update({ unit_price: price, total_price: total }).eq('id', rii);
        } else {
          const ins = await sb.from('quotation_response_items').insert({ response_id: rid, quotation_item_id: iid, unit_price: price, total_price: total }).select().single();
          if(ins.data) inp.dataset.rii = ins.data.id;
        }
        // Recarrega mapa pra recalcular scores
        const newMatrix = await loadResponseItems(items, responses);
        body.innerHTML = renderMapaHTML(items, responses, newMatrix, card);
        wireMapaEvents(items, responses, newMatrix, card);
      }, 400);
    };
  });
  // Selecionar fornecedor (split award permitido — atualiza winning_supplier_id)
  body.querySelectorAll('.mp-select').forEach(btn => {
    btn.onclick = async () => {
      const rid = btn.dataset.rid;
      const tot = parseFloat(btn.dataset.total) || 0;
      const score = parseFloat(btn.dataset.score) || 0;
      const resp = responses.find(r => r.id === rid);
      // Verifica se é o de menor preço; se não, pede justificativa
      const allTotals = responses.map(r => {
        return items.reduce((s,it) => {
          const c = matrix[r.id] && matrix[r.id][it.id];
          return s + (c ? n(c.unit_price) * n(it.quantity) : 0);
        }, 0);
      });
      const validTotals = allTotals.filter(t => t > 0);
      const minTot = validTotals.length ? Math.min(...validTotals) : 0;
      let justif = '';
      if(tot > minTot * 1.01){
        justif = prompt('Este fornecedor NÃO tem o menor preço. Justificativa obrigatória:');
        if(!justif || !justif.trim()){ alert('Justificativa obrigatória.'); return; }
      } else {
        justif = prompt('Justificativa (opcional):') || '';
      }
      const sb = getSb();
      // Marca resposta como aprovada
      await sb.from('quotation_responses').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', rid);
      // Atualiza RFQ com fornecedor vencedor + total
      await sb.from('quotation_requests').update({ kanban_status: 'aprovado', total_estimated: tot }).eq('id', card.id);
      // Loga aprovação
      await sb.from('purchase_approvals').insert({ org_id: card.org_id, entity_type: 'rfq', entity_id: card.id, approver_user_id: (w._user && w._user.id) || null, decision: 'approved', justification: 'Fornecedor selecionado: ' + (resp ? resp.supplier_name : '') + (justif ? ' | ' + justif : ''), approved_value: tot });
      alert('Fornecedor ' + (resp?resp.supplier_name:'') + ' selecionado. RFQ movida para "Aprovado".');
      d.getElementById('pia-rfq-detail').remove();
      await loadCards();
      renderBody();
    };
  });
}


function renderTimelineTab(timeline){
  if(timeline.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Sem eventos registrados ainda.</div>';
  return '<div style="position:relative;padding-left:24px"><div style="position:absolute;left:8px;top:8px;bottom:8px;width:2px;background:var(--t3,#E5E7EB)"></div>' + timeline.map(t => '<div style="position:relative;margin-bottom:14px"><div style="position:absolute;left:-22px;top:4px;width:14px;height:14px;border-radius:50%;background:var(--accent,#1D4ED8);border:3px solid var(--t0,#fff);box-shadow:0 0 0 1px var(--t3,#E5E7EB)"></div><div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:10px 12px"><div style="font-size:12px;font-weight:600;color:var(--t9,#0F172A)">' + esc(t.event_description||t.event_type) + '</div><div style="font-size:10.5px;color:var(--t6,#64748B);margin-top:3px">' + fmtDate(t.created_at) + ' &middot; ' + new Date(t.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) + (t.actor_name ? ' &middot; ' + esc(t.actor_name) : '') + '</div></div></div>').join('') + '</div>';
}

function renderAprovacoesTab(approvals){
  if(approvals.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhuma aprovação ainda.</div>';
  return '<div style="display:flex;flex-direction:column;gap:8px">' + approvals.map(a => '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-left:4px solid ' + (a.decision==='approved'?'#10B981':a.decision==='rejected'?'#EF4444':'#F59E0B') + ';border-radius:8px;padding:11px 14px"><div style="display:flex;justify-content:space-between"><div style="font-size:12.5px;font-weight:700;color:var(--t9,#0F172A)">' + (a.decision==='approved'?'Aprovado':a.decision==='rejected'?'Rejeitado':'Pediu mudanças') + '</div><div style="font-size:11px;color:var(--t6,#64748B)">' + fmtDate(a.created_at) + '</div></div>' + (a.justification ? '<div style="font-size:11.5px;color:var(--t9,#0F172A);margin-top:6px">' + esc(a.justification) + '</div>' : '') + (a.approved_value ? '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:4px">Valor aprovado: ' + brl(n(a.approved_value)) + '</div>' : '') + '</div>').join('') + '</div>';
}

function renderAnexosTab(rfqId){
  return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)"><div>Anexos via Supabase Storage — disponível na próxima atualização.</div><div style="font-size:11px;margin-top:6px">Cada etapa do workflow poderá ter PDFs anexados.</div></div>';
}

// ============================================================
// ACTIONS — criar RM, adicionar item/proposta, avançar status
// ============================================================
async function openNewRM(){
  const projId = (w._curProject && w._curProject.id) || w.curProj || null;
  if(!projId){ alert('Selecione um projeto primeiro.'); return; }
  const sb = getSb();
  const title = prompt('Título da Requisição (ex: Materiais elétricos - bloco A):');
  if(!title) return;
  const desc = prompt('Descrição (opcional):') || '';
  const requiredBy = prompt('Prazo necessário (YYYY-MM-DD, opcional):') || null;
  const orgId = (w._org && w._org.id) || null;
  const today = new Date();
  const ymd = today.toISOString().slice(0,10).replace(/-/g,'');
  const rnd = Math.floor(Math.random()*900 + 100);
  const ins = await sb.from('quotation_requests').insert({
    org_id: orgId, project_id: projId,
    rfq_number: 'RM-' + ymd + '-' + rnd,
    description: title,
    notes: desc || null,
    required_by: requiredBy && /^\d{4}-\d{2}-\d{2}$/.test(requiredBy) ? requiredBy : null,
    requester: (w._user && w._user.email) || null,
    priority: 'normal',
    kanban_status: 'rm',
    status: 'aberta'
  }).select().single();
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  await loadCards();
  renderBody();
  setTimeout(()=> openCardDetail(ins.data.id), 100);
}

async function addRfqItem(rfqId){
  const desc = prompt('Descrição do item:');
  if(!desc) return;
  const qty = parseFloat(prompt('Quantidade:', '1') || '1');
  if(isNaN(qty) || qty<=0) return;
  const unit = prompt('Unidade (un, kg, m, etc):', 'un') || 'un';
  const budgetPrice = parseFloat(prompt('Preço orçado por unidade (opcional):', '0') || '0');
  const sb = getSb();
  const ins = await sb.from('quotation_items').insert({
    rfq_id: rfqId, description: desc.slice(0,500), quantity: qty,
    unit: unit.slice(0,20), budget_unit_price: isNaN(budgetPrice)?null:budgetPrice
  });
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  // Atualiza total estimado
  await recalcTotalEstimated(rfqId);
  d.getElementById('pia-rfq-detail').remove();
  await loadCards();
  renderBody();
  setTimeout(()=> openCardDetail(rfqId), 100);
}

async function recalcTotalEstimated(rfqId){
  const sb = getSb();
  const items = await sb.from('quotation_items').select('quantity, budget_unit_price').eq('rfq_id', rfqId);
  const total = (items.data||[]).reduce((s,i) => s + (n(i.quantity)*n(i.budget_unit_price)), 0);
  await sb.from('quotation_requests').update({ total_estimated: total }).eq('id', rfqId);
}

async function addRfqResponse(rfqId, items){
  const sb = getSb();
  const supplierName = prompt('Nome do fornecedor:');
  if(!supplierName) return;
  const leadTime = parseInt(prompt('Prazo de entrega (dias):', '15') || '15');
  const payTerms = prompt('Condições de pagamento (ex: 30 dias):', '30 dias') || '';
  const ins = await sb.from('quotation_responses').insert({
    rfq_id: rfqId, supplier_name: supplierName.slice(0,200),
    lead_time_days: isNaN(leadTime)?null:leadTime,
    payment_terms: payTerms.slice(0,100),
    validity_days: 30
  });
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  d.getElementById('pia-rfq-detail').remove();
  await loadCards();
  renderBody();
  setTimeout(()=> openCardDetail(rfqId), 100);
}

async function advanceStatus(card){
  const order = KANBAN_COLS.map(c => c.id);
  const curIdx = order.indexOf(card.kanban_status);
  if(curIdx === -1 || curIdx === order.length - 1){ alert('Já está no status final.'); return; }
  const next = order[curIdx + 1];
  await moveCard(card.id, next);
  d.getElementById('pia-rfq-detail').remove();
}

// ============================================================
// REGRAS DE APROVAÇÃO (admin)
// ============================================================
async function openApprovalRules(){
  const sb = getSb();
  const orgId = (w._org && w._org.id) || null;
  if(!orgId){ alert('Sem org.'); return; }
  const r = await sb.from('purchase_approval_rules').select('*').eq('org_id', orgId).order('min_value');
  const rules = r.data || [];
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  var modalStyle = 'background:var(--t0,#fff);border-radius:10px;max-width:760px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)';
  var hdrStyle = 'padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB)';
  var thStyle = 'text-align:left;padding:8px 10px;font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--t3,#E5E7EB)';
  var rowsHtml = rules.map(function(r){
    var faixa = brl(n(r.min_value)) + ' \u2014 ' + (r.max_value?brl(n(r.max_value)):'\u221e');
    var roleChip = '<span style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);color:var(--t8,#1E293B);padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:600;text-transform:capitalize">' + (r.role_required||'') + '</span>';
    var statusChip = r.active
      ? '<span style="background:#ECFDF5;border:1px solid #A7F3D0;color:#047857;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600">Ativa</span>'
      : '<span style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);color:var(--t6,#64748B);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600">Inativa</span>';
    return '<tr style="border-bottom:1px solid var(--t2,#F1F5F9)">'
      + '<td style="padding:10px;font-family:ui-monospace,monospace;color:var(--t9,#0F172A);font-size:12px;white-space:nowrap">' + faixa + '</td>'
      + '<td style="padding:10px">' + roleChip + '</td>'
      + '<td style="padding:10px;color:var(--t7,#475569);font-size:12px">' + esc(r.description||'\u2014') + '</td>'
      + '<td style="padding:10px">' + statusChip + '</td>'
      + '</tr>';
  }).join('');
  ov.innerHTML = '<div style="' + modalStyle + '">'
    + '<div style="' + hdrStyle + '">'
      + '<div style="font-size:14.5px;font-weight:600;color:var(--t9,#0F172A)">Al\u00e7adas de Aprova\u00e7\u00e3o</div>'
      + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Quem pode aprovar compras por faixa de valor</div>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:14px 18px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:12.5px">'
        + '<thead><tr style="background:var(--t1,#F8FAFC)">'
          + '<th style="' + thStyle + '">Faixa (R$)</th>'
          + '<th style="' + thStyle + '">Role requerido</th>'
          + '<th style="' + thStyle + '">Descri\u00e7\u00e3o</th>'
          + '<th style="' + thStyle + '">Status</th>'
        + '</tr></thead>'
        + '<tbody>' + rowsHtml + '</tbody>'
      + '</table>'
    + '</div>'
    + '<div style="padding:12px 18px;border-top:1px solid var(--t3,#E5E7EB);text-align:right">'
      + '<button class="btn bg" id="par-close">Fechar</button>'
    + '</div>'
  + '</div>';
  d.body.appendChild(ov);
  d.getElementById('par-close').onclick = function(){ ov.remove(); };
}

w.PIAQuotations = { open };

} catch(e){ console.error('[quotations] init falhou:', e); }
})(window, document);
