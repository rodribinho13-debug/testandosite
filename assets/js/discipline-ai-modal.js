/*! PROJECT.IA — openDisciplineAIModal v2
 *  Modal de upload IA por disciplina com REVISÃO + CONFIRMAÇÃO antes do cadastro.
 *  Fluxo: Upload → Revisar dados extraídos → Confirmar → INSERT no banco.
 */
(function(w){'use strict';
try {

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';

// Tipos de documento por disciplina (visível ao usuário)
// shape:'single' → 1 registro por documento (ex: 1 ficha de concretagem = 1 row)
// shape:'array'  → N registros por documento (ex: lista de materiais = N rows)
// arrayKeys     → dicas de quais chaves do JSON da IA contêm os registros
const DOC_TYPES = {
  tubulacao: [
    {v:'isometrico',         l:'Isométrico (1 folha)',         table:'isometric_sheets',  shape:'single', desc:'Iso + materiais + juntas + suportes + EM detectados automaticamente'},
    {v:'lista_materiais',    l:'Lista de materiais (BM)',       table:'project_materials', shape:'array',  arrayKeys:['materials','materiais','items','bm','lista_materiais','records']},
    {v:'lista_suportes',     l:'Lista de suportes',             table:'supports',          shape:'array',  arrayKeys:['supports','suportes','records','items']},
    {v:'produtividade_hh',   l:'Parâmetros de produtividade (HH)', table:'productivity_params', shape:'array', arrayKeys:['params','parametros','items','records']}
  ],
  civil: [
    {v:'estrutura_concreto',    l:'Estrutura de concreto (memorial completo)', table:'civil_concrete_elements', shape:'single', desc:'Memorial + elementos + materiais detectados automaticamente'},
    {v:'ficha_concretagem',     l:'Ficha de concretagem (1 lançamento)', table:'civil_concrete_pours', shape:'single'},
    {v:'elementos_estruturais', l:'Lista de elementos estruturais', table:'civil_concrete_elements', shape:'array',  arrayKeys:['elements','elementos','items','records']},
    {v:'memorial_estrutural',   l:'Memorial estrutural',         table:'civil_concrete_pours',     shape:'single'},
    {v:'fundacao_sapata',       l:'Fundação / sapata',           table:'civil_concrete_elements',  shape:'array',  arrayKeys:['elements','elementos','items']},
    {v:'alvenaria',             l:'Alvenaria / blocos',          table:'project_materials',        shape:'array',  arrayKeys:['materials','materiais','items']},
    {v:'revestimento_acabamento', l:'Revestimento / acabamento', table:'project_materials',        shape:'array',  arrayKeys:['materials','materiais','items']}
  ],
  eletrica: [
    {v:'unifilar',                   l:'Diagrama unifilar (completo)',  table:'electrical_cables', shape:'single', desc:'Cabos + eletrodutos + painéis + aterramento detectados automaticamente'},
    {v:'lista_cabos',                l:'Lista de cabos',           table:'electrical_cables',    shape:'array', arrayKeys:['cables','cabos','records','items']},
    {v:'lista_eletrodutos',          l:'Lista de eletrodutos',     table:'eletroduct_runs',      shape:'array', arrayKeys:['conduits','eletrodutos','eletroduct','runs','records','items']},
    {v:'lista_quadros',              l:'Lista de quadros/painéis', table:'electrical_panels',    shape:'array', arrayKeys:['panels','paineis','records','items']},
    {v:'spda_aterramento_medicao',   l:'Medição SPDA (1 relatório)',table:'electrical_grounding', shape:'single'},
    {v:'iluminacao_luminotecnica',   l:'Luminotécnica / iluminação', table:'project_materials',  shape:'array', arrayKeys:['materials','materiais','items']}
  ],
  hidraulica: [
    {v:'projeto_hidrossanitario', l:'Projeto hidrossanitário (completo)', table:'hydraulic_systems', shape:'single', desc:'Sistema + tubos + reservatórios + bombas + materiais detectados automaticamente'}
  ],
  pintura: [
    {v:'inspecao_dft_relatorio', l:'Inspeção DFT (1 relatório)', table:'painting_inspections', shape:'single', desc:'Medições DFT + esquema + materiais detectados automaticamente'},
    {v:'inspecao_dft',           l:'Medições DFT (lote)',        table:'painting_inspections', shape:'array', arrayKeys:['inspections','medicoes','records','items']},
    {v:'esquema_pintura',        l:'Esquema de pintura',         table:'painting_inspections', shape:'single'}
  ],
  caldeiraria: [
    {v:'estruturas_metalicas', l:'Lista de estruturas (escadas, plataformas, vigas)', table:'structural_em_records', shape:'array', arrayKeys:['em','structures','estruturas','records','items'], desc:'Estruturas + perfis + materiais detectados automaticamente'},
    {v:'perfis_lista',         l:'Tabela de perfis (catálogo)',  table:'structural_profiles_catalog', shape:'array', arrayKeys:['profiles','perfis','records','items']}
  ]
};

function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

w.openDisciplineAIModal = function(disciplineCode){
  const types = DOC_TYPES[disciplineCode] || [];
  if(!types.length){ alert('Disciplina não reconhecida: '+disciplineCode); return; }

  // Estado interno do modal
  let _records = [];     // registros extraídos pela IA
  let _docTypeMeta = types[0];
  let _aiResponse = null;
  let _pdfFile = null;   // arquivo enviado (pra upload em Storage)

  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9700;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
  ov.setAttribute('data-ov','1');
  document.body.appendChild(ov);

  // ============================================================
  // FASE 1 — UPLOAD
  // ============================================================
  function renderUpload(){
    const typeOpts = types.map(t=>'<option value="'+t.v+'">'+esc(t.l)+'</option>').join('');
    ov.innerHTML = `
      <div style="background:#fff;border-radius:14px;width:100%;max-width:620px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">
        <div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#7C3AED,#5B21B6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">✨</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:800;color:#0F172A">Cadastro via IA — ${esc(disciplineCode.toUpperCase())}</div>
            <div style="font-size:11.5px;color:#64748B">Fase 1 de 3 · Upload do documento</div>
          </div>
          <button class="dai-x" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
        </div>
        <div style="flex:1;overflow:auto;padding:20px 22px">
          <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:6px;letter-spacing:.5px">Tipo de documento</label>
          <select id="dai-type" aria-label="Tipo de documento" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;background:#fff;margin-bottom:16px;font-family:inherit">${typeOpts}</select>

          <div id="dai-drop" style="border:2px dashed #C4B5FD;border-radius:12px;padding:36px;text-align:center;cursor:pointer;background:#F5F3FF;transition:background .15s">
            <div style="font-size:42px;margin-bottom:8px">📄</div>
            <div style="font-size:14px;font-weight:700;color:#5B21B6">Clique ou arraste o documento</div>
            <div style="font-size:11.5px;color:#7C3AED;margin-top:4px">PDF · PNG · JPG · CSV · XLSX (até 20 MB)</div>
          </div>
          <input type="file" id="dai-file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx" style="display:none">

          <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin:16px 0 6px;letter-spacing:.5px">Instruções extras (opcional)</label>
          <textarea id="dai-instr" rows="2" placeholder="ex: ignore linhas abaixo de 1 polegada, use código da coluna B como matrícula..." style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:12.5px;font-family:inherit;resize:vertical;outline:none"></textarea>

          <div id="dai-status" style="margin-top:14px"></div>
        </div>
        <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">
          <button class="dai-x" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Fechar</button>
        </div>
      </div>`;
    bindClose();
    const drop = ov.querySelector('#dai-drop');
    const inp = ov.querySelector('#dai-file');
    drop.onclick = ()=> inp.click();
    drop.ondragover = (e)=>{e.preventDefault();drop.style.background='#EDE9FE';};
    drop.ondragleave = ()=>{drop.style.background='#F5F3FF';};
    drop.ondrop = (e)=>{e.preventDefault();drop.style.background='#F5F3FF';if(e.dataTransfer.files[0]){inp.files=e.dataTransfer.files;processFile();}};
    inp.onchange = processFile;
  }

  function bindClose(){
    ov.querySelectorAll('.dai-x').forEach(b => b.onclick = ()=> ov.remove());
  }

  async function processFile(){
    const inp = ov.querySelector('#dai-file');
    const file = inp.files && inp.files[0];
    const status = ov.querySelector('#dai-status');
    if(!file) return;
    _pdfFile = file; // guarda pra upload em Storage depois
    if(file.size > 20*1024*1024){
      status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Arquivo muito grande (max 20 MB)</div>';
      return;
    }

    status.innerHTML='<div style="background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;border-radius:8px;padding:11px 14px;font-size:12.5px"><strong>⏳ Analisando com IA especializada...</strong><div style="font-size:11px;margin-top:3px;opacity:.8">30 a 90 segundos. Não feche essa janela.</div></div>';

    try {
      const docType = ov.querySelector('#dai-type').value;
      const instr = ov.querySelector('#dai-instr').value.trim();
      _docTypeMeta = types.find(t => t.v === docType) || types[0];

      let mime = file.type, b64;
      if(file.name.toLowerCase().endsWith('.xlsx')){
        if(!w.XLSX){
          status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Biblioteca XLSX não carregada. Recarregue a página.</div>';
          return;
        }
        const buf = await file.arrayBuffer();
        const wb = w.XLSX.read(buf,{type:'array'});
        const csv = w.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        b64 = btoa(unescape(encodeURIComponent(csv)));
        mime = 'text/csv';
      } else {
        b64 = await new Promise((res,rej)=>{
          const r=new FileReader();
          r.onload=()=>res(r.result.split(',')[1]);
          r.onerror=rej;
          r.readAsDataURL(file);
        });
      }

      const {data:{session}} = await w.sb.auth.getSession();
      if(!session){
        status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Sessão expirada. Faça login novamente.</div>';
        return;
      }

      const projId = (w._curProject && w._curProject.id) || w.curProj || null;
      const resp = await fetch(SB_URL+'/functions/v1/analyze-discipline-doc',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+session.access_token},
        body: JSON.stringify({
          file:b64, mime, project_id:projId,
          discipline_code:disciplineCode, document_type:docType,
          custom_instructions: instr || null
        })
      });
      const data = await resp.json();
      if(!resp.ok || data.error){
        status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">❌ '+esc(data.error||'HTTP '+resp.status)+'</div>';
        return;
      }

      // FALLBACK CRÍTICO: a edge function pode falhar em extrair JSON do response da IA
      // (quando a IA não fecha com ###FIM_DISCIPLINE_IA_JSON### ou usa formato diferente).
      // Aqui tentamos parsear de novo no frontend a partir do campo text.
      if((!data.extracted || Object.keys(data.extracted).length === 0) && data.text){
        const parsed = tryParseJsonFromText(data.text);
        if(parsed && typeof parsed === 'object'){
          console.log('[dai] Frontend fallback parseou JSON do text:', parsed);
          data.extracted = parsed;
          // Re-expõe arrays no topo do data (como a edge function fazia)
          for(const k in parsed){ if(Array.isArray(parsed[k])) data[k] = parsed[k]; }
          // E também espalha os campos planos no topo (pra extractRecords pegar)
          for(const k in parsed){
            if(typeof parsed[k] === 'string' || typeof parsed[k] === 'number' || typeof parsed[k] === 'boolean'){
              if(data[k] === undefined) data[k] = parsed[k];
            }
          }
        }
      }

      _aiResponse = data;
      _records = extractRecords(data, _docTypeMeta);
      console.log('[dai] AI response:', data);
      console.log('[dai] records extracted:', _records);

      // SEGUNDA TENTATIVA: se shape='single' não achou cabeçalho mas há categorias secundárias,
      // cria 1 registro vazio (placeholder) pra usuário poder ir pra Fase 2 e cadastrar o iso + secundárias
      if(!_records.length && _docTypeMeta.shape === 'single'){
        const sec = scanSecondaryCategories(data, _docTypeMeta.table);
        if(Object.keys(sec).length){
          // Tenta extrair o que conseguir do response, mesmo com valores null
          const root = (data && data.extracted) || data || {};
          const placeholder = {};
          for(const k in root){
            const v = root[k];
            if(v === null || v === undefined) continue;
            if(typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'){
              placeholder[k] = v;
            }
          }
          // Garante pelo menos campos essenciais vazios pro usuário preencher
          if(!placeholder.iso_number) placeholder.iso_number = '';
          if(!placeholder.line) placeholder.line = '';
          _records = [placeholder];
          console.log('[dai] Cabeçalho vazio mas tem secundárias — fase 2 com placeholder');
        }
      }

      if(!_records.length){
        const arraysFound = [];
        const scanForArrays = (obj) => {
          if(!obj || typeof obj !== 'object') return;
          for(const k in obj){
            if(Array.isArray(obj[k]) && obj[k].length && typeof obj[k][0] === 'object'){
              arraysFound.push({ key: k, count: obj[k].length });
            }
          }
        };
        scanForArrays(data);
        scanForArrays(data.extracted);

        if(_docTypeMeta.shape === 'single' && arraysFound.length){
          const arrInfo = arraysFound.map(a => '<code>'+esc(a.key)+'</code> ('+a.count+')').join(', ');
          status.innerHTML='<div style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong>⚠ Você escolheu "'+esc(_docTypeMeta.l)+'" (1 registro), mas a IA encontrou listas no documento:</strong><br>'+arrInfo+'<br><br>Volte e escolha o tipo correto:<br>• <strong>Lista de materiais</strong> — pra cadastrar materiais do iso<br>• <strong>Lista de juntas</strong> — pra cadastrar juntas<br>• <strong>Isométrico (1 folha)</strong> — só se o documento tem cabeçalho com número do iso, área, classe fluido</div>';
          return;
        }
        // Mostra preview do que a IA respondeu, pra debug
        // Prioriza raw_text (texto cru da IA) se disponivel, senão usa data completo
        const rawText = data.raw_text || JSON.stringify(data, null, 2);
        const rawSample = String(rawText).slice(0, 3000);
        console.log('[dai] FULL raw_text from edge function:', data.raw_text);
        console.log('[dai] FULL data from edge function:', JSON.stringify(data).slice(0,3000));
        status.innerHTML='<div style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:8px;padding:11px 14px;font-size:12.5px"><strong>⚠ A IA respondeu mas não consegui extrair registros estruturados.</strong><div style="margin-top:6px;font-size:11px">Possíveis causas:<br>1. PDF de baixa qualidade — re-escaneia em 300dpi+<br>2. Documento sem texto (puro desenho/blueprint)<br>3. Formato do JSON da IA mudou — abra o console (F12) pra ver detalhes</div><details open style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;font-size:11px">Ver resposta crua da IA</summary><pre style="max-height:400px;overflow:auto;font-size:10.5px;background:#FFF;padding:8px;border-radius:4px;margin-top:4px;border:1px solid #FDE68A;font-family:ui-monospace,monospace">'+esc(rawSample)+'</pre></details></div>';
        return;
      }
      // Vai pra fase 2 — REVISÃO
      renderReview();
    } catch(e){
      status.innerHTML='<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">❌ '+esc(e.message||e)+'</div>';
    }
  }

  // Tenta extrair JSON de um texto cru — múltiplas estratégias
  function tryParseJsonFromText(text){
    if(!text || typeof text !== 'string') return null;
    // Estratégia 1: marcadores ###DISCIPLINE_IA_JSON### ... ###FIM_DISCIPLINE_IA_JSON###
    let m = text.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*?)\s*###FIM_DISCIPLINE_IA_JSON###/);
    if(m && m[1]){
      try { return JSON.parse(m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim()); } catch(e){ console.warn('[dai] parse 1 fail:', e.message); }
    }
    // Estratégia 2: marcador de início mas sem fim — pega até o último } balanceado
    m = text.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*)$/);
    if(m && m[1]){
      const trimmed = m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```[\s\S]*$/,'').trim();
      const balanced = extractBalancedJson(trimmed);
      if(balanced){ try { return JSON.parse(balanced); } catch(e){ console.warn('[dai] parse 2 fail:', e.message); } }
    }
    // Estratégia 3: procura o maior bloco { ... } balanceado em qualquer lugar
    const balanced = extractBalancedJson(text);
    if(balanced){ try { return JSON.parse(balanced); } catch(e){ console.warn('[dai] parse 3 fail:', e.message); } }
    // Estratégia 4: bloco markdown ```json ... ```
    m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if(m && m[1]){ try { return JSON.parse(m[1].trim()); } catch(e){ console.warn('[dai] parse 4 fail:', e.message); } }
    return null;
  }

  // Acha o maior bloco { ... } com chaves balanceadas no texto
  function extractBalancedJson(text){
    if(!text) return null;
    const start = text.indexOf('{');
    if(start < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for(let i = start; i < text.length; i++){
      const c = text[i];
      if(inStr){
        if(esc){ esc = false; continue; }
        if(c === '\\'){ esc = true; continue; }
        if(c === '"'){ inStr = false; continue; }
        continue;
      }
      if(c === '"'){ inStr = true; continue; }
      if(c === '{') depth++;
      else if(c === '}'){
        depth--;
        if(depth === 0) return text.slice(start, i+1);
      }
    }
    return null;
  }

  // Heurística pra encontrar registros na resposta da IA
  // Usa hint de shape ('single' ou 'array') + chaves preferenciais do DOC_TYPES
  function extractRecords(data, docMeta){
    if(!data) return [];
    const shape = (docMeta && docMeta.shape) || 'array';
    const preferredKeys = (docMeta && docMeta.arrayKeys) || [];

    // Função helper: extrai todos os arrays de objetos do nível raiz
    const findArrays = (obj) => {
      const arrs = [];
      for(const k in obj){
        if(Array.isArray(obj[k]) && obj[k].length && typeof obj[k][0] === 'object' && !Array.isArray(obj[k][0])){
          arrs.push({ key: k, data: obj[k] });
        }
      }
      return arrs;
    };

    // Função helper: extrai campos planos (não-array, não-objeto-complexo) como 1 registro
    const extractFlat = (obj) => {
      if(!obj || typeof obj !== 'object') return [];
      const flat = {};
      for(const k in obj){
        const v = obj[k];
        if(v === null || v === undefined) continue;
        // Aceita primitivos diretos
        if(typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'){
          flat[k] = v;
        }
        // Aceita objetos pequenos como info (não arrays)
      }
      return Object.keys(flat).length >= 1 ? [flat] : [];
    };

    // CASO A — shape 'array': procura array correto (preferenciais primeiro)
    if(shape === 'array'){
      // 1) Tenta chaves preferenciais do DOC_TYPES
      for(const k of preferredKeys){
        if(Array.isArray(data[k]) && data[k].length) return data[k];
        if(data.extracted && Array.isArray(data.extracted[k]) && data.extracted[k].length) return data.extracted[k];
      }
      // 2) Chaves canônicas genéricas
      for(const k of ['records','items','rows','data']){
        if(Array.isArray(data[k]) && data[k].length && typeof data[k][0] === 'object') return data[k];
        if(data.extracted && Array.isArray(data.extracted[k]) && data.extracted[k].length) return data.extracted[k];
      }
      // 3) Pega o MAIOR array disponível (mais provavel ser a lista de registros)
      const root = data.extracted || data;
      const arrs = findArrays(root);
      if(arrs.length){
        arrs.sort((a,b) => b.data.length - a.data.length);
        return arrs[0].data;
      }
      // 4) Fallback: trata o objeto raiz como 1 registro só
      return extractFlat(root);
    }

    // CASO B — shape 'single': procura objeto plano (1 registro principal)
    // Os arrays auxiliares (ex: materiais dentro de um iso) são IGNORADOS aqui
    // — eles podem ser cadastrados separadamente com o tipo correto.
    const root = data.extracted || data;
    const flat = extractFlat(root);
    if(flat.length) return flat;
    // Se não há campos planos suficientes, procura objeto aninhado típico
    for(const k of ['record','item','data','iso','sheet','main']){
      if(root[k] && typeof root[k] === 'object' && !Array.isArray(root[k])){
        const f = extractFlat(root[k]);
        if(f.length) return f;
      }
    }
    return [];
  }

  // ============================================================
  // FASE 2 — REVISÃO (tabela com dados extraídos)
  // ============================================================
  // Cache da lista de projetos (carrega 1 vez)
  let _projectsList = null;
  async function loadProjectsList(){
    if(_projectsList) return _projectsList;
    // Primeiro tenta usar a lista global do v9 (já carregada)
    if(Array.isArray(w.projects) && w.projects.length){
      _projectsList = w.projects.map(p => ({ id: p.id, name: p.name, client: p.client }));
      return _projectsList;
    }
    // Fallback: consulta Supabase
    try {
      const sb = w.sb;
      const orgId = w._org && w._org.id;
      const r = await sb.from('projects').select('id, name, client').eq('org_id', orgId).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
      _projectsList = r.data || [];
    } catch(_){ _projectsList = []; }
    return _projectsList;
  }

  function getActiveProjectId(){
    if(w._curProject && w._curProject.id) return w._curProject.id;
    if(w.curProj) return w.curProj;
    try { return localStorage.getItem('pia.curProj') || null; } catch(_){ return null; }
  }

  async function renderReview(){
    // Descobre todas as colunas presentes nos registros
    const cols = collectColumns(_records);
    const desc = _aiResponse && _aiResponse.text ? _aiResponse.text : '';
    const projects = await loadProjectsList();
    const curPid = getActiveProjectId();
    const curProj = projects.find(p => String(p.id) === String(curPid));

    // PREVIEW: varre _aiResponse pra detectar categorias secundárias (materials, joints, etc.)
    const secPreview = scanSecondaryCategories(_aiResponse, _docTypeMeta.table);
    // Expõe globalmente pra edição inline persistir (cada cell input atualiza secPreview[tbl].rows[i][k])
    w._daiSecPreview = secPreview;
    const SEC_LABELS = {
      'project_materials':{ icon:'📦', label:'Materiais', cols:['code','description','category','material_type','diameter_in','schedule','pressure_class','unit','quantity'] },
      'joints':{ icon:'🔗', label:'Juntas', cols:['joint_number','joint_type','diameter_in','schedule','spool_id_ref'] },
      'supports':{ icon:'🪛', label:'Suportes', cols:['code','support_type','location','weight_kg','tipo_padrao','material'] },
      'structural_em_records':{ icon:'🏗️', label:'Estruturas metálicas', cols:['code','perfil','description','quantity','weight_kg'] },
      'electrical_cables':{ icon:'🔌', label:'Cabos elétricos', cols:['cable_tag','origin','destination','voltage_v','cable_type','cross_section_mm2','length_m'] },
      'eletroduct_runs':{ icon:'⚡', label:'Eletrodutos', cols:['tag','diameter_mm','length_m','supports_qty'] },
      'electrical_panels':{ icon:'📊', label:'Painéis elétricos', cols:['panel_tag','panel_type','protection_class'] }
    };
    const COL_LABELS = {
      code:'Código', description:'Descrição', category:'Categoria', material_type:'Material',
      diameter_in:'Diâm. (in)', schedule:'Sch.', pressure_class:'Classe', unit:'Un.', quantity:'Qtd.',
      joint_number:'N° Junta', joint_type:'Tipo', spool_id_ref:'Spool',
      support_type:'Tipo', location:'Localização', weight_kg:'Peso (kg)', tipo_padrao:'Padrão', material:'Material',
      perfil:'Perfil',
      cable_tag:'Tag', origin:'Origem', destination:'Destino', voltage_v:'V', cable_type:'Tipo cabo',
      cross_section_mm2:'Seção (mm²)', length_m:'Comp. (m)',
      tag:'Tag', diameter_mm:'Diâm. (mm)', supports_qty:'N° sup.',
      panel_tag:'Tag', panel_type:'Tipo', protection_class:'IP'
    };
    const secEntries = Object.entries(secPreview);
    const secPreviewHtml = secEntries.length ? (
      '<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:12px 14px;margin-bottom:12px">'+
      '<div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px;display:flex;align-items:center;gap:6px">🎯 Categorias adicionais detectadas <span style="background:#10B981;color:#fff;padding:1px 7px;border-radius:10px;font-size:10.5px">'+secEntries.reduce((s,[,v])=>s+v.rows.length,0)+' itens</span> <span style="font-size:10.5px;font-weight:500;color:#047857;margin-left:auto">Clique em qualquer célula pra editar</span></div>'+
      secEntries.map(([tbl,data])=>{
        const m = SEC_LABELS[tbl] || { icon:'📋', label: tbl, cols: Object.keys(data.rows[0]||{}).slice(0,6) };
        // Decide colunas: usa as preferenciais que TENHAM valor em pelo menos 1 linha + extras encontradas
        const preferredCols = m.cols.filter(c => data.rows.some(r => r[c] != null && r[c] !== ''));
        const extraCols = Array.from(new Set(data.rows.flatMap(r => Object.keys(r)))).filter(c => !preferredCols.includes(c) && !['id'].includes(c) && data.rows.some(r => r[c] != null && r[c] !== ''));
        const cols = preferredCols.length ? preferredCols : extraCols.slice(0,6);
        // Header da seção
        const sectionId = 'sec-'+tbl;
        const rows = data.rows;
        return '<details open style="margin:8px 0;background:#fff;border:1px solid #BBF7D0;border-radius:6px;overflow:hidden">'+
          '<summary style="padding:8px 12px;cursor:pointer;font-size:12px;color:#065F46;display:flex;align-items:center;gap:8px;list-style:none;user-select:none">'+
            '<span style="font-size:15px">'+m.icon+'</span>'+
            '<strong>'+esc(m.label)+'</strong>'+
            '<span style="background:#10B981;color:#fff;padding:1px 7px;border-radius:10px;font-size:10.5px;font-weight:700">'+rows.length+'</span>'+
            '<span style="margin-left:auto;font-size:10.5px;opacity:.7">▼ expandir/colapsar</span>'+
          '</summary>'+
          '<div style="max-height:280px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;font-family:inherit">'+
            '<thead style="background:#F0FDF4;position:sticky;top:0"><tr>'+
              '<th style="padding:5px 8px;text-align:center;color:#065F46;font-weight:700;font-size:10px;border-bottom:1px solid #BBF7D0;width:30px">#</th>'+
              cols.map(c => '<th style="padding:5px 8px;text-align:left;color:#065F46;font-weight:700;font-size:10px;border-bottom:1px solid #BBF7D0;white-space:nowrap">'+esc(COL_LABELS[c]||c)+'</th>').join('')+
            '</tr></thead>'+
            '<tbody>'+
              rows.map((r,i)=>{
                return '<tr style="border-bottom:1px solid #F0FDF4">'+
                  '<td style="padding:0;color:#64748B;text-align:center;font-size:10px;background:#FAFBFC;font-family:ui-monospace,monospace">'+(i+1)+'</td>'+
                  cols.map(c => {
                    const v = r[c]; const val = (v==null?'':String(v));
                    return '<td style="padding:0;min-width:80px"><input type="text" class="dai-sec-cell" data-tbl="'+esc(tbl)+'" data-i="'+i+'" data-k="'+esc(c)+'" value="'+esc(val)+'" style="width:100%;border:none;background:transparent;padding:5px 8px;font-size:11px;font-family:inherit;color:#0F172A;outline:none" onfocus="this.style.background=\'#FFFBEB\'" onblur="this.style.background=\'transparent\'"></td>';
                  }).join('')+
                '</tr>';
              }).join('')+
            '</tbody>'+
          '</table></div>'+
        '</details>';
      }).join('')+
      '<div style="font-size:11px;color:#047857;margin-top:10px;padding-top:6px;border-top:1px dashed #86EFAC">✓ Tudo acima será cadastrado junto quando você confirmar — no mesmo projeto, vinculado ao iso. Edite qualquer célula antes de confirmar pra corrigir o que a IA errou.</div>'+
      '</div>'
    ) : '';

    ov.innerHTML = `
      <div style="background:#fff;border-radius:14px;width:100%;max-width:1080px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(15,23,42,.25);overflow:hidden">
        <div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#FAFBFC;display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">✓</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:800;color:#0F172A">Revisar dados extraídos — ${esc(_docTypeMeta.l)}</div>
            <div style="font-size:11.5px;color:#64748B">Fase 2 de 3 · ${_records.length} registro(s) encontrado(s)</div>
          </div>
          <button class="dai-x" style="background:transparent;border:1px solid #E5E7EB;color:#475569;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:18px">×</button>
        </div>

        <div style="flex:1;overflow:auto;padding:18px 22px">
          <!-- SELETOR DE PROJETO (obrigatório pra tabelas com project_id NOT NULL) -->
          <div id="dai-proj-bar" style="background:${curProj?'#F0FDF4':'#FEF2F2'};border:1px solid ${curProj?'#86EFAC':'#FCA5A5'};border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-size:12.5px">
            <span style="font-size:16px">${curProj?'📁':'⚠️'}</span>
            <span style="flex:1;color:${curProj?'#166534':'#991B1B'}">
              <strong>${curProj?'Cadastrar no projeto:':'Selecione um projeto:'}</strong>
              <select id="dai-proj-select" aria-label="Selecionar projeto" style="margin-left:8px;padding:5px 10px;border:1px solid ${curProj?'#86EFAC':'#FCA5A5'};border-radius:6px;font-size:12.5px;background:#fff;font-family:inherit;font-weight:700;cursor:pointer">
                <option value="">— selecione —</option>
                ${projects.map(p => `<option value="${esc(p.id)}" ${String(p.id)===String(curPid)?'selected':''}>${esc(p.name)}${p.client?' · '+esc(p.client):''}</option>`).join('')}
              </select>
            </span>
            ${projects.length===0?'<span style="color:#991B1B;font-size:11px">Nenhum projeto disponível — crie um em Projetos antes.</span>':''}
          </div>

          ${secPreviewHtml}
          ${desc ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1E3A8A;line-height:1.5"><strong>💡 Análise da IA:</strong> ${esc(desc.slice(0, 600))}${desc.length > 600 ? '...' : ''}</div>` : ''}

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:#0F172A">📊 ${_records.length} registros prontos pra cadastrar</div>
            <div style="flex:1"></div>
            <button id="dai-back" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:11.5px;font-family:inherit">← Trocar arquivo</button>
          </div>

          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:11.5px;color:#1E3A8A;display:flex;align-items:center;gap:8px">
            <span style="font-size:14px">✏️</span>
            <span><strong>Clique em qualquer célula para editar.</strong> Você pode preencher campos vazios, corrigir o que a IA errou, ou deixar em branco (a tabela aceita null nos campos opcionais).</span>
          </div>

          <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
            <div style="overflow:auto;max-height:50vh">
              <table style="width:100%;border-collapse:collapse;font-size:11.5px;font-family:inherit">
                <thead style="background:#F8FAFC;position:sticky;top:0;z-index:1">
                  <tr>
                    <th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap;width:60px">✓ #</th>
                    ${cols.map(c => `<th style="padding:8px 10px;text-align:left;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #E5E7EB;white-space:nowrap">${esc(c)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${_records.map((r, i) => `<tr style="border-bottom:1px solid #F1F5F9">
                    <td style="padding:5px 10px;text-align:center;color:#64748B;font-family:ui-monospace,monospace;font-size:10.5px;background:#FAFBFC"><input type="checkbox" class="dai-row-chk" data-i="${i}" checked style="cursor:pointer"> <span style="margin-left:4px">${i+1}</span></td>
                    ${cols.map(c => `<td style="padding:0;color:#0F172A;min-width:120px;max-width:240px"><input type="text" class="dai-cell" data-i="${i}" data-k="${esc(c)}" value="${esc(r[c]==null?'':r[c])}" style="width:100%;border:none;background:transparent;padding:7px 10px;font-size:11.5px;font-family:inherit;color:#0F172A;outline:none" onfocus="this.style.background='#FFFBEB'" onblur="this.style.background='transparent'"></td>`).join('')}
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex;gap:10px;align-items:center;margin-top:14px;font-size:12px;color:#64748B;flex-wrap:wrap">
            <button id="dai-toggle-all" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:5px 11px;border-radius:6px;cursor:pointer;font-weight:600;font-size:11.5px;font-family:inherit">Marcar/desmarcar todos</button>
            <button id="dai-add-row" style="background:#fff;color:#10B981;border:1px solid #BBF7D0;padding:5px 11px;border-radius:6px;cursor:pointer;font-weight:600;font-size:11.5px;font-family:inherit">+ Adicionar linha vazia</button>
            <span><strong id="dai-count">${_records.length}</strong> selecionados</span>
          </div>

          <div id="dai-status2" style="margin-top:14px"></div>
        </div>

        <div style="padding:14px 22px;border-top:1px solid #F1F5F9;background:#FAFBFC;display:flex;justify-content:flex-end;gap:10px">
          <button class="dai-x" style="background:#fff;color:#475569;border:1px solid #E5E7EB;padding:9px 18px;border-radius:7px;cursor:pointer;font-weight:600;font-size:12.5px;font-family:inherit">Cancelar</button>
          <button id="dai-save" style="background:#10B981;color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12.5px;font-family:inherit">✓ Cadastrar selecionados (${_records.length})</button>
        </div>
      </div>`;
    bindClose();

    const updateCount = ()=>{
      const n = ov.querySelectorAll('.dai-row-chk:checked').length;
      ov.querySelector('#dai-count').textContent = n;
      ov.querySelector('#dai-save').textContent = '✓ Cadastrar selecionados (' + n + ')';
    };
    ov.querySelectorAll('.dai-row-chk').forEach(c => c.onchange = updateCount);
    ov.querySelector('#dai-toggle-all').onclick = ()=>{
      const chks = ov.querySelectorAll('.dai-row-chk');
      const allChecked = Array.from(chks).every(c => c.checked);
      chks.forEach(c => c.checked = !allChecked);
      updateCount();
    };

    // EDIÇÃO INLINE: cada input atualiza _records em tempo real
    ov.querySelectorAll('.dai-cell').forEach(inp => {
      inp.oninput = (e)=>{
        const i = +e.target.dataset.i;
        const k = e.target.dataset.k;
        const v = e.target.value;
        if(_records[i]){
          _records[i][k] = v === '' ? null : v;
        }
      };
    });

    // EDIÇÃO INLINE das tabelas secundárias (materiais, juntas, suportes, etc.)
    // Cada input atualiza secPreview[tbl].rows[i][k] em tempo real.
    // Quando o usuário confirmar, o doSave vai re-scan secPreview do _aiResponse atualizado.
    ov.querySelectorAll('.dai-sec-cell').forEach(inp => {
      inp.oninput = (e)=>{
        const tbl = e.target.dataset.tbl;
        const i = +e.target.dataset.i;
        const k = e.target.dataset.k;
        const v = e.target.value;
        const sec = w._daiSecPreview && w._daiSecPreview[tbl];
        if(sec && sec.rows[i]){
          sec.rows[i][k] = v === '' ? null : v;
        }
      };
    });

    // ADICIONAR LINHA VAZIA: cria um novo registro em branco com mesmas colunas
    ov.querySelector('#dai-add-row').onclick = ()=>{
      const cols2 = collectColumns(_records);
      const blank = {};
      cols2.forEach(c => blank[c] = null);
      _records.push(blank);
      renderReview(); // re-render pra mostrar nova linha
    };

    ov.querySelector('#dai-back').onclick = ()=>{ _records = []; _aiResponse = null; renderUpload(); };
    ov.querySelector('#dai-save').onclick = doSave;
  }

  function collectColumns(records){
    const set = new Set();
    records.forEach(r => { if(r && typeof r === 'object') Object.keys(r).forEach(k => set.add(k)); });
    return Array.from(set);
  }

  // Dicionário de aliases PT-BR → coluna real (universal pra todas tabelas)
  // Inclui colunas comuns das tabelas: isometric_sheets, joints, project_materials,
  // electrical_cables, eletroduct_runs, supports, structural_em_records,
  // civil_concrete_pours, electrical_panels, painting_inspections, technical_drawings, etc.
  const FIELD_ALIASES = {
    // === ISOMÉTRICOS (isometric_sheets) ===
    'numero_iso': 'iso_number', 'numero': 'iso_number', 'iso': 'iso_number', 'no_iso': 'iso_number',
    'folha': 'sheet_number', 'sheet': 'sheet_number', 'no_folha': 'sheet_number',
    'total_folhas': 'total_sheets',
    'revisao': 'revision', 'rev': 'revision',
    'linha': 'line', 'tag_linha': 'line', 'linha_tag': 'line',
    'nr_13': 'nr13', 'nr13_aplicavel': 'nr13',
    'classe_inspecao': 'inspection_class', 'classe_de_inspecao': 'inspection_class', 'classe_insp': 'inspection_class',
    'classe_fluido': 'fluid_class', 'classe_do_fluido': 'fluid_class', 'fluido': 'fluid_class',
    'isolamento_termico': 'thermal_insulation', 'isolamento': 'thermal_insulation',
    'temperatura_operacao': 'operating_temp', 't_op': 'operating_temp', 'temp_op': 'operating_temp', 'temperatura': 'operating_temp',
    'pintura': 'paint_status', 'status_pintura': 'paint_status',
    'teste_hidrostatico': 'hydro_test', 't_h': 'hydro_test', 'th': 'hydro_test',
    'iso_categoria': 'iso_category', 'categoria_iso': 'iso_category',
    // === JUNTAS (joints) ===
    'numero_junta': 'joint_number', 'no_junta': 'joint_number', 'junta_num': 'joint_number',
    'diametro_polegadas': 'diameter_in', 'diametro': 'diameter_in', 'diam': 'diameter_in', 'diam_in': 'diameter_in',
    'sched': 'schedule',
    'spool': 'spool_id_ref', 'spool_id': 'spool_id_ref',
    // === MATERIAIS (project_materials, materials_catalog) ===
    'codigo': 'code', 'cod': 'code',
    'descricao': 'description', 'desc': 'description',
    'categoria': 'category',
    'tipo_material': 'material_type',
    'unidade': 'unit', 'un': 'unit',
    'qtd': 'quantity', 'qty': 'quantity', 'quantidade': 'quantity',
    'classe_pressao': 'pressure_class', 'rating': 'pressure_class',
    // === CABOS (electrical_cables) ===
    'tag_cabo': 'cable_tag', 'tag': 'tag', 'cabo_tag': 'cable_tag',
    'origem': 'origin', 'de': 'origin', 'from': 'origin',
    'destino': 'destination', 'para': 'destination', 'to': 'destination',
    'funcao': 'function_type', 'tipo_funcao': 'function_type',
    'tensao_v': 'voltage_v', 'tensao': 'voltage_v', 'voltagem': 'voltage_v',
    'corrente_a': 'current_a', 'corrente': 'current_a',
    'tipo_cabo': 'cable_type',
    'secao_mm2': 'cross_section_mm2', 'secao': 'cross_section_mm2', 'bitola': 'cross_section_mm2',
    'isolacao': 'insulation', 'isolante': 'insulation',
    'comprimento_m': 'length_m', 'comprimento': 'length_m', 'metragem': 'length_m', 'extensao': 'length_m',
    'instalado': 'installed', 'lancado': 'installed',
    'servico': 'service_type', 'tipo_servico': 'service_type',
    // === ELETRODUTOS (eletroduct_runs) ===
    'disciplina': 'discipline',
    'diametro_mm': 'diameter_mm', 'diam_mm': 'diameter_mm',
    'quantidade_suportes': 'supports_qty', 'qtd_suportes': 'supports_qty',
    // === SUPORTES (supports) ===
    'tipo_suporte': 'support_type', 'tipo_padrao': 'tipo_padrao',
    'localizacao': 'location', 'local': 'location',
    'iso_referencia': 'iso_ref', 'iso_ref': 'iso_ref',
    'peso_kg': 'weight_kg', 'peso': 'weight_kg',
    // === ESTRUTURAS METÁLICAS (structural_em_records) ===
    'perfil': 'perfil',
    'peso_total_kg': 'peso_kg',
    // === CIVIL CONCRETE POURS ===
    'codigo_concretagem': 'pour_code', 'pour_code': 'pour_code',
    'data_concretagem': 'pour_date', 'pour_date': 'pour_date',
    'nome_elemento': 'element_name', 'elemento': 'element_name',
    'volume': 'volume_m3', 'volume_concreto': 'volume_m3',
    'fck': 'fck_mpa',
    'slump': 'slump_mm',
    // === PAINEIS ELÉTRICOS ===
    'tipo_painel': 'panel_type', 'tag_painel': 'panel_tag',
    'classe_protecao': 'protection_class', 'ip': 'protection_class',
    // === PINTURA ===
    'codigo_inspecao': 'inspection_code', 'inspection_code': 'inspection_code',
    'data_inspecao': 'inspection_date',
    'elemento_pintado': 'element_painted',
    'esquema': 'scheme',
    'dft_total': 'dft_total_um',
    'area_pintura': 'area_m2',
    'demaos': 'qtd_demaos',
    'inspetor': 'inspector',
    'resultado': 'result',
    // === TECHNICAL DRAWINGS ===
    'titulo': 'title',
    'tipo': 'tipo',
    'formato': 'format',
    'escala': 'scale',
    'autor': 'author', 'projetista': 'author',
    'revisor': 'reviewer',
    'aprovador': 'approver',
    'data_emissao': 'issue_date', 'data_de_emissao': 'issue_date',
    'prazo': 'due_date', 'data_prazo': 'due_date',
    'frente': 'frente'
  };

  // === NORMALIZADORES DE VALOR ===
  // Tabelas têm check constraints que exigem valores específicos (ex: nr13 = 'Sim'/'Não').
  // Esses normalizadores convertem variações comuns (SIM, sim, yes, 1, S) pro valor aceito.
  function _strip(v){ return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function _clamp(v, min, max){ const n = parseFloat(v); if(isNaN(n)) return null; return Math.max(min, Math.min(max, n)); }
  const VALUE_NORMALIZERS = {
    // Sim/Não
    nr13: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/^(s|sim|yes|y|true|1|aplicavel|aplicaveis)$/.test(s)) return 'Sim';
      if(/^(n|nao|no|false|0|nao.aplicavel|na|n\/a)$/.test(s)) return 'Não';
      return null;
    },
    hydro_test: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/^(pendente|aguard|pending)/.test(s)) return 'Pendente';
      if(/^(s|sim|yes|aprovado|ok|done|concluido|realizado)/.test(s)) return 'Sim';
      if(/^(n|nao|no|reprovado|falha)/.test(s)) return 'Não';
      return null;
    },
    torque: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/^(pendente|aguard|pending)/.test(s)) return 'Pendente';
      if(/^(s|sim|yes|aplicado|ok|done|realizado)/.test(s)) return 'Sim';
      if(/^(n|nao|no)/.test(s)) return 'Não';
      return null;
    },
    paint_status: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/n[ao]o.*pintado|sem.pintura|primer|nao.pintado/.test(s)) return 'Não Pintado';
      if(/pintado|pintura.completa|finalizado/.test(s)) return 'Pintado';
      return null;
    },
    iso_category: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/refer/.test(s)) return 'referencia';
      if(/desmonta|cancela/.test(s)) return 'desmontagem_cancelamento';
      if(/monta/.test(s)) return 'montagem';
      return null;
    },
    fab_pre: (v) => _clamp(v, 0, 100),
    fab_sol: (v) => _clamp(v, 0, 100),
    fab_end: (v) => _clamp(v, 0, 100),
    fab_progress_pct: (v) => _clamp(v, 0, 100),
    mon_pre: (v) => _clamp(v, 0, 100),
    mon_sol: (v) => _clamp(v, 0, 100),
    mon_end: (v) => _clamp(v, 0, 100),
    mon_progress_pct: (v) => _clamp(v, 0, 100),
    progress_pct: (v) => _clamp(v, 0, 100),
    avanco_pct: (v) => _clamp(v, 0, 100),
    // Booleanos (electrical_cables, etc.)
    installed: (v) => { const s = _strip(v); if(/^(s|sim|yes|true|1|lancado|instalado)$/.test(s)) return true; if(/^(n|nao|no|false|0)$/.test(s)) return false; return null; },
    nr10_compliant: (v) => { const s = _strip(v); if(/^(s|sim|yes|true|1|conforme)$/.test(s)) return true; if(/^(n|nao|no|false|0)$/.test(s)) return false; return null; },
    continuity_ok: (v) => { const s = _strip(v); if(/^(s|sim|yes|true|1|ok)$/.test(s)) return true; if(/^(n|nao|no|false|0)$/.test(s)) return false; return null; },
    // Enum support_type: fixo, guia, mola, deslizante, amortecedor, outro
    support_type: (v) => {
      const s = _strip(v);
      if(!s) return 'fixo';
      if(/fix|rigid/.test(s)) return 'fixo';
      if(/guia|guide/.test(s)) return 'guia';
      if(/mola|spring/.test(s)) return 'mola';
      if(/desliz|slid/.test(s)) return 'deslizante';
      if(/amortec|damp|snubber/.test(s)) return 'amortecedor';
      return 'outro';
    },
    // Enum generic_status
    status: (v) => {
      const s = _strip(v);
      if(!s) return 'pendente';
      if(/conclu|done|finished|aprov/.test(s)) return 'concluido';
      if(/andamento|progress|fab/.test(s)) return 'em_andamento';
      if(/reprov|rejei|reject/.test(s)) return 'reprovado';
      return 'pendente';
    },
    // Enum support_status_ext
    status_ext: (v) => {
      const s = _strip(v);
      if(!s) return 'projetado';
      if(/projetad|design/.test(s)) return 'projetado';
      if(/fabric/.test(s)) return 'fabricado';
      if(/pint/.test(s)) return 'pintado';
      if(/instal/.test(s)) return 'instalado';
      if(/inspec/.test(s)) return 'inspecionado';
      if(/aprov/.test(s)) return 'aprovado';
      if(/rejeit/.test(s)) return 'rejeitado';
      return 'projetado';
    },
    // Enum joint_type (BW/SW/SK/FL → topo/encaixe/rosqueada/flangeada)
    joint_type: (v) => {
      const s = _strip(v);
      if(!s) return 'topo';
      if(/^bw$|topo|butt|^b$/.test(s)) return 'topo';
      if(/^sw$|encaixe|socket|^s$/.test(s)) return 'encaixe';
      if(/rosq|thread|^th$|^t$/.test(s)) return 'rosqueada';
      if(/^fl$|flang/.test(s)) return 'flangeada';
      return 'outra';
    },
    // joint_status (usado em joints)
    joint_status_field: (v) => {
      const s = _strip(v);
      if(!s) return 'pendente';
      if(/aprov/.test(s)) return 'aprovada';
      if(/reprov|reject/.test(s)) return 'reprovada';
      if(/inspec/.test(s)) return 'inspecionada';
      if(/exec|done|conclu/.test(s)) return 'executada';
      if(/retrab/.test(s)) return 'retrabalhada';
      return 'pendente';
    },
    welding_process: (v) => {
      const s = _strip(v);
      if(!s) return null;
      if(/eletrod|smaw/.test(s)) return 'eletrodo';
      if(/tig|gtaw/.test(s)) return 'tig';
      if(/mig|mag|gmaw/.test(s)) return 'mig_mag';
      if(/arame|fcaw/.test(s)) return 'arame_tubular';
      return 'outro';
    }
  };
  function normalizeValue(col, val){
    if(val === null || val === undefined || val === '') return val;
    const fn = VALUE_NORMALIZERS[col];
    if(!fn) return val;
    const out = fn(val);
    return out; // pode ser null se não conseguiu normalizar — daí o filtro abaixo descarta
  }

  function normalizeKey(k){
    return String(k||'').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')   // remove acentos
      .replace(/[\s\-]+/g,'_')
      .replace(/[^a-z0-9_]/g,'')
      .replace(/_+/g,'_')
      .replace(/^_|_$/g,'');
  }
  function aliasKey(k){
    const nk = normalizeKey(k);
    return FIELD_ALIASES[nk] || nk;
  }

  // Cache de schemas por tabela: { tableName: Set<columnName> }
  const _schemaCache = {};

  // Descobre as colunas reais da tabela.
  // Estratégia 1: RPC get_table_columns (information_schema) — funciona com tabela vazia
  // Estratégia 2 (fallback): SELECT * LIMIT 1 — só funciona se a tabela tem dados
  async function getTableColumns(tableName){
    if(_schemaCache[tableName] !== undefined) return _schemaCache[tableName];
    const sb = w.sb;
    if(!sb){ return null; }

    // Estratégia 1: RPC
    try {
      const r = await sb.rpc('get_table_columns', { p_table: tableName });
      if(!r.error && r.data && r.data.found && Array.isArray(r.data.columns) && r.data.columns.length){
        const cols = new Set(r.data.columns);
        _schemaCache[tableName] = cols;
        console.log('[dai] schema via RPC pra', tableName, ':', r.data.columns.length, 'colunas');
        return cols;
      }
    } catch(e){
      console.warn('[dai] RPC get_table_columns falhou, tentando fallback:', e?.message||e);
    }

    // Estratégia 2: SELECT (só funciona com tabela populada)
    try {
      const r = await sb.from(tableName).select('*').limit(1);
      if(!r.error && r.data && r.data.length > 0){
        const cols = new Set(Object.keys(r.data[0]));
        _schemaCache[tableName] = cols;
        return cols;
      }
    } catch(e){ console.warn('[dai] SELECT fallback falhou:', e); }

    // Sem schema descoberto — o INSERT vai usar o retry inteligente
    _schemaCache[tableName] = null;
    return null;
  }

  // Sanitiza payload pra conter só colunas existentes na tabela
  function filterPayloadBySchema(payload, validCols){
    if(!validCols) return { kept: payload, dropped: [] };
    const kept = {};
    const dropped = [];
    for(const k in payload){
      if(validCols.has(k)) kept[k] = payload[k];
      else dropped.push(k);
    }
    return { kept, dropped };
  }

  // ============================================================
  // CATEGORIAS SECUNDÁRIAS — quando o documento (ex: isométrico) traz
  // junto listas de materiais, juntas, suportes, EM, etc., a IA retorna
  // esses arrays nested e nós cadastramos cada um na sua tabela própria.
  // ============================================================
  const SECONDARY_TABLE_MAP = {
    // === MATERIAIS (todas as disciplinas) ===
    materials: 'project_materials', materiais: 'project_materials',
    bm: 'project_materials', lista_materiais: 'project_materials',
    lista_de_materiais: 'project_materials', materials_list: 'project_materials',
    insumos: 'project_materials', items: 'project_materials',
    // === TUBULAÇÃO ===
    joints: 'joints', juntas: 'joints', lista_juntas: 'joints',
    welds: 'joints', soldas: 'joints',
    supports: 'supports', suportes: 'supports', lista_suportes: 'supports',
    // === ESTRUTURAS METÁLICAS / CALDEIRARIA ===
    em: 'structural_em_records', estruturas: 'structural_em_records',
    estruturas_metalicas: 'structural_em_records', structures: 'structural_em_records',
    metal_structures: 'structural_em_records',
    profiles: 'structural_profiles_catalog', perfis: 'structural_profiles_catalog',
    // === ELÉTRICA ===
    cables: 'electrical_cables', cabos: 'electrical_cables',
    lista_cabos: 'electrical_cables', cables_list: 'electrical_cables',
    conduits: 'eletroduct_runs', eletrodutos: 'eletroduct_runs',
    eletroduct: 'eletroduct_runs', lista_eletrodutos: 'eletroduct_runs',
    panels: 'electrical_panels', paineis: 'electrical_panels',
    lista_paineis: 'electrical_panels', quadros: 'electrical_panels',
    grounding: 'electrical_grounding', aterramento: 'electrical_grounding',
    spda: 'electrical_grounding',
    // === CIVIL ===
    elements: 'civil_concrete_elements', elementos: 'civil_concrete_elements',
    elementos_estruturais: 'civil_concrete_elements',
    pours: 'civil_concrete_pours', concretagens: 'civil_concrete_pours',
    // === HIDRÁULICA ===
    pipes: 'hydraulic_systems', tubos: 'hydraulic_systems',
    reservoirs: 'hydraulic_systems', reservatorios: 'hydraulic_systems',
    equipment: 'hydraulic_systems', equipamentos: 'hydraulic_systems',
    // === PINTURA ===
    coatings: 'painting_inspections', camadas: 'painting_inspections',
    inspections: 'painting_inspections', medicoes: 'painting_inspections'
  };

  // Varre todas as ramificações do objeto da IA procurando arrays nomeados como
  // categorias conhecidas. Ignora a categoria que já foi inserida como principal.
  function scanSecondaryCategories(aiData, excludeTable){
    const sources = [aiData, aiData && aiData.extracted, aiData && aiData.categories, aiData && aiData.data].filter(Boolean);
    const found = {}; // table -> records[]
    for(const src of sources){
      if(!src || typeof src !== 'object') continue;
      for(const key in src){
        const val = src[key];
        if(!Array.isArray(val) || !val.length || typeof val[0] !== 'object') continue;
        const lk = normalizeKey(key);
        const targetTable = SECONDARY_TABLE_MAP[lk];
        if(!targetTable) continue;
        if(targetTable === excludeTable) continue; // não duplica a categoria principal
        if(!found[targetTable]) found[targetTable] = { rows: [], sourceKey: lk };
        // Evita anexar 2x do mesmo array (extracted.materials e raiz.materials apontam pra mesma ref)
        if(found[targetTable].rows.length && found[targetTable].rows[0] === val[0]) continue;
        val.forEach(r => found[targetTable].rows.push(r));
      }
    }
    return found;
  }

  // CASE ESPECIAL: joints precisa de line_id (FK NOT NULL pra public.lines).
  // Esta função cria/busca a linha do iso e linka as joints nela.
  async function insertJointsRouted(records, projectId, orgId, lineTag, isoId){
    const sb = w.sb;
    if(!sb || !Array.isArray(records) || !records.length) return { ok:0, fail:0, errs:[] };
    // 1) Cria/busca linha
    let lineId = null;
    const tag = String(lineTag || 'AUTO-'+Date.now()).slice(0, 100);
    try {
      const existing = await sb.from('lines').select('id').eq('org_id', orgId).eq('project_id', projectId).eq('tag', tag).limit(1);
      if(existing.data && existing.data[0]) lineId = existing.data[0].id;
    } catch(_){}
    if(!lineId){
      const ins = await sb.from('lines').insert({ org_id: orgId, project_id: projectId, tag: tag }).select('id').single();
      if(ins.error){
        console.warn('[dai] lines insert fail:', ins.error);
        return { ok:0, fail: records.length, errs: ['lines: '+ins.error.message] };
      }
      lineId = ins.data && ins.data.id;
    }
    // 2) Insere joints com line_id + isometric_id (se houver)
    const jointsCols = await getTableColumns('joints');
    let ok = 0, fail = 0;
    const errs = [];
    for(const row of records){
      if(!row || typeof row !== 'object') continue;
      const raw = { org_id: orgId, project_id: projectId, line_id: lineId };
      // NOTA: NÃO setamos isometric_id porque essa FK aponta pra outra tabela ('isometrics',
      // não 'isometric_sheets' onde cadastramos). Deixa NULL (coluna é nullable).
      // if(isoId) raw.isometric_id = isoId;
      for(const k in row){
        if(k === 'id' || k.startsWith('_')) continue;
        if(row[k] === null || row[k] === '' || row[k] === undefined) continue;
        const nk = aliasKey(k);
        raw[nk] = row[k];
      }
      // Garante joint_number (NOT NULL)
      if(!raw.joint_number) raw.joint_number = 'J-' + (ok+fail+1).toString().padStart(3,'0');
      // Normaliza joint_type
      if(raw.joint_type){ const norm = VALUE_NORMALIZERS.joint_type(raw.joint_type); raw.joint_type = norm || 'topo'; }
      else raw.joint_type = 'topo';
      // Normaliza status se vier
      if(raw.status){ const norm = VALUE_NORMALIZERS.joint_status_field(raw.status); raw.status = norm || 'pendente'; }
      const { kept } = filterPayloadBySchema(raw, jointsCols);
      const res = await sb.from('joints').insert(kept).select('id').single();
      if(res.error){
        // Bug #8 fix (auditoria 2026-05-28): 23505 = duplicate. Idempotente.
        if(res.error.code === '23505' || /duplicate|unique|conflict/i.test(res.error.message)){
          ok++;
          console.log('[dai] joint duplicate — tratado como sucesso:', kept.joint_number);
        } else {
          fail++; errs.push('joints: '+res.error.message);
          console.warn('[dai] joint insert fail:', res.error.message, kept);
        }
      } else ok++;
    }
    return { ok, fail, errs };
  }

  // CASE ESPECIAL: project_materials só linka catalog+projeto+qty.
  // Os dados ricos (code, description, category, etc.) vão em materials_catalog.
  // Esta função faz o upsert no catalog + insert da linha de projeto.
  async function insertMaterialsRouted(records, projectId, orgId){
    const sb = w.sb;
    if(!sb || !Array.isArray(records) || !records.length) return { ok:0, fail:0, errs:[] };
    const catCols = await getTableColumns('materials_catalog');
    const pmCols = await getTableColumns('project_materials');
    let ok = 0, fail = 0;
    const errs = [];
    for(const row of records){
      if(!row || typeof row !== 'object') continue;
      // 1) Monta payload pra materials_catalog
      const matRaw = { org_id: orgId };
      let qty = null;
      for(const k in row){
        if(k === 'id' || k.startsWith('_')) continue;
        if(row[k] === null || row[k] === '' || row[k] === undefined) continue;
        const nk = aliasKey(k);
        // Quantidade vai pro project_materials (qty_planned), não pro catálogo
        if(nk === 'quantity' || nk === 'qty_planned'){ qty = parseFloat(row[k]) || 0; continue; }
        matRaw[nk] = row[k];
      }
      // Garante campos obrigatórios do catalog (code, description, unit)
      if(!matRaw.code){
        // Auto-gera code se ausente: usa primeiras palavras da descrição + index pra evitar colisão
        const desc = matRaw.description || 'MAT';
        const idx = (ok+fail+1).toString().padStart(3,'0');
        matRaw.code = String(desc).slice(0,30).replace(/[^a-zA-Z0-9]+/g,'-').toUpperCase().replace(/^-|-$/g,'') + '-' + idx;
      }
      if(!matRaw.description) matRaw.description = matRaw.code;
      if(!matRaw.unit) matRaw.unit = 'un';

      const { kept: matKept } = filterPayloadBySchema(matRaw, catCols);
      // Tenta achar material existente (mesmo code + org_id)
      let materialId = null;
      try {
        const existing = await sb.from('materials_catalog').select('id').eq('org_id', orgId).eq('code', matKept.code).is('deleted_at', null).limit(1);
        if(existing.data && existing.data[0]) materialId = existing.data[0].id;
      } catch(_){}

      if(!materialId){
        // Insere novo no catálogo
        const insRes = await sb.from('materials_catalog').insert(matKept).select('id').single();
        if(insRes.error){
          fail++; errs.push('materials_catalog: '+insRes.error.message);
          console.warn('[dai] catalog insert fail:', insRes.error, matKept);
          continue;
        }
        materialId = insRes.data && insRes.data.id;
      }

      // 2) Insere/atualiza link em project_materials (UNIQUE em project_id+material_id)
      const pmPayload = { org_id: orgId, project_id: projectId, material_id: materialId, qty_planned: qty || 1 };
      const { kept: pmKept } = filterPayloadBySchema(pmPayload, pmCols);
      const pmRes = await sb.from('project_materials').insert(pmKept).select('id').single();
      if(pmRes.error){
        // 409 = duplicado (material já linkado ao projeto). Tratamos como sucesso e somamos a quantidade.
        if(pmRes.error.code === '23505' || /duplicate|unique|conflict/i.test(pmRes.error.message)){
          try {
            const cur = await sb.from('project_materials').select('id, qty_planned').eq('project_id', projectId).eq('material_id', materialId).limit(1).single();
            if(cur.data){
              const newQty = (parseFloat(cur.data.qty_planned)||0) + (qty || 0);
              await sb.from('project_materials').update({ qty_planned: newQty }).eq('id', cur.data.id);
              ok++;
              continue;
            }
          } catch(_){}
          ok++; // mesmo se update falhar, o link existe — sucesso
        } else {
          fail++; errs.push('project_materials: '+pmRes.error.message);
          console.warn('[dai] project_materials insert fail:', pmRes.error.message, pmRes.error.details, pmKept);
        }
      } else {
        ok++;
      }
    }
    return { ok, fail, errs };
  }

  // Insere registros em uma tabela secundária aplicando alias + normalize + retry
  async function insertCategoryRecords(table, records, projectId, orgId, parentRefs){
    const sb = w.sb;
    if(!sb || !Array.isArray(records) || !records.length) return { ok:0, fail:0, errs:[] };
    const validCols = await getTableColumns(table);
    let ok = 0, fail = 0;
    const errs = [];
    for(const row of records){
      if(!row || typeof row !== 'object') continue;
      const raw = { org_id: orgId };
      if(projectId) raw.project_id = projectId;
      // Injeta refs do registro pai (ex: iso_number, iso_ref)
      if(parentRefs && typeof parentRefs === 'object'){
        for(const ref in parentRefs){
          if(parentRefs[ref] != null && raw[ref] === undefined) raw[ref] = parentRefs[ref];
        }
      }
      for(const k in row){
        if(k === 'id' || k.startsWith('_')) continue;
        if(row[k] === null || row[k] === '' || row[k] === undefined) continue;
        const nk = aliasKey(k);
        // Não sobrescreve parent refs já injetadas (a IA pode ter posto string vazia)
        if(raw[nk] !== undefined && parentRefs && parentRefs[nk] != null) continue;
        raw[nk] = row[k];
      }
      const { kept, dropped } = filterPayloadBySchema(raw, validCols);
      for(const col in kept){
        const norm = normalizeValue(col, kept[col]);
        if(norm === null || norm === undefined){
          if(VALUE_NORMALIZERS[col]){ delete kept[col]; }
        } else {
          kept[col] = norm;
        }
      }
      // Preserva drops em meta/notes quando suportado
      if(validCols && dropped.length){
        const extraObj = {};
        dropped.forEach(d => {
          if(d === 'org_id' || d === 'project_id') return;
          extraObj[d] = raw[d];
        });
        if(Object.keys(extraObj).length){
          if(validCols.has('meta')){
            kept.meta = Object.assign(kept.meta || {}, { ai_extracted_extra: extraObj });
          } else if(validCols.has('notes')){
            kept.notes = (kept.notes || '') + '\n[IA: ' + JSON.stringify(extraObj) + ']';
          }
        }
      }
      let payload = validCols ? kept : raw;
      let res = await sb.from(table).insert(payload);
      let retries = 0;
      while(res.error && retries < 12){
        const msg = res.error.message || '';
        let badCol = null;
        let recovered = false;
        let m = msg.match(/(?:column|find)\s*['"]?([a-zA-Z0-9_]+)['"]?/i);
        if(m && m[1] && payload[m[1]] !== undefined && /column.*does not exist|schema cache|find.*column/i.test(msg)){
          badCol = m[1];
        }
        // Bug #7 fix (auditoria 2026-05-28): tenta normalizar lowercase antes de remover
        if(!badCol){
          m = msg.match(/violates check constraint\s+["']?(\w+)["']?/i);
          if(m && m[1]){
            const cm = m[1].match(/_([a-z][a-z0-9_]*?)_check$/i);
            if(cm && cm[1] && payload[cm[1]] !== undefined){
              const colName = cm[1];
              const orig = payload[colName];
              if(typeof orig === 'string' && orig.length){
                const norm = orig.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'_');
                if(norm !== orig){
                  payload[colName] = norm;
                  recovered = true;
                  console.log('[dai] check_constraint recovered:', colName, orig, '->', norm);
                }
              }
              if(!recovered) badCol = colName;
            }
          }
        }
        // Bug #6 fix (auditoria 2026-05-28): NOT NULL auto-gera valor
        if(!badCol && !recovered && /violates not-null/i.test(msg)){
          const nm = msg.match(/column\s+["']?(\w+)["']?/i);
          if(nm && nm[1] && !payload[nm[1]]){
            const colName = nm[1];
            const fallbacks = {
              tag: 'AUTO-'+Date.now().toString().slice(-6),
              name: payload.description || payload.title || ('Item '+new Date().toLocaleDateString('pt-BR')),
              identification: payload.tag || payload.code || ('ID-'+Date.now().toString().slice(-6)),
              code: 'AUTO-'+Date.now().toString().slice(-6),
              title: payload.description || payload.name || ('Registro IA '+new Date().toLocaleDateString('pt-BR')),
              joint_number: 'J-'+(ok+fail+1).toString().padStart(3,'0'),
              card_number: 'C-'+(ok+fail+1).toString().padStart(3,'0'),
              wo_number: 'OS-'+Date.now().toString().slice(-6),
              pour_number: 'CP-'+(ok+fail+1).toString().padStart(3,'0'),
              element_type: 'outro',
              system_type: 'outro',
              ndt_type: 'visual',
              inspection_date: new Date().toISOString().split('T')[0],
              measurement_date: new Date().toISOString().split('T')[0],
              measured_resistance_ohm: 0,
              location: payload.tag || payload.area || 'Nao informado',
              full_name: payload.name || payload.description || ('Pessoa '+(ok+fail+1)),
              matricula: 'AUTO-'+(ok+fail+1).toString().padStart(4,'0'),
              description: payload.code || payload.tag || ('Item '+(ok+fail+1)),
              unit: 'un',
              source: 'ia_extracted',
              category: 'outros',
              cable_type: 'outro',
              cross_section_mm2: 2.5
            };
            if(fallbacks[colName] !== undefined){
              payload[colName] = fallbacks[colName];
              recovered = true;
              console.log('[dai] not_null auto-fill:', table+'.'+colName, '=', payload[colName]);
            } else {
              errs.push(table+': obrigatorio vazio "'+colName+'" (sem fallback)');
              break;
            }
          } else { break; }
        }
        if(badCol){
          delete payload[badCol];
          retries++;
          res = await sb.from(table).insert(payload);
        } else if(recovered){
          retries++;
          res = await sb.from(table).insert(payload);
        } else { break; }
      }
      if(res.error){
        if(res.error.code === '23505' || /duplicate|unique|conflict/i.test(res.error.message)){
          ok++;
          console.log('[dai] '+table+' duplicate — tratado como sucesso');
        } else {
          fail++; errs.push(table+': '+res.error.message);
          console.warn('[dai] sec insert fail', table, 'message:', res.error.message, 'details:', res.error.details, 'hint:', res.error.hint, 'code:', res.error.code, 'payload:', JSON.stringify(payload));
        }
      } else ok++;
    }
    return { ok, fail, errs };
  }

  // Sobe o arquivo (PDF/imagem) ao Storage do Supabase
  // Tenta buckets nesta ordem: project-files, isos, docs (primeiro que existir)
  async function uploadPdfToStorage(file, projectId, orgId, isoId, isoNumber){
    if(!file) return null;
    const sb = w.sb;
    if(!sb || !sb.storage) return null;
    const ext = (file.name && file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g,'');
    const ts = Date.now();
    const safeIso = String(isoNumber || isoId || 'doc').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0,80);
    const subPath = `${orgId||'noorg'}/${projectId||'noproject'}/${safeIso}_${ts}.${ext}`;
    // Ordem de tentativa: isometrics (existe + tem RLS por org) → dms-files (fallback genérico)
    const tryBuckets = ['isometrics','dms-files','project-files','docs'];
    for(const bucket of tryBuckets){
      try {
        const r = await sb.storage.from(bucket).upload(subPath, file, { upsert:true, contentType: file.type || 'application/octet-stream' });
        if(!r.error){
          console.log('[dai] PDF salvo em', bucket+'/'+subPath);
          return { bucket, path: subPath, full: bucket+'/'+subPath };
        }
        // Bucket não existe → tenta próximo
        if(/(not found|does not exist|bucket.*not)/i.test(r.error.message||'')) continue;
        console.warn('[dai] upload error em', bucket, r.error);
      } catch(e){ console.warn('[dai] upload exc em', bucket, e); }
    }
    console.warn('[dai] Nenhum bucket de storage disponível pra salvar o PDF. Crie "project-files" no Supabase.');
    return null;
  }

  // ============================================================
  // FASE 3 — CADASTRO (INSERT no banco)
  // ============================================================
  async function doSave(){
    const status = ov.querySelector('#dai-status2');
    const btn = ov.querySelector('#dai-save');
    const checked = Array.from(ov.querySelectorAll('.dai-row-chk:checked')).map(c => +c.dataset.i);
    if(checked.length === 0){
      status.innerHTML = '<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Selecione ao menos 1 registro pra cadastrar.</div>';
      return;
    }

    // Pega projeto selecionado no dropdown (override do _curProject global)
    const projSelect = ov.querySelector('#dai-proj-select');
    const projectId = (projSelect && projSelect.value) || getActiveProjectId();
    // Atualiza contexto global se mudou
    if(projectId && (!w._curProject || w._curProject.id !== projectId)){
      const p = (_projectsList||[]).find(x => String(x.id) === String(projectId));
      if(p){
        w._curProject = { id: p.id, name: p.name, client: p.client };
        w.curProj = p.id;
        try { localStorage.setItem('pia.curProj', p.id); } catch(_){}
      }
    }

    btn.disabled = true; btn.style.opacity = '.6'; btn.style.cursor = 'wait';
    status.innerHTML = '<div style="background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;border-radius:8px;padding:11px 14px;font-size:12.5px">⏳ Verificando schema da tabela e cadastrando '+checked.length+' registro(s)...</div>';

    const sb = w.sb;
    if(!sb){
      status.innerHTML = '<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px">Supabase indisponível. Recarregue a página.</div>';
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      return;
    }

    const orgId = (w._org && w._org.id) || null;
    const validCols = await getTableColumns(_docTypeMeta.table);

    // Valida se a tabela exige project_id e o usuário não selecionou um
    if(!projectId && validCols && validCols.has('project_id')){
      status.innerHTML = '<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong>⚠ Selecione um projeto</strong><div style="margin-top:5px">A tabela <code>'+esc(_docTypeMeta.table)+'</code> exige vínculo com projeto. Use o dropdown verde/vermelho no topo desta tela.</div></div>';
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      // Destaca o seletor
      const bar = ov.querySelector('#dai-proj-bar');
      if(bar){ bar.style.background = '#FEF2F2'; bar.style.border = '2px solid #DC2626'; setTimeout(()=>{ bar.style.border = '1px solid #FCA5A5'; }, 2000); }
      return;
    }

    let ok = 0, fail = 0;
    const errors = [];
    const allDropped = new Set();
    const allKept = new Set();
    const insertedIds = []; // ids retornados (pra linkar PDF + categorias secundárias)
    const insertedRefs = []; // { id, iso_number, payload } por inserted row
    for(const i of checked){
      const row = _records[i];
      // 1) Monta payload bruto (já remove chaves técnicas; mantém valores null/vazio
      //    pra que campos opcionais possam ser explicitamente vazios)
      const raw = { org_id: orgId };
      if(projectId) raw.project_id = projectId;
      const extraData = {}; // campos que NÃO são da tabela mas vamos preservar em meta
      for(const k in row){
        if(k === 'id' || k.startsWith('_')) continue;
        // Pula valores totalmente vazios (a tabela usa default/null)
        if(row[k] === null || row[k] === '' || row[k] === undefined) continue;
        // Normaliza + traduz alias PT→EN
        const nk = aliasKey(k);
        raw[nk] = row[k];
      }
      // 2) Filtra pelo schema real
      const { kept, dropped } = filterPayloadBySchema(raw, validCols);
      dropped.forEach(c => allDropped.add(c));
      Object.keys(kept).forEach(c => allKept.add(c));

      // 2.0) Normaliza valores que têm check constraints (nr13, hydro_test, etc.)
      for(const col in kept){
        const norm = normalizeValue(col, kept[col]);
        if(norm === null || norm === undefined){
          // Não conseguiu normalizar: descarta o campo pra não bater na constraint
          if(VALUE_NORMALIZERS[col]){ delete kept[col]; }
        } else {
          kept[col] = norm;
        }
      }

      // 2.1) PRESERVA campos descartados em meta/notes (se a tabela suporta)
      if(validCols && dropped.length){
        const extraObj = {};
        dropped.forEach(d => {
          if(d === 'org_id' || d === 'project_id') return; // não duplica
          extraObj[d] = raw[d];
        });
        if(Object.keys(extraObj).length){
          if(validCols.has('meta')){
            kept.meta = Object.assign(kept.meta || {}, { ai_extracted_extra: extraObj });
          } else if(validCols.has('notes')){
            // Concatena no notes como JSON serializado
            const extraStr = '\n[Campos extras da IA: ' + JSON.stringify(extraObj) + ']';
            kept.notes = (kept.notes || '') + extraStr;
          }
        }
      }

      // 3) Tenta insert — usa .select() pra recuperar o id do registro inserido
      let payload = validCols ? kept : raw;
      let res = await sb.from(_docTypeMeta.table).insert(payload).select('*').single();
      // 4) Retry inteligente: remove colunas problemáticas e re-tenta até 12x
      let retries = 0;
      while(res.error && retries < 12){
        const msg = res.error.message || '';
        let badCol = null;
        let recovered = false;
        // Coluna não existe
        let m = msg.match(/(?:column|find)\s*['"]?([a-zA-Z0-9_]+)['"]?/i);
        if(m && m[1] && payload[m[1]] !== undefined && /column.*does not exist|schema cache|find.*column/i.test(msg)){
          badCol = m[1];
        }
        // Bug #7 fix (auditoria 2026-05-28): check constraint — tenta normalizar lowercase antes de remover
        if(!badCol){
          m = msg.match(/violates check constraint\s+["']?(\w+)["']?/i);
          if(m && m[1]){
            // Extrai o nome da coluna do nome da constraint (ex: civil_concrete_pours_result_check → result)
            const cm = m[1].match(/_([a-z][a-z0-9_]*?)_check$/i);
            if(cm && cm[1] && payload[cm[1]] !== undefined){
              const colName = cm[1];
              const orig = payload[colName];
              if(typeof orig === 'string' && orig.length){
                const norm = orig.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'_');
                if(norm !== orig){
                  payload[colName] = norm;
                  recovered = true;
                  console.log('[dai/single] check_constraint recovered:', colName, orig, '->', norm);
                }
              }
              if(!recovered) badCol = colName;
            }
          }
        }
        // Bug #6 fix (auditoria 2026-05-28): NOT NULL auto-gera valor com fallback
        if(!badCol && !recovered && /violates not-null/i.test(msg)){
          const nm = msg.match(/column\s+["']?(\w+)["']?/i);
          if(nm && nm[1] && !payload[nm[1]]){
            const colName = nm[1];
            const fallbacks = {
              tag: 'AUTO-'+Date.now().toString().slice(-6),
              name: payload.description || payload.title || ('Item '+new Date().toLocaleDateString('pt-BR')),
              identification: payload.tag || payload.code || ('ID-'+Date.now().toString().slice(-6)),
              code: 'AUTO-'+Date.now().toString().slice(-6),
              title: payload.description || payload.name || ('Registro IA '+new Date().toLocaleDateString('pt-BR')),
              joint_number: 'J-'+Date.now().toString().slice(-4),
              card_number: 'C-'+Date.now().toString().slice(-4),
              wo_number: 'OS-'+Date.now().toString().slice(-6),
              pour_number: 'CP-'+Date.now().toString().slice(-4),
              element_type: 'outro',
              system_type: 'outro',
              ndt_type: 'visual',
              inspection_date: new Date().toISOString().split('T')[0],
              measurement_date: new Date().toISOString().split('T')[0],
              measured_resistance_ohm: 0,
              location: payload.tag || payload.area || 'Nao informado',
              full_name: payload.name || payload.description || 'Pessoa IA',
              matricula: 'AUTO-'+Date.now().toString().slice(-4),
              description: payload.code || payload.tag || 'Item IA',
              unit: 'un',
              source: 'ia_extracted',
              category: 'outros',
              cable_type: 'outro',
              cross_section_mm2: 2.5,
              result: 'aprovado',
              status: 'pendente'
            };
            if(fallbacks[colName] !== undefined){
              payload[colName] = fallbacks[colName];
              recovered = true;
              console.log('[dai/single] not_null auto-fill:', _docTypeMeta.table+'.'+colName, '=', payload[colName]);
            } else {
              errors.push('Campo obrigatorio vazio sem fallback: ' + colName);
              break;
            }
          } else { break; }
        }
        if(badCol){
          delete payload[badCol];
          allDropped.add(badCol);
          retries++;
          res = await sb.from(_docTypeMeta.table).insert(payload).select('*').single();
        } else if(recovered){
          retries++;
          res = await sb.from(_docTypeMeta.table).insert(payload).select('*').single();
        } else { break; }
      }
      // Bug #8 fix (auditoria 2026-05-28): duplicate (23505) — trata como sucesso idempotente
      if(res.error){
        if(res.error.code === '23505' || /duplicate|unique|conflict/i.test(res.error.message || '')){
          ok++;
          console.log('[dai/single] '+_docTypeMeta.table+' duplicate — tratado como sucesso idempotente');
        } else {
          fail++; errors.push(res.error.message);
          console.warn('[dai/single] insert fail', _docTypeMeta.table, 'message:', res.error.message, 'details:', res.error.details, 'hint:', res.error.hint, 'code:', res.error.code, 'payload:', JSON.stringify(payload));
          try { if(w.PIAToast && w.PIAToast.error){ w.PIAToast.error('Falha ao cadastrar: ' + res.error.message); } } catch(_){}
        }
      } else {
        ok++;
        if(res.data && res.data.id){
          insertedIds.push(res.data.id);
          insertedRefs.push({ id: res.data.id, iso_number: payload.iso_number || res.data.iso_number, row: res.data });
        }
      }
    }

    // ============================================================
    // CATEGORIAS SECUNDÁRIAS — varre _aiResponse e cadastra em outras tabelas
    // (ex: isométrico traz materiais junto → cadastra em project_materials)
    // ============================================================
    const secondaryReport = []; // [{ table, ok, fail, errs }]
    let secondaryOk = 0, secondaryFail = 0;
    try {
      // Usa a versão editada do user (se existir), senão re-scan
      const secondaries = (w._daiSecPreview && Object.keys(w._daiSecPreview).length)
        ? w._daiSecPreview
        : scanSecondaryCategories(_aiResponse, _docTypeMeta.table);
      const parentRefs = {};
      // Se o registro principal for um iso, passa o iso_number como ref pras secundárias
      if(insertedRefs.length === 1){
        if(insertedRefs[0].iso_number){
          parentRefs.iso_ref = insertedRefs[0].iso_number;
          parentRefs.iso_number = insertedRefs[0].iso_number;
        }
        // joints tem FK isometric_id (UUID) → linkamos diretamente
        if(insertedRefs[0].id && _docTypeMeta.table === 'isometric_sheets'){
          parentRefs.isometric_id = insertedRefs[0].id;
        }
      }
      // Pega line tag do iso pra criar lines auto pra joints
      const isoLineTag = (insertedRefs[0] && insertedRefs[0].row && (insertedRefs[0].row.line || insertedRefs[0].row.iso_number)) || null;
      const isoIdForJoints = (insertedRefs[0] && _docTypeMeta.table === 'isometric_sheets' ? insertedRefs[0].id : null);

      for(const tbl in secondaries){
        const { rows, sourceKey } = secondaries[tbl];
        if(!rows.length) continue;
        let r;
        if(tbl === 'project_materials'){
          // Roteamento especial: cria em materials_catalog → linka em project_materials
          r = await insertMaterialsRouted(rows, projectId, orgId);
        } else if(tbl === 'joints'){
          // Roteamento especial: cria/usa linha em public.lines + insere joints linkadas
          r = await insertJointsRouted(rows, projectId, orgId, isoLineTag, isoIdForJoints);
        } else {
          r = await insertCategoryRecords(tbl, rows, projectId, orgId, parentRefs);
        }
        secondaryOk += r.ok;
        secondaryFail += r.fail;
        secondaryReport.push({ table: tbl, sourceKey, ok: r.ok, fail: r.fail, errs: r.errs });
      }
    } catch(e){ console.warn('[dai] secondary categories falhou:', e); }

    // ============================================================
    // UPLOAD DO PDF/IMAGEM → Supabase Storage
    // Só faz se há 1 iso cadastrado (registro principal único)
    // ============================================================
    let pdfUploadInfo = null;
    try {
      if(_pdfFile && insertedRefs.length >= 1 && _docTypeMeta.table === 'isometric_sheets'){
        const ref = insertedRefs[0];
        pdfUploadInfo = await uploadPdfToStorage(_pdfFile, projectId, orgId, ref.id, ref.iso_number);
        if(pdfUploadInfo && pdfUploadInfo.path){
          // IMPORTANTE: grava SÓ o path relativo ao bucket (sem o prefixo do bucket)
          // Caso contrário o v9 ao fazer sb.storage.from('isometrics').createSignedUrl(...) duplica o bucket.
          const validCols = await getTableColumns(_docTypeMeta.table);
          if(validCols && validCols.has('pdf_storage_path')){
            const u = await sb.from(_docTypeMeta.table).update({ pdf_storage_path: pdfUploadInfo.path }).eq('id', ref.id);
            if(u.error) console.warn('[dai] update pdf_storage_path falhou:', u.error.message);
            else console.log('[dai] pdf_storage_path gravado como path relativo:', pdfUploadInfo.path);
          }
        }
      }
    } catch(e){ console.warn('[dai] PDF upload falhou:', e); }

    const droppedList = Array.from(allDropped).filter(c => c !== 'org_id' && c !== 'project_id');
    const preservedInMeta = validCols && (validCols.has('meta') || validCols.has('notes'));
    const droppedNote = ''; // Notas técnicas omitidas pra UX comercial

    // Bloco do relatório de categorias secundárias
    const TABLE_LABELS = {
      'project_materials':'📦 Materiais', 'joints':'🔗 Juntas', 'supports':'🪛 Suportes',
      'structural_em_records':'🏗️ Estruturas metálicas','electrical_cables':'🔌 Cabos',
      'eletroduct_runs':'⚡ Eletrodutos','electrical_panels':'📊 Painéis'
    };
    let secondaryHtml = '';
    if(secondaryReport.length){
      const rows = secondaryReport.map(r => {
        const label = TABLE_LABELS[r.table] || r.table;
        const color = r.fail === 0 ? '#059669' : (r.ok === 0 ? '#DC2626' : '#D97706');
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px"><span style="color:'+color+';font-weight:700">'+label+':</span> '+r.ok+' cadastrado(s)'+(r.fail>0?', '+r.fail+' falha(s)':'')+'</div>';
      }).join('');
      secondaryHtml = '<div style="margin-top:10px;padding:10px 12px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:6px"><div style="font-size:11.5px;font-weight:700;color:#065F46;margin-bottom:5px">🎯 Categorias secundárias detectadas e cadastradas:</div>'+rows+'</div>';
    }

    // Bloco do upload do PDF
    let pdfHtml = '';
    if(_pdfFile){
      if(pdfUploadInfo && pdfUploadInfo.full){
        pdfHtml = '<div style="margin-top:8px;padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;font-size:11.5px;color:#1E3A8A"><strong>📎 PDF anexado:</strong> <code style="background:#fff;padding:1px 5px;border-radius:3px;font-size:10.5px">'+esc(pdfUploadInfo.full)+'</code></div>';
      } else if(insertedRefs.length && _docTypeMeta.table === 'isometric_sheets'){
        pdfHtml = '<div style="margin-top:8px;padding:8px 12px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;font-size:11.5px;color:#78350F"><strong>⚠ PDF não foi anexado:</strong> nenhum bucket de Storage disponível. Crie um bucket "project-files" no Supabase Storage pra ativar o upload automático.</div>';
      }
    }

    const totalOk = ok + secondaryOk;
    const totalFail = fail + secondaryFail;

    // REFRESH AUTOMÁTICO: recarrega dados globais + re-renderiza view atual + dispara eventos
    // Assim os registros recém-cadastrados aparecem sem o usuário precisar dar F5.
    try {
      console.log('[dai] disparando refresh da view atual...');
      // 1) Recarrega dados globais do v9 se disponível
      if(typeof w.loadAll === 'function'){
        await w.loadAll();
      }
      // 2) Re-renderiza view atual no v9
      if(typeof w.goV === 'function' && w.curView){
        try { w.goV(w.curView); } catch(_){}
      }
      // 3) Dispara evento custom pra módulos do hub fazerem refresh
      w.dispatchEvent(new CustomEvent('pia:iso-cadastrado', {
        detail: { table: _docTypeMeta.table, projectId, count: ok, secondaryCount: secondaryOk }
      }));
      // 4) Se o Hub Unified está aberto, força re-render dele
      if(w.PIAHubUnified && typeof w.PIAHubUnified.refresh === 'function'){
        try { await w.PIAHubUnified.refresh(); } catch(_){}
      }
      // 5) Se há função específica de re-renderizar isos
      if(typeof w.rIsos === 'function'){
        try { w.rIsos(); } catch(_){}
      }
    } catch(refreshErr){ console.warn('[dai] refresh falhou (não crítico):', refreshErr); }

    if(fail === 0){
      status.innerHTML = '<div style="background:#ECFDF5;color:#065F46;border:1px solid #6EE7B7;border-radius:8px;padding:14px 16px;font-size:13px"><strong>✅ '+ok+' registro(s) cadastrado(s) com sucesso!</strong><div style="font-size:11.5px;margin-top:5px;opacity:.85">'+(secondaryOk>0?' + '+secondaryOk+' registro(s) em categorias secundárias':'')+'. Total: '+totalOk+' registro(s).</div>'+secondaryHtml+pdfHtml+droppedNote+'</div>';
      btn.style.display = 'none';
    } else if(ok === 0){
      const uniqueErrs = Array.from(new Set(errors)).slice(0, 3).join('\n• ');
      status.innerHTML = '<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong>❌ Nenhum registro cadastrado</strong><div style="font-size:11.5px;margin-top:6px;white-space:pre-line">• '+esc(uniqueErrs)+'</div>'+secondaryHtml+droppedNote+'</div>';
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
    } else {
      status.innerHTML = '<div style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;font-size:12.5px"><strong>⚠ '+ok+' cadastrado(s) · '+fail+' falha(s)</strong><div style="font-size:11.5px;margin-top:6px">Os '+ok+' foram cadastrados. As '+fail+' linhas com falha podem ter constraints (campos obrigatórios faltando, valores inválidos, etc.).</div>'+secondaryHtml+pdfHtml+droppedNote+'</div>';
      btn.style.display = 'none';
    }
  }

  // Inicia
  renderUpload();
};

} catch(e){ console.warn('[discipline-ai-modal] init falhou:', e); }
})(window);
