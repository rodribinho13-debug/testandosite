/*! PROJECT.IA — sidebar-groups v1.1
 *  Reorganiza visualmente em 7 grupos colapsáveis + filtro por disciplina.
 *  NÃO mexe em onclicks/IDs originais. Só adiciona o seletor no topo + esconde itens fora do escopo.
 */
(function(w,d){'use strict';
try {

// ============================================================
// DISCIPLINAS DISPONÍVEIS
// ============================================================
const DISCIPLINES = [
  { v:'all',           l:'Todas (multidisciplinar)', c:'#475569', ic:'☰' },
  { v:'tubulacao',     l:'Tubulação',     c:'#DC2626', ic:'🔧' },
  { v:'civil',         l:'Civil',         c:'#0EA5E9', ic:'🏗️' },
  { v:'eletrica',      l:'Elétrica',      c:'#EAB308', ic:'⚡' },
  { v:'instrumentacao',l:'Instrumentação',c:'#A855F7', ic:'📡' },
  { v:'hidraulica',    l:'Hidráulica',    c:'#06B6D4', ic:'💧' },
  { v:'pintura',       l:'Pintura',       c:'#EC4899', ic:'🎨' },
  { v:'caldeiraria',   l:'Caldeiraria',   c:'#84CC16', ic:'🔥' },
  { v:'seguranca',     l:'Segurança',     c:'#10B981', ic:'🦺' }
];

// ============================================================
// MAPEAMENTO: item-id -> disciplinas em que aparece
// '*' = universal (aparece pra todos)
// ============================================================
const APPLIES = {
  // Geral - universal
  'tab-disc':['*'], 'tab-dash':['*'],

  // Engenharia
  // tab-planner e tab-planner-hub foram removidos da UI (HUB Planejador unificado os substitui)
  'tab-elec-base':['eletrica','instrumentacao'],
  'tab-hyd':['hidraulica'],
  'tab-equip':['tubulacao'],
  'tab-maint':['tubulacao','eletrica','instrumentacao','hidraulica','caldeiraria'],
  'tab-paint':['pintura','caldeiraria'],
  'tab-scaf':['pintura','caldeiraria','seguranca'],

  // Qualidade
  'tab-quality-joints':['tubulacao','caldeiraria'],
  'tab-quality-reports':['tubulacao','caldeiraria'],
  'tab-sold':['tubulacao','caldeiraria'],
  'tab-cal':['tubulacao','eletrica','instrumentacao','pintura'],
  'tab-pend':['*'],
  'tab-com':['tubulacao','eletrica','instrumentacao','hidraulica'],

  // Obra/Suprimentos/Documentos/Sistema - universal
  'tab-proj':['*'], 'tab-gantt':['*'], 'tab-prod':['*'], 'tab-rdo':['*'],
  'tab-budget':['*'], 'tab-mat':['*'], 'tab-suppliers':['*'], 'tab-compositions':['*'],
  'tab-pcp':['*'], 'tab-quotations':['*'], 'tab-rdo-diario':['*'],
  'tab-hub-unified':['*'],
  'tab-int':['*'], 'tab-team':['*'], 'tab-plan':['*']
};

const GROUPS = [
  { id:'geral', label:'Geral', icon:'layout-dashboard', color:'#1E40AF', bg:'rgba(30,64,175,.06)',
    items:['tab-proj','tab-dash'] },
  { id:'engenharia', label:'Engenharia', icon:'settings-2', color:'#0EA5E9', bg:'rgba(14,165,233,.06)',
    items:['tab-elec-base','tab-hyd','tab-equip','tab-maint','tab-paint','tab-scaf'] },
  { id:'planejamento', label:'Planejamento', icon:'calendar-check-2', color:'#3B82F6', bg:'rgba(59,130,246,.06)',
    items:['tab-pcp','tab-hub-unified','tab-rdo-diario'] },
  { id:'qualidade', label:'Qualidade', icon:'shield-check', color:'#10B981', bg:'rgba(16,185,129,.06)',
    items:['tab-quality-joints','tab-quality-reports','tab-sold','tab-cal','tab-pend','tab-com'] },
  { id:'suprimentos', label:'Suprimentos', icon:'package', color:'#8B5CF6', bg:'rgba(139,92,246,.06)',
    items:['tab-budget','tab-quotations','tab-mat','tab-suppliers','tab-compositions'] },
  { id:'sistema', label:'Sistema', icon:'cog', color:'#64748B', bg:'rgba(100,116,139,.06)',
    items:['tab-int','tab-team','tab-plan'] }
];

const LS_KEY = 'pia.sidebar.groupState.v1';
const LS_DISC = 'pia.activeDiscipline';

function loadState(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); } catch(_){ return {}; } }
function saveState(s){ try { localStorage.setItem(LS_KEY, JSON.stringify(s||{})); } catch(_){} }
function loadDisc(){ return localStorage.getItem(LS_DISC) || 'all'; }
function saveDisc(v){ try { localStorage.setItem(LS_DISC, v); } catch(_){} }
function discMeta(v){ return DISCIPLINES.find(function(x){return x.v===v;}) || DISCIPLINES[0]; }

function injectStyles(){
  if(d.getElementById('sidebar-groups-css')) return;
  const css = `
  .sg-disc-bar{margin:8px 10px 4px;padding:9px 11px;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#fff;border-radius:9px;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;border:1px solid rgba(255,255,255,.08);position:relative}
  .sg-disc-bar:hover{filter:brightness(1.12)}
  .sg-disc-bar .sg-disc-lbl{flex:1;font-size:10.5px;text-transform:uppercase;font-weight:700;letter-spacing:.4px;opacity:.75}
  .sg-disc-bar .sg-disc-val{font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:5px}
  .sg-disc-pop{position:absolute;background:#fff;border:1px solid #E2E8F0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.18);min-width:220px;z-index:9999;padding:6px;display:none;left:10px;right:10px;top:55px}
  .sg-disc-pop.open{display:block}
  .sg-disc-opt{padding:8px 11px;border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:9px;font-size:12.5px;color:#1E293B;font-weight:600}
  .sg-disc-opt:hover{background:#F1F5F9}
  .sg-disc-opt.active{background:rgba(124,58,237,.08);color:#5B21B6}
  .sg-disc-opt-dot{width:8px;height:8px;border-radius:50%;margin-left:auto}
  .sg-group{margin:6px 8px;border-radius:10px;overflow:hidden;border:1px solid var(--t3,#e2e8f0);background:var(--bg1,#fff)}
  .sg-group + .sg-group{margin-top:4px}
  .sg-head{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;user-select:none;font-size:12px;font-weight:700;color:var(--t8,#0f172a);transition:background .15s ease}
  .sg-head:hover{filter:brightness(.97)}
  .sg-head .sg-ico{width:16px;height:16px;flex-shrink:0}
  .sg-head .sg-lbl{flex:1;text-transform:uppercase;letter-spacing:.4px;font-size:10.5px}
  .sg-head .sg-cnt{font-size:9.5px;background:rgba(0,0,0,.06);color:var(--t7,#475569);padding:2px 7px;border-radius:10px;font-weight:600}
  .sg-head .sg-chev{width:14px;height:14px;transition:transform .2s ease;opacity:.6}
  .sg-group.collapsed .sg-chev{transform:rotate(-90deg)}
  .sg-body{padding:4px 6px 8px;transition:max-height .25s ease, opacity .15s ease, padding .15s ease;overflow:hidden}
  .sg-group.collapsed .sg-body{max-height:0;padding:0 6px;opacity:0}
  .sg-body .side-item{margin:2px 0;border-radius:7px;font-size:12px;padding:7px 10px}
  .sg-body .side-item .ico{width:15px;height:15px}
  .sg-body .side-item .nbadge{font-size:9.5px;padding:1px 6px}
  .sg-body .side-item.active{box-shadow:inset 3px 0 0 var(--primary,#1E40AF)}
  .sg-othersec{display:none}
  .sg-search{margin:4px 10px 4px;position:relative}
  .sg-search input{width:100%;padding:7px 10px 7px 30px;border:1px solid var(--t3,#e2e8f0);border-radius:8px;font-size:12px;background:var(--bg1,#fff);color:var(--t8,#0f172a);outline:none;transition:border-color .15s}
  .sg-search input:focus{border-color:var(--primary,#1E40AF)}
  .sg-search .sg-srch-ic{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--t6,#64748b);pointer-events:none}
  .sg-body.sg-empty{display:none}
  .sg-group.sg-hide,.side-item.sg-disc-hidden{display:none !important}
  html[data-theme="dark"] .sg-group{background:var(--t2,#111B33);border-color:var(--t3,#1E293B)}
  html[data-theme="dark"] .sg-head{color:var(--t8,#E2E8F0);background:transparent}
  html[data-theme="dark"] .sg-head:hover{background:var(--t3,#1E293B)}
  html[data-theme="dark"] .sg-head .sg-lbl{color:var(--t9,#F8FAFC);opacity:.95}
  html[data-theme="dark"] .sg-head .sg-cnt{background:var(--t3,#1E293B);color:var(--t7,#CBD5E1)}
  html[data-theme="dark"] .sg-head .sg-chev{color:var(--t6,#94A3B8);opacity:.9}
  html[data-theme="dark"] .sg-body .side-item{color:var(--t7,#CBD5E1)}
  html[data-theme="dark"] .sg-body .side-item:hover{background:var(--t3,#1E293B);color:var(--t9,#F8FAFC)}
  html[data-theme="dark"] .sg-search input{background:var(--t2,#111B33);border-color:var(--t3,#1E293B);color:var(--t8,#E2E8F0)}
  html[data-theme="dark"] .sg-search .sg-srch-ic{color:var(--t6,#94A3B8)}
  html[data-theme="dark"] .sg-disc-pop{background:var(--t1,#0A1224);border-color:var(--t3,#1E293B)}
  html[data-theme="dark"] .sg-disc-opt{color:var(--t8,#E2E8F0)}
  html[data-theme="dark"] .sg-disc-opt:hover{background:var(--t3,#1E293B)}
  html[data-theme="dark"] .sg-disc-opt.active{background:rgba(124,58,237,.20);color:#C4B5FD}
  `;
  const st = d.createElement('style');
  st.id = 'sidebar-groups-css';
  st.textContent = css;
  d.head.appendChild(st);
}

// Cria botões dinâmicos (Base Elétrica + Orçamento + Composições)
function injectCompositionsButton(sidebar){
  if(!d.getElementById('tab-elec-base')){
    const eBtn = d.createElement('button');
    eBtn.className = 'side-item';
    eBtn.id = 'tab-elec-base';
    eBtn.onclick = function(){
      if(w.PIAElectricalBase && typeof w.PIAElectricalBase.open === 'function'){
        w.PIAElectricalBase.open();
      } else {
        alert('Base Elétrica ainda carregando.');
      }
    };
    eBtn.innerHTML = '<i data-lucide="zap" class="ico"></i><span>Base Elétrica</span>';
    sidebar.appendChild(eBtn);
  }
  // Esconde botões antigos (absorvidos pela Base Elétrica + civis movidos pro HUB Civil + SINAPI em Suprimentos)
  ['tab-elec-cab','tab-elec-ed','tab-elec-pnl','tab-elec-spda','tab-elec-specs',
   'tab-civil-concr','tab-civil-elem','tab-civil-sinapi',
   'tab-disc','tab-prod','tab-rdo','tab-gantt','tab-planner'].forEach(function(id){
    const old = d.getElementById(id);
    if(old){ old.style.display='none'; old.dataset.replaced='1'; }
  });

  // Helper: prefere PIALazy (lazy-load) se disponível, senão fallback ao namespace global se já carregado
  function lazyOpen(modName, ns, method){
    return async function(){
      // Caminho rápido: módulo já exposto globalmente, chama direto
      if(w[ns] && typeof w[ns][method] === 'function'){
        try { w[ns][method](); return; } catch(e){ console.error('[sidebar]', modName, method, 'lançou:', e); }
      }
      // Tenta carregar via PIALazy
      if(w.PIALazy && w.PIALazy.run){
        try {
          await w.PIALazy.run(modName, method);
          return;
        } catch(e){
          console.error('[sidebar] lazy load FALHOU para', modName, '—', e.message);
          // Mensagem clara pro usuário com instruções de debug
          alert(
            'Falha ao carregar o módulo "' + modName + '".\n\n' +
            'Erro: ' + (e.message || e) + '\n\n' +
            'Verifique o console do navegador (F12 → Console) pra ver o erro detalhado.\n' +
            'Se persistir, force refresh com Ctrl+Shift+R.'
          );
          return;
        }
      }
      // Sem PIALazy disponível
      alert('Sistema de carregamento de módulos não disponível. Recarregue a página (Ctrl+Shift+R).');
    };
  }

  if(!d.getElementById('tab-budget')){
    const bBtn = d.createElement('button'); bBtn.className='side-item'; bBtn.id='tab-budget';
    bBtn.onclick = lazyOpen('orcamento','PIAOrcamento','open');
    bBtn.innerHTML = '<i data-lucide="receipt" class="ico"></i><span>Orçamento</span>';
    sidebar.appendChild(bBtn);
  }
  // tab-rdo-new (RDO antigo) removido — substituido pelo novo "RDO Diário" na secao Planejamento
  if(!d.getElementById('tab-pcp')){
    const p = d.createElement('button'); p.className='side-item'; p.id='tab-pcp';
    p.onclick = lazyOpen('pcp','PIAPCP','open');
    p.innerHTML = '<i data-lucide="calendar-check-2" class="ico"></i><span>PCP — Plano Semanal</span>';
    sidebar.appendChild(p);
  }
  if(!d.getElementById('tab-hub-unified')){
    const hu = d.createElement('button'); hu.className='side-item'; hu.id='tab-hub-unified';
    hu.onclick = lazyOpen('hub-unified','PIAHubUnified','open');
    hu.innerHTML = '<i data-lucide="layout-grid" class="ico"></i><span>HUB Planejador</span>';
    sidebar.appendChild(hu);
  }
  if(!d.getElementById('tab-rdo-diario')){
    const rd = d.createElement('button'); rd.className='side-item'; rd.id='tab-rdo-diario';
    rd.onclick = lazyOpen('rdo-diario','PIARDODiario','open');
    rd.innerHTML = '<i data-lucide="clipboard-list" class="ico"></i><span>RDO Diário</span>';
    sidebar.appendChild(rd);
  }
  // tab-planner-hub (HUB embutido legado) removido: HUB Planejador unificado o substitui
  // tab-analytics removido: Curva S + Fisico-Financeiro + EVM agora vivem dentro do Orcamento (Suprimentos > Orcamento > Cronograma Fisico-Financeiro)
  // tab-mat-catalog: reutilizamos o tab-mat existente no HTML (que agora chama PIAMaterialsCatalog.open via onclick)
  if(!d.getElementById('tab-quotations')){
    const q = d.createElement('button'); q.className='side-item'; q.id='tab-quotations';
    q.onclick = lazyOpen('quotations','PIAQuotations','open');
    q.innerHTML = '<i data-lucide="shopping-cart" class="ico"></i><span>Compras (RFQ/PO/AR)</span>';
    sidebar.appendChild(q);
  }
  if(!d.getElementById('tab-compositions')){
    const btn = d.createElement('button'); btn.className='side-item'; btn.id='tab-compositions';
    btn.onclick = lazyOpen('compositions','PIACompositions','open');
    btn.innerHTML = '<i data-lucide="book-open-check" class="ico"></i><span>Base de Composições</span>';
    sidebar.appendChild(btn);
  }
}

// ============================================================
// Seletor de disciplina no topo
// ============================================================
function injectDisciplineSelector(sidebar){
  if(d.getElementById('sg-disc-bar')) return;
  const cur = loadDisc();
  const m = discMeta(cur);

  const wrap = d.createElement('div');
  wrap.id = 'sg-disc-bar-wrap';
  wrap.style.position = 'relative';
  wrap.innerHTML =
    '<div id="sg-disc-bar" class="sg-disc-bar">' +
      '<span class="sg-disc-ic">' + m.ic + '</span>' +
      '<span class="sg-disc-lbl">Perfil</span>' +
      '<span class="sg-disc-val">' + m.l + ' <span style="opacity:.6;font-size:9px">▼</span></span>' +
    '</div>' +
    '<div id="sg-disc-pop" class="sg-disc-pop"></div>';
  sidebar.insertBefore(wrap, sidebar.firstChild);

  const bar = d.getElementById('sg-disc-bar');
  const pop = d.getElementById('sg-disc-pop');
  pop.innerHTML = DISCIPLINES.map(function(disc){
    return '<div class="sg-disc-opt ' + (disc.v===cur?'active':'') + '" data-v="' + disc.v + '">' +
      '<span>' + disc.ic + '</span>' +
      '<span>' + disc.l + '</span>' +
      '<span class="sg-disc-opt-dot" style="background:' + disc.c + '"></span>' +
    '</div>';
  }).join('');

  bar.onclick = function(e){ e.stopPropagation(); pop.classList.toggle('open'); };
  d.addEventListener('click', function(){ pop.classList.remove('open'); });
  pop.querySelectorAll('.sg-disc-opt').forEach(function(opt){
    opt.onclick = function(){
      const v = opt.dataset.v;
      saveDisc(v);
      const m2 = discMeta(v);
      bar.querySelector('.sg-disc-ic').textContent = m2.ic;
      bar.querySelector('.sg-disc-val').innerHTML = m2.l + ' <span style="opacity:.6;font-size:9px">▼</span>';
      pop.querySelectorAll('.sg-disc-opt').forEach(function(o){ o.classList.toggle('active', o.dataset.v === v); });
      pop.classList.remove('open');
      applyDisciplineFilter();
    };
  });
}

// ============================================================
// Aplica filtro: esconde itens fora do APPLIES da disciplina ativa
// ============================================================
function applyDisciplineFilter(){
  const disc = loadDisc();
  d.querySelectorAll('aside.sidebar .side-item').forEach(function(btn){
    if(btn.dataset.replaced === '1') return; // ignora botões absorvidos
    const allowed = APPLIES[btn.id];
    if(!allowed){ btn.classList.remove('sg-disc-hidden'); return; }
    const show = disc === 'all' || allowed.indexOf(disc) >= 0 || allowed.indexOf('*') >= 0;
    btn.classList.toggle('sg-disc-hidden', !show);
  });
  // Esconde grupos vazios + atualiza contador
  d.querySelectorAll('.sg-group').forEach(function(grp){
    const visible = Array.from(grp.querySelectorAll('.side-item')).filter(function(b){
      return !b.classList.contains('sg-disc-hidden') && b.dataset.replaced !== '1' && b.style.display !== 'none';
    }).length;
    grp.classList.toggle('sg-hide', visible === 0);
    const cnt = grp.querySelector('.sg-cnt');
    if(cnt) cnt.textContent = visible;
  });
}

function buildGroups(){
  const sidebar = d.querySelector('aside.sidebar');
  if(!sidebar){ console.warn('[sidebar-groups] aside.sidebar não encontrado'); return; }
  if(sidebar.dataset.grouped === '1') return;

  injectStyles();
  injectCompositionsButton(sidebar);

  const state = loadState();
  sidebar.querySelectorAll('.side-sec').forEach(function(s){ s.classList.add('sg-othersec'); });

  const buttons = {};
  sidebar.querySelectorAll('.side-item').forEach(function(b){ if(b.id) buttons[b.id] = b; });

  // Search box
  const search = d.createElement('div');
  search.className = 'sg-search';
  search.innerHTML = '<i data-lucide="search" class="sg-srch-ic"></i><input id="sg-search-input" type="search" placeholder="Buscar..." autocomplete="off">';
  sidebar.insertBefore(search, sidebar.firstChild);

  // Seletor de disciplina (acima do search)
  injectDisciplineSelector(sidebar);

  const otherItems = new Set(Object.keys(buttons));

  GROUPS.forEach(function(g){
    const wrap = d.createElement('div');
    wrap.className = 'sg-group' + (state[g.id]==='collapsed' ? ' collapsed':'');
    wrap.dataset.gid = g.id;
    wrap.style.borderLeft = '3px solid '+g.color;

    const head = d.createElement('div');
    head.className = 'sg-head';
    head.style.background = g.bg;
    head.innerHTML =
      '<i data-lucide="' + g.icon + '" class="sg-ico" style="color:' + g.color + '"></i>' +
      '<span class="sg-lbl">' + g.label + '</span>' +
      '<span class="sg-cnt">0</span>' +
      '<i data-lucide="chevron-down" class="sg-chev"></i>';
    head.onclick = function(){
      wrap.classList.toggle('collapsed');
      const s = loadState();
      s[g.id] = wrap.classList.contains('collapsed') ? 'collapsed' : 'open';
      saveState(s);
    };

    const body = d.createElement('div');
    body.className = 'sg-body';

    let count = 0;
    g.items.forEach(function(id){
      const b = buttons[id];
      if(b){ body.appendChild(b); otherItems.delete(id); count++; }
    });
    head.querySelector('.sg-cnt').textContent = count;
    if(count === 0) wrap.classList.add('sg-hide');

    wrap.appendChild(head); wrap.appendChild(body);
    sidebar.appendChild(wrap);
  });

  // Itens órfãos
  if(otherItems.size > 0){
    const wrap = d.createElement('div');
    wrap.className = 'sg-group';
    wrap.style.borderLeft = '3px solid #94A3B8';
    const head = d.createElement('div');
    head.className = 'sg-head';
    head.style.background = 'rgba(148,163,184,.06)';
    head.innerHTML = '<i data-lucide="more-horizontal" class="sg-ico"></i><span class="sg-lbl">Outros</span><span class="sg-cnt">' + otherItems.size + '</span><i data-lucide="chevron-down" class="sg-chev"></i>';
    head.onclick = function(){ wrap.classList.toggle('collapsed'); };
    const body = d.createElement('div');
    body.className = 'sg-body';
    otherItems.forEach(function(id){ body.appendChild(buttons[id]); });
    wrap.appendChild(head); wrap.appendChild(body);
    sidebar.appendChild(wrap);
  }

  // Abre grupo do item ativo
  const active = sidebar.querySelector('.side-item.active');
  if(active){ const grp = active.closest('.sg-group'); if(grp && grp.classList.contains('collapsed')) grp.classList.remove('collapsed'); }

  const inp = d.getElementById('sg-search-input');
  if(inp) inp.addEventListener('input', filterSidebar);

  sidebar.dataset.grouped = '1';

  if(w.lucide && typeof w.lucide.createIcons === 'function'){ w.lucide.createIcons(); }

  applyDisciplineFilter();
  console.log('[sidebar-groups v1.1] ' + GROUPS.length + ' grupos + filtro de disciplina');
}

function filterSidebar(){
  const q = (d.getElementById('sg-search-input').value || '').toLowerCase().trim();
  d.querySelectorAll('.sg-group').forEach(function(grp){
    const body = grp.querySelector('.sg-body'); if(!body) return;
    let anyVisible = false;
    body.querySelectorAll('.side-item').forEach(function(item){
      if(item.classList.contains('sg-disc-hidden')){ return; }
      const txt = (item.textContent || '').toLowerCase();
      const show = !q || txt.indexOf(q) !== -1;
      item.style.display = show ? '' : 'none';
      if(show) anyVisible = true;
    });
    grp.style.display = anyVisible || !q ? '' : 'none';
  });
}

// Expor pra uso externo
window.PIASidebar = window.PIASidebar || { reorganize: buildGroups, applyFilter: filterSidebar };

} catch(e){ console.warn('[sidebar-groups] init falhou:', e); }
})(window, document);
