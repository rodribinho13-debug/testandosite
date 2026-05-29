/*! PROJECT.IA - compositions v1
 *  Base de Composições Multi-Disciplinar (substituto industrial do SINAPI)
 *  Disciplinas: tubulação, mecânica, elétrica, instrumentação, civil,
 *               hidráulica, pintura, caldeiraria, isolamento, segurança.
 */
(function(w,d){'use strict';
try {

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';

const DISCIPLINES = [
  {v:'',              l:'Todas',          c:'#64748B', ic:'list'},
  {v:'tubulacao',     l:'Tubulação',      c:'#DC2626', ic:'git-merge'},
  {v:'mecanica',      l:'Mecânica',       c:'#EA580C', ic:'cog'},
  {v:'eletrica',      l:'Elétrica',       c:'#EAB308', ic:'zap'},
  {v:'instrumentacao',l:'Instrumentação', c:'#A855F7', ic:'activity'},
  {v:'civil',         l:'Civil',          c:'#0EA5E9', ic:'building-2'},
  {v:'hidraulica',    l:'Hidráulica',     c:'#06B6D4', ic:'droplets'},
  {v:'pintura',       l:'Pintura',        c:'#EC4899', ic:'paint-roller'},
  {v:'caldeiraria',   l:'Caldeiraria',    c:'#84CC16', ic:'flame'},
  {v:'isolamento',    l:'Isolamento',     c:'#14B8A6', ic:'thermometer-snowflake'},
  {v:'seguranca',     l:'Segurança',      c:'#10B981', ic:'shield'}
];

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtBR(n){if(n==null||isNaN(n))return '—';return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n));}
function fmtNum(n){if(n==null||isNaN(n))return '—';return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4}).format(Number(n));}

let _comps = [];
let _filterDiscipline = '';
let _filterText = '';

function getSb(){
  if(w.sb) return w.sb;
  // Fallback: cria cliente local se v9-app ainda não expôs o sb global
  if(w.supabase && typeof w.supabase.createClient === 'function'){
    if(w.__pia_sb){ w.sb = w.__pia_sb; return w.sb; }
    try { w.sb = w.__pia_sb = w.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey:'sb-toapdhfouuedaexgqlsv-auth-token', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }); return w.sb; } catch(e){ console.warn('[compositions] createClient falhou:', e); }
  }
  return null;
}
async function fetchComps(){
  const sb = getSb();
  if(!sb){ throw new Error('Supabase não inicializado'); }
  let q = sb.from('v_compositions_effective').select('*').order('discipline').order('code').limit(500);
  if(_filterDiscipline) q = q.eq('discipline', _filterDiscipline);
  const {data, error} = await q;
  if(error) throw error;
  _comps = data || [];
  // Custom compositions da org
  if(w._org && w._org.id){
    const {data:custom} = await getSb().from('org_custom_compositions')
      .select('*').eq('org_id', w._org.id).eq('is_active', true);
    if(custom) {
      custom.forEach(c => _comps.push({
        id: c.id, discipline: c.discipline, code: c.code, description: c.description,
        unit: c.unit, source:'CUSTOM', effective_price: c.base_price, tags: c.tags||[],
        _is_custom: true
      }));
    }
  }
}

function open(){
  let ov = d.getElementById('pia-comp-ov');
  if(ov){ ov.remove(); }
  ov = d.createElement('div');
  ov.id = 'pia-comp-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--t1,#F8FAFC);z-index:9700;overflow:auto;font-family:inherit;display:flex;flex-direction:column';

  ov.innerHTML = `
      <div style="background:var(--t0,#fff);border-bottom:1px solid var(--t3,#E5E7EB);padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0">
        <button id="pia-comp-close" class="btn bg" style="display:inline-flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar
        </button>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Base de Composições</div>
          <div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">Multi-disciplinar · SINAPI + TCPO + Petrobras + ABNT + composições próprias</div>
        </div>
        <div style="flex:1"></div>
        <button id="pia-comp-new" class="btn bp">+ Nova composição</button>
      </div>

      <div style="padding:14px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--t0,#fff)" id="pia-comp-disc-bar"></div>

      <div style="padding:12px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;gap:10px;align-items:center;background:var(--t0,#fff)">
        <div style="flex:1">
          <input id="pia-comp-search" placeholder="Buscar por código, descrição, tags..." style="width:100%;padding:9px 12px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;outline:none;font-family:inherit;background:var(--t0,#fff);color:var(--t9,#0F172A)">
        </div>
        <div id="pia-comp-stats" style="font-size:12px;color:var(--t6,#64748B);white-space:nowrap;font-weight:500"></div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:14px 22px;background:var(--t1,#F8FAFC)" id="pia-comp-list-wrap">
        <div style="padding:40px;text-align:center;color:var(--t6,#64748B)">Carregando...</div>
      </div>

      <div style="padding:12px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center;background:var(--t0,#fff);font-size:11.5px;color:var(--t6,#64748B);flex-shrink:0">
        <div>Clique numa composição para ver detalhes e adicionar ao projeto atual</div>
        <div>v1.0 · ${DISCIPLINES.length-1} disciplinas</div>
      </div>
  `;

  if(w.PIAShell && w.PIAShell.inlineWrap(ov, 'compositions', 'tab-compositions')){} else { d.body.appendChild(ov); }
  d.getElementById('pia-comp-close').onclick = ()=> ov.remove();
  d.getElementById('pia-comp-search').oninput = (e)=>{ _filterText = e.target.value.toLowerCase().trim(); renderList(); };
  d.getElementById('pia-comp-new').onclick = openNewModal;

  // Discipline bar
  const bar = d.getElementById('pia-comp-disc-bar');
  bar.innerHTML = DISCIPLINES.map(disc =>
    `<button class="pia-disc-chip" data-v="${disc.v}" style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border:1px solid var(--t3,#E5E7EB);border-radius:18px;background:${_filterDiscipline===disc.v?disc.c:'var(--t0,#fff)'};color:${_filterDiscipline===disc.v?'#fff':disc.c};font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s">${disc.l}</button>`
  ).join('');
  bar.querySelectorAll('.pia-disc-chip').forEach(btn => {
    btn.onclick = async ()=>{
      _filterDiscipline = btn.dataset.v;
      bar.querySelectorAll('.pia-disc-chip').forEach(b => {
        const disc = DISCIPLINES.find(x=>x.v===b.dataset.v);
        const active = b.dataset.v === _filterDiscipline;
        b.style.background = active ? disc.c : 'var(--t0,#fff)';
        b.style.color = active ? '#fff' : disc.c;
      });
      await loadAndRender();
    };
  });

  loadAndRender();
}

async function loadAndRender(){
  const wrap = d.getElementById('pia-comp-list-wrap');
  wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t6,#64748B)">Carregando composições...</div>';
  try {
    await fetchComps();
    renderList();
  } catch(e){
    wrap.innerHTML = `<div style="padding:30px;text-align:center;color:var(--t9,#0F172A);border:1px solid var(--t3,#E5E7EB);border-radius:10px;background:var(--t0,#fff);max-width:520px;margin:30px auto"><div style="font-weight:700;font-size:14px">Não foi possível carregar</div><div style="font-size:12px;margin-top:6px;color:var(--t6,#64748B)">${esc(e.message||e)}</div><div style="font-size:11px;margin-top:12px;color:var(--t6,#64748B)">Verifique se a migration 006_compositions.sql foi aplicada no Supabase.</div></div>`;
  }
}

function renderList(){
  const wrap = d.getElementById('pia-comp-list-wrap');
  let list = _comps.slice();
  if(_filterText){
    const q = _filterText;
    list = list.filter(c =>
      (c.code||'').toLowerCase().includes(q) ||
      (c.description||'').toLowerCase().includes(q) ||
      (c.tags||[]).some(t => (t||'').toLowerCase().includes(q))
    );
  }

  d.getElementById('pia-comp-stats').textContent = list.length + ' composições';

  if(list.length === 0){
    wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t6,#64748B);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;background:var(--t0,#fff);max-width:520px;margin:30px auto"><div style="font-weight:600;color:var(--t9,#0F172A);font-size:13px">Nenhuma composição encontrada</div><div style="font-size:12px;margin-top:5px;color:var(--t6,#64748B)">Tente outro filtro ou crie uma composição customizada</div></div>`;
    return;
  }

  // Agrupar por disciplina
  const grouped = {};
  list.forEach(c => { (grouped[c.discipline]=grouped[c.discipline]||[]).push(c); });

  const html = Object.keys(grouped).sort().map(discKey => {
    const disc = DISCIPLINES.find(x=>x.v===discKey) || {l:discKey, c:'#64748B'};
    const items = grouped[discKey];
    return `
      <div style="margin:14px 16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid ${disc.c}33">
          <span style="font-size:13px;font-weight:800;color:${disc.c};text-transform:uppercase;letter-spacing:.5px">${esc(disc.l)}</span>
          <span style="background:${disc.c}1A;color:${disc.c};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${items.length}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:8px">
          ${items.map(c => renderCard(c, disc.c)).join('')}
        </div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = html;

  // Wire up clicks
  wrap.querySelectorAll('.pia-comp-card').forEach(card => {
    card.onclick = ()=> openDetail(card.dataset.id);
  });
}

function renderCard(c, color){
  const customBadge = c._is_custom ? `<span style="background:var(--t1,#F1F5F9);color:var(--t9,#0F172A);padding:1px 6px;border-radius:6px;font-size:9.5px;font-weight:700;margin-left:6px;border:1px solid var(--t3,#E5E7EB)">PRÓPRIA</span>` : '';
  const sourceBadge = c.source && c.source!=='PROJECT.IA' && !c._is_custom ? `<span style="background:var(--t1,#F1F5F9);color:var(--t6,#64748B);padding:1px 6px;border-radius:6px;font-size:9.5px;font-weight:700;margin-left:6px;border:1px solid var(--t3,#E5E7EB)">${esc(c.source)}</span>` : '';
  return `
    <div class="pia-comp-card" data-id="${esc(c.id)}" style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-left:3px solid ${color};border-radius:8px;padding:11px 14px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:6px" onmouseover="this.style.borderColor='${color}';this.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'" onmouseout="this.style.borderColor='';this.style.boxShadow=''">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="font-size:10.5px;font-weight:700;color:${color};font-family:'SF Mono',ui-monospace,monospace">${esc(c.code)}${customBadge}${sourceBadge}</div>
        <div style="font-size:13px;font-weight:700;color:var(--t9,#0F172A);white-space:nowrap">${fmtBR(c.effective_price)}</div>
      </div>
      <div style="font-size:12.5px;color:var(--t9,#0F172A);line-height:1.35">${esc(c.description)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--t6,#64748B)">
        <div>Unidade: <strong style="color:var(--t9,#0F172A)">${esc(c.unit)}</strong></div>
        ${c.productivity ? `<div>Produtividade: <strong style="color:var(--t9,#0F172A)">${fmtNum(c.productivity)} h/un</strong></div>` : '<div></div>'}
      </div>
    </div>
  `;
}

async function openDetail(id){
  const c = _comps.find(x => x.id === id);
  if(!c) return;
  const disc = DISCIPLINES.find(x=>x.v===c.discipline) || {l:c.discipline, c:'#64748B'};

  let items = [];
  if(!c._is_custom){
    const {data} = await getSb().from('composition_items')
      .select('*').eq('composition_id', id).order('display_order');
    items = data || [];
  }

  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};

  ov.innerHTML = `
    <div style="background:var(--t0,#fff);border-radius:12px;max-width:720px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB);background:var(--t0,#fff)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
          <div>
            <div style="font-size:11px;font-weight:700;color:${disc.c};font-family:'SF Mono',ui-monospace,monospace;letter-spacing:.5px">${esc(c.code)}</div>
            <div style="font-size:15.5px;font-weight:700;color:var(--t9,#0F172A);margin-top:3px;line-height:1.3">${esc(c.description)}</div>
          </div>
          <button class="pia-det-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
        </div>
        <div style="display:flex;gap:18px;font-size:12px;color:var(--t6,#64748B);margin-top:6px;flex-wrap:wrap">
          <div><strong style="color:${disc.c}">${esc(disc.l)}</strong></div>
          <div>Unidade: <strong style="color:var(--t9,#0F172A)">${esc(c.unit)}</strong></div>
          <div>Preço: <strong style="color:var(--t9,#0F172A)">${fmtBR(c.effective_price)}</strong></div>
          ${c.source ? `<div>Origem: <strong style="color:var(--t9,#0F172A)">${esc(c.source)}</strong></div>` : ''}
        </div>
      </div>

      <div style="padding:18px 22px;background:var(--t0,#fff)">
        ${items.length ? `
          <div style="font-size:11px;font-weight:700;color:var(--t6,#64748B);text-transform:uppercase;margin-bottom:10px;letter-spacing:.4px">Insumos / Mão de obra</div>
          <table class="ptable" style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:var(--t1,#F8FAFC);color:var(--t6,#64748B)">
                <th style="text-align:left;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">Tipo</th>
                <th style="text-align:left;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">Descrição</th>
                <th style="text-align:right;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">Qtd</th>
                <th style="text-align:left;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">Un</th>
                <th style="text-align:right;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">R$/un</th>
                <th style="text-align:right;padding:7px 9px;border-bottom:1px solid var(--t3,#E5E7EB);font-weight:600">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr style="border-bottom:1px solid var(--t2,#F1F5F9)">
                  <td style="padding:7px 9px;color:var(--t9,#0F172A)"><span style="background:var(--t1,#F1F5F9);color:var(--t9,#0F172A);padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:600;border:1px solid var(--t3,#E5E7EB)">${esc(it.item_type)}</span></td>
                  <td style="padding:7px 9px;color:var(--t9,#0F172A)">${esc(it.description)}</td>
                  <td style="padding:7px 9px;text-align:right;font-family:'SF Mono',monospace;color:var(--t9,#0F172A)">${fmtNum(it.quantity)}</td>
                  <td style="padding:7px 9px;color:var(--t9,#0F172A)">${esc(it.unit)}</td>
                  <td style="padding:7px 9px;text-align:right;font-family:'SF Mono',monospace;color:var(--t9,#0F172A)">${fmtBR(it.unit_price)}</td>
                  <td style="padding:7px 9px;text-align:right;font-weight:600;font-family:'SF Mono',monospace;color:var(--t9,#0F172A)">${fmtBR(it.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="text-align:center;padding:28px;color:var(--t6,#64748B);border:1px dashed var(--t3,#E5E7EB);border-radius:10px;background:var(--t1,#F8FAFC)">
            <div style="font-weight:600;color:var(--t9,#0F172A);font-size:13px">Composição sintética</div>
            <div style="font-size:12px;margin-top:4px;color:var(--t6,#64748B)">Detalhamento de insumos não cadastrado.</div>
          </div>
        `}

        ${c.notes ? `<div style="margin-top:14px;padding:10px 12px;background:var(--t1,#F8FAFC);border-left:3px solid var(--t6,#64748B);border-radius:6px;font-size:12px;color:var(--t9,#0F172A)"><strong style="color:var(--t6,#64748B);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:3px">Observações</strong>${esc(c.notes)}</div>` : ''}

        <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--t3,#E5E7EB);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
          <button class="pia-det-close btn bg">Fechar</button>
          <button id="pia-det-override" class="btn bg">Customizar preço (org)</button>
          <button id="pia-det-add" class="btn bp">+ Adicionar ao projeto</button>
        </div>
      </div>
    </div>
  `;

  d.body.appendChild(ov);
  ov.querySelectorAll('.pia-det-close').forEach(b => b.onclick = ()=> ov.remove());
  d.getElementById('pia-det-add').onclick = ()=> addToProject(c, ov);
  d.getElementById('pia-det-override').onclick = ()=> openPriceOverride(c, ov);
}

async function addToProject(c, parentOv){
  const projId = (w._curProject && w._curProject.id) || w.curProj;
  if(!projId){ alert('Selecione um projeto primeiro.'); return; }
  const qty = parseFloat(prompt('Quantidade ('+c.unit+'):', '1') || '0');
  if(isNaN(qty) || qty <= 0){ return; }
  const orgId = (w._org && w._org.id) || null;
  if(!orgId){ alert('Organização não identificada.'); return; }

  try {
    const payload = {
      org_id: orgId,
      project_id: projId,
      composition_id: c._is_custom ? null : c.id,
      org_composition_id: c._is_custom ? c.id : null,
      discipline: c.discipline,
      description: c.description,
      unit: c.unit,
      quantity: qty,
      unit_price: c.effective_price || 0
    };
    const {error} = await getSb().from('project_composition_lines').insert(payload);
    if(error) throw error;
    // Recalcula ABC
    await getSb().rpc('calc_project_abc', {p_project_id: projId});
    (window.PIAToast ? PIAToast('Adicionado ao orçamento do projeto.','success') : alert('Adicionado ao orçamento do projeto.'));
    if(parentOv) parentOv.remove();
  } catch(e){
    alert('Erro ao adicionar: ' + (e.message||e));
  }
}

async function openPriceOverride(c, parentOv){
  const orgId = (w._org && w._org.id) || null;
  if(!orgId){ alert('Organização não identificada.'); return; }
  const newPrice = parseFloat(prompt('Preço customizado para sua organização (R$ por ' + c.unit + '):\\n\\nPreço de referência atual: ' + fmtBR(c.effective_price), c.effective_price || 0) || '');
  if(isNaN(newPrice) || newPrice <= 0) return;

  try {
    const {error} = await getSb().from('composition_org_overrides').upsert({
      org_id: orgId,
      composition_id: c.id,
      custom_price: newPrice,
      updated_by: (w._user && w._user.id) || null,
      updated_at: new Date().toISOString()
    }, {onConflict: 'org_id,composition_id'});
    if(error) throw error;
    (window.PIAToast ? PIAToast('Preço personalizado salvo','success') : alert('Preço personalizado salvo.'));
    if(parentOv) parentOv.remove();
    await loadAndRender();
  } catch(e){
    alert('Erro: ' + (e.message||e));
  }
}

function openNewModal(){
  const orgId = (w._org && w._org.id) || null;
  if(!orgId){ alert('Organização não identificada.'); return; }

  const ov = d.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{if(e.target===ov)ov.remove();};

  const discOpts = DISCIPLINES.filter(x=>x.v).map(d=>`<option value="${d.v}">${d.l}</option>`).join('');

  const inputBase = 'width:100%;padding:9px 12px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:13px;background:var(--t0,#fff);color:var(--t9,#0F172A);outline:none;font-family:inherit';
  const labelBase = 'font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;display:block;margin-bottom:4px;letter-spacing:.3px';

  ov.innerHTML = `
    <div style="background:var(--t0,#fff);border-radius:12px;max-width:560px;width:100%;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--t9,#0F172A);letter-spacing:-.2px">Nova composição própria</div>
          <div style="font-size:12px;color:var(--t6,#64748B);margin-top:2px">Cadastro exclusivo da sua organização</div>
        </div>
        <button class="pia-new-close" style="background:transparent;border:none;cursor:pointer;color:var(--t6,#64748B);width:30px;height:30px;border-radius:7px;font-size:20px">×</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="${labelBase}">Disciplina *</label>
          <select id="nc-disc" style="${inputBase}">${discOpts}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 100px;gap:8px">
          <div>
            <label style="${labelBase}">Código *</label>
            <input id="nc-code" placeholder="ORG.MEC.001" style="${inputBase};font-family:'SF Mono',monospace">
          </div>
          <div>
            <label style="${labelBase}">Unidade *</label>
            <input id="nc-unit" placeholder="m, kg, un" style="${inputBase}">
          </div>
        </div>
        <div>
          <label style="${labelBase}">Descrição *</label>
          <input id="nc-desc" placeholder="Ex: Montagem de skid de bombeamento porte médio" style="${inputBase}">
        </div>
        <div>
          <label style="${labelBase}">Preço base (R$ por unidade)</label>
          <input id="nc-price" type="number" step="0.01" placeholder="0.00" style="${inputBase}">
        </div>
        <div>
          <label style="${labelBase}">Tags (separadas por vírgula)</label>
          <input id="nc-tags" placeholder="solda, skid, montagem" style="${inputBase}">
        </div>
        <div>
          <label style="${labelBase}">Observações</label>
          <textarea id="nc-notes" rows="2" style="${inputBase};font-size:12.5px;resize:vertical"></textarea>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--t3,#E5E7EB)">
        <button class="pia-new-close btn bg">Cancelar</button>
        <button id="pia-new-save" class="btn bp">Salvar</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  ov.querySelectorAll('.pia-new-close').forEach(b => b.onclick = ()=> ov.remove());

  d.getElementById('pia-new-save').onclick = async ()=>{
    const disc = d.getElementById('nc-disc').value;
    const code = d.getElementById('nc-code').value.trim().toUpperCase();
    const unit = d.getElementById('nc-unit').value.trim();
    const desc = d.getElementById('nc-desc').value.trim();
    const price = parseFloat(d.getElementById('nc-price').value || '0');
    const tags = d.getElementById('nc-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
    const notes = d.getElementById('nc-notes').value.trim();

    if(!disc || !code || !unit || !desc){
      alert('Preencha os campos obrigatórios (*)');
      return;
    }

    try {
      const {error} = await getSb().from('org_custom_compositions').insert({
        org_id: orgId, discipline: disc, code, description: desc, unit,
        base_price: price || null, tags,
        notes: notes || null,
        created_by: (w._user && w._user.id) || null
      });
      if(error) throw error;
      ov.remove();
      await loadAndRender();
      (window.PIAToast ? PIAToast('Composição salva.','success') : alert('Composição salva.'));
    } catch(e){
      alert('Erro: ' + (e.message || 'falhou ao salvar'));
    }
  };
}


// ============================================================
// FASE E: Detalhe expandido — insumos detalhados + variantes regionais
// ============================================================
async function openCompositionInputs(compId){
  const sb = getSb();
  const r = await sb.from('composition_items').select('*').eq('composition_id', compId).order('item_order',{ascending:true,nullsFirst:false});
  return r.data || [];
}


w.openCompositionAI = function(){ if(w.PIALazy) w.PIALazy.run('ai-composition','open'); else if(w.PIAIAComposition) w.PIAIAComposition.open(); };
w.PIACompositionsExtra = {
  // Render tab Insumos
  renderInsumos: async function(compId, hostEl){
    const items = await openCompositionInputs(compId);
    if(items.length === 0){
      hostEl.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t6,#64748B)">Sem insumos detalhados nesta composição. <button class="btn bg" id="ci-add" style="margin-top:10px">+ Adicionar insumo</button></div>';
    } else {
      const total = items.reduce((s,i) => s + n(i.total||0), 0);
      hostEl.innerHTML = '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Tipo</th><th>Descrição</th><th style="text-align:right">Qtd</th><th>Un</th><th style="text-align:right">Preço unit</th><th style="text-align:right">Total</th></tr></thead><tbody>'
        + items.map(it => '<tr><td><span style="background:' + (it.item_type==='mao_obra'?'#DBEAFE':it.item_type==='material'?'#D1FAE5':'#FEF3C7') + ';color:var(--t9,#0F172A);padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;border:1px solid var(--t3,#E5E7EB)">' + esc(it.item_type) + '</span></td><td>' + esc(it.description||'') + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + n(it.quantity).toFixed(3) + '</td><td>' + esc(it.unit||'') + '</td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(n(it.unit_price)) + '</td><td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(n(it.total||n(it.quantity)*n(it.unit_price))) + '</td></tr>').join('')
        + '<tr style="background:var(--t1,#F8FAFC);font-weight:700"><td colspan="5" style="text-align:right">TOTAL</td><td style="text-align:right;font-family:ui-monospace,monospace">' + brl(total) + '</td></tr>'
        + '</tbody></table>';
    }
  },
  // Render tab Variantes regionais
  renderRegional: function(comp, hostEl){
    const variants = Array.isArray(comp.regional_variants) ? comp.regional_variants : [];
    const regions = [['NE','Nordeste'],['SE','Sudeste'],['S','Sul'],['N','Norte'],['CO','Centro-Oeste']];
    const basePrice = n(comp.base_price);
    hostEl.innerHTML = '<div style="margin-bottom:10px;font-size:12px;color:var(--t6,#64748B)">Preço base: <strong style="color:var(--t9,#0F172A);font-family:ui-monospace,monospace">' + brl(basePrice) + '</strong> &middot; variantes ajustam o fator regional por multiplicador</div>'
      + '<table class="ptable" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Região</th><th style="text-align:right">Fator</th><th style="text-align:right">Preço ajustado</th></tr></thead><tbody>'
      + regions.map(r => {
          const v = variants.find(x => x.region === r[0]);
          const f = v ? n(v.price_factor||1) : 1;
          return '<tr><td><strong>' + r[1] + ' (' + r[0] + ')</strong></td><td style="text-align:right;font-family:ui-monospace,monospace">' + f.toFixed(3) + '</td><td style="text-align:right;font-family:ui-monospace,monospace;font-weight:600">' + brl(basePrice * f) + '</td></tr>';
        }).join('')
      + '</tbody></table>'
      + '<div style="margin-top:14px;padding:10px 14px;background:var(--t1,#F8FAFC);border-left:3px solid var(--accent,#1D4ED8);border-radius:6px;font-size:11.5px">Variantes regionais aplicam multiplicador no preço base. Valores padrão SINAPI