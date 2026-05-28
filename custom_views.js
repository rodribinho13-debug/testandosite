// =============================================================
// PROJECT.IA - Custom Views (Builder de Abas Customizadas)
// Modulo reutilizavel para v9, HUB Mecanico, Civil, Eletrica, Pintura, Caldeiraria
// =============================================================
// Requer no escopo global: sb (supabase client), _org, _user, _curProject (opcional)
// Opcional: toast(msg,kind), _renderIcons()
// =============================================================

(function(global){
'use strict';

const CV = global.CustomViews = {};

const FIELD_TYPES = [
  {v:'text',l:'Texto'},
  {v:'textarea',l:'Texto longo'},
  {v:'number',l:'Numero'},
  {v:'date',l:'Data'},
  {v:'time',l:'Hora'},
  {v:'datetime-local',l:'Data e hora'},
  {v:'select',l:'Lista (select)'},
  {v:'boolean',l:'Sim/Nao'},
  {v:'tag',l:'TAG (texto mono)'},
  {v:'currency',l:'Moeda BRL'}
];

const ICON_OPTIONS = [
  'sparkles','star','flag','tag','folder','file-text','clipboard','clipboard-list',
  'wrench','hammer','hard-hat','zap','cable','cuboid','square-stack','flask-conical',
  'calculator','gauge','trending-up','bar-chart-3','pie-chart','calendar','clock',
  'truck','package','box','warehouse','users','user','briefcase','shield',
  'alert-triangle','check-circle','x-circle','info','help-circle','book','book-marked',
  'globe','map','map-pin','route','layers','server','database','settings','plus-square'
];

// Cor padrao por escopo - segue o design system do HUB
const SCOPE_COLORS = {
  v9:          '#1E40AF',
  tubulacao:   '#1E40AF',
  civil:       '#92400E',
  eletrica:    '#CA8A04',
  pintura:     '#BE185D',
  caldeiraria: '#F97316'
};
function _scopeColor(scope){ return SCOPE_COLORS[scope] || '#1E40AF'; }

function _san(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function _ri(){try{if(global.lucide)lucide.createIcons();}catch(e){}}
function _toast(msg,kind){if(global.toast)global.toast(msg,kind);else if(kind==='err'||kind==='warn')console.warn(msg);else console.log(msg);}
function _num(v,d){const n=parseFloat(v);if(isNaN(n))return '-';return n.toLocaleString('pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
function _fmtDate(d){if(!d)return '-';try{return new Date(d).toLocaleDateString('pt-BR');}catch{return d;}}

// =============================================================
// PUBLIC API
// =============================================================

// Lista abas customizadas para um escopo
CV.list = async function(scope){
  if(!global.sb || !global._org || !global._org.id){
    console.warn('[CustomViews] Contexto nao pronto (org/sb). Aguardando...');
    return [];
  }
  const {data,error} = await global.sb.from('custom_views')
    .select('*').eq('org_id', global._org.id).eq('scope', scope)
    .is('deleted_at', null).eq('enabled', true)
    .order('position').order('created_at');
  if(error){ console.error('custom_views.list:',error); return []; }
  return data || [];
};

// Renderiza chips de abas custom no container (chamar apos renderizar sidebar nativa)
CV.renderSidebarItems = async function(containerEl, scope, onClick){
  if(!containerEl) return;
  const items = await CV.list(scope);
  // Remove pre-existentes
  containerEl.querySelectorAll('[data-cv-item],[data-cv-add]').forEach(el=>el.remove());

  const color = _scopeColor(scope);

  // Section header
  const sec = document.createElement('div');
  sec.className = 'side-sec';
  sec.dataset.cvItem = 'sec';
  sec.style.cssText = 'padding:14px 18px 6px;font-size:10.5px;color:var(--t5,#94A3B8);text-transform:uppercase;letter-spacing:.8px;font-weight:600;display:flex;align-items:center;justify-content:space-between';
  sec.innerHTML = '<span>Abas personalizadas</span><button data-cv-add="1" title="Criar nova aba" style="background:transparent;border:none;cursor:pointer;color:'+color+';width:22px;height:22px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:16px;font-weight:700;line-height:1">+</button>';
  containerEl.appendChild(sec);

  // Abas
  items.forEach(v=>{
    const b = document.createElement('button');
    b.className = 'side-item';
    b.dataset.cvItem = v.id;
    b.style.cssText = 'display:flex;align-items:center;gap:11px;padding:8px 18px;margin:0 8px;color:var(--t7,#334155);font-size:13px;cursor:pointer;border:none;background:none;width:calc(100% - 16px);text-align:left;border-radius:7px;font-family:inherit;font-weight:500';
    b.innerHTML = '<i data-lucide="'+_san(v.icon||'sparkles')+'" style="width:18px;height:18px;flex-shrink:0;stroke-width:2;color:'+color+'"></i><span style="flex:1">'+_san(v.name)+'</span>';
    b.onmouseover=()=>{b.style.background='var(--t2,#F1F5F9)';b.style.color='var(--t9,#0F172A)';};
    b.onmouseout=()=>{b.style.background='none';b.style.color='var(--t7,#334155)';};
    b.onclick = ()=>{
      if(onClick) onClick(v);
      CV.render(v);
    };
    containerEl.appendChild(b);
  });

  // Wire botao +
  const addBtn = containerEl.querySelector('[data-cv-add="1"]');
  if(addBtn) addBtn.onclick = (e)=>{ e.stopPropagation(); CV.openBuilder(scope); };

  _ri();
};

// =============================================================
// BUILDER - modal de criacao/edicao de aba
// =============================================================
CV.openBuilder = function(scope, existing){
  const isEdit = !!existing;
  const scopeColor = _scopeColor(scope);
  const v = existing || {
    icon:'sparkles',
    fields_jsonb:[
      {key:'titulo', label:'Titulo', type:'text', required:true},
      {key:'descricao', label:'Descricao', type:'textarea', required:false}
    ],
    features_jsonb:{crud:true,excel_import:true,excel_export:true,ai_import:false,p6_import:false,filters:true},
    ai_prompt:''
  };

  const ov = document.createElement('div');
  ov.className = 'cv-builder-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };

  // Grid de icones - 12 colunas, visual clean (sem dropdown)
  const iconGrid = ICON_OPTIONS.map(i=>
    '<button type="button" data-cv-icon="'+i+'" title="'+i+'" style="background:'+(v.icon===i?scopeColor+'15':'#fff')+';border:1px solid '+(v.icon===i?scopeColor:'#E2E8F0')+';border-radius:8px;width:36px;height:36px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:all .12s"><i data-lucide="'+i+'" style="width:16px;height:16px;color:'+(v.icon===i?scopeColor:'#64748B')+';stroke-width:2"></i></button>'
  ).join('');

  ov.innerHTML = '<div style="background:#fff;border-radius:14px;padding:24px;max-width:760px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative">'
    + '<button onclick="this.closest(\'.cv-builder-overlay\').remove()" style="position:absolute;top:14px;right:14px;background:transparent;border:none;cursor:pointer;color:#64748B;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center"><i data-lucide="x" style="width:16px;height:16px"></i></button>'
    + '<div style="display:flex;align-items:center;gap:9px;font-size:16px;font-weight:700;color:#0F172A;margin-bottom:6px;letter-spacing:-.2px"><i data-lucide="plus-square" style="width:18px;height:18px;color:'+scopeColor+';stroke-width:2"></i>'+(isEdit?'Editar':'Nova')+' aba personalizada</div>'
    + '<div style="font-size:12.5px;color:#64748B;margin-bottom:18px">A aba seguira o estilo do <strong>'+_san(scope.toUpperCase())+'</strong> e aparecera na sidebar para sua organizacao.</div>'

    // Identificacao - so nome e descricao
    + '<div style="margin-bottom:14px">'
    +   '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Nome da aba *</label>'
    +   '<input id="cv-name" value="'+_san(v.name||'')+'" placeholder="Ex: Lista de Reuniões" style="width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'
    + '</div>'
    + '<div style="margin-bottom:14px">'
    +   '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Descricao <span style="color:#94A3B8;font-weight:500;text-transform:none;letter-spacing:0">(opcional)</span></label>'
    +   '<input id="cv-desc" value="'+_san(v.description||'')+'" placeholder="Para que serve esta aba" style="width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'
    + '</div>'

    // Icone - grid visual
    + '<div style="margin-bottom:14px">'
    +   '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">Icone</label>'
    +   '<div id="cv-icon-grid" style="display:flex;flex-wrap:wrap;gap:6px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px;max-height:180px;overflow-y:auto">'+iconGrid+'</div>'
    +   '<input type="hidden" id="cv-icon" value="'+_san(v.icon||'sparkles')+'">'
    + '</div>'

    // Campos
    + '<div style="margin-bottom:14px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    +     '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px">Campos da aba *</label>'
    +     '<button id="cv-add-field" type="button" style="background:transparent;color:'+scopeColor+';border:1px solid '+scopeColor+';padding:5px 10px;border-radius:7px;font-size:11.5px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:12px;height:12px;color:'+scopeColor+';stroke:'+scopeColor+'"></i>Adicionar campo</button>'
    +   '</div>'
    +   '<div id="cv-fields-list" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px"></div>'
    + '</div>'

    // Features
    + '<div style="margin-bottom:14px">'
    +   '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">Funcionalidades</label>'
    +   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">'
    +     featCheck('crud','CRUD manual','Adicionar/editar/excluir',v.features_jsonb?.crud!==false, scopeColor)
    +     featCheck('excel_import','Importar Excel/CSV','Upload XLSX/CSV',v.features_jsonb?.excel_import!==false, scopeColor)
    +     featCheck('excel_export','Exportar Excel','Download XLSX',v.features_jsonb?.excel_export!==false, scopeColor)
    +     featCheck('ai_import','IA: extrair de PDF/Imagem','Gemini IA',!!v.features_jsonb?.ai_import, scopeColor)
    +     featCheck('p6_import','Importar Primavera P6','Upload XER/XML',!!v.features_jsonb?.p6_import, scopeColor)
    +     featCheck('filters','Filtros e busca','Busca por texto',v.features_jsonb?.filters!==false, scopeColor)
    +   '</div>'
    + '</div>'

    // Prompt IA
    + '<div id="cv-ai-section" style="margin-bottom:14px;'+(v.features_jsonb?.ai_import?'':'display:none')+'">'
    +   '<label style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Prompt da IA</label>'
    +   '<div style="font-size:11.5px;color:#64748B;margin-bottom:6px">Explique a IA o que extrair do documento. Os campos definidos acima sao usados como esperados.</div>'
    +   '<textarea id="cv-ai-prompt" placeholder="Ex: Voce e um analista. Extraia do documento: numero, data, responsavel, status. Retorne JSON com array records." style="width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;font-family:inherit;min-height:80px;resize:vertical;outline:none">'+_san(v.ai_prompt||'')+'</textarea>'
    + '</div>'

    // Footer
    + '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:18px;padding-top:14px;border-top:1px solid #E2E8F0">'
    +   '<div>'+(isEdit?'<button id="cv-del-view" style="background:transparent;border:1px solid #FCA5A5;color:#991B1B;padding:8px 14px;border-radius:8px;font-size:12.5px;cursor:pointer;font-weight:600">Excluir aba</button>':'')+'</div>'
    +   '<div style="display:flex;gap:8px"><button onclick="this.closest(\'.cv-builder-overlay\').remove()" style="background:transparent;border:1px solid #E2E8F0;padding:8px 14px;border-radius:8px;font-size:12.5px;cursor:pointer;color:#334155;font-weight:600">Cancelar</button>'
    +   '<button id="cv-save" style="background:'+scopeColor+';color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:12.5px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i data-lucide="save" style="width:14px;height:14px;color:#fff;stroke:#fff"></i>Salvar aba</button></div>'
    + '</div>'

    + '</div>';

  document.body.appendChild(ov);
  _ri();

  // Render campos
  const list = ov.querySelector('#cv-fields-list');
  let fields = JSON.parse(JSON.stringify(v.fields_jsonb||[]));

  function drawFields(){
    list.innerHTML = fields.length ? fields.map((f,i)=>fieldRow(f,i)).join('') :
      '<div style="text-align:center;padding:20px;color:#94A3B8;font-size:12px;background:#fff;border:1px dashed #E2E8F0;border-radius:8px">Nenhum campo. Clique em <strong>Adicionar campo</strong>.</div>';
    list.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>{ fields.splice(parseInt(b.dataset.fdel),1); drawFields(); });
    list.querySelectorAll('[data-fup]').forEach(b=>b.onclick=()=>{const i=parseInt(b.dataset.fup);if(i>0){[fields[i],fields[i-1]]=[fields[i-1],fields[i]];drawFields();}});
    list.querySelectorAll('[data-fdn]').forEach(b=>b.onclick=()=>{const i=parseInt(b.dataset.fdn);if(i<fields.length-1){[fields[i],fields[i+1]]=[fields[i+1],fields[i]];drawFields();}});
    list.querySelectorAll('[data-fk]').forEach(inp=>inp.oninput=()=>{const i=parseInt(inp.dataset.fk);fields[i].label=inp.value;fields[i].key=slug(inp.value);});
    list.querySelectorAll('[data-ft]').forEach(sel=>sel.onchange=()=>{const i=parseInt(sel.dataset.ft);fields[i].type=sel.value;drawFields();});
    list.querySelectorAll('[data-fopts]').forEach(inp=>inp.oninput=()=>{const i=parseInt(inp.dataset.fopts);fields[i].opts=inp.value.split(',').map(s=>s.trim()).filter(Boolean);});
    list.querySelectorAll('[data-freq]').forEach(cb=>cb.onchange=()=>{const i=parseInt(cb.dataset.freq);fields[i].required=cb.checked;});
    _ri();
  }

  function fieldRow(f,i){
    const isSelect = f.type==='select';
    return '<div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px;margin-bottom:6px;display:flex;align-items:center;gap:8px">'
      + '<div style="display:flex;flex-direction:column;gap:1px"><button data-fup="'+i+'" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;padding:0;width:18px;height:14px;display:flex;align-items:center;justify-content:center" title="Mover acima"><i data-lucide="chevron-up" style="width:14px;height:14px"></i></button><button data-fdn="'+i+'" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;padding:0;width:18px;height:14px;display:flex;align-items:center;justify-content:center" title="Mover abaixo"><i data-lucide="chevron-down" style="width:14px;height:14px"></i></button></div>'
      + '<input data-fk="'+i+'" value="'+_san(f.label||f.key||'')+'" placeholder="Nome do campo" style="flex:1.6;padding:7px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:12px;outline:none;font-family:inherit">'
      + '<select data-ft="'+i+'" style="flex:1;padding:7px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:12px;background:#fff;font-family:inherit">'+FIELD_TYPES.map(t=>'<option value="'+t.v+'" '+(f.type===t.v?'selected':'')+'>'+t.l+'</option>').join('')+'</select>'
      + (isSelect?'<input data-fopts="'+i+'" value="'+_san((f.opts||[]).join(', '))+'" placeholder="opcoes separadas por virgula" style="flex:1.4;padding:7px 10px;border:1px solid #E2E8F0;border-radius:7px;font-size:12px;outline:none;font-family:inherit">':'')
      + '<label style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#64748B;cursor:pointer;white-space:nowrap;font-weight:500"><input type="checkbox" data-freq="'+i+'" '+(f.required?'checked':'')+' style="cursor:pointer;accent-color:'+scopeColor+'">Obrig.</label>'
      + '<button data-fdel="'+i+'" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;width:26px;height:26px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center" onmouseover="this.style.background=\'#FEF2F2\';this.style.color=\'#EF4444\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'#94A3B8\'"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>'
      + '</div>';
  }
  drawFields();

  ov.querySelector('#cv-add-field').onclick = ()=>{
    fields.push({label:'Novo campo', key:'novo_campo_'+(fields.length+1), type:'text', required:false});
    drawFields();
  };

  // Grid de icones - seleciona visual
  ov.querySelectorAll('[data-cv-icon]').forEach(b=>{
    b.onclick = ()=>{
      const icon = b.dataset.cvIcon;
      ov.querySelector('#cv-icon').value = icon;
      ov.querySelectorAll('[data-cv-icon]').forEach(bb=>{
        const sel = bb.dataset.cvIcon === icon;
        bb.style.background = sel ? scopeColor+'15' : '#fff';
        bb.style.borderColor = sel ? scopeColor : '#E2E8F0';
        const ic = bb.querySelector('i');
        if(ic) ic.style.color = sel ? scopeColor : '#64748B';
      });
    };
  });

  // Toggle prompt IA + update borda do label conforme checkbox
  ov.querySelectorAll('[data-feat]').forEach(cb=>{
    cb.onchange = ()=>{
      if(cb.dataset.feat==='ai_import'){
        ov.querySelector('#cv-ai-section').style.display = cb.checked ? '' : 'none';
      }
      const lbl = cb.closest('label');
      if(lbl) lbl.style.borderColor = cb.checked ? scopeColor : '#E2E8F0';
    };
  });

  // Salvar
  ov.querySelector('#cv-save').onclick = async ()=>{
    const name = ov.querySelector('#cv-name').value.trim();
    if(!name){ _toast('Defina um nome para a aba','warn'); return; }
    if(!fields.length){ _toast('Adicione pelo menos um campo','warn'); return; }
    if(!global._org || !global._org.id){ _toast('Contexto da organizacao nao carregado. Recarregue a pagina.','err'); return; }
    if(!global.sb){ _toast('Cliente Supabase nao disponivel','err'); return; }
    // Normaliza keys
    const seenKeys = new Set();
    fields.forEach(f=>{ let k = slug(f.label||f.key||'campo'); let n=1; while(seenKeys.has(k)){n++;k=slug(f.label||'campo')+'_'+n;} seenKeys.add(k); f.key=k; });

    const features = {};
    ov.querySelectorAll('[data-feat]').forEach(cb=>{ features[cb.dataset.feat] = cb.checked; });

    const code = isEdit ? v.code : slug(name) + '_' + Math.random().toString(36).slice(2,6);
    const payload = {
      org_id: global._org.id, scope,
      code, name,
      icon: ov.querySelector('#cv-icon').value || 'sparkles',
      color: _scopeColor(scope),
      description: ov.querySelector('#cv-desc').value.trim() || null,
      fields_jsonb: fields,
      features_jsonb: features,
      ai_prompt: features.ai_import ? ov.querySelector('#cv-ai-prompt').value.trim() : null,
      updated_at: new Date().toISOString()
    };
    if(!isEdit) payload.created_by = global._user?.id;

    const op = isEdit ?
      global.sb.from('custom_views').update(payload).eq('id', v.id) :
      global.sb.from('custom_views').insert(payload);
    const {error} = await op;
    if(error){ _toast('Erro: '+error.message,'err'); return; }
    _toast(isEdit?'Aba atualizada':'Aba criada','ok');
    ov.remove();
    // Re-render sidebar (chama via evento)
    document.dispatchEvent(new CustomEvent('cv-changed',{detail:{scope}}));
  };

  // Excluir
  if(isEdit){
    ov.querySelector('#cv-del-view').onclick = async ()=>{
      if(!confirm('Excluir esta aba e todos os seus registros? Esta acao nao pode ser desfeita.'))return;
      const {error} = await global.sb.from('custom_views').update({deleted_at:new Date().toISOString(), enabled:false}).eq('id', v.id);
      if(error){ _toast('Erro: '+error.message,'err'); return; }
      _toast('Aba excluida','ok');
      ov.remove();
      document.dispatchEvent(new CustomEvent('cv-changed',{detail:{scope}}));
    };
  }
};

function featCheck(key,label,desc,checked,color){
  const c = color || '#1E40AF';
  return '<label style="display:flex;gap:8px;padding:9px 11px;background:#fff;border:1px solid '+(checked?c:'#E2E8F0')+';border-radius:8px;cursor:pointer;transition:border .12s"><input type="checkbox" data-feat="'+key+'" '+(checked?'checked':'')+' style="margin-top:2px;cursor:pointer;accent-color:'+c+'"><div><div style="font-size:12px;font-weight:600;color:#0F172A">'+label+'</div><div style="font-size:10.5px;color:#64748B;margin-top:1px">'+desc+'</div></div></label>';
}

function slug(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'campo';}

// =============================================================
// RENDER de uma aba customizada no #content
// =============================================================
CV.render = async function(view){
  if(!view) return;
  const content = document.getElementById('content');
  if(!content) return;

  // Marca aba ativa
  document.querySelectorAll('[data-cv-item]').forEach(b=>b.style.background='');
  const btn = document.querySelector('[data-cv-item="'+view.id+'"]');
  if(btn){ btn.style.background = (view.color||'#1E40AF')+'15'; btn.style.color = view.color||'#1E40AF'; btn.style.fontWeight='600'; }

  const feats = view.features_jsonb || {};
  const fields = view.fields_jsonb || [];

  let records = await loadRecords(view);
  let busca = '';

  function draw(){
    const filt = records.filter(r=>{
      if(!busca) return true;
      const blob = JSON.stringify(r.data||{}).toLowerCase();
      return blob.includes(busca.toLowerCase());
    });
    content.innerHTML =
      '<div class="bc-row" style="background:var(--t0,#fff);border-bottom:1px solid #E2E8F0;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#334155;font-weight:500"><i data-lucide="'+_san(view.icon||'sparkles')+'" style="width:14px;height:14px;color:'+_san(view.color||'#1E40AF')+'"></i> '+_san(view.name)+(view.description?' <span style="color:#94A3B8;font-weight:400">&middot; '+_san(view.description)+'</span>':'')+'</div><button onclick="CustomViews.openBuilder(\''+view.scope+'\','+JSON.stringify(view).replace(/"/g,'&quot;')+')" style="background:transparent;border:1px solid #E2E8F0;cursor:pointer;color:#64748B;padding:5px 10px;border-radius:6px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:5px"><i data-lucide="settings" style="width:12px;height:12px"></i>Editar aba</button></div>'
      + '<div style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:14px 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px"><div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:13px 15px"><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.7px;color:#94A3B8;margin-bottom:6px;font-weight:700">Registros</div><div style="font-size:22px;font-weight:700;color:#0F172A;font-family:JetBrains Mono,monospace">'+records.length+'</div></div><div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:13px 15px"><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.7px;color:#94A3B8;margin-bottom:6px;font-weight:700">Filtrados</div><div style="font-size:22px;font-weight:700;color:#0F172A;font-family:JetBrains Mono,monospace">'+filt.length+'</div></div></div>'
      + '<div style="background:#fff;border-bottom:1px solid #E2E8F0;padding:12px 22px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      + (feats.crud!==false ? '<button id="cv-new" style="background:'+_san(view.color||'#1E40AF')+';color:#fff;border:none;padding:9px 16px;border-radius:10px;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:7px"><i data-lucide="plus" style="width:14px;height:14px;stroke:#fff"></i>Novo registro</button>' : '')
      + (feats.excel_import ? '<button id="cv-imp-xls" style="background:#F1F5F9;color:#1E293B;border:1px solid #E2E8F0;padding:9px 14px;border-radius:10px;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:7px"><i data-lucide="file-spreadsheet" style="width:14px;height:14px"></i>Importar Excel</button>' : '')
      + (feats.ai_import ? '<button id="cv-imp-ai" style="background:#F5F3FF;color:#5B21B6;border:1px solid #DDD6FE;padding:9px 14px;border-radius:10px;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:7px"><i data-lucide="sparkles" style="width:14px;height:14px"></i>Importar com IA</button>' : '')
      + (feats.p6_import ? '<button id="cv-imp-p6" style="background:#FFF7ED;color:#9A3412;border:1px solid #FED7AA;padding:9px 14px;border-radius:10px;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:7px"><i data-lucide="calendar-range" style="width:14px;height:14px"></i>Importar P6</button>' : '')
      + (feats.excel_export ? '<button id="cv-exp" style="background:transparent;color:#1E293B;border:1px solid #E2E8F0;padding:9px 14px;border-radius:10px;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:7px"><i data-lucide="download" style="width:14px;height:14px"></i>Exportar Excel</button>' : '')
      + (feats.filters!==false ? '<input id="cv-busca" placeholder="Buscar..." value="'+_san(busca)+'" style="flex:1;min-width:200px;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;outline:none">' : '')
      + '</div>'
      + '<div style="overflow-x:auto;background:#fff"><table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px"><thead><tr style="background:#F8FAFC">'
      + fields.map(f=>'<th style="padding:11px 14px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;border-bottom:1px solid #E2E8F0;white-space:nowrap">'+_san(f.label||f.key)+'</th>').join('')
      + '<th style="padding:11px 14px;border-bottom:1px solid #E2E8F0;width:80px"></th>'
      + '</tr></thead><tbody>'
      + (filt.length ? filt.map(r=>{
          const d = r.data||{};
          return '<tr style="border-bottom:1px solid #E2E8F0">' + fields.map(f=>{
            let val = d[f.key];
            if(f.type==='boolean') val = val===true||val==='true' ? '<span style="background:#ECFDF5;color:#065F46;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">Sim</span>' : val===false||val==='false' ? '<span style="background:#FEF2F2;color:#991B1B;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">Nao</span>' : '-';
            else if(f.type==='date') val = _fmtDate(val);
            else if(f.type==='number') val = '<span style="font-family:JetBrains Mono,monospace">'+_num(val,2)+'</span>';
            else if(f.type==='currency') val = '<span style="font-family:JetBrains Mono,monospace">R$ '+_num(val,2)+'</span>';
            else if(f.type==='tag') val = '<span style="font-family:JetBrains Mono,monospace">'+_san(val||'-')+'</span>';
            else val = _san(val==null?'-':String(val).slice(0,80));
            return '<td style="padding:10px 14px">'+val+'</td>';
          }).join('')
          + '<td style="padding:10px 14px;text-align:right;white-space:nowrap">'
          +   (feats.crud!==false ? '<button onclick="CustomViews._edit(\''+r.id+'\')" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' : '')
          +   (feats.crud!==false ? '<button onclick="CustomViews._del(\''+r.id+'\')" style="background:transparent;border:none;cursor:pointer;color:#64748B;width:30px;height:30px;border-radius:7px"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' : '')
          + '</td></tr>';
        }).join('') : '<tr><td colspan="'+(fields.length+1)+'" style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:13px">Sem registros. '+(feats.crud!==false?'Clique em <strong>Novo registro</strong>':'')+(feats.ai_import?' ou use a <strong>IA</strong>':'')+(feats.excel_import?' ou <strong>importe um Excel</strong>':'')+'.</td></tr>')
      + '</tbody></table></div>';

    // Wire
    if(feats.crud!==false) document.getElementById('cv-new').onclick = ()=> editRecord();
    if(feats.excel_import) document.getElementById('cv-imp-xls').onclick = ()=> importExcel();
    if(feats.ai_import) document.getElementById('cv-imp-ai').onclick = ()=> importAI();
    if(feats.p6_import) document.getElementById('cv-imp-p6').onclick = ()=> importP6();
    if(feats.excel_export) document.getElementById('cv-exp').onclick = ()=> exportExcel();
    if(feats.filters!==false){const inp=document.getElementById('cv-busca');inp.oninput=(e)=>{busca=e.target.value;clearTimeout(window._cvT);window._cvT=setTimeout(draw,250);};}
    _ri();
  }

  // Internas (expostas em CustomViews._)
  CV._edit = (id)=> editRecord(records.find(x=>x.id===id));
  CV._del = async (id)=>{
    if(!confirm('Excluir este registro?'))return;
    const {error} = await global.sb.from('custom_view_records').update({deleted_at:new Date().toISOString()}).eq('id',id);
    if(error){ _toast('Erro: '+error.message,'err'); return; }
    _toast('Excluido','ok');
    records = await loadRecords(view); draw();
  };

  function editRecord(r){
    const data = r?.data || {};
    const ov = document.createElement('div');
    ov.className = 'cv-rec-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px';
    ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
    const inputs = fields.map(f=>{
      const v = data[f.key]==null?'':data[f.key];
      let inp;
      if(f.type==='select'){
        inp = '<select data-k="'+f.key+'" '+(f.required?'required':'')+'><option value="">-</option>'+(f.opts||[]).map(o=>'<option value="'+_san(o)+'" '+(String(v)===String(o)?'selected':'')+'>'+_san(o)+'</option>').join('')+'</select>';
      } else if(f.type==='textarea'){
        inp = '<textarea data-k="'+f.key+'" rows="3" '+(f.required?'required':'')+'>'+_san(v)+'</textarea>';
      } else if(f.type==='boolean'){
        inp = '<select data-k="'+f.key+'"><option value="">-</option><option value="true" '+(v===true||v==='true'?'selected':'')+'>Sim</option><option value="false" '+(v===false||v==='false'?'selected':'')+'>Nao</option></select>';
      } else {
        const t = f.type==='tag'||f.type==='currency'?'text':(f.type||'text');
        inp = '<input data-k="'+f.key+'" type="'+t+'" '+(f.type==='number'||f.type==='currency'?'step="0.01"':'')+' '+(f.required?'required':'')+' value="'+_san(v)+'">';
      }
      return '<div style="grid-column:'+(f.type==='textarea'?'1/-1':'auto')+'"><label style="display:block;font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">'+_san(f.label||f.key)+(f.required?' *':'')+'</label>'+inp+'</div>';
    }).join('');
    ov.innerHTML = '<div style="background:#fff;border-radius:14px;padding:24px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative"><button onclick="this.closest(\'.cv-rec-overlay\').remove()" style="position:absolute;top:14px;right:14px;background:transparent;border:none;cursor:pointer;color:#64748B;width:32px;height:32px;border-radius:8px"><i data-lucide="x" style="width:16px;height:16px"></i></button><div style="display:flex;align-items:center;gap:9px;font-size:16px;font-weight:700;color:#0F172A;margin-bottom:18px"><i data-lucide="'+_san(view.icon||'sparkles')+'" style="width:18px;height:18px;color:'+_san(view.color||'#1E40AF')+'"></i>'+(r?'Editar':'Novo')+' &middot; '+_san(view.name)+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+inputs+'</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #E2E8F0"><button onclick="this.closest(\'.cv-rec-overlay\').remove()" style="background:transparent;border:1px solid #E2E8F0;padding:8px 14px;border-radius:8px;font-size:12.5px;cursor:pointer;color:#334155;font-weight:600">Cancelar</button><button id="cv-rec-save" style="background:'+_san(view.color||'#1E40AF')+';color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12.5px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i data-lucide="save" style="width:14px;height:14px;stroke:#fff"></i>Salvar</button></div></div><style>.cv-rec-overlay input,.cv-rec-overlay select,.cv-rec-overlay textarea{width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;background:#fff;color:#0F172A;font-family:inherit;outline:none}.cv-rec-overlay input:focus,.cv-rec-overlay select:focus,.cv-rec-overlay textarea:focus{border-color:'+_san(view.color||'#1E40AF')+'}</style>';
    document.body.appendChild(ov);
    _ri();
    ov.querySelector('#cv-rec-save').onclick = async()=>{
      const newData = {};
      fields.forEach(f=>{
        const el = ov.querySelector('[data-k="'+f.key+'"]');
        let v = el.value;
        if(f.required && (v===''||v==null)){ _toast('Campo obrigatorio: '+f.label,'warn'); throw new Error('req'); }
        if(f.type==='number'||f.type==='currency'){ v = v===''?null:parseFloat(v); }
        if(f.type==='boolean'){ v = v==='true'?true:v==='false'?false:null; }
        if(v==='') v = null;
        newData[f.key] = v;
      });
      const payload = { data:newData, updated_at:new Date().toISOString() };
      let res;
      if(r){
        res = await global.sb.from('custom_view_records').update(payload).eq('id',r.id);
      } else {
        payload.custom_view_id = view.id;
        payload.org_id = global._org.id;
        payload.project_id = global._curProject?.id || null;
        payload.created_by = global._user?.id;
        res = await global.sb.from('custom_view_records').insert(payload);
      }
      if(res.error){ _toast('Erro: '+res.error.message,'err'); return; }
      _toast(r?'Atualizado':'Criado','ok');
      ov.remove();
      records = await loadRecords(view); draw();
    };
  }

  async function importExcel(){
    const input = document.createElement('input');
    input.type='file'; input.accept='.xlsx,.xls,.csv';
    input.onchange = async ()=>{
      const f = input.files[0]; if(!f) return;
      try {
        const buf = await f.arrayBuffer();
        const wb = global.XLSX.read(buf,{type:'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = global.XLSX.utils.sheet_to_json(sheet, {defval:null});
        if(!rows.length){ _toast('Planilha vazia','warn'); return; }
        // Tentar mapear colunas - usa keys do excel == label OR key (case insensitive)
        const fieldMap = {};
        fields.forEach(fd=>{
          const candidates = [fd.label, fd.key].filter(Boolean).map(s=>s.toLowerCase());
          const header = Object.keys(rows[0]).find(h=>candidates.includes(h.toLowerCase()) || candidates.includes(h.toLowerCase().replace(/\s+/g,'_')));
          if(header) fieldMap[fd.key] = header;
        });
        let added=0, skipped=0;
        for(const xRow of rows){
          const data = {};
          fields.forEach(fd=>{
            const h = fieldMap[fd.key];
            if(h && xRow[h]!=null) data[fd.key] = xRow[h];
          });
          // Checa obrigatorios
          const missing = fields.filter(fd=>fd.required && (data[fd.key]==null||data[fd.key]===''));
          if(missing.length){ skipped++; continue; }
          const {error} = await global.sb.from('custom_view_records').insert({
            custom_view_id: view.id, org_id: global._org.id,
            project_id: global._curProject?.id || null, data,
            created_by: global._user?.id
          });
          if(error){ skipped++; continue; }
          added++;
        }
        _toast(added+' importados, '+skipped+' descartados', skipped?'warn':'ok');
        records = await loadRecords(view); draw();
      } catch(e){ _toast('Erro: '+e.message,'err'); }
    };
    input.click();
  }

  async function importAI(){
    const input = document.createElement('input');
    input.type='file'; input.accept='.pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx';
    input.onchange = async ()=>{
      const f = input.files[0]; if(!f) return;
      _toast('Analisando com IA...','warn');
      try {
        let b64, mime = f.type;
        if(f.name.toLowerCase().endsWith('.xlsx')){
          const buf = await f.arrayBuffer();
          const wb = global.XLSX.read(buf,{type:'array'});
          const csv = global.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          b64 = btoa(unescape(encodeURIComponent(csv))); mime='text/csv';
        } else {
          b64 = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(f);});
        }
        // Monta prompt customizado para esta aba
        const expectedFields = fields.map(fd=>'- "'+fd.key+'" ('+fd.type+'): '+fd.label).join('\n');
        const userPrompt = (view.ai_prompt || 'Voce e um analista. Extraia do documento os campos abaixo.') + '\n\nCampos esperados:\n' + expectedFields + '\n\nRetorne JSON com array "records" onde cada item tem essas chaves. Se nao identificar um campo, deixe null. NUNCA invente.';
        const SUPABASE_URL = global.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
        const SUPABASE_KEY = global.SUPABASE_KEY;
        const {data:{session}} = await global.sb.auth.getSession();
        const resp = await fetch(SUPABASE_URL+'/functions/v1/analyze-discipline-doc',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+(session?.access_token||SUPABASE_KEY)},
          body: JSON.stringify({
            file:b64, mime,
            project_id: global._curProject?.id || null,
            discipline_code:'custom',
            document_type:'custom_view',
            custom_prompt: userPrompt
          })
        });
        const data = await resp.json();
        if(!resp.ok || data.error){ _toast('Erro IA: '+(data.error||resp.status),'err'); return; }
        let recs=[];
        for(const k of ['records','items','data']){ if(Array.isArray(data[k])){recs=data[k];break;} }
        if(!recs.length){ for(const k in data){ if(Array.isArray(data[k]) && data[k].length){recs=data[k];break;} } }
        let added=0, skipped=0;
        for(const ai of recs){
          const dataRow = {};
          fields.forEach(fd=>{ if(ai[fd.key]!=null) dataRow[fd.key]=ai[fd.key]; });
          const missing = fields.filter(fd=>fd.required && (dataRow[fd.key]==null||dataRow[fd.key]===''));
          if(missing.length){ skipped++; continue; }
          const {error} = await global.sb.from('custom_view_records').insert({
            custom_view_id: view.id, org_id: global._org.id,
            project_id: global._curProject?.id || null, data: dataRow,
            created_by: global._user?.id
          });
          if(error){ skipped++; continue; }
          added++;
        }
        _toast('IA: '+added+' cadastrados, '+skipped+' descartados', skipped?'warn':'ok');
        records = await loadRecords(view); draw();
      } catch(e){ _toast('Erro: '+e.message,'err'); }
    };
    input.click();
  }

  function importP6(){
    _toast('Importacao Primavera P6 (XER/XML) em breve - configure os campos task_id, name, start_date, end_date, duration para usar.','warn');
  }

  function exportExcel(){
    const data = records.map(r=>{
      const row = {};
      fields.forEach(fd=>{ row[fd.label||fd.key] = r.data?.[fd.key] ?? null; });
      return row;
    });
    if(!data.length){ _toast('Sem dados','warn'); return; }
    const wb = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(wb, global.XLSX.utils.json_to_sheet(data), view.code.slice(0,30));
    global.XLSX.writeFile(wb, view.code+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
    _toast('Exportado','ok');
  }

  draw();
};

async function loadRecords(view){
  let q = global.sb.from('custom_view_records').select('*').eq('custom_view_id',view.id).is('deleted_at',null);
  if(global._curProject?.id){ q = q.or('project_id.eq.'+global._curProject.id+',project_id.is.null'); }
  const {data,error} = await q.order('created_at',{ascending:false});
  if(error){ console.error(error); return []; }
  return data||[];
}

})(typeof window !== 'undefined' ? window : globalThis);
