/* ============================================================
   PROJECT.IA — Planner Hub Embed
   Abre o HUB Planejador (multi-disciplina) embutido no v9 via iframe,
   passando autenticação e projeto pela URL.
   NÃO remove nem altera o Hub original — apenas adiciona um modo embutido.
   ============================================================ */
(function(){
'use strict';
const w = window, d = document;

const HUBS = [
  { id:'tubulacao',   file:'hydrostec_planejador.html',            name:'Mecânica / Tubulação',    icon:'🔧', cor:'#1E40AF' },
  { id:'civil',       file:'hydrostec_planejador_civil.html',      name:'Civil / Concreto',        icon:'🏗️', cor:'#92400E' },
  { id:'eletrica',    file:'hydrostec_planejador_eletrica.html',   name:'Elétrica',                icon:'⚡', cor:'#CA8A04' },
  { id:'pintura',     file:'hydrostec_planejador_pintura.html',    name:'Pintura Industrial',      icon:'🎨', cor:'#BE185D' },
  { id:'caldeiraria', file:'hydrostec_planejador_caldeiraria.html',name:'Caldeiraria / Estrutura', icon:'🔥', cor:'#F97316' }
];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(m,t){ if(w.toast) w.toast(m,t); else console.log('[Hub]',m); }
function getProjectId(){ if(w._curProject && w._curProject.id) return w._curProject.id; if(w.curProj) return w.curProj; try { return localStorage.getItem('pia.curProj'); } catch(_){ return null; } }
function getProjectName(){ try { if(w._curProject && w._curProject.name) return w._curProject.name; const ps = w.projects || []; const id = getProjectId(); const p = ps.find(x => String(x.id)===String(id)); return p ? p.name : ''; } catch(_){ return ''; } }

async function buildHubUrl(disciplina){
  const meta = HUBS.find(x => x.id === disciplina) || HUBS[0];
  let url = meta.file;
  const pid = getProjectId();
  const nm = getProjectName();
  if(pid){
    url += '?project=' + encodeURIComponent(pid);
    if(nm) url += '&name=' + encodeURIComponent(nm);
  }
  // Marca como embedded pra que o Hub possa esconder header/menu se quiser
  url += (url.includes('?') ? '&' : '?') + 'embedded=1';
  // Anexa tokens de auth (mesmo padrão que o openPlannerView faz)
  try {
    if(w.sb && w.sb.auth){
      const s = (await w.sb.auth.getSession()).data.session;
      if(s){
        url += '&_at=' + encodeURIComponent(s.access_token);
        if(s.refresh_token) url += '&_rt=' + encodeURIComponent(s.refresh_token);
      }
    }
  } catch(e){ console.warn('[Hub] auth append', e); }
  return url;
}

function openHubDisciplinePicker(){
  let ov = d.getElementById('pia-hub-pick');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-hub-pick';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9640;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:780px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,22,40,.2);overflow:hidden">
      <div style="padding:14px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;font-size:22px">📐</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800">HUB Planejador</div>
          <div style="font-size:11.5px;opacity:.75">Escolha a disciplina · ${esc(getProjectName()||'(sem projeto)')}</div>
        </div>
        <button id="pia-hub-pick-close" style="background:rgba(255,255,255,.18);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;font-size:22px">×</button>
      </div>
      <div style="flex:1;overflow:auto;padding:18px;background:#F8FAFC">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
          ${HUBS.map(h => `
            <div class="pia-hub-card" data-disc="${h.id}" style="background:#fff;border:2px solid #E2E8F0;border-radius:12px;padding:18px;cursor:pointer;transition:all .15s">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div style="width:42px;height:42px;border-radius:10px;background:${h.cor};display:flex;align-items:center;justify-content:center;font-size:22px">${h.icon}</div>
                <div style="font-weight:800;color:#0F172A;font-size:14px">${esc(h.name)}</div>
              </div>
              <div style="font-size:11.5px;color:#64748B;line-height:1.4">${esc(getHubDesc(h.id))}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:18px;background:#EFF6FF;border:1px solid #DBEAFE;border-radius:10px;padding:12px 14px;font-size:12px;color:#1E40AF">
          💡 <strong>Modo embutido:</strong> o Hub abre dentro do PROJECT.IA. Se preferir abrir em nova aba (versão antiga), use a opção <em>"HUB Planejador"</em> no menu Engenharia.
        </div>
      </div>
    </div>
  `;
  d.body.appendChild(ov);
  d.getElementById('pia-hub-pick-close').onclick = ()=> ov.remove();
  ov.querySelectorAll('.pia-hub-card').forEach(c => {
    c.onmouseover = ()=>{ c.style.borderColor = '#3B82F6'; c.style.transform = 'translateY(-2px)'; c.style.boxShadow = '0 8px 20px rgba(59,130,246,.15)'; };
    c.onmouseout  = ()=>{ c.style.borderColor = '#E2E8F0'; c.style.transform = ''; c.style.boxShadow = ''; };
    c.onclick = ()=>{
      ov.remove();
      openHubEmbedded(c.dataset.disc);
    };
  });
}

function getHubDesc(id){
  switch(id){
    case 'tubulacao':   return 'Folhas (isos), juntas detalhadas, suportes, materiais, HH e produtividade.';
    case 'civil':       return 'Concretagens, elementos estruturais, ensaios de corpos de prova, traços.';
    case 'eletrica':    return 'Cabos, eletrodutos, painéis, SPDA, baixa/média tensão.';
    case 'pintura':     return 'Inspeções DFT, esquemas Petrobras, controle de pintura industrial.';
    case 'caldeiraria': return 'Estruturas metálicas, perfis, certificados de execução.';
    default: return '';
  }
}

async function openHubEmbedded(disciplina, viewHash, labelOverride){
  const pid = getProjectId();
  if(!pid){
    toast('Selecione um projeto primeiro','warn');
    if(typeof w.goV === 'function') w.goV('projects');
    return;
  }
  const meta = HUBS.find(x => x.id === disciplina) || HUBS[0];
  let url = await buildHubUrl(disciplina);
  if(viewHash) url += '#' + viewHash;

  let ov = d.getElementById('pia-hub-embed');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-hub-embed';
  ov.style.cssText = 'position:fixed;inset:0;background:#0F172A;z-index:9640;display:flex;flex-direction:column';
  ov.innerHTML = `
    <div style="padding:10px 18px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1E293B">
      <div style="width:36px;height:36px;border-radius:9px;background:${meta.cor};display:flex;align-items:center;justify-content:center;font-size:18px">${meta.icon}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:800">${esc(labelOverride || ('HUB Planejador · ' + meta.name))}</div>
        <div style="font-size:11px;opacity:.65">${esc(getProjectName()||'(sem projeto)')}${labelOverride?' · '+esc(meta.name):''} · modo embutido</div>
      </div>
      <button id="pia-hub-embed-disc" title="Trocar disciplina" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.15);color:#fff;padding:7px 12px;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:600">🔀 Trocar disciplina</button>
      <button id="pia-hub-embed-newtab" title="Abrir em nova aba" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.15);color:#fff;padding:7px 12px;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:600">↗ Nova aba</button>
      <button id="pia-hub-embed-reload" title="Recarregar" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.15);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:14px">⟳</button>
      <button id="pia-hub-embed-close" title="Fechar" style="background:#DC2626;border:none;color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
    </div>
    <div style="flex:1;position:relative;background:#0F172A">
      <div id="pia-hub-embed-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:13px;background:#0F172A;z-index:1">
        <div style="text-align:center">
          <div style="font-size:42px">⏳</div>
          <div style="margin-top:10px;font-weight:700">Carregando HUB ${esc(meta.name)}...</div>
          <div style="font-size:11px;margin-top:4px;opacity:.7">Conectando ao banco · autenticando · carregando dados</div>
        </div>
      </div>
      <iframe id="pia-hub-embed-frame" src="${esc(url)}" style="width:100%;height:100%;border:none;background:#fff;position:relative;z-index:2;opacity:0;transition:opacity .3s" allow="clipboard-read; clipboard-write"></iframe>
    </div>
  `;
  // Renderiza inline (usando PIAShell se disponível) ou fullscreen overlay
  if(w.PIAShell && w.PIAShell.inlineWrap && w.PIAShell.inlineWrap(ov,'planner-hub','tab-planner-hub')){
    /* inline mode */
  } else {
    d.body.appendChild(ov);
  }

  const frame = d.getElementById('pia-hub-embed-frame');
  const loading = d.getElementById('pia-hub-embed-loading');
  frame.onload = ()=>{ frame.style.opacity = '1'; if(loading) loading.style.display = 'none'; };

  d.getElementById('pia-hub-embed-close').onclick = ()=> ov.remove();
  d.getElementById('pia-hub-embed-reload').onclick = ()=>{
    if(loading) loading.style.display = 'flex';
    frame.style.opacity = '0';
    frame.src = frame.src;
  };
  d.getElementById('pia-hub-embed-disc').onclick = ()=>{
    ov.remove();
    openHubDisciplinePicker();
  };
  d.getElementById('pia-hub-embed-newtab').onclick = ()=>{
    w.open(url, '_blank');
  };
}

/* ============================================================
   API pública
   ============================================================ */
// Atalhos pra views específicas (Onda 2 — granularidade no v9 sem reescrever Hub)
const SHORTCUTS = {
  // Mecânica / Tubulação
  folhas:     { disc:'tubulacao', view:'sheets',     label:'📄 Folhas / Isos' },
  juntas:     { disc:'tubulacao', view:'joints',     label:'🔗 Mapa de Juntas (detalhado)' },
  suportes:   { disc:'tubulacao', view:'supports',   label:'⚓ Suportes' },
  em:         { disc:'tubulacao', view:'em',         label:'🏗 Estruturas Metálicas' },
  materiais:  { disc:'tubulacao', view:'materials',  label:'📦 Materiais do Projeto' },
  calc_hh:    { disc:'tubulacao', view:'calc',       label:'🧮 Calculadora HH' },
  hycontrol:  { disc:'tubulacao', view:'hycontrol',  label:'📈 HYCONTROL Semanal' },
  coef:       { disc:'tubulacao', view:'coef',       label:'⚙ Coeficientes Hh' },
  // Catálogos / referências
  refs:       { disc:'tubulacao', view:'refs',       label:'📚 Normas e Referências' },
  cablecat:   { disc:'tubulacao', view:'cablecat',   label:'🔌 Catálogo de Cabos' },
  perfis:     { disc:'tubulacao', view:'profiles',   label:'📐 Perfis Estruturais' },
  sinapi:     { disc:'tubulacao', view:'civilins',   label:'🏗 Insumos Civis SINAPI' },
  // Elétrica
  cabos:      { disc:'eletrica',  view:'cables',     label:'🔌 Cabos (lançamento)' },
  eletroduct: { disc:'eletrica',  view:'eletroduct', label:'🛤 Eletrodutos' },
  paineis:    { disc:'eletrica',  view:'panels',     label:'🖥 Sala de Controle' }
};

function openShortcut(key){
  const s = SHORTCUTS[key];
  if(!s){ console.warn('[Hub shortcut] desconhecido:', key); return; }
  return openHubEmbedded(s.disc, s.view, s.label + ' · ' + (HUBS.find(h=>h.id===s.disc)||{}).name);
}

w.PIAPlannerHub = {
  /** Abre o picker de disciplina e em seguida o iframe */
  open: openHubDisciplinePicker,
  /** Abre direto o iframe de uma disciplina específica */
  openDiscipline: openHubEmbedded,
  /** Abre direto uma view específica via key (ex: 'folhas', 'juntas') */
  openShortcut,
  HUBS, SHORTCUTS
};

})();
