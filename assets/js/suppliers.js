/*! PROJECT.IA - Fornecedores (KPIs + Certificações + Score) v3
 *  Inspirado em SAP SRM, Coupa Supplier Network, Mercado Eletrônico
 *  Multi-tenant via RLS. Tokens v9.
 */
(function(w,d){'use strict';
try {

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';
function getSb(){
  if(w.sb) return w.sb;
  if(w.supabase && typeof w.supabase.createClient === 'function'){
    try { w.sb = w.supabase.createClient(SB_URL, SB_KEY); return w.sb; } catch(_){}
  }
  return null;
}
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function n(x){ const v=parseFloat(x); return isNaN(v)?0:v; }
function brl(x){ if(x==null||isNaN(x)) return '—'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)); }
function fmtDate(s){ if(!s) return '—'; try { return new Date(s).toLocaleDateString('pt-BR'); } catch(_){ return '—'; } }

const CERT_TYPES = [
  ['CND','CND Federal'],['FGTS','CRF do FGTS'],['INSS','INSS'],['TRAB','CNDT Trabalhista'],
  ['ISO9001','ISO 9001'],['ISO14001','ISO 14001'],['ABNT_NR13','ABNT NR-13'],['OUTRA','Outra']
];
const QUAL_STATUS = [
  ['aprovado','Aprovado','#10B981'],
  ['em_homologacao','Em homologação','#F59E0B'],
  ['suspenso','Suspenso','#EF4444'],
  ['bloqueado','Bloqueado','#7F1D1D']
];

let _state = {
  suppliers: [],
  certStatus: {},
  filters: { status:'', category:'', discipline:'', text:'', certWarning:false },
  selectedId: null
};

async function open(){
  const sb = getSb();
  if(!sb){ alert('Sistema ainda nao inicializado.'); return; }
  const prev = d.getElementById('pia-sup-ov'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-sup-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9640;overflow:auto;font-family:inherit;display:flex;flex-direction:column';
  d.body.appendChild(ov);
  await loadAll();
  renderShell();
}

async function loadAll(){
  const sb = getSb();
  try {
    const [supR, certR] = await Promise.all([
      sb.from('suppliers').select('*').is('deleted_at',null).order('trade_name').limit(1000),
      sb.from('v_supplier_cert_status').select('*')
    ]);
    _state.suppliers = supR.data || [];
    _state.certStatus = {};
    (certR.data || []).forEach(c => { _state.certStatus[c.id] = c; });
  } catch(e){ console.warn('[sup] loadAll', e); _state.suppliers = []; }
}

function applyFilters(items){
  const f = _state.filters;
  return (items||[]).filter(s => {
    if(f.status && s.qualification_status !== f.status) return false;
    if(f.category && !(s.categories||[]).includes(f.category)) return false;
    if(f.discipline && !(s.disciplines||[]).includes(f.discipline)) return false;
    if(f.certWarning && (!_state.certStatus[s.id] || _state.certStatus[s.id].expiring_soon === 0 && _state.certStatus[s.id].expired_certs === 0)) return false;
    if(f.text){
      const t = f.text.toLowerCase();
      const hay = ((s.trade_name||'') + ' ' + (s.legal_name||'') + ' ' + (s.cnpj||'') + ' ' + (s.city||'')).toLowerCase();
      if(!hay.includes(t)) return false;
    }
    return true;
  });
}

function renderShell(){
  const ov = d.getElementById('pia-sup-ov'); if(!ov) return;
  const filtered = applyFilters(_state.suppliers);
  // Alertas globais
  let expiringSoon = 0, expired = 0;
  Object.values(_state.certStatus).forEach(c => { expiringSoon += c.expiring_soon || 0; expired += c.expired_certs || 0; });
  ov.innerHTML =
    '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<button class="btn bg" onclick="document.getElementById(\'pia-sup-ov\').remove()" style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Fornecedores</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + filtered.length + ' fornecedor(es)</div></div>'
    + '<div style="flex:1"></div>'
    + '<input id="sp-search" placeholder="Buscar nome, CNPJ, cidade..." value="' + esc(_state.filters.text||'') + '" style="padding:7px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;width:240px">'
    + '<button class="btn bp" id="sp-new">+ Novo fornecedor</button>'
    + '</div>'
    + (expiringSoon + expired > 0 ?
      '<div style="background:#FEF3C7;border-bottom:1px solid #FCD34D;padding:10px 22px;display:flex;align-items:center;gap:10px;font-size:12.5px;color:#92400E">'
      + '<span style="font-size:16px">⚠</span>'
      + '<div><strong>' + (expired>0?expired+' certidão(ões) vencida(s)':'') + (expired>0&&expiringSoon>0?' e ':'') + (expiringSoon>0?expiringSoon+' vencendo em 30 dias':'') + '</strong></div>'
      + '<button class="btn bg" id="sp-filter-warn" style="margin-left:auto;font-size:11px;padding:4px 10px">Filtrar afetados</button>'
      + '</div>'
      : '')
    + '<div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:10px 22px;display:flex;gap:8px;flex-wrap:wrap">'
    + filterPill('status','Status',_state.filters.status, [['','Todos']].concat(QUAL_STATUS.map(s => [s[0], s[1]])))
    + filterPill('category','Categoria',_state.filters.category, [['','Todas'],['material','Material'],['servico','Serviço'],['locacao','Locação']])
    + filterPill('discipline','Disciplina',_state.filters.discipline, [['','Todas'],['civil','Civil'],['eletrica','Elétrica'],['hidraulica','Hidráulica'],['mecanica','Mecânica'],['tubulacao','Tubulação']])
    + '</div>'
    + '<div id="sp-body" style="flex:1;overflow-y:auto;padding:18px 22px;background:var(--t1,#F8FAFC)"></div>';
  d.getElementById('sp-search').oninput = e => { _state.filters.text = e.target.value; renderBody(); };
  d.getElementById('sp-new').onclick = ()=> openSupplierEditor(null);
  const fw = d.getElementById('sp-filter-warn'); if(fw) fw.onclick = ()=>{ _state.filters.certWarning = true; renderShell(); };
  ov.querySelectorAll('.flt-sel').forEach(sel => sel.onchange = ()=>{ _state.filters[sel.dataset.k] = sel.value; renderShell(); });
  renderBody();
}

function filterPill(key, label, value, opts){
  return '<select class="flt-sel" data-k="' + key + '" style="padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:11.5px;background:var(--t0,#fff);color:var(--t9,#0F172A);font-family:inherit">'
    + opts.map(o => '<option value="' + esc(o[0]) + '"' + (value===o[0]?' selected':'') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
}

function renderBody(){
  const host = d.getElementById('sp-body'); if(!host) return;
  const filtered = applyFilters(_state.suppliers);
  if(filtered.length === 0){
    host.innerHTML = '<div style="background:var(--t0,#fff);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;padding:48px;text-align:center"><div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A);margin-bottom:6px">Nenhum fornecedor</div><div style="font-size:12.5px;color:var(--t6,#64748B)">Cadastre fornecedores ou ajuste os filtros.</div></div>';
    return;
  }
  host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">'
    + filtered.map(s => renderCard(s)).join('') + '</div>';
  host.querySelectorAll('.sp-card').forEach(c => c.onclick = ()=> openSupplierDetail(c.dataset.id));
}

function renderCard(s){
  const q = QUAL_STATUS.find(x => x[0] === (s.qualification_status||'aprovado')) || QUAL_STATUS[0];
  const certStat = _state.certStatus[s.id] || { valid_certs:0, expired_certs:0, expiring_soon:0 };
  const score = n(s.score || s.rating || 0);
  const stars = Array.from({length:5}, (_,i) => i < Math.round(score) ? '★' : '☆').join('');
  return '<div class="sp-card" data-id="' + s.id + '" style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-left:3px solid ' + q[2] + ';border-radius:10px;padding:13px 15px;cursor:pointer;transition:all .12s" onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'\'">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">'
    + '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:var(--t9,#0F172A);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.trade_name||'') + '</div>'
    + (s.cnpj ? '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px;font-family:ui-monospace,monospace">' + esc(s.cnpj) + '</div>' : '')
    + '</div>'
    + '<span style="background:' + q[2] + '22;color:' + q[2] + ';padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;white-space:nowrap">' + q[1].toUpperCase() + '</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="color:#F59E0B;letter-spacing:1px;font-size:14px">' + stars + '</span><span style="font-size:11px;color:var(--t6,#64748B)">' + score.toFixed(1) + '/5</span></div>'
    + (s.categories && s.categories.length ? '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">' + s.categories.slice(0,3).map(c => '<span style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);color:var(--t6,#64748B);padding:1px 7px;border-radius:8px;font-size:9.5px;font-weight:600;text-transform:uppercase">' + esc(c) + '</span>').join('') + '</div>' : '')
    + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--t6,#64748B);padding-top:6px;border-top:1px solid var(--t2,#F1F5F9);margin-top:4px">'
    + '<div>' + (s.total_orders_count||0) + ' POs &middot; ' + brl(n(s.total_purchases_brl||0)) + '</div>'
    + (certStat.expired_certs > 0 ? '<span style="background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:6px;font-size:9.5px;font-weight:700">' + certStat.expired_certs + ' CERT VENCIDA</span>' : certStat.expiring_soon > 0 ? '<span style="background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:6px;font-size:9.5px;font-weight:700">' + certStat.expiring_soon + ' VENCENDO</span>' : (certStat.valid_certs > 0 ? '<span style="color:#10B981;font-size:10px;font-weight:700">✓ ' + certStat.valid_certs + ' válidas</span>' : ''))
    + '</div>'
    + '</div>';
}

async function openSupplierDetail(id){
  const sb = getSb();
  const s = _state.suppliers.find(x => x.id === id);
  if(!s) return;
  const [certR, kpiR, contR, evalR] = await Promise.all([
    sb.from('supplier_certifications').select('*').eq('supplier_id', id).order('valid_until',{ascending:false}),
    sb.from('supplier_kpis').select('*').eq('supplier_id', id).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(12),
    sb.from('supplier_contacts').select('*').eq('supplier_id', id),
    sb.from('supplier_evaluations').select('*').eq('supplier_id', id).order('created_at',{ascending:false}).limit(10)
  ]);
  const certs = certR.data || [];
  const kpis = kpiR.data || [];
  const contacts = contR.data || [];
  const evals = evalR.data || [];
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  const q = QUAL_STATUS.find(x => x[0] === (s.qualification_status||'aprovado')) || QUAL_STATUS[0];
  const score = n(s.score || s.rating || 0);
  const stars = Array.from({length:5}, (_,i) => i < Math.round(score) ? '★' : '☆').join('');
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:900px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    + '<div style="flex:1"><div style="font-size:17px;font-weight:700;color:var(--t9,#0F172A)">' + esc(s.trade_name||'') + '</div>'
    + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px">' + esc(s.legal_name||'') + (s.cnpj ? ' &middot; <span style="font-family:ui-monospace,monospace">' + esc(s.cnpj) + '</span>' : '') + '</div>'
    + '<div style="display:flex;gap:10px;align-items:center;margin-top:6px"><span style="background:' + q[2] + '22;color:' + q[2] + ';padding:3px 10px;border-radius:8px;font-size:10.5px;font-weight:700">' + q[1].toUpperCase() + '</span><span style="color:#F59E0B;letter-spacing:1px;font-size:13px">' + stars + '</span><span style="font-size:11px;color:var(--t6,#64748B)">' + score.toFixed(1) + '/5</span></div></div>'
    + '<div style="display:flex;gap:6px"><button class="btn bg" id="sd-edit">Editar</button><button id="sd-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div></div>'
    + '<div style="display:flex;gap:0;border-bottom:1px solid var(--t3,#E5E7EB);padding:0 18px">'
    + ['cadastro','certificacoes','kpis','contatos','avaliacoes'].map((tab,i) => {
        const labels = { cadastro:'Cadastro', certificacoes:'Certificações ('+certs.length+')', kpis:'KPIs', contatos:'Contatos ('+contacts.length+')', avaliacoes:'Avaliações ('+evals.length+')' };
        return '<button class="sd-tab" data-tab="' + tab + '" style="border:none;background:transparent;padding:12px 14px;cursor:pointer;font-weight:600;font-size:12.5px;color:' + (i===0?'var(--t9)':'var(--t6)') + ';border-bottom:3px solid ' + (i===0?'var(--accent,#1D4ED8)':'transparent') + ';font-family:inherit">' + labels[tab] + '</button>';
      }).join('')
    + '</div>'
    + '<div id="sd-body" style="flex:1;overflow-y:auto;padding:18px 22px"></div></div>';
  d.body.appendChild(ov);
  d.getElementById('sd-close').onclick = ()=> ov.remove();
  d.getElementById('sd-edit').onclick = ()=>{ ov.remove(); openSupplierEditor(s); };
  const render = (tab) => {
    ov.querySelectorAll('.sd-tab').forEach(b => {
      const act = b.dataset.tab === tab;
      b.style.color = act ? 'var(--t9)' : 'var(--t6)';
      b.style.borderBottomColor = act ? 'var(--accent,#1D4ED8)' : 'transparent';
    });
    const body = d.getElementById('sd-body');
    if(tab==='cadastro') body.innerHTML = renderCadastroTab(s);
    else if(tab==='certificacoes') body.innerHTML = renderCertsTab(certs, s.id);
    else if(tab==='kpis') body.innerHTML = renderKpisTab(kpis);
    else if(tab==='contatos') body.innerHTML = renderContactsTab(contacts);
    else if(tab==='avaliacoes') body.innerHTML = renderEvalsTab(evals);
    // Wire-up extra para botões dentro das tabs
    const addC = d.getElementById('sd-add-cert'); if(addC) addC.onclick = ()=> addCertModal(s.id);
  };
  ov.querySelectorAll('.sd-tab').forEach(b => b.onclick = ()=> render(b.dataset.tab));
  render('cadastro');
}

function renderCadastroTab(s){
  const addr = s.address_data || {};
  const bank = s.bank_data || {};
  const rows = [
    ['Razão social', s.legal_name], ['Nome fantasia', s.trade_name],
    ['CNPJ', s.cnpj], ['IE', s.ie], ['IM', s.im],
    ['Cidade', s.city], ['UF', s.state], ['CEP', s.zip_code],
    ['Endereço', s.address], ['Telefone', s.phone], ['E-mail', s.email],
    ['Website', s.website], ['Pagamento padrão', s.payment_terms],
    ['Lead time (d)', s.delivery_lead_time_days],
    ['Banco', bank.banco], ['Agência', bank.agencia], ['Conta', bank.conta], ['PIX', bank.pix],
    ['Categorias', (s.categories||[]).join(', ')], ['Disciplinas', (s.disciplines||[]).join(', ')]
  ];
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'
    + rows.filter(r => r[1]).map(r => '<div style="padding:8px 11px;background:var(--t1,#F8FAFC);border-radius:7px"><div style="font-size:10px;font-weight:700;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px">' + esc(r[0]) + '</div><div style="font-size:12.5px;color:var(--t9,#0F172A);margin-top:2px;font-weight:600">' + esc(String(r[1])) + '</div></div>').join('')
    + '</div>' + (s.notes ? '<div style="margin-top:14px;padding:11px 14px;background:var(--t1,#F8FAFC);border-left:3px solid var(--accent,#1D4ED8);border-radius:6px;font-size:12px"><strong>Notas:</strong><br>' + esc(s.notes) + '</div>' : '');
}

function renderCertsTab(certs, supplierId){
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:12.5px;color:var(--t6,#64748B)">Documentos de qualificação e certidões</div><button id="sd-add-cert" class="btn bp" style="font-size:11px;padding:6px 10px">+ Certificação</button></div>';
  if(certs.length === 0) html += '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhuma certificação cadastrada.</div>';
  else html += '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Tipo</th><th>Válida de</th><th>Válida até</th><th>Status</th><th>Doc</th></tr></thead><tbody>'
    + certs.map(c => {
      const today = new Date().toISOString().slice(0,10);
      const expired = c.valid_until && c.valid_until < today;
      const soon = c.valid_until && c.valid_until <= new Date(Date.now()+30*86400000).toISOString().slice(0,10) && !expired;
      const stColor = expired?'#EF4444':soon?'#F59E0B':'#10B981';
      const stLabel = expired?'VENCIDA':soon?'VENCE EM '+ Math.ceil((new Date(c.valid_until) - new Date())/86400000) + 'd':'VÁLIDA';
      const ct = CERT_TYPES.find(t => t[0] === c.cert_type);
      return '<tr><td><strong>' + esc(ct ? ct[1] : c.cert_type) + '</strong></td><td>' + fmtDate(c.valid_from) + '</td><td>' + fmtDate(c.valid_until) + '</td><td><span style="background:' + stColor + '22;color:' + stColor + ';padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">' + stLabel + '</span></td><td>' + (c.document_url ? '<a href="' + esc(c.document_url) + '" target="_blank" style="color:var(--accent,#1D4ED8)">Abrir</a>' : '—') + '</td></tr>';
    }).join('') + '</tbody></table>';
  return html;
}

function renderKpisTab(kpis){
  if(kpis.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Sem KPIs registrados ainda. KPIs são calculados automaticamente após registros de POs/entregas.</div>';
  return '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Período</th><th>POs</th><th style="text-align:right">Valor</th><th>Entregas no prazo</th><th>Atrasadas</th><th>Conformidade NF</th><th>NCs</th></tr></thead><tbody>'
    + kpis.map(k => '<tr><td><strong>' + String(k.period_month).padStart(2,'0') + '/' + k.period_year + '</strong></td><td>' + k.total_pos + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(k.total_value)) + '</td><td style="color:#10B981;font-weight:600">' + k.deliveries_on_time + '</td><td style="color:' + (k.deliveries_late>0?'#EF4444':'var(--t6,#64748B)') + ';font-weight:600">' + k.deliveries_late + '</td><td>' + (k.nf_conformity_pct||100).toFixed(1) + '%</td><td>' + (k.nc_count || 0) + '</td></tr>').join('')
    + '</tbody></table>';
}

function renderContactsTab(contacts){
  if(contacts.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhum contato cadastrado.</div>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">' + contacts.map(c => '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:8px;padding:11px 14px"><div style="display:flex;justify-content:space-between"><div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A)">' + esc(c.name||'') + '</div>' + (c.is_primary ? '<span style="background:var(--accent,#1D4ED8);color:#fff;font-size:9.5px;padding:1px 7px;border-radius:8px;font-weight:700">PRINCIPAL</span>' : '') + '</div>' + (c.role ? '<div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">' + esc(c.role) + '</div>' : '') + (c.email ? '<div style="font-size:11px;margin-top:6px;color:var(--t9,#0F172A)">📧 ' + esc(c.email) + '</div>' : '') + (c.phone ? '<div style="font-size:11px;margin-top:2px;color:var(--t9,#0F172A)">📞 ' + esc(c.phone) + '</div>' : '') + '</div>').join('') + '</div>';
}

function renderEvalsTab(evals){
  if(evals.length === 0) return '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Nenhuma avaliação registrada.</div>';
  return '<div style="display:flex;flex-direction:column;gap:8px">' + evals.map(e => '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-left:4px solid ' + (e.would_buy_again?'#10B981':'#EF4444') + ';border-radius:8px;padding:11px 14px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:12.5px;font-weight:700;color:var(--t9,#0F172A)">' + fmtDate(e.evaluation_date || e.created_at) + '</div><div style="color:#F59E0B;letter-spacing:1px;font-size:12px">' + Array.from({length:5},(_,i) => i < Math.round(n(e.overall_score||0)) ? '★' : '☆').join('') + ' <span style="color:var(--t6,#64748B);font-size:11px;letter-spacing:0">' + n(e.overall_score||0).toFixed(1) + '</span></div></div>' + (e.comments ? '<div style="font-size:11.5px;color:var(--t9,#0F172A);margin-top:6px">' + esc(e.comments) + '</div>' : '') + '</div>').join('') + '</div>';
}

async function addCertModal(supplierId){
  const sb = getSb();
  const certType = prompt('Tipo (CND, FGTS, INSS, TRAB, ISO9001, ISO14001, ABNT_NR13, OUTRA):');
  if(!certType || !CERT_TYPES.find(c => c[0] === certType)){ alert('Tipo inválido.'); return; }
  const validUntil = prompt('Válida até (YYYY-MM-DD):');
  if(!validUntil || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)){ alert('Data inválida.'); return; }
  const orgId = (w._org && w._org.id) || null;
  const ins = await sb.from('supplier_certifications').insert({ org_id: orgId, supplier_id: supplierId, cert_type: certType, valid_until: validUntil });
  if(ins.error){ alert('Erro: ' + ins.error.message); return; }
  d.querySelector('.sp-card[data-id="' + supplierId + '"]')?.click();
  await loadAll();
}

async function openSupplierEditor(supplier){
  const isEdit = !!supplier;
  const s = supplier || {};
  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9750;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:12px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A)">' + (isEdit?'Editar fornecedor':'Novo fornecedor') + '</div><button id="se-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">x</button></div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 22px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-trade','Nome fantasia *', s.trade_name)
    + fld('se-legal','Razão social', s.legal_name)
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-cnpj','CNPJ', s.cnpj, 'ui-monospace,monospace')
    + fld('se-ie','IE', s.ie)
    + fld('se-im','IM', s.im)
    + sel('se-qual','Status', s.qualification_status, QUAL_STATUS.map(q => [q[0], q[1]]))
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-city','Cidade', s.city)
    + fld('se-state','UF', s.state)
    + fld('se-zip','CEP', s.zip_code)
    + '</div>'
    + '<div style="margin-bottom:8px">' + fld('se-addr','Endereço completo', s.address) + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-phone','Telefone', s.phone)
    + fld('se-email','E-mail', s.email)
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-cats','Categorias (separadas por vírgula)', (s.categories||[]).join(', '))
    + fld('se-discs','Disciplinas (separadas por vírgula)', (s.disciplines||[]).join(', '))
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:8px">'
    + fld('se-bank-banco','Banco', (s.bank_data||{}).banco)
    + fld('se-bank-ag','Agência', (s.bank_data||{}).agencia, 'ui-monospace,monospace')
    + fld('se-bank-cc','Conta', (s.bank_data||{}).conta, 'ui-monospace,monospace')
    + fld('se-bank-pix','PIX', (s.bank_data||{}).pix)
    + '</div>'
    + '<div style="margin-bottom:8px"><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">Notas</label><textarea id="se-notes" rows="2" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12px;margin-top:3px;resize:vertical">' + esc(s.notes||'') + '</textarea></div>'
    + '</div>'
    + '<div style="padding:12px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="se-cancel">Cancelar</button><button class="btn bp" id="se-save">' + (isEdit?'Salvar':'Criar') + '</button></div>'
    + '</div>';
  d.body.appendChild(ov);
  d.getElementById('se-close').onclick = ()=> ov.remove();
  d.getElementById('se-cancel').onclick = ()=> ov.remove();
  d.getElementById('se-save').onclick = async ()=>{
    const tn = d.getElementById('se-trade').value.trim();
    if(!tn){ alert('Nome fantasia obrigatório.'); return; }
    const orgId = (w._org && w._org.id) || null;
    const payload = {
      org_id: orgId, trade_name: tn,
      legal_name: d.getElementById('se-legal').value.trim() || null,
      cnpj: d.getElementById('se-cnpj').value.trim() || null,
      ie: d.getElementById('se-ie').value.trim() || null,
      im: d.getElementById('se-im').value.trim() || null,
      qualification_status: d.getElementById('se-qual').value || 'aprovado',
      city: d.getElementById('se-city').value.trim() || null,
      state: d.getElementById('se-state').value.trim() || null,
      zip_code: d.getElementById('se-zip').value.trim() || null,
      address: d.getElementById('se-addr').value.trim() || null,
      phone: d.getElementById('se-phone').value.trim() || null,
      email: d.getElementById('se-email').value.trim() || null,
      categories: d.getElementById('se-cats').value.split(',').map(x => x.trim()).filter(Boolean),
      disciplines: d.getElementById('se-discs').value.split(',').map(x => x.trim()).filter(Boolean),
      bank_data: {
        banco: d.getElementById('se-bank-banco').value.trim() || null,
        agencia: d.getElementById('se-bank-ag').value.trim() || null,
        conta: d.getElementById('se-bank-cc').value.trim() || null,
        pix: d.getElementById('se-bank-pix').value.trim() || null
      },
      notes: d.getElementById('se-notes').value.trim() || null,
      is_active: true
    };
    const sb = getSb();
    let res;
    if(isEdit) res = await sb.from('suppliers').update(payload).eq('id', s.id);
    else res = await sb.from('suppliers').insert(payload);
    if(res.error){ alert('Erro: ' + res.error.message); return; }
    ov.remove();
    await loadAll();
    renderShell();
  };
}

function fld(id, label, value, font){
  return '<div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">' + esc(label) + '</label><input id="' + id + '" value="' + esc(value||'') + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px' + (font?';font-family:'+font:'') + '"></div>';
}
function sel(id, label, value, opts){
  return '<div><label style="font-size:10.5px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase">' + esc(label) + '</label><select id="' + id + '" style="width:100%;padding:8px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;margin-top:3px">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (value===o[0]?' selected':'') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
}


w.openSupplierAI = function(supplierId){ if(!supplierId){alert('Selecione fornecedor.');return;} if(w.PIALazy) w.PIALazy.run('ai-supplier','generateAdvisory',supplierId); else if(w.PIAIASupplier) w.PIAIASupplier.generateAdvisory(supplierId); };
w.PIASuppliers = { open };

} catch(e){ console.error('[suppliers] init falhou:', e); }
})(window, document);
