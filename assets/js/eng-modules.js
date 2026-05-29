/* ============================================================
   PROJECT.IA — Engineering Modules (Cabos, Eletrodutos, Suportes,
   Estruturas Metálicas, HYCONTROL)
   CRUD nativo padronizado, antes via iframe do Hub Planejador.
   ============================================================ */
(function(){
'use strict';
const w = window, d = document;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function getSb(){ if(w.sb) return w.sb; if(w.__pia_sb) return (w.sb = w.__pia_sb); try { if(w.supabase && w.SUPABASE_URL && w.SUPABASE_KEY) return (w.sb = w.__pia_sb = w.supabase.createClient(w.SUPABASE_URL, w.SUPABASE_KEY, { auth: { storageKey:'sb-toapdhfouuedaexgqlsv-auth-token', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } })); } catch(_){} return null; }
function getProjectId(){ if(w._curProject && w._curProject.id) return w._curProject.id; if(w.curProj) return w.curProj; try { return localStorage.getItem('pia.curProj'); } catch(_){ return null; } }
function getProjectName(){ try { if(w._curProject && w._curProject.name) return w._curProject.name; const ps = w.projects || []; const id = getProjectId(); const p = ps.find(x => String(x.id)===String(id)); return p ? p.name : ''; } catch(_){ return ''; } }
function getOrgId(){ return w._org && w._org.id; }
function getUserId(){ return w._user && w._user.id; }
function toast(m,t){ if(w.toast) w.toast(m,t); else console.log('[Eng]', m); }

/* ============================================================
   CATÁLOGO DE MÓDULOS (schema declarativo)
   ============================================================ */
const MODULES = {
  cables: {
    label: 'Cabos (lançamento)',
    table: 'electrical_cables',
    keyField: 'cable_tag',
    keyLabel: 'TAG do cabo',
    color: '#CA8A04',
    fields: [
      { k:'cable_tag',         l:'TAG *',                  t:'text', required:true, mono:true },
      { k:'origin',            l:'Origem',                 t:'text' },
      { k:'destination',       l:'Destino',                t:'text' },
      { k:'function_type',     l:'Função',                 t:'select', options:['Força','Comando','Controle','Iluminação','Aterramento','Sinal','Instrumentação'] },
      { k:'service_type',      l:'Serviço',                t:'select', options:['BT','MT','AT','Instrumentação','Telecom','Comando'] },
      { k:'voltage_v',         l:'Tensão (V)',             t:'number', step:'1' },
      { k:'current_a',         l:'Corrente (A)',           t:'number', step:'0.1' },
      { k:'cable_type',        l:'Tipo de cabo',           t:'text', placeholder:'EPR/XLPE/PVC' },
      { k:'conductor_count',   l:'Nº condutores',          t:'number', step:'1' },
      { k:'cross_section_mm2', l:'Seção (mm²)',            t:'number', step:'0.5' },
      { k:'material',          l:'Material',               t:'select', options:['Cobre','Alumínio'] },
      { k:'insulation',        l:'Isolação',               t:'text', placeholder:'EPR 0,6/1kV' },
      { k:'length_m',          l:'Comprimento (m)',        t:'number', step:'0.1' },
      { k:'installed',         l:'Lançado?',               t:'bool' },
      { k:'lm_done',           l:'LM (Lista Materiais) ok',t:'bool' },
      { k:'lm_date',           l:'Data LM',                t:'date' },
      { k:'lc_done',           l:'LC (Lista Cabos) ok',    t:'bool' },
      { k:'lc_date',           l:'Data LC',                t:'date' },
      { k:'installation_date', l:'Data lançamento',        t:'date' },
      { k:'hipot_test_kv',     l:'Hipot (kV)',             t:'number', step:'0.1' },
      { k:'insulation_test_megohm', l:'Megaohmetro (MΩ)',  t:'number', step:'0.1' },
      { k:'continuity_ok',     l:'Continuidade OK',        t:'bool' },
      { k:'responsible_electrician', l:'Eletricista resp.',t:'text' },
      { k:'nr10_compliant',    l:'NR-10 conforme',         t:'bool' },
      { k:'progress_pct',      l:'% Avanço',               t:'number', step:'1' },
      { k:'notes',             l:'Observações',            t:'textarea' }
    ],
    tableCols: ['cable_tag','origin','destination','service_type','cross_section_mm2','length_m','installed','progress_pct']
  },

  eletroduct: {
    label: 'Eletrodutos',
    table: 'eletroduct_runs',
    keyField: 'tag',
    keyLabel: 'TAG do eletroduto',
    color: '#CA8A04',
    fields: [
      { k:'tag',                l:'TAG *',              t:'text', required:true, mono:true },
      { k:'discipline',         l:'Disciplina',         t:'select', options:['Elétrica','Instrumentação','Automação','Hidráulica'] },
      { k:'origin',             l:'Origem',             t:'text' },
      { k:'destination',        l:'Destino',            t:'text' },
      { k:'diameter_mm',        l:'Diâmetro (mm)',      t:'number', step:'1' },
      { k:'material',           l:'Material',           t:'select', options:['Aço galvanizado','Aço carbono','PVC rígido','PVC flexível','Inox'] },
      { k:'length_m',           l:'Comprimento total (m)',t:'number', step:'0.1' },
      { k:'length_projected_m', l:'Projetado (m)',      t:'number', step:'0.1' },
      { k:'length_fabricated_m',l:'Fabricado (m)',      t:'number', step:'0.1' },
      { k:'length_installed_m', l:'Instalado (m)',      t:'number', step:'0.1' },
      { k:'pct_fabricated',     l:'% Fabricado',        t:'number', step:'1' },
      { k:'pct_installed',      l:'% Instalado',        t:'number', step:'1' },
      { k:'supports_qty',       l:'Qtd suportes',       t:'number', step:'1' },
      { k:'notes',              l:'Observações',        t:'textarea' }
    ],
    tableCols: ['tag','discipline','origin','destination','diameter_mm','length_m','pct_fabricated','pct_installed']
  },

  supports: {
    label: 'Suportes',
    table: 'supports',
    keyField: 'tag',
    keyLabel: 'TAG do suporte',
    color: '#1E40AF',
    fields: [
      { k:'tag',                l:'TAG *',                  t:'text', required:true, mono:true },
      { k:'code',               l:'Código',                 t:'text' },
      { k:'tipo_padrao',        l:'Tipo padrão',            t:'select', options:['Sl-01','Sl-02','Sl-03','Sl-04','Sl-05','Sl-06','Sl-07','Sl-08','Sl-09','Sl-10','Estrutura','Trunnion','Spring','Variable','Snubber','Restritor','Outro'] },
      { k:'support_type',       l:'Tipo (DB)',              t:'select', options:['rigid','spring','variable','snubber','trunnion','clamp'] },
      { k:'location',           l:'Localização',            t:'text', placeholder:'Cota +10.50' },
      { k:'iso_ref',            l:'Iso de referência',      t:'text' },
      { k:'estrutura_metalica', l:'Estrutura metálica',     t:'text' },
      { k:'material',           l:'Material',               t:'text' },
      { k:'weight_kg',          l:'Peso unit. (kg)',        t:'number', step:'0.1' },
      { k:'peso_total_kg',      l:'Peso total (kg)',        t:'number', step:'0.1' },
      { k:'peso_hilt_kg',       l:'Peso Hilti (kg)',        t:'number', step:'0.1' },
      { k:'status',             l:'Status',                 t:'select', options:['pending','released','fabricated','installed','tested'] },
      { k:'status_ext',         l:'Status estendido',       t:'select', options:['projetado','liberado','enviado_fabricacao','fabricado','enviado_jato','recebido_jato','enviado_montagem','montado','testado'] },
      { k:'fab_date',           l:'Data fab.',              t:'date' },
      { k:'envio_jato_date',    l:'Envio p/ jato',          t:'date' },
      { k:'recebido_jato_date', l:'Recebido jato',          t:'date' },
      { k:'montagem_date',      l:'Montagem',               t:'date' },
      { k:'avanco_pct',         l:'% Avanço',               t:'number', step:'1' },
      { k:'sketch_path',        l:'Croqui (path)',          t:'text' },
      { k:'notes',              l:'Observações',            t:'textarea' }
    ],
    tableCols: ['tag','tipo_padrao','location','iso_ref','peso_total_kg','status_ext','avanco_pct']
  },

  em: {
    label: 'Estruturas Metálicas',
    table: 'structural_em_records',
    keyField: 'tag',
    keyLabel: 'TAG da peça',
    color: '#F97316',
    fields: [
      { k:'tag',              l:'TAG *',           t:'text', required:true, mono:true },
      { k:'tipo',             l:'Tipo',            t:'select', options:['Pilar','Viga','Treliça','Contraventamento','Mão-francesa','Escada','Plataforma','Guarda-corpo','Outro'] },
      { k:'perfil',           l:'Perfil',          t:'text', placeholder:'W 360x44, L 50x50x5' },
      { k:'descricao',        l:'Descrição',       t:'text' },
      { k:'localizacao',      l:'Localização',     t:'text' },
      { k:'ref_drawing',      l:'Desenho ref.',    t:'text' },
      { k:'peso_kg',          l:'Peso (kg)',       t:'number', step:'0.1' },
      { k:'fab_status',       l:'Status fab.',     t:'select', options:['nao_iniciado','em_andamento','concluido','liberado'] },
      { k:'mont_status',      l:'Status mont.',    t:'select', options:['nao_iniciado','em_andamento','concluido','testado'] },
      { k:'fab_date',         l:'Data fab.',       t:'date' },
      { k:'mont_date',        l:'Data mont.',      t:'date' },
      { k:'responsavel_fab',  l:'Resp. fab.',      t:'text' },
      { k:'responsavel_mont', l:'Resp. mont.',     t:'text' },
      { k:'notes',            l:'Observações',     t:'textarea' }
    ],
    tableCols: ['tag','tipo','perfil','localizacao','peso_kg','fab_status','mont_status']
  },

  hycontrol: {
    label: 'HYCONTROL Semanal',
    table: 'weekly_progress_summary',
    keyField: 'week_label',
    keyLabel: 'Semana',
    color: '#10B981',
    fields: [
      { k:'week_label',           l:'Semana (rótulo) *', t:'text', required:true, placeholder:'S22/2026', mono:true },
      { k:'week_start_date',      l:'Início semana *',   t:'date', required:true },
      { k:'discipline',           l:'Disciplina',        t:'select', options:['tubulacao','civil','eletrica','instrumentacao','pintura','caldeiraria','mecanica','hidraulica','geral'] },
      { k:'hh_planejado',         l:'HH planejado',      t:'number', step:'1' },
      { k:'hh_realizado',         l:'HH realizado',      t:'number', step:'1' },
      { k:'custo_planejado_brl',  l:'Custo plan. (R$)',  t:'number', step:'0.01' },
      { k:'custo_realizado_brl',  l:'Custo real. (R$)',  t:'number', step:'0.01' },
      { k:'avanco_planejado_pct', l:'% Plan.',           t:'number', step:'0.1' },
      { k:'avanco_realizado_pct', l:'% Real.',           t:'number', step:'0.1' },
      { k:'notes',                l:'Observações',       t:'textarea' }
    ],
    tableCols: ['week_label','week_start_date','discipline','hh_planejado','hh_realizado','avanco_planejado_pct','avanco_realizado_pct']
  }
};

/* ============================================================
   ESTADO
   ============================================================ */
let _curMod = 'cables';
let _rows = [];
let _filter = '';

/* ============================================================
   API PÚBLICA
   ============================================================ */
async function openMod(modId){
  if(!MODULES[modId]){ console.warn('[Eng] módulo desconhecido:', modId); return; }
  _curMod = modId;
  const pid = getProjectId();
  if(!pid){
    toast('Selecione um projeto primeiro','warn');
    if(typeof w.goV === 'function') w.goV('projects');
    return;
  }
  ensureContainer();
  await load();
  render();
}

function containerId(){ return 'veng-' + _curMod; }

function ensureContainer(){
  let el = d.getElementById(containerId());
  if(el) return el;
  const content = d.querySelector('.content');
  if(!content) return null;
  el = d.createElement('div');
  el.id = containerId();
  el.style.display = 'none';
  content.appendChild(el);
  return el;
}

async function load(){
  const sb = getSb(); if(!sb){ _rows = []; return; }
  const pid = getProjectId(); if(!pid){ _rows = []; return; }
  const mod = MODULES[_curMod];
  const r = await sb.from(mod.table)
    .select('*')
    .eq('project_id', pid)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(2000);
  if(r.error){
    console.error('[Eng] load', mod.table, r.error);
    toast('Erro: ' + r.error.message,'err');
    _rows = [];
    return;
  }
  _rows = r.data || [];
}

function render(){
  const el = ensureContainer();
  if(!el) return;
  const mod = MODULES[_curMod];

  const q = (_filter||'').toLowerCase().trim();
  const filtered = q ? _rows.filter(r => {
    return mod.tableCols.some(k => String(r[k]||'').toLowerCase().includes(q));
  }) : _rows;

  el.style.display = 'block';
  el.style.padding = '0';
  el.innerHTML = `
    <div style="padding:20px 24px;background:#FAFBFC;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px">
        ${renderKPIs(mod)}
      </div>

      <!-- Toolbar -->
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <input id="eng-search" type="text" value="${esc(_filter)}" placeholder="Buscar..." style="flex:1;min-width:220px;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;background:#fff;font-family:inherit">
        <div class="eng-excel-wrap" style="position:relative;display:inline-block">
          <button id="eng-excel-btn" type="button" style="padding:9px 14px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;color:#475569;font-family:inherit;display:inline-flex;align-items:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            Excel
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div id="eng-excel-menu" style="display:none;position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(10,22,40,.12);min-width:180px;z-index:50;overflow:hidden">
            <button id="eng-import" type="button" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'#fff\'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importar Excel
            </button>
            <button id="eng-export" type="button" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;border-top:1px solid #F1F5F9;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'#fff\'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Excel
            </button>
          </div>
        </div>
        <button id="eng-new" class="btn bp">+ Novo</button>
      </div>

      <!-- Tabela -->
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
        <div style="overflow-x:auto;max-height:calc(100vh - 320px);overflow-y:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1">
              <tr>${mod.tableCols.map(k => {
                const f = mod.fields.find(x => x.k === k) || { l: k };
                return `<th style="padding:10px 12px;text-align:left;color:#475569;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap">${esc(f.l||k)}</th>`;
              }).join('')}<th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB">Ações</th></tr>
            </thead>
            <tbody>
              ${filtered.length === 0
                ? `<tr><td colspan="${mod.tableCols.length+1}" style="padding:50px;text-align:center;color:#94A3B8"><div style="font-size:38px">📋</div><div style="font-weight:600;color:#475569;margin-top:8px">Nenhum registro</div><div style="font-size:12px;margin-top:4px">Clique em <strong>+ Novo</strong> para começar</div></td></tr>`
                : filtered.map(row => renderRow(row, mod)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  d.getElementById('eng-search').oninput = (e)=>{ _filter = e.target.value; render(); setTimeout(()=>{ const i=d.getElementById('eng-search'); if(i){i.focus(); i.setSelectionRange(_filter.length,_filter.length);} },0); };
  d.getElementById('eng-new').onclick = ()=> openEditor(null);
  // Excel dropdown (Importar + Exportar)
  const _engExcelBtn = d.getElementById('eng-excel-btn');
  const _engExcelMenu = d.getElementById('eng-excel-menu');
  if(_engExcelBtn && _engExcelMenu){
    _engExcelBtn.onclick = (ev)=>{
      ev.stopPropagation();
      _engExcelMenu.style.display = _engExcelMenu.style.display === 'block' ? 'none' : 'block';
    };
    setTimeout(()=> d.addEventListener('click', ()=>{ if(_engExcelMenu) _engExcelMenu.style.display='none'; }, { once: true }), 0);
  }
  const _engImpBtn = d.getElementById('eng-import');
  if(_engImpBtn) _engImpBtn.onclick = (ev)=>{ ev.stopPropagation(); if(_engExcelMenu) _engExcelMenu.style.display='none'; openImport(); };
  const _engExpBtn = d.getElementById('eng-export');
  if(_engExpBtn) _engExpBtn.onclick = (ev)=>{ ev.stopPropagation(); if(_engExcelMenu) _engExcelMenu.style.display='none'; exportExcel(); };
  el.querySelectorAll('.eng-edit').forEach(b => b.onclick = ()=> openEditor(b.dataset.id));
  el.querySelectorAll('.eng-del').forEach(b => b.onclick = ()=> remove(b.dataset.id));
}

function renderKPIs(mod){
  const total = _rows.length;
  let kpis = [`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Total</div><div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1.1;margin-top:4px">${total}</div></div>`];
  if(mod.fields.find(f => f.k === 'progress_pct')){
    const avg = total ? Math.round(_rows.reduce((s,r) => s + (+r.progress_pct||0), 0) / total) : 0;
    kpis.push(`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Avanço médio</div><div style="font-size:24px;font-weight:800;color:${mod.color};line-height:1.1;margin-top:4px">${avg}%</div></div>`);
  }
  if(mod.fields.find(f => f.k === 'installed')){
    const inst = _rows.filter(r => r.installed).length;
    kpis.push(`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Lançados</div><div style="font-size:24px;font-weight:800;color:#10B981;line-height:1.1;margin-top:4px">${inst}</div></div>`);
  }
  if(mod.fields.find(f => f.k === 'length_m')){
    const km = _rows.reduce((s,r) => s + (+r.length_m||0), 0);
    kpis.push(`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Total metros</div><div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1.1;margin-top:4px">${km.toFixed(1)}</div></div>`);
  }
  if(mod.fields.find(f => f.k === 'peso_kg') || mod.fields.find(f => f.k === 'peso_total_kg')){
    const w_k = mod.fields.find(f => f.k === 'peso_total_kg') ? 'peso_total_kg' : 'peso_kg';
    const peso = _rows.reduce((s,r) => s + (+r[w_k]||0), 0);
    kpis.push(`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Peso total (kg)</div><div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1.1;margin-top:4px">${peso.toFixed(0)}</div></div>`);
  }
  if(mod.fields.find(f => f.k === 'hh_realizado')){
    const hh = _rows.reduce((s,r) => s + (+r.hh_realizado||0), 0);
    kpis.push(`<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px"><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">HH realizado</div><div style="font-size:24px;font-weight:800;color:#10B981;line-height:1.1;margin-top:4px">${hh.toFixed(0)}</div></div>`);
  }
  return kpis.join('');
}

function renderRow(row, mod){
  return `<tr style="border-bottom:1px solid #F1F5F9">
    ${mod.tableCols.map(k => {
      const f = mod.fields.find(x => x.k === k);
      const v = row[k];
      let cell = '';
      if(v == null || v === '') cell = '<span style="color:#CBD5E1">—</span>';
      else if(f && f.t === 'bool') cell = v ? '<span style="color:#10B981">✓</span>' : '<span style="color:#94A3B8">—</span>';
      else if(f && (f.t === 'select' || /status/.test(k))) cell = `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background:${mod.color}15;color:${mod.color};font-weight:600;font-size:10.5px">${esc(v)}</span>`;
      else cell = esc(v);
      const isKey = (k === mod.keyField);
      const isMono = isKey || (f && f.mono);
      return `<td style="padding:9px 12px;color:#0F172A;${isMono?'font-family:ui-monospace,SFMono-Regular,monospace;font-weight:'+(isKey?'700':'500')+';':''}max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cell}</td>`;
    }).join('')}
    <td style="padding:9px 12px;text-align:center;white-space:nowrap">
      <button class="eng-edit" data-id="${esc(row.id)}" style="background:transparent;border:1px solid #E5E7EB;color:#475569;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px;font-family:inherit">Editar</button>
      <button class="eng-del" data-id="${esc(row.id)}" style="background:transparent;border:1px solid #FECACA;color:#DC2626;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">×</button>
    </td>
  </tr>`;
}

/* ============================================================
   EDITOR
   ============================================================ */
function openEditor(id){
  const mod = MODULES[_curMod];
  const r = id ? _rows.find(x => x.id === id) : null;
  const isNew = !r;
  const cur = r || {};

  let ov = d.getElementById('eng-editor');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'eng-editor';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };

  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:14px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:8px;background:${mod.color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px">📋</div>
        <div style="flex:1">
          <div style="font-size:14.5px;font-weight:800;color:#0F172A">${isNew?'Novo':'Editar'} — ${esc(mod.label)}</div>
          <div style="font-size:11.5px;color:#64748B">${esc(getProjectName()||'(sem projeto)')}</div>
        </div>
        <button id="eng-edit-close" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
      </div>
      <div style="flex:1;overflow:auto;padding:18px 22px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">
          ${mod.fields.map(f => renderField(f, cur[f.k])).join('')}
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;gap:10px">
        ${!isNew ? '<button id="eng-edit-del" style="background:#fff;color:#DC2626;border:1px solid #FECACA;padding:9px 16px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Excluir</button>' : ''}
        <div style="flex:1"></div>
        <button id="eng-edit-cancel" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Cancelar</button>
        <button id="eng-edit-save" style="background:${mod.color};color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12.5px;font-family:inherit">${isNew?'Criar':'Salvar'}</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('eng-edit-close').onclick = ()=> ov.remove();
  d.getElementById('eng-edit-cancel').onclick = ()=> ov.remove();
  d.getElementById('eng-edit-save').onclick = async ()=>{
    const payload = { org_id: getOrgId(), project_id: getProjectId() };
    let missingReq = null;
    mod.fields.forEach(f => {
      const v = readFieldValue(f);
      if(f.required && (v == null || v === '')){ missingReq = f.l; return; }
      if(v !== null && v !== undefined && v !== '') payload[f.k] = v;
    });
    if(missingReq){ toast('Campo obrigatório: ' + missingReq, 'err'); return; }
    const sb = getSb();
    if(!sb){ toast('Supabase indisponível','err'); return; }
    if(isNew){
      const r2 = await sb.from(mod.table).insert(payload).select().single();
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); console.error(r2.error); return; }
      toast('Cadastrado','ok');
    } else {
      const r2 = await sb.from(mod.table).update(payload).eq('id', cur.id).select().single();
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); console.error(r2.error); return; }
      toast('Salvo','ok');
    }
    ov.remove();
    await load(); render();
  };
  if(!isNew){
    d.getElementById('eng-edit-del').onclick = async ()=>{
      if(!confirm('Excluir este registro?')) return;
      const sb = getSb();
      const r2 = await sb.from(mod.table).update({ deleted_at: new Date().toISOString() }).eq('id', cur.id);
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); return; }
      toast('Excluído','ok');
      ov.remove();
      await load(); render();
    };
  }
}

function renderField(f, v){
  const baseStyle = 'width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;background:#fff;font-family:inherit;box-sizing:border-box';
  const label = `<label style="display:block;font-size:10.5px;color:#64748B;font-weight:600;margin-bottom:3px">${esc(f.l)}</label>`;
  let inner = '';
  if(f.t === 'select'){
    const opts = ['', ...(f.options||[])].map(o => `<option value="${esc(o)}" ${v===o?'selected':''}>${esc(o||'—')}</option>`).join('');
    inner = `<select id="ef-${f.k}" style="${baseStyle}">${opts}</select>`;
  } else if(f.t === 'bool'){
    inner = `<div style="display:flex;align-items:center;gap:8px;padding:8px 0"><input id="ef-${f.k}" type="checkbox" ${v?'checked':''} style="width:18px;height:18px;cursor:pointer"><span style="font-size:12px;color:#475569">Sim</span></div>`;
  } else if(f.t === 'textarea'){
    inner = `<textarea id="ef-${f.k}" rows="2" style="${baseStyle};resize:vertical">${esc(v||'')}</textarea>`;
  } else {
    const step = f.step ? `step="${f.step}"` : '';
    inner = `<input id="ef-${f.k}" type="${f.t||'text'}" ${step} value="${esc(v==null?'':v)}" placeholder="${esc(f.placeholder||'')}" style="${baseStyle}">`;
  }
  const span = (f.t === 'textarea') ? 'grid-column:1/-1' : '';
  return `<div style="${span}">${label}${inner}</div>`;
}

function readFieldValue(f){
  const el = d.getElementById('ef-'+f.k);
  if(!el) return null;
  if(f.t === 'bool') return !!el.checked;
  const raw = (el.value||'').trim();
  if(raw === '') return null;
  if(f.t === 'number') return parseFloat(raw);
  return raw;
}

async function remove(id){
  if(!confirm('Excluir este registro?')) return;
  const sb = getSb();
  const mod = MODULES[_curMod];
  const r = await sb.from(mod.table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if(r.error){ toast('Erro: '+r.error.message,'err'); return; }
  toast('Excluído','ok');
  await load(); render();
}

/* ============================================================
   EXPORT EXCEL
   ============================================================ */
function exportExcel(){
  if(!w.PIAExcel || !w.PIAExcel.exportData){ toast('Exportador Excel indisponível','warn'); return; }
  const mod = MODULES[_curMod];
  const cols = mod.fields.map(f => ({ h: f.l, k: f.k }));
  w.PIAExcel.exportData({
    filename: mod.table + '_' + (new Date().toISOString().slice(0,10)) + '.xlsx',
    sheetName: mod.label,
    columns: cols,
    rows: _rows,
    title: mod.label + ' · ' + getProjectName()
  });
}

/* ============================================================
   IMPORT EXCEL
   ============================================================ */
function openImport(){
  const mod = MODULES[_curMod];
  let ov = d.getElementById('eng-imp');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'eng-imp';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:680px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:14px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:8px;background:#10B981;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">⬆</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;color:#0F172A">Importar Excel — ${esc(mod.label)}</div>
          <div style="font-size:11px;color:#64748B">Colunas reconhecidas pelos nomes do cabeçalho</div>
        </div>
        <button id="eng-imp-close" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer">×</button>
      </div>
      <div style="padding:18px 22px;overflow:auto;flex:1">
        <div style="font-size:11.5px;color:#475569;margin-bottom:8px"><strong>Colunas aceitas (use o nome em minúsculas):</strong></div>
        <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:10px;font-family:ui-monospace,monospace;font-size:10.5px;color:#475569;line-height:1.6">${mod.fields.map(f => f.k).join(', ')}</div>
        <div style="margin-top:14px;background:#F0FDF4;border:1px dashed #86EFAC;border-radius:10px;padding:24px;text-align:center">
          <input type="file" id="eng-imp-file" accept=".xlsx,.xls,.csv" style="display:none">
          <button id="eng-imp-pick" style="background:#10B981;color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;font-family:inherit">Selecionar planilha</button>
          <div id="eng-imp-status" style="margin-top:10px;font-size:11.5px;color:#475569"></div>
        </div>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('eng-imp-close').onclick = ()=> ov.remove();
  const fileEl = d.getElementById('eng-imp-file');
  d.getElementById('eng-imp-pick').onclick = ()=> fileEl.click();
  fileEl.onchange = async ()=>{
    const f = fileEl.files[0]; if(!f) return;
    const stEl = d.getElementById('eng-imp-status');
    stEl.innerHTML = '⏳ Lendo arquivo...';
    try {
      if(!w.XLSX) throw new Error('Lib XLSX não disponível. Recarregue a página.');
      const buf = await f.arrayBuffer();
      const wb = w.XLSX.read(buf, { type:'array' });
      const sh = wb.Sheets[wb.SheetNames[0]];
      const rowsR = w.XLSX.utils.sheet_to_json(sh, { defval: null });
      const rows = rowsR.map(r => {
        const out = {};
        Object.keys(r).forEach(k => {
          const nk = String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
          out[nk] = r[k];
        });
        return out;
      });
      stEl.innerHTML = '📊 ' + rows.length + ' linhas detectadas. Importando...';
      const sb = getSb();
      const pid = getProjectId();
      const org = getOrgId();
      const validKeys = mod.fields.map(ff => ff.k);
      let ok = 0, fail = 0;
      for(const r of rows){
        const payload = { org_id: org, project_id: pid };
        for(const k of validKeys){
          if(r[k] == null || r[k] === '') continue;
          payload[k] = r[k];
        }
        const reqField = mod.fields.find(ff => ff.required);
        if(reqField && !payload[reqField.k]){ fail++; continue; }
        const res = await sb.from(mod.table).insert(payload);
        if(res.error){ fail++; console.warn('import', res.error); } else ok++;
      }
      stEl.innerHTML = '✅ ' + ok + ' importado(s). ' + (fail>0 ? '⚠ '+fail+' falhas (faltou campo obrigatório).' : '');
      await load(); render();
      setTimeout(()=> d.getElementById('eng-imp')?.remove(), 2200);
    } catch(e){
      stEl.innerHTML = '⚠ Erro: ' + esc(e.message||e);
    }
  };
}

w.PIAEngModule = {
  open: openMod,
  MODULES
};

/* ============================================================
   Hook no goV pra esconder os containers quando outra view é ativada
   ============================================================ */
function hookGoVForEng(){
  if(typeof w.goV !== 'function' || w.goV._engHooked) return false;
  const orig = w.goV;
  w.goV = function(){
    try {
      Object.keys(MODULES).forEach(m => {
        const el = d.getElementById('veng-' + m);
        if(el) el.style.display = 'none';
      });
    } catch(_){}
    return orig.apply(this, arguments);
  };
  w.goV._engHooked = true;
  return true;
}
if(!hookGoVForEng()){
  if(d.readyState === 'loading'){
    d.addEvent