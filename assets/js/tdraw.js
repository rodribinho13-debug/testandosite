/* ============================================================
   PROJECT.IA — Desenho Técnico (Technical Drawings)
   Modelo padronizado adaptado por disciplina.
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
function toast(m,t){ if(w.toast) w.toast(m,t); else console.log('[TDraw]', m); }

/* ============================================================
   ESQUEMA POR DISCIPLINA
   - common: aparece para todas
   - specific: aparece dinamicamente conforme a disciplina ativa
   ============================================================ */
const COMMON_STATUS = [
  { v:'em_elaboracao', l:'Em elaboração', c:'#94A3B8' },
  { v:'em_revisao',    l:'Em revisão',    c:'#F59E0B' },
  { v:'afc',           l:'Aprovado (AFC)',c:'#10B981' },
  { v:'cancelado',     l:'Cancelado',     c:'#DC2626' }
];

const FORMATS = ['A0','A1','A2','A3','A4'];
const REVISIONS = ['0','A','B','C','D','E','1','2','3'];

const SCHEMAS = {
  civil: {
    label: 'Civil',
    tipos: ['Planta baixa','Planta de cobertura','Corte','Vista','Detalhe','Fundação','Forma','Armadura','Locação'],
    fields: [
      { k:'volume_concreto', l:'Volume concreto (m³)', t:'number', step:'0.01' },
      { k:'kg_aco',          l:'Aço (kg)',            t:'number', step:'1' },
      { k:'fck',             l:'Fck (MPa)',           t:'number', step:'1', placeholder:'25' },
      { k:'cota_referencia', l:'Cota de referência',  t:'text',  placeholder:'+0.00' }
    ]
  },
  eletrica: {
    label: 'Elétrica',
    tipos: ['Diagrama unifilar','Diagrama de força','Diagrama de comando','Malha de aterramento','SPDA','Percurso de cabos','P&ID','Layout de painel'],
    fields: [
      { k:'tensao',          l:'Tensão',             t:'select', options:['BT (até 1kV)','MT (1-72,5kV)','AT (>72,5kV)'] },
      { k:'carga_kw',        l:'Carga prevista (kW)',t:'number', step:'0.1' },
      { k:'sistema',         l:'Sistema',            t:'select', options:['Iluminação','Força motriz','Controle','SPDA','Aterramento','Automação'] }
    ]
  },
  instrumentacao: {
    label: 'Instrumentação',
    tipos: ['P&ID','Malha de controle','Fluxograma','Layout de campo','Lista de instrumentos','Hookup'],
    fields: [
      { k:'loop_number', l:'Loop number',     t:'text',  placeholder:'L-101' },
      { k:'tag_principal', l:'TAG principal', t:'text',  placeholder:'PT-101' },
      { k:'tipo_lazo',   l:'Tipo de malha',   t:'select', options:['Indicação','Controle','Alarme','Shutdown (ESD)','Fire & Gas'] }
    ]
  },
  pintura: {
    label: 'Pintura',
    tipos: ['Esquema de pintura','Mapa de pintura','Detalhe de preparo','Norma','Memorial'],
    fields: [
      { k:'esquema',     l:'Esquema',              t:'text',  placeholder:'PETROBRAS N-2628 / RAL 9006' },
      { k:'sistema',     l:'Sistema (camadas)',    t:'text',  placeholder:'Primer EP + Inter + Acabamento PU' },
      { k:'dft_total',   l:'DFT total (μm)',       t:'number', step:'1' },
      { k:'area_m2',     l:'Área (m²)',            t:'number', step:'0.01' },
      { k:'qtd_demaos',  l:'Qtd de demãos',        t:'number', step:'1' }
    ]
  },
  caldeiraria: {
    label: 'Caldeiraria',
    tipos: ['Estrutura','Perfil','Detalhe de junta','Detalhe de solda','Vista geral','Montagem'],
    fields: [
      { k:'material_perfil', l:'Material do perfil', t:'text', placeholder:'ASTM A572 Gr.50' },
      { k:'espessura_mm',    l:'Espessura (mm)',     t:'number', step:'0.1' },
      { k:'wps',             l:'WPS / Procedimento', t:'text', placeholder:'WPS-001' },
      { k:'nde_requerido',   l:'NDE requerido',      t:'select', options:['Nenhum','VS','LP','PM','RX','US','TT'] }
    ]
  },
  mecanica: {
    label: 'Mecânica',
    tipos: ['Vista geral','Corte','Detalhe','Lista de peças','Montagem','Conjunto'],
    fields: [
      { k:'material',          l:'Material',              t:'text',  placeholder:'AISI 304' },
      { k:'tolerancia_geral',  l:'Tolerância geral',      t:'text',  placeholder:'ISO 2768-m' },
      { k:'tratamento_sup',    l:'Tratamento superficial',t:'text',  placeholder:'Galvanização' }
    ]
  },
  hidraulica: {
    label: 'Hidráulica',
    tipos: ['Planta hidráulica','Isométrico','Detalhe','Diagrama'],
    fields: [
      { k:'pressao_bar',  l:'Pressão (bar)', t:'number', step:'0.1' },
      { k:'vazao_lps',    l:'Vazão (L/s)',   t:'number', step:'0.1' },
      { k:'diametro_mm',  l:'Diâmetro (mm)', t:'number', step:'1' }
    ]
  },
  tubulacao: {
    label: 'Tubulação (não-iso)',
    tipos: ['Fluxograma','P&ID','Lista de linhas','Locação de tubulação','Detalhe'],
    fields: [
      { k:'linha',         l:'Linha',           t:'text', placeholder:'L-101-A1A' },
      { k:'diametro_in',   l:'Diâmetro (")',    t:'number', step:'0.25' },
      { k:'classe',        l:'Classe (rating)', t:'text', placeholder:'150# / 300#' }
    ]
  }
};

/* ============================================================
   ESTADO
   ============================================================ */
let _curDisciplina = 'civil';
let _rows = [];
let _filter = '';
let _statusFilter = '';

function setDisciplina(d){
  if(!SCHEMAS[d]) return;
  _curDisciplina = d;
}

/* ============================================================
   API PÚBLICA
   ============================================================ */
async function openTDraw(disciplina){
  if(disciplina && SCHEMAS[disciplina]) _curDisciplina = disciplina;
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

/* Garante que existe o <div id="vtdraw"> dentro de .content */
function ensureContainer(){
  let el = d.getElementById('vtdraw');
  if(el) return el;
  const content = d.querySelector('.content');
  if(!content) return null;
  el = d.createElement('div');
  el.id = 'vtdraw';
  el.style.display = 'none';
  content.appendChild(el);
  return el;
}

async function load(){
  const sb = getSb();
  if(!sb){ _rows = []; return; }
  const pid = getProjectId();
  if(!pid){ _rows = []; return; }
  const r = await sb.from('technical_drawings')
    .select('*')
    .eq('project_id', pid)
    .eq('disciplina', _curDisciplina)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(2000);
  if(r.error){
    console.error('[tdraw] load', r.error);
    toast('Erro ao carregar: ' + r.error.message,'err');
    _rows = [];
    return;
  }
  _rows = r.data || [];
}

function render(){
  const el = ensureContainer();
  if(!el) return;
  const schema = SCHEMAS[_curDisciplina];
  if(!schema){ el.innerHTML = '<div style="padding:30px;color:#94A3B8">Disciplina inválida</div>'; return; }

  // Filtros
  const q = (_filter||'').toLowerCase().trim();
  const stf = _statusFilter;
  const filtered = _rows.filter(r => {
    if(stf && r.status !== stf) return false;
    if(q){
      const hay = [r.code, r.title, r.author, r.tipo, r.frente].filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  // KPIs
  const total = _rows.length;
  const afc = _rows.filter(x => x.status === 'afc').length;
  const elab = _rows.filter(x => x.status === 'em_elaboracao').length;
  const rev = _rows.filter(x => x.status === 'em_revisao').length;
  const overdue = _rows.filter(x => x.status !== 'afc' && x.status !== 'cancelado' && x.due_date && new Date(x.due_date) < new Date()).length;

  el.style.display = 'block';
  el.style.padding = '0';
  el.innerHTML = `
    <div style="padding:20px 24px;background:#FAFBFC;min-height:100%">
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px">
        ${kpiCard('Total de desenhos', total, '#0F172A')}
        ${kpiCard('Aprovados (AFC)', afc, '#10B981')}
        ${kpiCard('Em revisão', rev, '#F59E0B')}
        ${kpiCard('Em elaboração', elab, '#94A3B8')}
        ${kpiCard('Atrasados', overdue, overdue>0?'#DC2626':'#94A3B8')}
      </div>

      <!-- Filtros + ações -->
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <input id="tdraw-search" type="text" value="${esc(_filter)}" placeholder="Buscar por código, título, autor, tipo..." style="flex:1;min-width:240px;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;background:#fff;font-family:inherit">
        <select id="tdraw-status" style="padding:9px 10px;border:1px solid #E5E7EB;border-radius:8px;font-size:12.5px;background:#fff;font-family:inherit">
          <option value="">Todos os status</option>
          ${COMMON_STATUS.map(s => `<option value="${s.v}" ${stf===s.v?'selected':''}>${esc(s.l)}</option>`).join('')}
        </select>
        <div class="tdraw-excel-wrap" style="position:relative;display:inline-block">
          <button id="tdraw-excel-btn" type="button" style="padding:9px 14px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;color:#475569;font-family:inherit;display:inline-flex;align-items:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            Excel
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div id="tdraw-excel-menu" style="display:none;position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(10,22,40,.12);min-width:180px;z-index:50;overflow:hidden">
            <button id="tdraw-import-excel" type="button" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'#fff\'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importar Excel
            </button>
            <button id="tdraw-export" type="button" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:#fff;border:none;border-top:1px solid #F1F5F9;cursor:pointer;font-size:12.5px;font-weight:600;color:#0F172A;font-family:inherit;text-align:left" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'#fff\'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Excel
            </button>
          </div>
        </div>
        <button id="tdraw-ai" class="btn bia"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>Cadastrar via IA</button>
        <button id="tdraw-new" style="padding:9px 18px;background:#2563EB;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit">+ Novo desenho</button>
      </div>

      <!-- Tabela -->
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
        <div style="overflow-x:auto;max-height:calc(100vh - 320px);overflow-y:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;font-family:inherit">
            <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1">
              <tr>
                ${headerCell('Código')}
                ${headerCell('Rev')}
                ${headerCell('Título')}
                ${headerCell('Tipo')}
                ${headerCell('Status')}
                ${headerCell('Autor')}
                ${headerCell('Formato')}
                ${headerCell('Escala')}
                ${schema.fields.map(f => headerCell(f.l)).join('')}
                ${headerCell('Emissão')}
                ${headerCell('Prazo')}
                ${headerCell('PDF', 'center')}
                ${headerCell('Ações', 'center')}
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0
                ? `<tr><td colspan="${12 + schema.fields.length}" style="padding:50px;text-align:center;color:#94A3B8"><div style="font-size:38px">📐</div><div style="font-weight:600;color:#475569;margin-top:8px">Nenhum desenho cadastrado</div><div style="font-size:12px;margin-top:4px">Clique em <strong>+ Novo desenho</strong> para começar</div></td></tr>`
                : filtered.map(row => renderRow(row, schema)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Listeners
  d.getElementById('tdraw-search').oninput = (e)=>{ _filter = e.target.value; render(); setTimeout(()=>{ const i=d.getElementById('tdraw-search'); if(i){i.focus(); i.setSelectionRange(_filter.length,_filter.length);} },0); };
  d.getElementById('tdraw-status').onchange = (e)=>{ _statusFilter = e.target.value; render(); };
  d.getElementById('tdraw-new').onclick = ()=> openEditor(null);
  d.getElementById('tdraw-ai').onclick = openAIWizard;
  // Excel dropdown (Importar + Exportar)
  const excelBtn = d.getElementById('tdraw-excel-btn');
  const excelMenu = d.getElementById('tdraw-excel-menu');
  if(excelBtn && excelMenu){
    excelBtn.onclick = (ev)=>{
      ev.stopPropagation();
      excelMenu.style.display = excelMenu.style.display === 'block' ? 'none' : 'block';
    };
    setTimeout(()=> d.addEventListener('click', ()=>{ if(excelMenu) excelMenu.style.display='none'; }, { once: true }), 0);
  }
  const _importBtn = d.getElementById('tdraw-import-excel');
  if(_importBtn) _importBtn.onclick = (ev)=>{ ev.stopPropagation(); if(excelMenu) excelMenu.style.display='none'; openImportExcel(); };
  const _exportBtn = d.getElementById('tdraw-export');
  if(_exportBtn) _exportBtn.onclick = (ev)=>{ ev.stopPropagation(); if(excelMenu) excelMenu.style.display='none'; exportExcel(); };
  el.querySelectorAll('.tdraw-edit').forEach(b => b.onclick = ()=> openEditor(b.dataset.id));
  el.querySelectorAll('.tdraw-del').forEach(b => b.onclick = ()=> remove(b.dataset.id));
}

/* ============================================================
   WIZARD DE CADASTRO VIA IA
   ============================================================ */
// Estado do wizard multi-categoria
let _multiAI = null;

async function openAIWizard(){
  const schema = SCHEMAS[_curDisciplina];
  let ov = d.getElementById('tdraw-ai-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'tdraw-ai-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#7C3AED,#5B21B6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">✨</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:800;color:#0F172A">Cadastro via IA — DESENHO TÉCNICO (${esc(schema.label)})</div>
          <div style="font-size:11.5px;color:#64748B">Fase 1 de 3 · Upload do documento</div>
        </div>
        <button id="tdraw-ai-close" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
      </div>
      <div id="tdraw-ai-body" style="flex:1;overflow:auto;padding:20px 22px">
        <div id="tdraw-ai-drop" style="border:2px dashed #C4B5FD;border-radius:12px;padding:36px;text-align:center;cursor:pointer;background:#F5F3FF;transition:background .15s">
          <div style="font-size:42px;margin-bottom:8px">📐</div>
          <div style="font-size:14px;font-weight:700;color:#5B21B6">Clique ou arraste as pranchas</div>
          <div style="font-size:11.5px;color:#7C3AED;margin-top:4px">PDF · PNG · JPG · WEBP — até 6 páginas</div>
          <input type="file" id="tdraw-ai-file" accept="image/*,application/pdf" multiple style="display:none">
        </div>

        <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin:16px 0 6px;letter-spacing:.5px">Instruções extras (opcional)</label>
        <textarea id="tdraw-ai-instr" rows="2" placeholder="ex: conte apenas válvulas acima de 2 polegadas, ignore a legenda do carimbo, use o código da prancha como referência..." style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:12.5px;font-family:inherit;resize:vertical;outline:none"></textarea>
        <div style="font-size:10.5px;color:#94A3B8;margin-top:4px">A IA seguirá estas instruções além do prompt padrão da disciplina.</div>

        <div id="tdraw-ai-preview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin:14px 0"></div>
        <div id="tdraw-ai-result"></div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;display:flex;gap:10px;background:#FAFBFC">
        <button id="tdraw-ai-cancel" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Cancelar</button>
        <div style="flex:1"></div>
        <button id="tdraw-ai-go" disabled style="background:#A78BFA;color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:not-allowed;font-weight:700;font-size:12.5px;opacity:.6;font-family:inherit">🤖 Analisar com IA</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('tdraw-ai-close').onclick = ()=> ov.remove();
  d.getElementById('tdraw-ai-cancel').onclick = ()=> ov.remove();
  const fileInput = d.getElementById('tdraw-ai-file');
  const dropZone = d.getElementById('tdraw-ai-drop');
  dropZone.onclick = ()=> fileInput.click();
  dropZone.ondragover = (e)=>{ e.preventDefault(); dropZone.style.background = '#EDE9FE'; };
  dropZone.ondragleave = ()=>{ dropZone.style.background = '#F5F3FF'; };
  dropZone.ondrop = (e)=>{ e.preventDefault(); dropZone.style.background = '#F5F3FF'; if(e.dataTransfer.files && e.dataTransfer.files.length){ fileInput.files = e.dataTransfer.files; fileInput.onchange(); } };

  let imgs = [];
  fileInput.onchange = async ()=>{
    const files = Array.from(fileInput.files || []);
    for(const f of files){
      if(imgs.length >= 6){ alert('Máximo 6 arquivos'); break; }
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = ()=> res(r.result);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
        if(!m) continue;
        imgs.push({ mime: m[1], b64: m[2], dataUrl, name: f.name, isPdf: m[1] === 'application/pdf' });
      } catch(e){ console.warn('upload', e); }
    }
    renderAIPreview(imgs);
    const btn = d.getElementById('tdraw-ai-go');
    btn.disabled = imgs.length === 0;
    btn.style.opacity = imgs.length === 0 ? '.6' : '1';
    btn.style.cursor = imgs.length === 0 ? 'not-allowed' : 'pointer';
    btn.style.background = imgs.length === 0 ? '#A78BFA' : '#7C3AED';
  };

  d.getElementById('tdraw-ai-go').onclick = async ()=>{
    if(imgs.length === 0) return;
    const result = d.getElementById('tdraw-ai-result');
    result.innerHTML = '<div style="background:#FAFBFC;border:1px solid #E5E7EB;border-radius:10px;padding:30px;text-align:center;color:#475569"><div style="font-size:36px">🤖</div><div style="font-weight:700;margin-top:8px;font-size:14px">Engenheiro sênior em ' + esc(SCHEMAS[_curDisciplina].label) + ' analisando documento completo...</div><div style="font-size:11.5px;margin-top:4px;color:#94A3B8">Extraindo materiais, suportes, juntas, isos, cabos, e tudo mais que existir · 20-60 segundos</div></div>';
    const btn = d.getElementById('tdraw-ai-go');
    btn.disabled = true; btn.style.opacity = '.6'; btn.style.cursor = 'wait';
    try {
      const sbUrl = w.SUPABASE_URL || '';
      const session = w.sb ? await w.sb.auth.getSession() : null;
      const token = session?.data?.session?.access_token || w.SUPABASE_KEY;
      // Usa o endpoint MULTI: extrai TODAS as categorias da disciplina
      const resp = await fetch(sbUrl + '/functions/v1/analyze-discipline-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          disciplina: _curDisciplina,
          images: imgs.map(i => ({ mime: i.mime, b64: i.b64 })),
          instructions: ((d.getElementById('tdraw-ai-instr')||{}).value || '').trim()
        })
      });
      const data = await resp.json();
      if(!data.ok) throw new Error(data.error || 'Falha na análise');
      _multiAI = data;
      renderMultiCategories();
    } catch(e){
      console.error('[TDraw multi-AI]', e);
      result.innerHTML = '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:18px;color:#991B1B;font-size:13px"><strong>⚠ Erro:</strong> ' + esc(e.message||e) + '</div>';
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
    }
  };
}

/* ============================================================
   NOVA UI — MULTI-CATEGORIA (Engenheiro sênior despacha tudo)
   ============================================================ */
let _multiActiveCat = null;

function renderMultiCategories(){
  const data = _multiAI;
  const ov = d.getElementById('tdraw-ai-ov');
  if(!ov || !data) return;
  const cats = data.categories || {};
  const catKeys = Object.keys(cats).filter(k => (cats[k].items||[]).length > 0);

  if(catKeys.length === 0){
    d.getElementById('tdraw-ai-result').innerHTML = '<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px;color:#78350F;font-size:13px"><strong>⚠ Nenhum elemento estruturado foi identificado.</strong> Tente outro documento ou verifique se a qualidade da imagem está adequada.</div>';
    return;
  }
  // Adiciona aba "hh" virtual quando há materials
  if(cats.materials && cats.materials.items.length){
    if(!catKeys.includes('hh')) catKeys.push('hh');
  }
  if(!_multiActiveCat || (!cats[_multiActiveCat] && _multiActiveCat !== 'hh')) _multiActiveCat = catKeys[0];

  // Mostra tela cheia (substitui o conteúdo do modal)
  ov.querySelector('div').innerHTML = `
    <div style="padding:14px 22px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#10B981,#059669);color:#fff">
      <div style="width:38px;height:38px;border-radius:9px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px">✓</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:800">Análise concluída — ${data.total_items} elementos encontrados em ${catKeys.length} categorias</div>
        <div style="font-size:11.5px;opacity:.85">Revise cada aba, edite o que precisar, e clique em "Cadastrar tudo" pra distribuir nas tabelas do projeto</div>
      </div>
      <button id="tdraw-multi-close" style="background:rgba(255,255,255,.18);border:none;color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
    </div>
    ${data.summary ? `<div style="padding:10px 22px;background:#EFF6FF;border-bottom:1px solid #DBEAFE;font-size:12px;color:#1E3A8A;line-height:1.5"><strong>💡 Análise:</strong> ${esc(data.summary.slice(0, 500))}${data.summary.length > 500 ? '...' : ''}</div>` : ''}
    <div id="tdraw-multi-tabs" style="display:flex;gap:0;border-bottom:1px solid #E5E7EB;background:#FAFBFC;overflow-x:auto;padding:0 12px">
      ${catKeys.map(k => {
        const isHH = k === 'hh';
        const cat = isHH ? { label: '💪 HH Estimado', count: '' } : cats[k];
        const active = k === _multiActiveCat;
        const accent = isHH ? '#7C3AED' : '#10B981';
        return `<button data-cat="${esc(k)}" class="tdraw-multi-tab" style="background:${active?'#fff':'transparent'};border:none;border-bottom:3px solid ${active?accent:'transparent'};padding:11px 16px;cursor:pointer;font-weight:${active?'800':'600'};font-size:12.5px;color:${active?'#0F172A':'#64748B'};white-space:nowrap;font-family:inherit">
          <span>${esc(cat.label)}</span>
          ${cat.count !== '' ? `<span style="background:${active?accent:'#E5E7EB'};color:${active?'#fff':'#475569'};padding:1px 7px;border-radius:99px;font-size:10.5px;margin-left:5px;font-weight:700">${cat.count}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <div id="tdraw-multi-body" style="flex:1;overflow:auto;padding:14px 22px;background:#fff"></div>
    <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;gap:10px;align-items:center">
      <div style="flex:1;font-size:11.5px;color:#475569">Cada categoria vai pra sua tabela. Você pode marcar/desmarcar e editar antes de confirmar.</div>
      <button id="tdraw-multi-cancel" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Cancelar</button>
      <button id="tdraw-multi-save-all" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;border:none;padding:10px 22px;border-radius:7px;cursor:pointer;font-weight:800;font-size:13px;font-family:inherit">✓ Cadastrar TUDO (${data.total_items})</button>
    </div>
  `;
  ov.querySelectorAll('.tdraw-multi-tab').forEach(b => b.onclick = ()=>{ _multiActiveCat = b.dataset.cat; renderMultiCategories(); });
  d.getElementById('tdraw-multi-close').onclick = ()=> ov.remove();
  d.getElementById('tdraw-multi-cancel').onclick = ()=> ov.remove();
  d.getElementById('tdraw-multi-save-all').onclick = saveAllCategories;
  renderActiveCategory();
}

async function renderActiveCategory(){
  const body = d.getElementById('tdraw-multi-body');
  if(!body || !_multiAI) return;

  // Aba especial HH Estimado
  if(_multiActiveCat === 'hh'){
    return renderHHEstimate(body);
  }

  const cat = _multiAI.categories[_multiActiveCat];
  if(!cat){ body.innerHTML = '<div style="color:#94A3B8;text-align:center;padding:30px">Selecione uma categoria</div>'; return; }

  // Coleta todas as colunas dos items
  const items = cat.items || [];
  const cols = Array.from(new Set(items.flatMap(it => Object.keys(it||{}))));

  body.innerHTML = `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;font-size:12px;color:#166534">
      <span style="font-size:14px">🧠</span>
      <span><strong>${cat.count} ${esc(cat.label).toLowerCase()}</strong> serão cadastrados na tabela <code style="background:#D1FAE5;padding:1px 6px;border-radius:4px">${esc(cat.table)}</code> do projeto ativo. Edite, desmarque ou apague o que não precisar.</span>
    </div>
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
      <div style="overflow:auto;max-height:48vh">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;font-family:inherit">
          <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1">
            <tr>
              <th style="padding:8px;text-align:center;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;width:60px">✓ #</th>
              ${cols.map(c => `<th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap">${esc(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${items.map((it, i) => `<tr style="border-bottom:1px solid #F1F5F9">
              <td style="padding:5px 8px;text-align:center;background:#FAFBFC"><input type="checkbox" class="multi-row-chk" data-cat="${esc(_multiActiveCat)}" data-i="${i}" checked style="cursor:pointer"> <span style="font-size:10px;color:#64748B;margin-left:3px">${i+1}</span></td>
              ${cols.map(c => `<td style="padding:0;min-width:120px;max-width:240px"><input type="text" class="multi-cell" data-cat="${esc(_multiActiveCat)}" data-i="${i}" data-k="${esc(c)}" value="${esc(it[c]==null?'':it[c])}" style="width:100%;border:none;background:transparent;padding:6px 10px;font-size:11.5px;font-family:inherit;outline:none" onfocus="this.style.background='#FFFBEB'" onblur="this.style.background='transparent'"></td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Edição inline
  body.querySelectorAll('.multi-cell').forEach(inp => {
    inp.oninput = (e)=>{
      const c = e.target.dataset.cat;
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      const v = e.target.value;
      if(_multiAI.categories[c] && _multiAI.categories[c].items[i]){
        _multiAI.categories[c].items[i][k] = v === '' ? null : v;
      }
    };
  });
}

async function renderHHEstimate(body){
  body.innerHTML = '<div style="text-align:center;padding:40px;color:#475569"><div style="font-size:32px">⏳</div><div style="margin-top:10px;font-weight:700">Calculando HH estimado…</div><div style="font-size:11.5px;color:#94A3B8;margin-top:4px">Cruzando os itens com os coeficientes do banco</div></div>';
  const sb = getSb();
  const items = (_multiAI.categories.materials && _multiAI.categories.materials.items) || [];
  // Inclui também suportes e juntas se houver
  const supItems = (_multiAI.categories.supports && _multiAI.categories.supports.items) || [];
  const jntItems = (_multiAI.categories.joints && _multiAI.categories.joints.items) || [];
  const allItems = items.concat(supItems.map(s => ({ ...s, category: 'suporte' }))).concat(jntItems.map(j => ({ ...j, category: 'junta', description: 'Solda junta ' + (j.joint_number||''), diameter_in: j.diameter_in, quantity: 1, unit: 'jt' })));

  if(allItems.length === 0){
    body.innerHTML = '<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px;color:#78350F;font-size:13px">Nenhum item com quantidade pra calcular HH. Volte às abas Materiais/Suportes/Juntas, preencha as quantidades e tente novamente.</div>';
    return;
  }

  let hhData = null;
  try {
    const r = await sb.rpc('calculate_hh_estimate', { p_items: allItems });
    if(r.error) throw r.error;
    hhData = r.data;
  } catch(e){
    body.innerHTML = '<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:14px;color:#991B1B;font-size:13px"><strong>Erro ao calcular HH:</strong> ' + esc(e.message||e) + '</div>';
    return;
  }

  const rows = hhData.items || [];
  const totalHH = hhData.total_hh || 0;
  const withHH = hhData.items_with_hh || 0;
  const total = hhData.total_items || rows.length;
  const dias8h = (totalHH / 8).toFixed(1);

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      ${kpiHHCard('HH Total', totalHH.toFixed(1) + ' h', '#7C3AED', '💪')}
      ${kpiHHCard('Equivalente em dias (8h)', dias8h + ' dias', '#0F172A', '📅')}
      ${kpiHHCard('Itens calculados', withHH + ' / ' + total, '#10B981', '✓')}
      ${kpiHHCard('Sem coeficiente', (total - withHH) + ' itens', '#F59E0B', '⚠')}
    </div>

    <div style="background:#F5F3FF;border:1px solid #C4B5FD;border-radius:10px;padding:11px 14px;margin-bottom:12px;font-size:12px;color:#5B21B6;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">🧠</span>
      <span><strong>Coeficientes do banco PROJECT.IA</strong> (hh_coefficients_pipe, hh_coefficients_valve, hh_coefficients_cable, productivity_params) — referências da indústria brasileira. Você pode ajustar manualmente clicando na coluna "HH unit".</span>
    </div>

    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
      <div style="overflow:auto;max-height:42vh">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px">
          <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1">
            <tr>
              <th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">Item</th>
              <th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">Categoria</th>
              <th style="padding:8px 10px;text-align:center;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">Ø</th>
              <th style="padding:8px 10px;text-align:right;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">Qtd</th>
              <th style="padding:8px 10px;text-align:right;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">HH unit</th>
              <th style="padding:8px 10px;text-align:right;color:#7C3AED;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">HH total</th>
              <th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB">Profissional</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const hasHH = r.hh_unit != null;
              return `<tr style="border-bottom:1px solid #F1F5F9;${!hasHH?'background:#FEF3C7':''}">
                <td style="padding:8px 10px;color:#0F172A;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.description||'')}">${esc((r.description||'').slice(0,70))}</td>
                <td style="padding:8px 10px;color:#64748B">${esc(r.category||'')}</td>
                <td style="padding:8px 10px;text-align:center;color:#64748B;font-family:ui-monospace,monospace">${esc(r.diameter||'')}</td>
                <td style="padding:8px 10px;text-align:right;color:#0F172A;font-weight:600">${(r.qty!=null?(+r.qty).toFixed(2):'-')} ${esc(r.unit||'')}</td>
                <td style="padding:8px 10px;text-align:right;color:${hasHH?'#0F172A':'#94A3B8'};font-family:ui-monospace,monospace;font-size:11px">${hasHH?(+r.hh_unit).toFixed(3)+'h':'—'}</td>
                <td style="padding:8px 10px;text-align:right;color:${hasHH?'#7C3AED':'#94A3B8'};font-weight:800;font-family:ui-monospace,monospace">${hasHH?(+r.hh_total).toFixed(1)+'h':'sem coef'}</td>
                <td style="padding:8px 10px;color:#64748B;font-size:11px">${esc(r.role||'')}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot style="background:#FAFBFC;border-top:2px solid #7C3AED">
            <tr>
              <td colspan="5" style="padding:12px;text-align:right;color:#0F172A;font-weight:800;font-size:12px">TOTAL ESTIMADO:</td>
              <td style="padding:12px;text-align:right;color:#7C3AED;font-weight:900;font-size:16px;font-family:ui-monospace,monospace">${totalHH.toFixed(1)}h</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:11px 14px;margin-top:12px;font-size:11.5px;color:#78350F;line-height:1.55">
      <strong>💡 Como ler:</strong> O HH unitário vem do banco de coeficientes de produtividade brasileiro (válvulas, soldas, lançamento de cabos, etc.). Quem opera é o profissional indicado em "Profissional". <strong>Linhas amarelas</strong> são itens que a IA identificou mas não bateram com nenhum coeficiente — você pode cadastrar o coeficiente manualmente em Engenharia → Parâmetros HH, ou só ignorar.
    </div>

    <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end">
      <button id="hh-save-pcp" style="background:#fff;color:#7C3AED;border:1px solid #C4B5FD;padding:8px 16px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit">📅 Salvar como pacote PCP</button>
    </div>
  `;

  // Botão salvar PCP
  const btnPcp = d.getElementById('hh-save-pcp');
  if(btnPcp) btnPcp.onclick = ()=> savePCPFromHH(totalHH, rows);
}

function kpiHHCard(label, val, color, icon){
  return `<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
    <div style="display:flex;align-items:center;gap:6px"><span style="font-size:14px">${icon}</span><div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${esc(label)}</div></div>
    <div style="font-size:22px;font-weight:900;color:${color};margin-top:4px;line-height:1.1">${val}</div>
  </div>`;
}

async function savePCPFromHH(totalHH, rows){
  const sb = getSb();
  const orgId = getOrgId();
  const projectId = getProjectId();
  if(!sb || !projectId){ toast('Projeto não selecionado','err'); return; }
  const desc = (_multiAI.summary || 'Pacote gerado pela IA').slice(0, 180);
  // Pacote PCP único com HH previsto total
  const payload = {
    org_id: orgId,
    project_id: projectId,
    disciplina: _curDisciplina,
    descricao: desc,
    hh_prev: Math.round(totalHH),
    status: 'backlog',
    meta: { source: 'ai_hh_estimate', items: rows.length, items_with_hh: rows.filter(r => r.hh_unit != null).length }
  };
  const r = await sb.from('pcp_packages').insert(payload).select().single();
  if(r.error){ toast('Erro: ' + r.error.message, 'err'); console.error(r.error); return; }
  toast('Pacote PCP criado · ' + Math.round(totalHH) + ' hh previstos', 'ok');
}

// Dicionário de aliases PT-BR → coluna real (compartilhado com discipline-ai-modal)
const ENG_ALIASES = {
  'numero_iso':'iso_number','numero':'iso_number','iso':'iso_number','no_iso':'iso_number',
  'folha':'sheet_number','sheet':'sheet_number','no_folha':'sheet_number',
  'total_folhas':'total_sheets',
  'revisao':'revision','rev':'revision',
  'linha':'line','tag_linha':'line',
  'nr_13':'nr13','nr13_aplicavel':'nr13',
  'classe_inspecao':'inspection_class','classe_de_inspecao':'inspection_class','classe_insp':'inspection_class',
  'classe_fluido':'fluid_class','classe_do_fluido':'fluid_class','fluido':'fluid_class',
  'isolamento_termico':'thermal_insulation','isolamento':'thermal_insulation',
  'temperatura_operacao':'operating_temp','t_op':'operating_temp','temperatura':'operating_temp',
  'pintura':'paint_status','status_pintura':'paint_status',
  'teste_hidrostatico':'hydro_test','t_h':'hydro_test','th':'hydro_test',
  'iso_categoria':'iso_category',
  'numero_junta':'joint_number','no_junta':'joint_number',
  'diametro_polegadas':'diameter_in','diametro':'diameter_in','diam':'diameter_in','diam_in':'diameter_in',
  'sched':'schedule','spool':'spool_id_ref',
  'codigo':'code','cod':'code',
  'descricao':'description','desc':'description',
  'categoria':'category','tipo_material':'material_type',
  'unidade':'unit','un':'unit',
  'qtd':'quantity','qty':'quantity','quantidade':'quantity',
  'classe_pressao':'pressure_class','rating':'pressure_class',
  'tag_cabo':'cable_tag','cabo_tag':'cable_tag',
  'origem':'origin','de':'origin',
  'destino':'destination','para':'destination',
  'funcao':'function_type',
  'tensao_v':'voltage_v','tensao':'voltage_v','voltagem':'voltage_v',
  'corrente_a':'current_a','corrente':'current_a',
  'tipo_cabo':'cable_type',
  'secao_mm2':'cross_section_mm2','secao':'cross_section_mm2','bitola':'cross_section_mm2',
  'isolacao':'insulation','isolante':'insulation',
  'comprimento_m':'length_m','comprimento':'length_m','metragem':'length_m',
  'instalado':'installed','lancado':'installed',
  'servico':'service_type','tipo_servico':'service_type',
  'disciplina':'discipline',
  'diametro_mm':'diameter_mm','diam_mm':'diameter_mm',
  'quantidade_suportes':'supports_qty','qtd_suportes':'supports_qty',
  'tipo_suporte':'support_type',
  'localizacao':'location','local':'location',
  'iso_referencia':'iso_ref',
  'peso_kg':'weight_kg','peso':'weight_kg',
  'codigo_concretagem':'pour_code',
  'data_concretagem':'pour_date',
  'nome_elemento':'element_name','elemento':'element_name',
  'volume':'volume_m3','volume_concreto':'volume_m3',
  'fck':'fck_mpa','slump':'slump_mm',
  'tipo_painel':'panel_type','tag_painel':'panel_tag',
  'classe_protecao':'protection_class','ip':'protection_class',
  'codigo_inspecao':'inspection_code','data_inspecao':'inspection_date',
  'elemento_pintado':'element_painted','esquema':'scheme',
  'dft_total':'dft_total_um','area_pintura':'area_m2','demaos':'qtd_demaos',
  'inspetor':'inspector','resultado':'result',
  'titulo':'title','formato':'format','escala':'scale',
  'autor':'author','projetista':'author','revisor':'reviewer','aprovador':'approver',
  'data_emissao':'issue_date','prazo':'due_date','data_prazo':'due_date'
};
function engNormKey(k){
  return String(k||'').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[\s\-]+/g,'_').replace(/[^a-z0-9_]/g,'')
    .replace(/_+/g,'_').replace(/^_|_$/g,'');
}
function engAliasKey(k){ const nk = engNormKey(k); return ENG_ALIASES[nk] || nk; }

// Normalizadores de valor (mesmas regras do discipline-ai-modal)
function _engStrip(v){ return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function _engClamp(v, mn, mx){ const n = parseFloat(v); if(isNaN(n)) return null; return Math.max(mn, Math.min(mx, n)); }
const ENG_VALUE_NORMALIZERS = {
  nr13: (v)=>{ const s=_engStrip(v); if(!s)return null; if(/^(s|sim|yes|y|true|1)$/.test(s))return 'Sim'; if(/^(n|nao|no|false|0)$/.test(s))return 'Não'; return null; },
  hydro_test: (v)=>{ const s=_engStrip(v); if(!s)return null; if(/^(pendente|aguard)/.test(s))return 'Pendente'; if(/^(s|sim|yes|ok|aprovado)/.test(s))return 'Sim'; if(/^(n|nao|no|reprovado)/.test(s))return 'Não'; return null; },
  torque: (v)=>{ const s=_engStrip(v); if(!s)return null; if(/^(pendente|aguard)/.test(s))return 'Pendente'; if(/^(s|sim|yes|aplicado|ok)/.test(s))return 'Sim'; if(/^(n|nao|no)/.test(s))return 'Não'; return null; },
  paint_status: (v)=>{ const s=_engStrip(v); if(!s)return null; if(/n[ao]o.*pintado|primer|sem.pintura/.test(s))return 'Não Pintado'; if(/pintado/.test(s))return 'Pintado'; return null; },
  iso_category: (v)=>{ const s=_engStrip(v); if(!s)return null; if(/refer/.test(s))return 'referencia'; if(/desmonta|cancela/.test(s))return 'desmontagem_cancelamento'; if(/monta/.test(s))return 'montagem'; return null; },
  fab_pre:(v)=>_engClamp(v,0,100), fab_sol:(v)=>_engClamp(v,0,100), fab_end:(v)=>_engClamp(v,0,100),
  fab_progress_pct:(v)=>_engClamp(v,0,100),
  mon_pre:(v)=>_engClamp(v,0,100), mon_sol:(v)=>_engClamp(v,0,100), mon_end:(v)=>_engClamp(v,0,100),
  mon_progress_pct:(v)=>_engClamp(v,0,100),
  progress_pct:(v)=>_engClamp(v,0,100), avanco_pct:(v)=>_engClamp(v,0,100),
  installed:(v)=>{ const s=_engStrip(v); if(/^(s|sim|yes|true|1|lancado|instalado)$/.test(s))return true; if(/^(n|nao|no|false|0)$/.test(s))return false; return null; },
  nr10_compliant:(v)=>{ const s=_engStrip(v); if(/^(s|sim|yes|true|1|conforme)$/.test(s))return true; if(/^(n|nao|no|false|0)$/.test(s))return false; return null; },
  continuity_ok:(v)=>{ const s=_engStrip(v); if(/^(s|sim|yes|true|1|ok)$/.test(s))return true; if(/^(n|nao|no|false|0)$/.test(s))return false; return null; }
};

async function saveAllCategories(){
  const data = _multiAI;
  if(!data) return;
  const sb = getSb();
  if(!sb){ toast('Supabase indisponível','err'); return; }

  const orgId = getOrgId();
  let projectId = getProjectId();

  // Se não tem projeto selecionado, pede pra escolher antes de cadastrar
  if(!projectId){
    let projects = (w.projects && Array.isArray(w.projects)) ? w.projects : null;
    if(!projects){
      try { const r = await sb.from('projects').select('id, name, client').eq('org_id', orgId).is('deleted_at', null).order('created_at',{ascending:false}).limit(100); projects = r.data || []; } catch(_){ projects = []; }
    }
    if(!projects.length){ toast('Crie um projeto antes de cadastrar via IA','err'); return; }
    // Modal rápido de seleção
    const chosen = await new Promise((resolve)=>{
      const sel = d.createElement('div');
      sel.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:9800;display:flex;align-items:center;justify-content:center;padding:18px';
      sel.innerHTML = `<div style="background:#fff;border-radius:12px;width:100%;max-width:480px;padding:20px;box-shadow:0 24px 60px rgba(15,23,42,.25);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <div style="font-size:15px;font-weight:800;color:#0F172A;margin-bottom:6px">📁 Selecione o projeto</div>
        <div style="font-size:12px;color:#64748B;margin-bottom:14px">Onde os ${data.total_items} itens da IA serão cadastrados</div>
        <select id="multi-proj-pick" style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:7px;font-size:13px;background:#fff;margin-bottom:14px">
          <option value="">— escolha um projeto —</option>
          ${projects.map(p => '<option value="'+p.id+'">'+esc(p.name)+(p.client?' · '+esc(p.client):'')+'</option>').join('')}
        </select>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="multi-proj-cancel" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:8px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px">Cancelar</button>
          <button id="multi-proj-ok" style="background:#10B981;color:#fff;border:none;padding:8px 22px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12.5px">Continuar</button>
        </div>
      </div>`;
      d.body.appendChild(sel);
      sel.querySelector('#multi-proj-cancel').onclick = ()=>{ sel.remove(); resolve(null); };
      sel.querySelector('#multi-proj-ok').onclick = ()=>{
        const v = sel.querySelector('#multi-proj-pick').value;
        sel.remove(); resolve(v||null);
      };
    });
    if(!chosen){ toast('Cadastro cancelado','warn'); return; }
    projectId = chosen;
    const p = (w.projects||[]).find(x => String(x.id) === String(chosen)) || (await sb.from('projects').select('id,name,client').eq('id',chosen).single()).data;
    if(p){ w._curProject = { id: p.id, name: p.name, client: p.client }; w.curProj = p.id; try { localStorage.setItem('pia.curProj', p.id); } catch(_){} }
  }

  const btn = d.getElementById('tdraw-multi-save-all');
  btn.disabled = true; btn.style.opacity = '.6'; btn.style.cursor = 'wait';
  btn.innerHTML = '⏳ Cadastrando...';

  const summary = []; // { cat, table, ok, fail }

  for(const catKey in data.categories){
    const cat = data.categories[catKey];
    // Pega itens marcados
    const checks = d.querySelectorAll(`.multi-row-chk[data-cat="${catKey}"]:checked`);
    const indices = Array.from(checks).map(c => +c.dataset.i);
    if(indices.length === 0){ summary.push({ cat: cat.label, table: cat.table, ok: 0, fail: 0, skip: true }); continue; }

    // Descobre schema da tabela — usa RPC (funciona com tabela vazia), fallback no SELECT
    let validCols = null;
    try {
      const rpc = await sb.rpc('get_table_columns', { p_table: cat.table });
      if(!rpc.error && rpc.data && rpc.data.found && Array.isArray(rpc.data.columns) && rpc.data.columns.length){
        validCols = new Set(rpc.data.columns);
      } else {
        // Fallback: SELECT (só funciona com tabela populada)
        const r = await sb.from(cat.table).select('*').limit(1);
        if(!r.error && r.data && r.data.length){
          validCols = new Set(Object.keys(r.data[0]));
        }
      }
    } catch(_){}

    let ok = 0, fail = 0;
    for(const i of indices){
      const item = cat.items[i];
      const raw = { org_id: orgId };
      if(projectId) raw.project_id = projectId;
      for(const k in item){
        if(item[k] === null || item[k] === undefined || item[k] === '') continue;
        if(k === 'id' || k.startsWith('_')) continue;
        // Normaliza + aplica alias PT→EN
        const nk = engAliasKey(k);
        raw[nk] = item[k];
      }
      // Filtra por schema
      let payload = raw;
      if(validCols){
        const filtered = {};
        const dropped = {};
        for(const k in raw){
          if(validCols.has(k)) filtered[k] = raw[k];
          else dropped[k] = raw[k];
        }
        // Preserva extras em meta/notes
        if(Object.keys(dropped).length){
          if(validCols.has('meta')) filtered.meta = Object.assign(filtered.meta || {}, { ai_extracted_extra: dropped });
          else if(validCols.has('notes')) filtered.notes = (filtered.notes || '') + '\n[Campos extras IA: ' + JSON.stringify(dropped) + ']';
        }
        payload = filtered;
      }
      // Normaliza valores que têm check constraints (nr13, hydro_test, etc.)
      for(const col in payload){
        if(ENG_VALUE_NORMALIZERS[col]){
          const norm = ENG_VALUE_NORMALIZERS[col](payload[col]);
          if(norm === null || norm === undefined) delete payload[col];
          else payload[col] = norm;
        }
      }
      // Insert com retry pra colunas E check constraints
      let res = await sb.from(cat.table).insert(payload);
      let retries = 0;
      while(res.error && retries < 8){
        const msg = res.error.message || '';
        let badCol = null;
        // 1) Coluna inexistente
        let m = msg.match(/(?:column|find)\s*['"]?([a-zA-Z0-9_]+)['"]?/i);
        if(m && m[1] && payload[m[1]] !== undefined && /column.*does not exist|schema cache|find.*column/i.test(msg)){
          badCol = m[1];
        }
        // 2) Check constraint
        if(!badCol){
          m = msg.match(/violates check constraint\s+["']?(\w+)["']?/i);
          if(m && m[1]){
            const cm = m[1].match(/_([a-z][a-z0-9_]*?)_check$/i);
            if(cm && cm[1] && payload[cm[1]] !== undefined) badCol = cm[1];
          }
        }
        // 3) NOT NULL = fatal
        if(/violates not-null/i.test(msg)) break;
        if(badCol){
          delete payload[badCol];
          retries++;
          res = await sb.from(cat.table).insert(payload);
        } else break;
      }
      if(res.error){ fail++; console.warn('[multi-AI insert]', cat.table, res.error, payload); }
      else ok++;
    }
    summary.push({ cat: cat.label, table: cat.table, ok, fail });
  }

  // Renderiza relatório final
  const totalOk = summary.reduce((s,x) => s + (x.ok||0), 0);
  const totalFail = summary.reduce((s,x) => s + (x.fail||0), 0);
  const body = d.getElementById('tdraw-multi-body');
  if(body){
    body.innerHTML = `
      <div style="text-align:center;padding:24px 0">
        <div style="font-size:48px">${totalFail===0 ? '✅' : (totalOk>0 ? '⚠️' : '❌')}</div>
        <div style="font-size:18px;font-weight:800;color:${totalFail===0?'#10B981':totalOk>0?'#F59E0B':'#DC2626'};margin-top:8px">${totalOk} cadastrados${totalFail>0?' · '+totalFail+' falhas':''}</div>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;max-width:680px;margin:0 auto">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead style="background:#F8FAFC"><tr>
            <th style="padding:8px 12px;text-align:left;font-size:10.5px;color:#475569;text-transform:uppercase">Categoria</th>
            <th style="padding:8px 12px;text-align:left;font-size:10.5px;color:#475569;text-transform:uppercase">Tabela</th>
            <th style="padding:8px;text-align:center;font-size:10.5px;color:#10B981;text-transform:uppercase">OK</th>
            <th style="padding:8px;text-align:center;font-size:10.5px;color:#DC2626;text-transform:uppercase">Falhas</th>
          </tr></thead>
          <tbody>
            ${summary.map(s => `<tr style="border-bottom:1px solid #F1F5F9">
              <td style="padding:8px 12px;font-weight:600;color:#0F172A">${esc(s.cat)}</td>
              <td style="padding:8px 12px;color:#64748B;font-family:ui-monospace,monospace;font-size:11px">${esc(s.table)}</td>
              <td style="padding:8px;text-align:center;color:#10B981;font-weight:700">${s.ok||0}</td>
              <td style="padding:8px;text-align:center;color:${s.fail>0?'#DC2626':'#94A3B8'};font-weight:700">${s.fail||0}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  btn.style.display = 'none';
  // Refresh do tdraw
  await load(); render();
  toast(totalOk + ' itens cadastrados em ' + summary.filter(s => (s.ok||0) > 0).length + ' tabelas', totalFail===0?'ok':'warn');
}

function renderAIPreview(imgs){
  const wrap = d.getElementById('tdraw-ai-preview');
  if(!wrap) return;
  if(imgs.length === 0){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = imgs.map((im, i) => `
    <div style="position:relative;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#F8FAFC">
      ${im.isPdf
        ? `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7C3AED"><div style="font-size:32px">📄</div><div style="font-size:10px;font-weight:600;margin-top:4px;padding:0 8px;text-align:center;line-height:1.2;word-break:break-word">${esc(im.name)}</div></div>`
        : `<img src="${im.dataUrl}" style="width:100%;height:100%;object-fit:cover">`}
      <button data-i="${i}" class="tdraw-ai-rm" style="position:absolute;top:4px;right:4px;background:rgba(15,23,42,.85);color:#fff;border:none;width:22px;height:22px;border-radius:5px;cursor:pointer;font-size:13px">×</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.tdraw-ai-rm').forEach(b => b.onclick = ()=>{
    const i = +b.dataset.i;
    imgs.splice(i, 1);
    renderAIPreview(imgs);
    const btn = d.getElementById('tdraw-ai-go');
    if(btn){ btn.disabled = imgs.length===0; btn.style.opacity = imgs.length===0?'.6':'1'; btn.style.cursor = imgs.length===0?'not-allowed':'pointer'; btn.style.background = imgs.length===0?'#A78BFA':'#7C3AED'; }
  });
}

function renderAIExtracted(ex, imgs){
  const result = d.getElementById('tdraw-ai-result');
  const e = ex || {};
  const conf = (e.confidence != null) ? Math.round(e.confidence * 100) : null;
  const confCor = conf == null ? '#94A3B8' : (conf >= 70 ? '#10B981' : conf >= 50 ? '#F59E0B' : '#DC2626');
  result.innerHTML = `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
      <div style="font-size:22px">✅</div>
      <div style="flex:1">
        <div style="font-weight:800;color:#166534;font-size:13px">Análise concluída</div>
        <div style="font-size:11.5px;color:#15803D">Revise os dados e clique em <strong>"Cadastrar"</strong>. ${conf!=null?'Confiança da IA: <strong style="color:'+confCor+'">'+conf+'%</strong>':''}</div>
      </div>
    </div>
    ${e.notas_extrator ? `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:9px 12px;font-size:11.5px;color:#78350F;margin-bottom:12px"><strong>📝 Notas da IA:</strong> ${esc(e.notas_extrator)}</div>` : ''}
    <div style="margin-bottom:8px;font-size:11.5px;color:#475569"><strong>Dados extraídos:</strong></div>
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:12px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11.5px;color:#0F172A;max-height:280px;overflow:auto;white-space:pre-wrap;line-height:1.5">${esc(JSON.stringify(e, null, 2))}</div>
    <button id="tdraw-ai-save" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:800;font-size:13.5px;font-family:inherit">✓ Cadastrar Desenho</button>
  `;
  d.getElementById('tdraw-ai-save').onclick = async ()=>{
    const payload = {
      org_id: getOrgId(), project_id: getProjectId(),
      disciplina: _curDisciplina,
      code: e.code || ('AI-' + Date.now().toString(36).toUpperCase().slice(-5)),
      revision: e.revision || '0',
      title: e.title || null,
      tipo: e.tipo || null,
      format: e.format || null,
      scale: e.scale || null,
      author: e.author || null,
      reviewer: e.reviewer || null,
      issue_date: e.issue_date || null,
      status: 'em_revisao',
      discipline_data: e.discipline_data || {},
      meta: { source: 'ai_analyze_tdraw', confidence: e.confidence, notas_ia: e.notas_extrator },
      created_by: getUserId()
    };
    const sb = getSb();
    const r = await sb.from('technical_drawings').insert(payload).select().single();
    if(r.error){ alert('Erro: ' + r.error.message); return; }
    toast('Desenho cadastrado via IA','ok');
    d.getElementById('tdraw-ai-ov').remove();
    await load(); render();
  };
}

/* ============================================================
   IMPORT EXCEL/CSV
   ============================================================ */
function openImportExcel(){
  let ov = d.getElementById('tdraw-imp-ov');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'tdraw-imp-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  const schema = SCHEMAS[_curDisciplina];
  const cols = ['code','revision','title','tipo','format','scale','author','reviewer','status','issue_date','due_date', ...schema.fields.map(f=>f.k)];
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:680px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:14px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:8px;background:#10B981;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">⬆</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;color:#0F172A">Importar Excel/CSV — ${esc(schema.label)}</div>
          <div style="font-size:11px;color:#64748B">As colunas serão mapeadas pelo nome (cabeçalho)</div>
        </div>
        <button id="tdraw-imp-close" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer">×</button>
      </div>
      <div style="padding:18px 22px;overflow:auto;flex:1">
        <div style="font-size:12px;color:#475569;margin-bottom:10px"><strong>Colunas reconhecidas:</strong></div>
        <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:10px;font-family:ui-monospace,monospace;font-size:11px;color:#475569;line-height:1.6">${esc(cols.join(', '))}</div>
        <div style="margin-top:14px;background:#F5F3FF;border:1px dashed #C4B5FD;border-radius:10px;padding:24px;text-align:center">
          <input type="file" id="tdraw-imp-file" accept=".xlsx,.xls,.csv" style="display:none">
          <button id="tdraw-imp-pick" style="background:#10B981;color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;font-family:inherit">Selecionar planilha</button>
          <div id="tdraw-imp-status" style="margin-top:10px;font-size:11.5px;color:#64748B"></div>
        </div>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('tdraw-imp-close').onclick = ()=> ov.remove();
  const file = d.getElementById('tdraw-imp-file');
  d.getElementById('tdraw-imp-pick').onclick = ()=> file.click();
  file.onchange = async ()=>{
    const f = file.files[0]; if(!f) return;
    const stEl = d.getElementById('tdraw-imp-status');
    stEl.innerHTML = '⏳ Lendo arquivo...';
    try {
      const rows = await readSpreadsheet(f);
      stEl.innerHTML = `📊 ${rows.length} linhas detectadas. Importando...`;
      const sb = getSb();
      const pid = getProjectId();
      const org = getOrgId();
      const uid = getUserId();
      const validKeys = ['code','revision','title','tipo','format','scale','author','reviewer','approver','status','issue_date','due_date','notes','frente'];
      const dispKeys = schema.fields.map(ff => ff.k);
      let ok = 0, fail = 0;
      for(const r of rows){
        const payload = { org_id:org, project_id:pid, disciplina:_curDisciplina, created_by:uid, discipline_data:{} };
        for(const k of validKeys){ if(r[k] != null && r[k] !== '') payload[k] = r[k]; }
        for(const k of dispKeys){ if(r[k] != null && r[k] !== '') payload.discipline_data[k] = r[k]; }
        if(!payload.code){ fail++; continue; }
        const res = await sb.from('technical_drawings').insert(payload);
        if(res.error){ fail++; console.warn('import', res.error); } else ok++;
      }
      stEl.innerHTML = `✅ ${ok} cadastrado(s). ${fail>0?'⚠ '+fail+' falhas (verifique se cada linha tem código).':''}`;
      await load(); render();
      setTimeout(()=> d.getElementById('tdraw-imp-ov')?.remove(), 2000);
    } catch(e){
      stEl.innerHTML = '⚠ Erro: ' + esc(e.message||e);
    }
  };
}

async function readSpreadsheet(file){
  // Usa SheetJS se disponível (carregado pelo Excel helper)
  if(!w.XLSX){
    throw new Error('Lib XLSX não carregada. Recarregue a página.');
  }
  const buf = await file.arrayBuffer();
  const wb = w.XLSX.read(buf, { type:'array' });
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = w.XLSX.utils.sheet_to_json(sh, { defval: null });
  // Normaliza chaves (minúsculas, sem acento)
  return rows.map(r => {
    const out = {};
    Object.keys(r).forEach(k => {
      const nk = String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
      out[nk] = r[k];
    });
    return out;
  });
}

function kpiCard(label, val, color){
  return `<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px">
    <div style="font-size:10.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${esc(label)}</div>
    <div style="font-size:24px;font-weight:800;color:${color};line-height:1.1;margin-top:4px">${val}</div>
  </div>`;
}

function headerCell(label, align){
  return `<th style="padding:10px 12px;text-align:${align||'left'};color:#475569;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap">${esc(label)}</th>`;
}

function renderRow(r, schema){
  const st = COMMON_STATUS.find(s => s.v === r.status) || COMMON_STATUS[0];
  const dd = r.discipline_data || {};
  const overdue = r.due_date && r.status !== 'afc' && r.status !== 'cancelado' && new Date(r.due_date) < new Date();
  return `<tr style="border-bottom:1px solid #F1F5F9">
    <td style="padding:9px 12px;font-weight:700;color:#0F172A;font-family:ui-monospace,SFMono-Regular,monospace">${esc(r.code||'')}</td>
    <td style="padding:9px 12px;color:#64748B;font-family:ui-monospace,monospace">${esc(r.revision||'0')}</td>
    <td style="padding:9px 12px;color:#0F172A;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.title||'')}">${esc(r.title||'')}</td>
    <td style="padding:9px 12px;color:#64748B">${esc(r.tipo||'')}</td>
    <td style="padding:9px 12px"><span style="display:inline-block;padding:3px 8px;border-radius:99px;background:${st.c}20;color:${st.c};font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">${esc(st.l)}</span></td>
    <td style="padding:9px 12px;color:#64748B">${esc(r.author||'')}</td>
    <td style="padding:9px 12px;color:#64748B">${esc(r.format||'')}</td>
    <td style="padding:9px 12px;color:#64748B">${esc(r.scale||'')}</td>
    ${schema.fields.map(f => `<td style="padding:9px 12px;color:#64748B">${esc(dd[f.k]??'')}</td>`).join('')}
    <td style="padding:9px 12px;color:#64748B;font-family:ui-monospace,monospace">${esc(r.issue_date||'')}</td>
    <td style="padding:9px 12px;font-family:ui-monospace,monospace;${overdue?'color:#DC2626;font-weight:700':'color:#64748B'}">${esc(r.due_date||'')}</td>
    <td style="padding:9px 12px;text-align:center">${r.pdf_path?'<span title="PDF anexado" style="color:#10B981">●</span>':'<span style="color:#CBD5E1">—</span>'}</td>
    <td style="padding:9px 12px;text-align:center;white-space:nowrap">
      <button class="tdraw-edit" data-id="${esc(r.id)}" style="background:transparent;border:1px solid #E5E7EB;color:#475569;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px">Editar</button>
      <button class="tdraw-del" data-id="${esc(r.id)}" style="background:transparent;border:1px solid #FECACA;color:#DC2626;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">×</button>
    </td>
  </tr>`;
}

/* ============================================================
   EDITOR
   ============================================================ */
function openEditor(id){
  const schema = SCHEMAS[_curDisciplina];
  const r = id ? _rows.find(x => x.id === id) : null;
  const isNew = !r;
  const cur = r || {
    code:'', revision:'0', title:'', disciplina:_curDisciplina,
    tipo:'', frente:'', status:'em_elaboracao',
    issue_date: new Date().toISOString().slice(0,10),
    due_date:'', author:'', reviewer:'', format:'A1', scale:'1:50',
    notes:'', discipline_data:{}
  };

  let ov = d.getElementById('tdraw-edit');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'tdraw-edit';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };

  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:14px 22px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;background:#FAFBFC">
        <div style="width:36px;height:36px;border-radius:8px;background:#2563EB;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px">📐</div>
        <div style="flex:1">
          <div style="font-size:14.5px;font-weight:800;color:#0F172A">${isNew?'Novo Desenho Técnico':'Editar Desenho Técnico'}</div>
          <div style="font-size:11.5px;color:#64748B">${esc(schema.label)} · ${esc(getProjectName()||'(sem projeto)')}</div>
        </div>
        <button id="tdraw-edit-close" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
      </div>
      <div style="flex:1;overflow:auto;padding:18px 22px">
        ${section('Identificação', `
          <div style="display:grid;grid-template-columns:140px 80px 1fr;gap:10px">
            ${input('code','Código *', cur.code, 'text', 'ex: CV-PL-001')}
            ${selectField('revision','Revisão', cur.revision, REVISIONS)}
            ${input('title','Título', cur.title, 'text', 'ex: Planta baixa do galpão A')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
            ${selectField('tipo','Tipo de desenho', cur.tipo||'', ['', ...schema.tipos])}
            ${input('frente','Frente / Área', cur.frente||'', 'text', 'ex: Bloco A, ISBL-1')}
          </div>
        `)}
        ${section('Especificações', `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${selectField('format','Formato', cur.format||'', ['', ...FORMATS])}
            ${input('scale','Escala', cur.scale||'', 'text', 'ex: 1:50')}
          </div>
        `)}
        ${schema.fields.length > 0 ? section(schema.label + ' — campos específicos', `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
            ${schema.fields.map(f => {
              const v = (cur.discipline_data || {})[f.k] || '';
              return renderDynField(f, v);
            }).join('')}
          </div>
        `) : ''}
        ${section('Pessoas', `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            ${input('author','Projetista', cur.author||'', 'text', '')}
            ${input('reviewer','Revisor', cur.reviewer||'', 'text', '')}
            ${input('approver','Aprovador', cur.approver||'', 'text', '')}
          </div>
        `)}
        ${section('Status & datas', `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            ${selectField('status','Status', cur.status, COMMON_STATUS.map(s=>s.v), COMMON_STATUS.map(s=>s.l))}
            ${input('issue_date','Data de emissão', cur.issue_date||'', 'date', '')}
            ${input('due_date','Prazo', cur.due_date||'', 'date', '')}
          </div>
        `)}
        ${section('Observações', `<textarea id="td-notes" rows="2" style="width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;font-family:inherit;resize:vertical">${esc(cur.notes||'')}</textarea>`)}
      </div>
      <div style="padding:14px 22px;border-top:1px solid #F1F5F9;display:flex;gap:10px;background:#FAFBFC">
        ${!isNew ? '<button id="tdraw-edit-del" style="background:#fff;color:#DC2626;border:1px solid #FECACA;padding:9px 16px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px">Excluir</button>' : ''}
        <div style="flex:1"></div>
        <button id="tdraw-edit-cancel" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px">Cancelar</button>
        <button id="tdraw-edit-save" style="background:#2563EB;color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12.5px">${isNew?'Criar':'Salvar'}</button>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('tdraw-edit-close').onclick = ()=> ov.remove();
  d.getElementById('tdraw-edit-cancel').onclick = ()=> ov.remove();
  d.getElementById('tdraw-edit-save').onclick = async ()=>{
    const payload = {
      org_id: getOrgId(), project_id: getProjectId(),
      disciplina: _curDisciplina,
      code: val('code'),
      revision: val('revision') || '0',
      title: val('title') || null,
      tipo: val('tipo') || null,
      frente: val('frente') || null,
      format: val('format') || null,
      scale: val('scale') || null,
      author: val('author') || null,
      reviewer: val('reviewer') || null,
      approver: val('approver') || null,
      status: val('status') || 'em_elaboracao',
      issue_date: val('issue_date') || null,
      due_date: val('due_date') || null,
      notes: d.getElementById('td-notes').value || null,
      discipline_data: {}
    };
    schema.fields.forEach(f => {
      const v = val('df_'+f.k);
      payload.discipline_data[f.k] = (f.t === 'number' && v !== '') ? parseFloat(v) : v;
    });
    if(!payload.code){ toast('Código é obrigatório','err'); return; }

    const sb = getSb();
    if(!sb){ toast('Supabase indisponível','err'); return; }
    if(isNew){
      payload.created_by = getUserId();
      const r2 = await sb.from('technical_drawings').insert(payload).select().single();
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); console.error(r2.error); return; }
      toast('Desenho criado','ok');
    } else {
      const r2 = await sb.from('technical_drawings').update(payload).eq('id', cur.id).select().single();
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); console.error(r2.error); return; }
      toast('Desenho salvo','ok');
    }
    ov.remove();
    await load();
    render();
  };
  if(!isNew){
    d.getElementById('tdraw-edit-del').onclick = async ()=>{
      if(!confirm('Excluir este desenho?')) return;
      const sb = getSb();
      const r2 = await sb.from('technical_drawings').update({ deleted_at: new Date().toISOString() }).eq('id', cur.id);
      if(r2.error){ toast('Erro: '+r2.error.message,'err'); return; }
      toast('Excluído','ok');
      ov.remove();
      await load();
      render();
    };
  }
  setTimeout(()=>{ const i = d.getElementById('td-code'); if(i) i.focus(); }, 50);
}

function val(name){ const el = d.getElementById('td-'+name); return el ? (el.value||'').trim() : ''; }

function section(title, body){
  return `<div style="margin-bottom:14px">
    <div style="font-size:10.5px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:7px">${esc(title)}</div>
    ${body}
  </div>`;
}
function input(name, label, value, type, placeholder){
  return `<div>
    <label style="display:block;font-size:10.5px;color:#64748B;font-weight:600;margin-bottom:3px">${esc(label)}</label>
    <input id="td-${name}" type="${type||'text'}" value="${esc(value||'')}" placeholder="${esc(placeholder||'')}" style="width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;background:#fff;font-family:inherit;box-sizing:border-box">
  </div>`;
}
function selectField(name, label, value, options, labels){
  const opts = options.map((opt,i) => {
    const lbl = labels ? labels[i] : opt;
    return `<option value="${esc(opt)}" ${value===opt?'selected':''}>${esc(lbl||opt||'—')}</option>`;
  }).join('');
  return `<div>
    <label style="display:block;font-size:10.5px;color:#64748B;font-weight:600;margin-bottom:3px">${esc(label)}</label>
    <select id="td-${name}" style="width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;background:#fff;font-family:inherit;box-sizing:border-box">${opts}</select>
  </div>`;
}
function renderDynField(f, v){
  if(f.t === 'select'){
    const opts = ['', ...(f.options||[])].map(o => `<option value="${esc(o)}" ${v===o?'selected':''}>${esc(o||'—')}</option>`).join('');
    return `<div>
      <label style="display:block;font-size:10.5px;color:#64748B;font-weight:600;margin-bottom:3px">${esc(f.l)}</label>
      <select id="td-df_${f.k}" style="width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;background:#fff;font-family:inherit;box-sizing:border-box">${opts}</select>
    </div>`;
  }
  return `<div>
    <label style="display:block;font-size:10.5px;color:#64748B;font-weight:600;margin-bottom:3px">${esc(f.l)}</label>
    <input id="td-df_${f.k}" type="${f.t||'text'}" ${f.step?'step="'+f.step+'"':''} value="${esc(v||'')}" placeholder="${esc(f.placeholder||'')}" style="width:100%;padding:8px 10px;border:1px solid #E5E7EB;border-radius:7px;font-size:12.5px;background:#fff;font-family:inherit;box-sizing:border-box">
  </div>`;
}

/* ============================================================
   AÇÕES
   ============================================================ */
async function remove(id){
  if(!confirm('Excluir este desenho?')) return;
  const sb = getSb();
  const r = await sb.from('technical_drawings').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if(r.error){ toast('Erro: '+r.error.message,'err'); return; }
  toast('Excluído','ok');
  await load(); render();
}

function exportExcel(){
  if(!w.PIAExcel || !w.PIAExcel.exportData){ toast('Exportador Excel indisponível','warn'); return; }
  const schema = SCHEMAS[_curDisciplina];
  const cols = [
    {h:'Código', k:'code'}, {h:'Rev', k:'revision'}, {h:'Título', k:'title'},
    {h:'Tipo', k:'tipo'}, {h:'Status', k:'status'}, {h:'Autor', k:'author'},
    {h:'Revisor', k:'reviewer'}, {h:'Formato', k:'format'}, {h:'Escala', k:'scale'},
    ...schema.fields.map(f => ({ h:f.l, k:'discipline_data.'+f.k })),
    {h:'Emissão', k:'issue_date'}, {h:'Prazo', k:'due_date'}, {h:'Observações', k:'notes'}
  ];
  const data = _rows.map(r => {
    const row = { ...r };
    if(r.discipline_data) Object.keys(r.discipline_data).forEach(k => row['discipline_data.'+k] = r.discipline_data[k]);
    return row;
  });
  w.PIAExcel.exportData({
    filename: 'desenho_tecnico_' + _curDisciplina + '_' + (new Date().toISOString().slice(0,10)) + '.xlsx',
    sheetName: schema.label,
    columns: cols,
    rows: data,
    title: 'Desenho Técnico — ' + schema.label + ' · ' + getProjectName()
  });
}

w.PIATDraw = {
  open: openTDraw,
  setDisciplina,
  load, render,
  SCHEMAS, COMMON_STATUS
};

/* ============================================================
   Hook no goV pra esconder #vtdraw quando outra view é ativada
   (evita sobreposição quando o usuário sai do Hub e troca de aba)
   ============================================================ */
function hookGoVForTdraw(){
  if(typeof w.goV !== 'function' || w.goV._tdrawHooked) return false;
  const orig = w.goV;
  w.goV = function(){
    try {
      const el = d.getElementById('vtdraw');
      if(el) el.style.display = 'none';
    } catch(_){}
    return orig.apply(this, arguments);
  };
  w.goV._tdrawHooked = true;
  return true;
}
if(!hookGoVForTdraw()){
  if(d.readyState === 'loading'){
    d.addEventListener('DOMContentLoaded', ()=>{ setTimeout(hookGoVForTdraw, 500); setTimeout(hookGoVForTdraw, 2000); });
  } else {
    setTimeout(hookGoVForTdraw, 500); setTimeout(hookGoVForTdraw, 2000);
  }
}

})();
