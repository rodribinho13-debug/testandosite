/*! PROJECT.IA — IA do Orçamento v1
 *  Recebe desenho técnico (PDF/imagem) + memorial descritivo + RT
 *  Devolve detalhamento WBS completo (capítulos → grupos → subgrupos → linhas)
 *  Cruzando com compositions/materials_catalog/hh_coefficients
 *
 *  Fluxo: extrair → revisar (células editáveis) → confirmar → batch insert
 *
 *  Uso: PIAIAOrcamento.open(budgetId, projectId)
 */
(function(w, d){'use strict';
try {

function getSb(){ return w.sb || null; }
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function n(x){ const v = parseFloat(x); return isNaN(v) ? 0 : v; }
function brl(x){ if(x==null||isNaN(x)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)); }

let _state = {
  budgetId: null,
  projectId: null,
  files: [],      // [{ name, mime, file (File), b64, kind: 'desenho'|'memorial'|'rt' }]
  extracted: null, // árvore extraída pela IA
  context: null,   // amostras de compositions/materials/hh_coefs
  busy: false
};

// ============================================================
// PROMPT MASTER — IA do Orçamento profissional (engenharia industrial)
// ============================================================
function buildPrompt(ctx){
  const compSamp = (ctx.compositions || []).slice(0, 80).map(c => `${c.id}|${c.code||''}|${(c.description||'').slice(0,80)}|${c.unit||''}|${c.discipline||''}`).join('\n');
  const matSamp = (ctx.materials || []).slice(0, 80).map(m => `${m.id}|${m.code||''}|${(m.description||'').slice(0,80)}|${m.unit||''}`).join('\n');
  const hhSamp = (ctx.hh_coefs || []).slice(0, 40).map(h => `${h.discipline||''}|${(h.activity||'').slice(0,60)}|${h.unit||''}|${h.coefficient||''}`).join('\n');

  return `Voce e ENGENHEIRO ORCAMENTISTA SENIOR de obras industriais e civis (TCPO, SINAPI, SBC, normas brasileiras + internacionais ASME/AWS).

Voce esta analisando documentos de um projeto: pode ser DESENHO TECNICO (planta, isometrico, P&ID, unifilar), MEMORIAL DESCRITIVO, RT (Relatorio Tecnico), ou ESPECIFICACAO TECNICA. Sua missao: detalhar o orcamento COMPLETO de forma hierarquica WBS, pronto pra ser cadastrado no sistema.

PRINCIPIO FUNDAMENTAL: pense como um orcamentista experiente RE-LENDO o documento. Identifique TODOS os capitulos, grupos, subgrupos e linhas que esse documento implica — mesmo que nao estejam explicitamente listados. Por exemplo, se o memorial menciona "pintura epoxi", voce DEVE incluir um capitulo de Pintura mesmo que nao haja BM. Se ve tubulacao em isometrico, inclua capitulo de Montagem Mecanica.

ESTRUTURA HIERARQUICA OBRIGATORIA (WBS 4 niveis):
- CAPITULO (ex: 01 Servicos Preliminares, 02 Civil, 03 Tubulacao, 04 Eletrica, 05 Instrumentacao, 06 Pintura, 07 Caldeiraria, 08 Comissionamento)
- GRUPO (subdivisao do capitulo, ex: 03.01 Fabricacao, 03.02 Montagem, 03.03 Suportes)
- SUBGRUPO (subdivisao do grupo, ex: 03.02.001 Tubo carbono Sch40, 03.02.002 Tubo inox 304)
- LINHA (item executavel com qty/unit/preco/composicao)

CONTEXTO DO BANCO (use pra MATCH — referencie ids quando achar similaridade real):

=== COMPOSICOES DISPONIVEIS (id|code|descricao|unit|disciplina) ===
${compSamp || '(banco vazio)'}

=== MATERIAIS DISPONIVEIS (id|code|descricao|unit) ===
${matSamp || '(banco vazio)'}

=== COEFICIENTES HH (disciplina|atividade|unit|coef) ===
${hhSamp || '(banco vazio)'}

REGRAS DE OUTPUT:
1. Retorne JSON entre marcadores ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###
2. Estrutura JSON:
{
  "wbs": [
    {
      "type": "capitulo",
      "code": "01",
      "description": "Servicos Preliminares",
      "discipline": "civil",
      "children": [
        {
          "type": "grupo",
          "code": "01.01",
          "description": "Mobilizacao",
          "children": [
            {
              "type": "linha",
              "description": "Container vestiario 6m",
              "qty": 2,
              "unit": "mes",
              "unit_price_estimate": null,
              "calc_method": "Conforme prazo de obra (4 meses) × 2 containers",
              "composition_match_id": null,
              "composition_match_confidence": null,
              "material_refs": [],
              "hh_coefficient_match_id": null,
              "source_doc": "memorial pagina 3",
              "engineer_note": "valor de mercado regional"
            }
          ]
        }
      ]
    }
  ],
  "achados_adicionais": [
    {
      "description": "Memorial menciona pintura epoxi de tanques mas nao vejo capitulo de Pintura no escopo informado",
      "severity": "alta",
      "suggested_action": "Adicionar capitulo 06 Pintura com servicos de jateamento Sa 2.5 + pintura epoxi 2 demaos"
    }
  ],
  "premissas_assumidas": [
    "Considerado escopo conforme memorial v2",
    "Quantidades estimadas por geometria do isometrico (cotas)"
  ],
  "resumo_executivo": "Resumo curto de 3-5 linhas pro orcamentista entender o detalhamento extraido"
}

REGRAS DE QUALIDADE:
- NUNCA invente codigo de composicao se nao houver match REAL no contexto fornecido (composition_match_id = null)
- composition_match_confidence: 0-1 (1 = match perfeito, 0.5 = parcial, 0 = nao achei)
- qty: SEMPRE numero, NUNCA null. Se nao for explicito, ESTIME usando geometria/cotas/escopo + indique em calc_method
- unit_price_estimate: deixe null se nao houver referencia (usuario preencher na revisao). NUNCA invente
- source_doc: SEMPRE preencha — pagina do PDF ou trecho do memorial onde voce inferiu
- calc_method: SEMPRE explique o raciocinio (engenheiro precisa validar)
- Hierarquia bem feita: 4-8 capitulos, 2-5 grupos por capitulo, 1-3 subgrupos por grupo, 3-20 linhas por subgrupo
- engineer_note: alertas tecnicos ("tubo Sch80 fluido critico ASME B31.3", "junta soldada com NDT obrigatorio", etc.)

PRIORIZE COMPLETUDE. Se nao identificar algo, REGISTRE em achados_adicionais ao inves de omitir.

Comece DIRETO com ###DISCIPLINE_IA_JSON###. NAO use markdown fora do JSON. Apos ###FIM_DISCIPLINE_IA_JSON###, escreva no maximo 3 linhas de analise.`;
}

// ============================================================
// Carrega amostras do banco pra IA poder cruzar
// ============================================================
async function loadContext(projectId){
  const sb = getSb();
  if(!sb) return { compositions: [], materials: [], hh_coefs: [] };
  const orgId = (w._org && w._org.id) || null;

  const tasks = [];
  tasks.push(sb.from('compositions').select('id,code,description,unit,discipline').limit(200).then(r => r.data || []).catch(() => []));
  tasks.push(sb.from('materials_catalog').select('id,code,description,unit').is('deleted_at', null).limit(200).then(r => r.data || []).catch(() => []));
  tasks.push(sb.from('hh_coefficients').select('id,discipline,activity,unit,coefficient').limit(80).then(r => r.data || []).catch(() => []));
  const [compositions, materials, hh_coefs] = await Promise.all(tasks);
  return { compositions, materials, hh_coefs };
}

// ============================================================
// Modal: upload e configuração
// ============================================================
async function open(budgetId, projectId){
  if(!budgetId){ alert('Salve o orcamento antes de usar a IA.'); return; }
  _state.budgetId = budgetId;
  _state.projectId = projectId;
  _state.files = [];
  _state.extracted = null;
  _state.context = null;

  const prev = d.getElementById('pia-ia-orc-ov'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-ia-orc-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9870;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto';
  ov.onclick = e => { if(e.target===ov && !_state.busy) ov.remove(); };
  d.body.appendChild(ov);
  renderUploadStep();
}

function renderUploadStep(){
  const ov = d.getElementById('pia-ia-orc-ov'); if(!ov) return;
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:10px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB);overflow:hidden">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)">'
      + '<div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">IA Orçamento — Detalhamento profissional</div>'
      + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Envie desenho técnico, memorial descritivo e/ou RT. A IA gera a árvore WBS hierárquica (capítulo → grupo → subgrupo → linha) cruzando com sua base de composições, materiais e coeficientes HH.</div>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 22px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">'
        + uploadCard('desenho', 'Desenho técnico', 'PDF/imagem do isométrico, planta, P&ID, unifilar')
        + uploadCard('memorial', 'Memorial descritivo', 'PDF do memorial / especificação técnica')
        + uploadCard('rt', 'RT / Outros', 'Relatório técnico, normas aplicáveis ou anexos')
      + '</div>'
      + '<div id="ia-orc-filelist" style="font-size:11.5px;color:var(--t6,#64748B);min-height:18px;margin-bottom:10px"></div>'
      + '<div style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);border-radius:6px;padding:10px 12px;font-size:11.5px;color:var(--t7,#475569);line-height:1.5">'
        + '<strong style="color:var(--t9,#0F172A)">Como funciona:</strong> a IA lê cada arquivo, identifica disciplinas (civil, tubulação, elétrica, etc), monta a árvore WBS, sugere composições do seu banco, indica achados (ex.: "memorial menciona pintura mas não há capítulo de pintura"). Você revisa tudo antes de gravar.'
      + '</div>'
    + '</div>'
    + '<div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;align-items:center;gap:10px">'
      + '<div id="ia-orc-status" style="font-size:11.5px;color:var(--t6,#64748B);flex:1"></div>'
      + '<button class="btn bg" id="ia-orc-cancel">Cancelar</button>'
      + '<button class="btn bia" id="ia-orc-go"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>Extrair WBS com IA</button>'
    + '</div>'
  + '</div>';

  d.getElementById('ia-orc-cancel').onclick = () => { if(!_state.busy) ov.remove(); };
  d.getElementById('ia-orc-go').onclick = startExtraction;
  d.querySelectorAll('input[data-iakind]').forEach(inp => {
    inp.onchange = (e) => {
      const f = e.target.files[0]; if(!f) return;
      _state.files = _state.files.filter(x => x.kind !== inp.dataset.iakind);
      _state.files.push({ name: f.name, mime: f.type || 'application/pdf', file: f, kind: inp.dataset.iakind });
      refreshFileList();
    };
  });
}

function uploadCard(kind, label, hint){
  return '<label style="border:1px dashed var(--t3,#E5E7EB);border-radius:7px;padding:14px 12px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:6px;background:var(--t1,#F8FAFC);transition:border-color .15s" onmouseover="this.style.borderColor=\'#94A3B8\'" onmouseout="this.style.borderColor=\'\'">'
    + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
    + '<div style="font-size:11.5px;font-weight:600;color:var(--t9,#0F172A)">' + label + '</div>'
    + '<div style="font-size:10px;color:var(--t6,#64748B);line-height:1.3">' + hint + '</div>'
    + '<input type="file" data-iakind="' + kind + '" accept=".pdf,.png,.jpg,.jpeg" style="display:none">'
  + '</label>';
}

function refreshFileList(){
  const el = d.getElementById('ia-orc-filelist'); if(!el) return;
  if(_state.files.length === 0){ el.textContent = 'Nenhum arquivo selecionado ainda. Envie pelo menos 1 documento.'; return; }
  el.innerHTML = '<strong style="color:var(--t9,#0F172A)">Selecionados:</strong> '
    + _state.files.map(f => '<span style="background:var(--t1,#F8FAFC);border:1px solid var(--t3,#E5E7EB);padding:2px 8px;border-radius:6px;font-size:10.5px;margin-right:4px;color:var(--t8,#1E293B)">' + esc(f.kind) + ': ' + esc(f.name) + '</span>').join('');
}

// ============================================================
// EXTRAÇÃO via IA
// ============================================================
async function startExtraction(){
  if(_state.files.length === 0){ alert('Envie pelo menos 1 arquivo.'); return; }
  if(!w.PIAAIRouter){ alert('Sistema de IA ainda inicializando. Tente novamente em alguns segundos.'); return; }
  _state.busy = true;
  const statusEl = d.getElementById('ia-orc-status');
  const goBtn = d.getElementById('ia-orc-go');
  goBtn.disabled = true;
  goBtn.textContent = 'Processando...';

  try {
    statusEl.textContent = 'Carregando contexto do banco (composições, materiais, HH)...';
    _state.context = await loadContext(_state.projectId);
    statusEl.textContent = 'Convertendo arquivos...';
    for(const f of _state.files){
      f.b64 = await w.PIAAIRouter.fileToBase64(f.file);
    }
    const prompt = buildPrompt(_state.context);

    // Roda 1 chamada por arquivo (analyze-discipline-doc só aceita 1 file). Mescla resultados.
    const results = [];
    for(let i = 0; i < _state.files.length; i++){
      const f = _state.files[i];
      statusEl.textContent = `Analisando ${i+1}/${_state.files.length}: ${f.name}...`;
      const r = await w.PIAAIRouter.call('analyze-discipline-doc', {
        file: f.b64,
        mime: f.mime,
        discipline_code: 'custom',
        custom_prompt: prompt + `\n\n=== TIPO DESTE DOCUMENTO ===\n${f.kind}\n=== FIM ===`
      }, {
        event: 'budget_full_extract',
        tables: ['budget_items']
      });
      if(!r.ok) throw new Error(r.error || 'Falha na IA');
      results.push({ kind: f.kind, name: f.name, data: r.data });
    }

    // Mescla as árvores WBS (deduplicando capítulos por code+description)
    const merged = mergeResults(results);
    _state.extracted = merged;
    statusEl.textContent = 'Análise concluída. Revise antes de gravar.';
    renderReviewStep();
  } catch(e){
    console.error('[ia-orcamento]', e);
    statusEl.textContent = 'Erro: ' + (e.message || String(e));
    statusEl.style.color = '#DC2626';
  } finally {
    _state.busy = false;
    if(goBtn){ goBtn.disabled = false; goBtn.textContent = 'Extrair WBS com IA'; }
  }
}

function mergeResults(results){
  const wbsMap = new Map();
  const achados = [];
  const premissas = [];
  const resumos = [];
  results.forEach(r => {
    const d = r.data?.extracted || r.data || {};
    const wbs = Array.isArray(d.wbs) ? d.wbs : [];
    wbs.forEach(cap => {
      const key = (cap.code||'') + '|' + (cap.description||'');
      if(!wbsMap.has(key)) wbsMap.set(key, JSON.parse(JSON.stringify(cap)));
      else mergeNode(wbsMap.get(key), cap);
    });
    if(Array.isArray(d.achados_adicionais)) achados.push(...d.achados_adicionais);
    if(Array.isArray(d.premissas_assumidas)) premissas.push(...d.premissas_assumidas);
    if(d.resumo_executivo) resumos.push(d.resumo_executivo);
  });
  return {
    wbs: Array.from(wbsMap.values()),
    achados_adicionais: achados,
    premissas_assumidas: [...new Set(premissas)],
    resumo_executivo: resumos.join('\n\n')
  };
}

function mergeNode(a, b){
  const aChildren = a.children || [];
  const bChildren = b.children || [];
  const map = new Map();
  aChildren.forEach(c => map.set((c.code||'') + '|' + (c.description||''), c));
  bChildren.forEach(c => {
    const k = (c.code||'') + '|' + (c.description||'');
    if(!map.has(k)) map.set(k, c);
    else if(c.children) mergeNode(map.get(k), c);
  });
  a.children = Array.from(map.values());
}

// ============================================================
// REVISÃO — árvore editável + achados
// ============================================================
function renderReviewStep(){
  const ov = d.getElementById('pia-ia-orc-ov'); if(!ov) return;
  const ex = _state.extracted || {};
  const lineCount = countLines(ex.wbs || []);
  const achadosCount = (ex.achados_adicionais || []).length;

  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:10px;max-width:1100px;width:100%;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid var(--t3,#E5E7EB);overflow:hidden">'
    + '<div style="padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:14px">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Revisão da extração</div>'
      + '<div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:2px">' + (ex.wbs||[]).length + ' capítulo(s) · ' + lineCount + ' linha(s) · ' + achadosCount + ' achado(s) adicional(is)</div></div>'
      + '<button class="btn bg" id="ia-orc-back">Voltar</button>'
      + '<button class="btn bp" id="ia-orc-confirm">Gravar tudo no orçamento</button>'
    + '</div>'
    + (ex.resumo_executivo ? '<div style="padding:12px 22px;background:var(--t1,#F8FAFC);border-bottom:1px solid var(--t3,#E5E7EB);font-size:11.5px;color:var(--t7,#475569);line-height:1.5"><strong style="color:var(--t9,#0F172A)">Resumo:</strong> ' + esc(ex.resumo_executivo).slice(0, 600) + '</div>' : '')
    + '<div style="display:flex;flex:1;overflow:hidden">'
      + '<div id="ia-orc-tree" style="flex:1;overflow-y:auto;padding:12px 18px;border-right:1px solid var(--t3,#E5E7EB)"></div>'
      + '<div style="width:340px;overflow-y:auto;padding:12px 16px;background:var(--t1,#F8FAFC)"><div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Achados adicionais</div>' + renderAchados(ex.achados_adicionais || []) + '<div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin:14px 0 8px">Premissas assumidas</div>' + renderPremissas(ex.premissas_assumidas || []) + '</div>'
    + '</div>'
  + '</div>';

  d.getElementById('ia-orc-back').onclick = () => renderUploadStep();
  d.getElementById('ia-orc-confirm').onclick = confirmAndSave;
  d.getElementById('ia-orc-tree').innerHTML = renderTreeNodes(ex.wbs || [], 0);
  // Wire inputs editáveis
  d.querySelectorAll('[data-edit-path]').forEach(inp => {
    inp.oninput = (e) => updateField(e.target.dataset.editPath, e.target.dataset.editField, e.target.type === 'number' ? n(e.target.value) : e.target.value);
  });
  d.querySelectorAll('[data-toggle-incl]').forEach(cb => {
    cb.onchange = (e) => updateField(e.target.dataset.togglePath, 'include', e.target.checked);
  });
}

function countLines(nodes){
  let n = 0;
  nodes.forEach(node => {
    if(node.type === 'linha') n++;
    if(node.children) n += countLines(node.children);
  });
  return n;
}

function renderTreeNodes(nodes, depth, parentPath){
  parentPath = parentPath || '';
  return nodes.map((node, i) => {
    const path = parentPath + i;
    const indent = depth * 18;
    const isLine = node.type === 'linha';
    const incl = node.include !== false;
    const typeColors = { capitulo: '#0F172A', grupo: '#1E293B', subgrupo: '#475569', linha: '#64748B' };
    const typeBg = { capitulo: 'var(--t1,#F8FAFC)', grupo: '#fff', subgrupo: '#fff', linha: '#fff' };

    let html = '<div data-path="' + path + '" style="border-bottom:1px solid var(--t2,#F1F5F9);padding:8px 10px 8px ' + (10+indent) + 'px;background:' + typeBg[node.type] + ';opacity:' + (incl ? '1' : '.45') + '">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (isLine ? '6' : '0') + 'px">';
    html += '<input type="checkbox" data-toggle-incl data-toggle-path="' + path + '"' + (incl ? ' checked' : '') + ' style="margin:0;cursor:pointer">';
    if(!isLine) html += '<span style="font-size:10px;color:var(--t6,#64748B);font-weight:600;text-transform:uppercase;letter-spacing:.4px">' + node.type + '</span>';
    html += '<span style="font-family:ui-monospace,monospace;font-size:10.5px;color:var(--t7,#475569)">' + esc(node.code||'') + '</span>';
    html += '<input type="text" data-edit-path="' + path + '" data-edit-field="description" value="' + esc(node.description||'') + '" style="flex:1;padding:3px 6px;border:1px solid transparent;background:transparent;font-size:' + (node.type==='capitulo' ? '13' : '12') + 'px;font-weight:' + (node.type==='capitulo' ? '700' : '500') + ';color:' + typeColors[node.type] + ';font-family:inherit" onfocus="this.style.borderColor=\'#CBD5E1\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">';
    html += '</div>';
    if(isLine){
      html += '<div style="display:grid;grid-template-columns:90px 70px 110px 1fr;gap:6px;font-size:11px;margin-left:24px">';
      html += '<input type="number" step="0.01" data-edit-path="' + path + '" data-edit-field="qty" value="' + (node.qty||0) + '" placeholder="qty" style="padding:4px 6px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:11px;font-family:ui-monospace,monospace">';
      html += '<input type="text" data-edit-path="' + path + '" data-edit-field="unit" value="' + esc(node.unit||'un') + '" placeholder="un" style="padding:4px 6px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:11px">';
      html += '<input type="number" step="0.01" data-edit-path="' + path + '" data-edit-field="unit_price_estimate" value="' + (node.unit_price_estimate||0) + '" placeholder="R$ unit" style="padding:4px 6px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:11px;font-family:ui-monospace,monospace">';
      html += '<div style="font-size:10.5px;color:var(--t6,#64748B);padding:4px 0;display:flex;flex-direction:column;gap:2px">';
      if(node.calc_method) html += '<span><strong style="color:var(--t8,#1E293B)">Cálculo:</strong> ' + esc(node.calc_method).slice(0,140) + '</span>';
      if(node.source_doc) html += '<span style="color:var(--t6,#94A3B8)">Fonte: ' + esc(node.source_doc) + '</span>';
      if(node.engineer_note) html += '<span style="color:#B45309;background:#FFFBEB;padding:1px 6px;border-radius:4px;border:1px solid #FEF3C7;display:inline-block;width:fit-content">Eng: ' + esc(node.engineer_note).slice(0,100) + '</span>';
      if(node.composition_match_id) html += '<span style="color:#047857">Composição: ' + esc(String(node.composition_match_id).slice(0,12)) + ' (conf ' + Math.round((node.composition_match_confidence||0)*100) + '%)</span>';
      html += '</div></div>';
    }
    html += '</div>';
    if(node.children && node.children.length){
      html += renderTreeNodes(node.children, depth+1, path + '.');
    }
    return html;
  }).join('');
}

function updateField(path, field, value){
  const parts = path.split('.').map(p => parseInt(p, 10));
  let cur = _state.extracted.wbs;
  for(let i = 0; i < parts.length - 1; i++){
    cur = cur[parts[i]].children;
  }
  cur[parts[parts.length-1]][field] = value;
}

function renderAchados(achados){
  if(!achados.length) return '<div style="font-size:11px;color:var(--t6,#94A3B8);font-style:italic">(nenhum)</div>';
  return achados.map(a => {
    const sevColor = a.severity === 'alta' ? '#991B1B' : a.severity === 'media' ? '#92400E' : '#475569';
    const sevBg = a.severity === 'alta' ? '#FEE2E2' : a.severity === 'media' ? '#FEF3C7' : '#F1F5F9';
    return '<div style="background:#fff;border:1px solid var(--t3,#E5E7EB);border-radius:6px;padding:8px 10px;margin-bottom:6px">'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="background:' + sevBg + ';color:' + sevColor + ';font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:4px;text-transform:uppercase">' + esc(a.severity || 'info') + '</span></div>'
      + '<div style="font-size:11px;color:var(--t9,#0F172A);line-height:1.4;margin-bottom:4px">' + esc(a.description||'') + '</div>'
      + (a.suggested_action ? '<div style="font-size:10.5px;color:var(--t7,#475569);font-style:italic">→ ' + esc(a.suggested_action) + '</div>' : '')
    + '</div>';
  }).join('');
}

function renderPremissas(prems){
  if(!prems.length) return '<div style="font-size:11px;color:var(--t6,#94A3B8);font-style:italic">(nenhuma)</div>';
  return '<ul style="margin:0;padding-left:18px;font-size:11px;color:var(--t7,#475569);line-height:1.5">' + prems.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>';
}

// ============================================================
// CONFIRMA E SALVA — insere recursivamente budget_items
// ============================================================
async function confirmAndSave(){
  const sb = getSb(); if(!sb){ alert('Sem conexão.'); return; }
  if(_state.busy) return;
  _state.busy = true;
  const btn = d.getElementById('ia-orc-confirm');
  btn.disabled = true; btn.textContent = 'Gravando...';

  try {
    const wbs = (_state.extracted && _state.extracted.wbs) || [];
    let totalInserted = 0;
    let baseOrder = Date.now();
    for(let i = 0; i < wbs.length; i++){
      const cap = wbs[i];
      if(cap.include === false) continue;
      totalInserted += await insertSubtree(cap, null, baseOrder + i*1000);
    }
    btn.textContent = '✓ ' + totalInserted + ' linhas gravadas';
    setTimeout(() => {
      d.getElementById('pia-ia-orc-ov').remove();
      // Refresh do orçamento
      if(w.PIAOrcamento && typeof w.PIAOrcamento.reload === 'function') w.PIAOrcamento.reload();
      else location.reload();
    }, 800);
  } catch(e){
    console.error('[ia-orcamento] save', e);
    alert('Erro ao gravar: ' + (e.message || String(e)));
    btn.disabled = false; btn.textContent = 'Gravar tudo no orçamento';
  } finally {
    _state.busy = false;
  }
}

async function insertSubtree(node, parentId, order){
  if(node.include === false) return 0;
  const sb = getSb();
  const payload = {
    budget_id: _state.budgetId,
    parent_id: parentId,
    item_type: node.type === 'capitulo' || node.type === 'grupo' || node.type === 'subgrupo' || node.type === 'linha' ? node.type : 'linha',
    code: (node.code || null) ? String(node.code).slice(0,30) : null,
    description: String(node.description || 'Item').slice(0, 500),
    discipline: node.discipline || null,
    item_order: order,
    display_order: order
  };
  if(payload.item_type === 'linha'){
    payload.qty = n(node.qty) || 1;
    payload.unit = String(node.unit || 'un').slice(0, 20);
    payload.unit_price = n(node.unit_price_estimate) || 0;
    // metadados extras na coluna meta (jsonb) se a tabela tiver
    payload.meta = {
      calc_method: node.calc_method || null,
      source_doc: node.source_doc || null,
      engineer_note: node.engineer_note || null,
      composition_match_id: node.composition_match_id || null,
      composition_match_confidence: node.composition_match_confidence || null,
      material_refs: node.material_refs || [],
      hh_coefficient_match_id: node.hh_coefficient_match_id || null,
      source: 'ai-orcamento'
    };
  }

  // Tenta inserir; se a tabela não tiver `meta`, retry sem
  let r = await sb.from('budget_items').insert(payload).select('id').single();
  if(r.error && /column .* does not exist/i.test(r.error.message || '')) {
    delete payload.meta;
    r = await sb.from('budget_items').insert(payload).select('id').single();
  }
  if(r.error) throw r.error;
  const newId = r.data.id;

  let count = 1;
  if(node.children && node.children.length){
    for(let i = 0; i < node.children.length; i++){
      count += await insertSubtree(node.children[i], newId, order + (i+1));
    }
  }
  return count;
}

// ============================================================
// EXPORT
// ============================================================
w.PIAIAOrcamento = { open };

} catch(e){ console.error('[ai-orcamento] init falhou:', e); }
})(window, document);
