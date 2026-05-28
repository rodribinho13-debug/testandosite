/*! PROJECT.IA v9 - Fields & Import module v1
 *  Extraído do v9-app.js (linhas 41-826) — Fase 1 da modularização.
 *  Contém: FIELD_SCHEMA, _fieldCustomizations, customização de campos,
 *  Importar Excel, Importar IA, applyFieldLabels, etc.
 *
 *  IMPORTANTE: carregar ANTES do v9-app.js no HTML.
 */
var _fieldCustomizations = {};
const FIELD_SCHEMA = {
  // Mapa de Juntas — Qualidade (labels EXATOS do <th> da tabela)
  quality_joints: [
    {name:'iso_number', label:'Iso/Rev', type:'text'},
    {name:'spool_id_ref', label:'Spool', type:'text'},
    {name:'joint_number', label:'Junta', type:'text', required:true},
    {name:'diameter_in', label:'Ø', type:'number', step:'0.25'},
    {name:'schedule', label:'Sch', type:'text'},
    {name:'material', label:'Material', type:'text'},
    {name:'data_solda', label:'Data solda', type:'date'},
    {name:'sinete_raiz', label:'Sinete raiz', type:'text'},
    {name:'sinete_ench_acab', label:'Sinete ench', type:'text'},
    {name:'vs_raiz_date', label:'VS Raiz', type:'date'},
    {name:'vs_date', label:'VS Final', type:'date'},
    {name:'rx_us_date', label:'RX/US', type:'date'},
    {name:'lppm_date', label:'LP/PM', type:'date'},
    {name:'tt_date', label:'TT', type:'date'},
    {name:'du_date', label:'Dureza', type:'date'},
    {name:'pmi_date', label:'PMI', type:'date'},
    {name:'th_date', label:'TH', type:'date'},
    {name:'reparo', label:'Reparo', type:'checkbox'}
  ],
  // Relatorios END
  quality_reports: [
    {name:'inspected_at', label:'Data', type:'date'},
    {name:'ndt_type', label:'Tipo', type:'text'},
    {name:'joint_number', label:'Junta', type:'text'},
    {name:'iso_number', label:'Iso', type:'text'},
    {name:'inspector_name', label:'Inspetor', type:'text'},
    {name:'inspector_certification', label:'Cert.', type:'text'},
    {name:'result', label:'Resultado', type:'text'},
    {name:'coverage_pct', label:'Cobertura', type:'number', step:'0.1'},
    {name:'notebook_ref', label:'Caderneta', type:'text'},
    {name:'findings', label:'Achados', type:'textarea', full:true}
  ],
  // Comissionamento (Sistemas TH)
  com: [
    {name:'code', label:'Código', type:'text', required:true},
    {name:'system_type', label:'Tipo', type:'text'},
    {name:'name', label:'Nome', type:'text', full:true},
    {name:'project_code', label:'Projeto', type:'text'},
    {name:'pressure_bar', label:'Pressão', type:'number', step:'0.1'},
    {name:'status', label:'Status', type:'text'}
  ],
  // Materiais — campos do catalogo + quantity (virtual, vai pra project_materials)
  mat: [
    {name:'code', label:'Código', type:'text', required:true},
    {name:'description', label:'Descrição', type:'text', full:true},
    {name:'category', label:'Categoria', type:'text'},
    {name:'material_type', label:'Material', type:'text'},
    {name:'diameter_in', label:'Ø', type:'number', step:'0.25'},
    {name:'pressure_class', label:'Classe', type:'text'},
    {name:'schedule', label:'Schedule', type:'text'},
    {name:'quantity', label:'Quantidade', type:'number', step:'0.01'},
    {name:'unit', label:'Un.', type:'text'},
    {name:'ncm', label:'NCM', type:'text'},
    {name:'weight_per_unit', label:'Peso/und', type:'number', step:'0.001'},
    {name:'unit_price', label:'Preço unit.', type:'number', step:'0.01'},
    {name:'supplier', label:'Fornecedor', type:'text'},
    {name:'notes', label:'Observações', type:'textarea', full:true}
  ],
  // Equipamentos NR-13
  equip: [
    {name:'tag', label:'TAG', type:'text', required:true},
    {name:'name', label:'Nome', type:'text'},
    {name:'equipment_type', label:'Tipo', type:'text'},
    {name:'manufacturer', label:'Fabricante', type:'text'},
    {name:'pressure_design_bar', label:'P proj.', type:'number', step:'0.1'},
    {name:'temperature_design_c', label:'T proj.', type:'number', step:'0.1'},
    {name:'volume_m3', label:'Volume', type:'number', step:'0.01'},
    {name:'nr13_class', label:'NR-13', type:'text'},
    {name:'status', label:'Status', type:'text'},
    {name:'last_inspection_date', label:'Última insp.', type:'date'},
    {name:'next_inspection_date', label:'Próxima', type:'date'}
  ],
  // Manutenção (OS)
  maint: [
    {name:'os_number', label:'OS', type:'text', required:true},
    {name:'title', label:'Título', type:'text', full:true},
    {name:'os_type', label:'Tipo', type:'text'},
    {name:'priority', label:'Prioridade', type:'text'},
    {name:'equipment_tag', label:'Equipamento', type:'text'},
    {name:'status', label:'Status', type:'text'},
    {name:'scheduled_start', label:'Início prev.', type:'date'},
    {name:'scheduled_end', label:'Fim prev.', type:'date'},
    {name:'planned_hh', label:'HH plan.', type:'number', step:'0.1'}
  ],
  // Soldadores
  sold: [
    {name:'matricula', label:'Matrícula', type:'text', required:true},
    {name:'full_name', label:'Nome', type:'text', full:true, required:true},
    {name:'cpf', label:'CPF', type:'text'},
    {name:'phone', label:'Telefone', type:'text'},
    {name:'active', label:'Status', type:'checkbox'}
  ],
  // Calibração de Instrumentos
  cal: [
    {name:'tag', label:'TAG', type:'text', required:true},
    {name:'name', label:'Nome', type:'text'},
    {name:'instrument_type', label:'Tipo', type:'text'},
    {name:'range', label:'Faixa', type:'text'},
    {name:'standard', label:'Padrão', type:'text'},
    {name:'next_calibration', label:'Próxima calibração', type:'date'},
    {name:'status', label:'Status', type:'text'}
  ],
  // Pendências / NCs
  pend: [
    {name:'priority', label:'Prioridade', type:'text'},
    {name:'pending_type', label:'Tipo', type:'text'},
    {name:'title', label:'Título', type:'text', full:true, required:true},
    {name:'project_code', label:'Projeto', type:'text'},
    {name:'due_date', label:'Prazo', type:'date'},
    {name:'status', label:'Status', type:'text'}
  ],
  // RDO / RDC
  rdo: [
    {name:'report_date', label:'Data', type:'date', required:true},
    {name:'shift', label:'Tipo', type:'text'},
    {name:'project_code', label:'Projeto', type:'text'},
    {name:'weather', label:'Clima', type:'text'},
    {name:'workforce_total', label:'Horas', type:'number'},
    {name:'activities_summary', label:'Resumo', type:'textarea', full:true}
  ],
  // Pintura Industrial
  paint: [
    {name:'inspection_date', label:'Data', type:'date', required:true},
    {name:'scheme', label:'Esquema', type:'text'},
    {name:'inspector_name', label:'Inspetor', type:'text'},
    {name:'prep_method', label:'Preparação', type:'text'},
    {name:'dft_um', label:'DFT', type:'number', step:'0.1'},
    {name:'adhesion_mpa', label:'Aderência', type:'number', step:'0.01'},
    {name:'dew_point_c', label:'P. Orvalho', type:'number', step:'0.1'},
    {name:'humidity_pct', label:'Umid.', type:'number', step:'0.1'},
    {name:'result', label:'Resultado', type:'text'}
  ],
  // Andaime
  scaf: [
    {name:'card_number', label:'Cartão', type:'text', required:true},
    {name:'scaffold_type', label:'Tipo', type:'text'},
    {name:'location', label:'Local', type:'text'},
    {name:'size', label:'Altura/Área', type:'text'},
    {name:'max_load_kg', label:'Carga máx', type:'number', step:'0.1'},
    {name:'status', label:'Status', type:'text'},
    {name:'released_by', label:'Liberado por', type:'text'},
    {name:'next_inspection', label:'Próx. inspeção', type:'date'},
    {name:'expires_at', label:'Vence', type:'date'}
  ],
  // Parâmetros HH (Produtividade)
  prod: [
    {name:'process', label:'Processo', type:'text', required:true},
    {name:'material', label:'Material', type:'text'},
    {name:'diameter_min', label:'Ø min', type:'number', step:'0.25'},
    {name:'diameter_max', label:'Ø max', type:'number', step:'0.25'},
    {name:'hh_per_meter', label:'HH/metro', type:'number', step:'0.001'},
    {name:'hh_per_joint', label:'HH/junta', type:'number', step:'0.001'},
    {name:'hh_per_support', label:'HH/suporte', type:'number', step:'0.001'},
    {name:'factor_inox', label:'Fator INOX', type:'number', step:'0.01'},
    {name:'factor_galv', label:'Fator galv.', type:'number', step:'0.01'},
    {name:'factor_field', label:'Fator campo', type:'number', step:'0.01'},
    {name:'type', label:'Tipo', type:'text'}
  ]
};

function getFieldLabel(view, fieldName, defaultLabel){
  const cust = _fieldCustomizations[view] && _fieldCustomizations[view][fieldName];
  if(cust && cust.label) return cust.label;
  return defaultLabel;
}
function isFieldVisible(view, fieldName){
  const cust = _fieldCustomizations[view] && _fieldCustomizations[view][fieldName];
  if(cust && cust.visible === false) return false;
  return true;
}
function getOrderedFields(view){
  const schema = FIELD_SCHEMA[view] || [];
  const custs = _fieldCustomizations[view] || {};
  return schema.map(f=>({
    ...f,
    label: getFieldLabel(view, f.name, f.label),
    visible: isFieldVisible(view, f.name),
    order: (custs[f.name] && custs[f.name].order!=null) ? custs[f.name].order : 999
  })).sort((a,b)=>a.order-b.order);
}
async function loadFieldCustomizations(){
  if(!_org) return;
  try {
    const {data} = await sb.from('org_field_customizations').select('*').eq('org_id',_org.id);
    _fieldCustomizations = {};
    (data||[]).forEach(r=>{
      if(!_fieldCustomizations[r.view_name]) _fieldCustomizations[r.view_name] = {};
      _fieldCustomizations[r.view_name][r.field_name] = {
        label: r.custom_label,
        visible: r.is_visible,
        order: r.display_order
      };
    });
  } catch(e){ console.warn('loadFieldCustomizations:', e); }
}

// ════════════════════════════════════════════════════
// IMPORTAR EXCEL + IA EM TODAS AS VIEWS
// ════════════════════════════════════════════════════
// Mapeamento view -> tabela do Supabase + project_required flag
const VIEW_TABLE_MAP = {
  quality_joints:   {table:'joints',                 reqProject:true,  extra:{junta_ativa:true}},
  quality_reports:  {table:'ndt_inspections',        reqProject:true},
  com:              {table:'test_systems',           reqProject:true},
  mat:              {table:'materials_catalog',      reqProject:false},
  equip:            {table:'equipments',             reqProject:true},
  maint:            {table:'maint_work_orders',      reqProject:true},
  sold:             {table:'welders',                reqProject:false},
  cal:              {table:'instruments',            reqProject:false},
  pend:             {table:'pendings',               reqProject:true},
  rdo:              {table:'daily_reports',          reqProject:true},
  paint:            {table:'painting_inspections',   reqProject:true},
  scaf:             {table:'scaffolds',              reqProject:true},
  prod:             {table:'productivity_params',    reqProject:false}
};

// Mapeamento view -> {discipline_code, document_type} para chamar Gemini com o prompt certo
const VIEW_AI_PROMPT = {
  quality_joints:   {disc:'qualidade',          doc:'mapa_juntas'},
  quality_reports:  {disc:'qualidade',          doc:'laudo_end'},
  sold:             {disc:'qualidade',          doc:'soldadores'},
  cal:              {disc:'instrumentacao_cal', doc:'instrumentos'},
  com:              {disc:'comissionamento',    doc:'sistemas_th'},
  mat:              {disc:'tubulacao',          doc:'lista_materiais'},
  equip:            {disc:'eq_estatico',        doc:'cadastro_equipamento'},
  maint:            {disc:'manutencao',         doc:'ordem_servico'},
  pend:             {disc:'qualidade',          doc:'pendencias_nc'},
  rdo:              {disc:'documentacao',       doc:'rdo_diario'},
  paint:            {disc:'pintura',            doc:'inspecao_dft'},
  scaf:             {disc:'andaime',            doc:'cartao_andaime'},
  prod:             {disc:'tubulacao',          doc:'produtividade_hh'}
};

// Auto-detecta o mapeamento de coluna do Excel -> campo do sistema
// Tenta: exato (case-insensitive) > sem acentos > contém substring
function _normStr(s){
  return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
}
function _autoMapColumn(excelHeader, schemaFields){
  const norm = _normStr(excelHeader);
  // 1) exato pelo label
  for(const f of schemaFields){ if(_normStr(f.label) === norm) return f.name; }
  // 2) exato pelo name
  for(const f of schemaFields){ if(_normStr(f.name) === norm) return f.name; }
  // 3) contém substring
  for(const f of schemaFields){
    const ln = _normStr(f.label);
    if(ln && (ln.includes(norm) || norm.includes(ln))) return f.name;
  }
  return '';
}

// ──────────────── IMPORTAR EXCEL ────────────────
function openImportExcel(view){
  const mapInfo = VIEW_TABLE_MAP[view];
  if(!mapInfo){ toast('Esta view nao suporta importar Excel','warn'); return; }
  if(mapInfo.reqProject && !curProj){ toast('Selecione um projeto primeiro','warn'); return; }

  const viewNames = {quality_joints:'Mapa de Juntas',quality_reports:'Relatorios END',com:'Sistemas TH',mat:'Materiais',equip:'Equipamentos',maint:'Manutencao',sold:'Soldadores',cal:'Instrumentos',pend:'Pendencias',rdo:'RDO',paint:'Pintura',scaf:'Andaime',prod:'Produtividade HH'};
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'import-excel-overlay';
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="mbox" style="max-width:820px"><button class="mclose" onclick="document.getElementById(\'import-excel-overlay\').remove()"><i data-lucide="x"></i></button>'
    + '<div class="mtitle"><i data-lucide="file-spreadsheet" style="color:var(--success)"></i>Importar Excel - '+(viewNames[view]||view)+'</div>'
    + '<div style="background:var(--success-l);border-left:3px solid var(--success);padding:10px 14px;border-radius:6px;font-size:12px;color:var(--success-h);margin-bottom:14px"><strong>Como funciona:</strong> selecione um arquivo .xlsx/.xls/.csv com a primeira linha contendo os cabecalhos das colunas. O sistema vai sugerir o mapeamento de cada coluna do Excel para um campo do sistema. Voce ajusta o que quiser e clica Importar para cadastrar tudo de uma vez.</div>'
    + '<div style="border:2px dashed var(--t3);border-radius:12px;padding:30px;text-align:center;cursor:pointer;background:var(--t1)" onclick="document.getElementById(\'imp-xl-file\').click()">'
    + '<i data-lucide="upload-cloud" style="width:36px;height:36px;color:var(--primary);margin-bottom:8px"></i>'
    + '<div style="font-size:13.5px;font-weight:600;color:var(--t9)">Clique ou arraste o arquivo Excel/CSV aqui</div>'
    + '<div style="font-size:11.5px;color:var(--t6);margin-top:4px">.xlsx &middot; .xls &middot; .csv (ate ~5000 linhas)</div>'
    + '</div>'
    + '<input type="file" id="imp-xl-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="processImportExcel(this,\''+view+'\')">'
    + '<div id="imp-xl-content" style="margin-top:16px"></div>'
    + '<div class="mfooter" id="imp-xl-footer"><button class="btn bg" onclick="document.getElementById(\'import-excel-overlay\').remove()">Fechar</button></div>'
    + '</div>';
  document.body.appendChild(overlay);
  _renderIcons();
}

let _impXlData = null;
let _impXlView = null;
function processImportExcel(input, view){
  const file = input.files && input.files[0];
  if(!file) return;
  _impXlView = view;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:null});
      if(!rows.length){ toast('Planilha vazia','warn'); return; }
      _impXlData = rows;
      const schema = FIELD_SCHEMA[view] || [];
      const headers = Object.keys(rows[0]);
      const preview = rows.slice(0,3);

      const content = document.getElementById('imp-xl-content');
      content.innerHTML = '<div style="background:var(--t1);border:1px solid var(--t3);border-radius:10px;padding:14px;margin-bottom:14px">'
        + '<div style="font-size:13px;font-weight:700;color:var(--t9);margin-bottom:8px"><i data-lucide="check-circle-2" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;color:var(--success)"></i> Arquivo lido: <strong>'+rows.length+' linhas</strong> encontradas</div>'
        + '<div style="font-size:11.5px;color:var(--t6)">Coluna do Excel &rarr; Campo do sistema:</div>'
        + '<div style="display:grid;grid-template-columns:1fr 14px 1fr;gap:8px 12px;margin-top:10px;align-items:center">'
        + headers.map(h=>{
            const auto = _autoMapColumn(h, schema);
            const opts = '<option value="">-- ignorar --</option>' + schema.map(f=>'<option value="'+f.name+'"'+(f.name===auto?' selected':'')+'>'+san(f.label)+' ('+f.name+')</option>').join('');
            return '<div style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--t8);background:var(--t0);padding:6px 10px;border:1px solid var(--t3);border-radius:6px">'+san(h)+'</div>'
                + '<div style="text-align:center;color:var(--t5)">&rarr;</div>'
                + '<select data-excel-col="'+san(h)+'" style="padding:6px 10px;border:1px solid var(--t3);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg)">'+opts+'</select>';
          }).join('')
        + '</div></div>'
        + '<div style="margin-top:14px"><div style="font-size:11.5px;color:var(--t6);margin-bottom:6px">Pré-visualização (3 primeiras linhas):</div>'
        + '<div class="tbl-wrap" style="max-height:200px;overflow:auto"><table><thead><tr>'+headers.map(h=>'<th>'+san(h)+'</th>').join('')+'</tr></thead><tbody>'
        + preview.map(r=>'<tr>'+headers.map(h=>'<td style="font-size:11px">'+san(r[h]==null?'':r[h])+'</td>').join('')+'</tr>').join('')
        + '</tbody></table></div></div>';

      document.getElementById('imp-xl-footer').innerHTML = '<button class="btn bg" onclick="document.getElementById(\'import-excel-overlay\').remove()">Cancelar</button>'
        + '<button class="btn bp" onclick="confirmImportExcel(\''+view+'\')"><i data-lucide="upload"></i>Importar '+rows.length+' registros</button>';
      _renderIcons();
    } catch(err){ toast('Erro lendo Excel: '+(err.message||err),'err'); }
  };
  reader.readAsArrayBuffer(file);
}

async function confirmImportExcel(view){
  if(!_impXlData || !_impXlData.length){ toast('Sem dados pra importar','warn'); return; }
  const mapInfo = VIEW_TABLE_MAP[view];
  if(!mapInfo){ toast('View nao mapeada','err'); return; }

  // Lê mapeamento de colunas
  const selects = document.querySelectorAll('#imp-xl-content select[data-excel-col]');
  const colMap = {};
  selects.forEach(s=>{
    if(s.value) colMap[s.dataset.excelCol] = s.value;
  });
  if(!Object.keys(colMap).length){ toast('Mapeie pelo menos uma coluna','warn'); return; }

  // Constroi registros
  const records = _impXlData.map(row=>{
    const rec = { org_id: _org.id };
    if(mapInfo.reqProject) rec.project_id = curProj;
    if(mapInfo.extra) Object.assign(rec, mapInfo.extra);
    Object.entries(colMap).forEach(([excelCol, fieldName])=>{
      let val = row[excelCol];
      if(val === '' || val == null) return;
      // Coerção de tipo basica via schema
      const f = (FIELD_SCHEMA[view]||[]).find(x=>x.name===fieldName);
      if(f){
        if(f.type==='number') val = parseFloat(val);
        if(f.type==='checkbox') val = ['sim','true','1','x','yes'].includes(String(val).toLowerCase());
        if(f.type==='date'){
          // Excel pode trazer numero serial ou string
          if(typeof val === 'number'){
            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
            val = d.toISOString().slice(0,10);
          } else { val = String(val).slice(0,10); }
        }
      }
      rec[fieldName] = val;
    });
    return rec;
  }).filter(r=>Object.keys(r).length > (mapInfo.reqProject?2:1));

  if(!records.length){ toast('Nenhum registro valido','warn'); return; }

  toast('Importando '+records.length+' registros...','warn');
  try {
    // Insere em batches de 100
    let imported = 0;
    for(let i=0; i<records.length; i+=100){
      const batch = records.slice(i, i+100);
      const {error} = await sb.from(mapInfo.table).insert(batch);
      if(error) throw error;
      imported += batch.length;
    }
    toast(imported+' registros importados!','ok');
    document.getElementById('import-excel-overlay').remove();
    _impXlData = null;
    // Re-renderiza a view
    if(typeof reRenderViewWithLabels==='function') await reRenderViewWithLabels(view);
  } catch(e){ toast('Erro: '+(e.message||e),'err'); }
}

// ──────────────── IMPORTAR VIA IA ────────────────
function openAIImport(view){
  const mapInfo = VIEW_TABLE_MAP[view];
  if(!mapInfo){ toast('Esta view nao suporta IA','warn'); return; }
  if(mapInfo.reqProject && !curProj){ toast('Selecione um projeto primeiro','warn'); return; }

  const viewNames = {quality_joints:'Mapa de Juntas',quality_reports:'Relatorios END',com:'Sistemas TH',mat:'Materiais',equip:'Equipamentos',maint:'Manutencao',sold:'Soldadores',cal:'Instrumentos',pend:'Pendencias',rdo:'RDO',paint:'Pintura',scaf:'Andaime',prod:'Produtividade HH'};

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'ai-import-overlay';
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="mbox" style="max-width:680px"><button class="mclose" onclick="document.getElementById(\'ai-import-overlay\').remove()"><i data-lucide="x"></i></button>'
    + '<div class="mtitle"><i data-lucide="sparkles" style="color:var(--violet)"></i>Importar via IA - '+(viewNames[view]||view)+'</div>'
    + '<div style="background:var(--violet-l);border-left:3px solid var(--violet);padding:10px 14px;border-radius:6px;font-size:12px;color:#5B21B6;margin-bottom:14px"><strong>Como funciona:</strong> envie um PDF, imagem ou planilha. A IA le o documento, extrai os dados estruturados e mostra uma previa antes de cadastrar. Funciona com fotos de fichas em papel, prints de planilha, lista impressa, etc.</div>'
    + '<div style="border:2px dashed var(--violet);border-radius:12px;padding:30px;text-align:center;cursor:pointer;background:var(--violet-l)" onclick="document.getElementById(\'ai-imp-file\').click()">'
    + '<i data-lucide="sparkles" style="width:36px;height:36px;color:var(--violet);margin-bottom:8px"></i>'
    + '<div style="font-size:13.5px;font-weight:600;color:var(--t9)">Clique ou arraste o documento</div>'
    + '<div style="font-size:11.5px;color:var(--t6);margin-top:4px">PDF &middot; PNG &middot; JPG &middot; XLSX (ate 20 MB)</div>'
    + '</div>'
    + '<div style="margin-top:14px"><label style="font-size:11px;font-weight:600;color:var(--t7);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block"><i data-lucide="message-square-plus" style="width:11px;height:11px;display:inline-block;vertical-align:-1px"></i> Instrucoes extras para a IA (opcional)</label><textarea id="ai-imp-instructions" placeholder="Ex: ignore linhas com diametro menor que 1 polegada / so importe juntas soldadas em 2026 / use o codigo da coluna B como matricula..." style="width:100%;padding:9px 12px;border:1px solid var(--t3);border-radius:8px;font-size:12px;font-family:inherit;background:var(--t0);color:var(--t9);min-height:60px;resize:vertical;outline:none"></textarea><div style="font-size:10.5px;color:var(--t5);margin-top:4px">A IA seguira estas instrucoes alem do prompt padrao. Util para ajustar conforme a particularidade da sua empresa.</div></div>'
    + '<input type="file" id="ai-imp-file" accept=".pdf,image/*,.xlsx,.xls" style="display:none" onchange="processAIImport(this,\''+view+'\')">'
    + '<div id="ai-imp-status" style="margin-top:14px"></div>'
    + '<div id="ai-imp-result" style="margin-top:14px;display:none"></div>'
    + '<div class="mfooter" id="ai-imp-footer"><button class="btn bg" onclick="document.getElementById(\'ai-import-overlay\').remove()">Fechar</button></div>'
    + '</div>';
  document.body.appendChild(overlay);
  _renderIcons();
}

let _aiImpData = null;
async function processAIImport(input, view){
  const file = input.files && input.files[0];
  if(!file) return;
  const statusEl = document.getElementById('ai-imp-status');
  statusEl.innerHTML = '<div style="background:var(--primary-l);border:1px solid var(--primary);border-radius:8px;padding:11px 14px;font-size:12px;color:var(--primary-h)"><i data-lucide="loader" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;animation:spin 1s linear infinite"></i> Analisando documento com IA... (15-60s)</div>';
  _renderIcons();

  try {
    // Detecta XLSX/XLS -> converte pra CSV no frontend (Gemini suporta CSV nativamente, e fica mais barato)
    let b64, mimeOut;
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  || file.type === 'application/vnd.ms-excel'
                  || /\.xlsx?$/i.test(file.name);
    if(isExcel){
      // Le XLSX e converte cada sheet pra CSV
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), {type:'array'});
      let csvAll = '';
      wb.SheetNames.forEach(name=>{
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
        if(csv.trim()) csvAll += '### Sheet: ' + name + ' ###\n' + csv + '\n\n';
      });
      if(!csvAll.trim()) { statusEl.innerHTML = '<div style="background:var(--danger-l);color:var(--danger-h);border:1px solid var(--danger);border-radius:8px;padding:11px 14px;font-size:12px">Planilha vazia.</div>'; return; }
      // Codifica utf-8 -> base64
      b64 = btoa(unescape(encodeURIComponent(csvAll)));
      mimeOut = 'text/csv';
    } else if(file.type === 'text/csv' || /\.csv$/i.test(file.name)){
      const txt = await file.text();
      b64 = btoa(unescape(encodeURIComponent(txt)));
      mimeOut = 'text/csv';
    } else {
      // PDF / imagem / texto - le como base64 direto
      b64 = await new Promise((res,rej)=>{
        const r = new FileReader();
        r.onload = ()=>res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      mimeOut = file.type || 'application/octet-stream';
    }

    // Mapeia view -> discipline/document_type cadastrados em discipline_ai_prompts
    const aiMap = VIEW_AI_PROMPT[view] || {disc:'qualidade', doc:view};
    // Le instrucoes extras digitadas pelo usuario
    const userInstr = (document.getElementById('ai-imp-instructions')?.value || '').trim();
    const fieldsHint = 'Campos esperados (use exatamente esses nomes nas chaves do JSON): ' + (FIELD_SCHEMA[view]||[]).map(f=>f.name+' ('+f.label+')').join(', ');
    const combinedInstructions = userInstr ? (fieldsHint + '\n\nINSTRUCOES EXTRAS DO USUARIO:\n' + userInstr) : fieldsHint;

    const {data:{session}} = await sb.auth.getSession();
    const resp = await fetch(SUPABASE_URL+'/functions/v1/analyze-discipline-doc', {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+(session?.access_token||SUPABASE_KEY)},
      body: JSON.stringify({
        file: b64,
        mime: mimeOut,
        discipline_code: aiMap.disc,
        document_type: aiMap.doc,
        project_id: curProj || null,
        custom_instructions: combinedInstructions,
        auto_save: false
      })
    });
    const data = await resp.json();
    if(!resp.ok || data.error){ statusEl.innerHTML = '<div style="background:var(--danger-l);color:var(--danger-h);border:1px solid var(--danger);border-radius:8px;padding:11px 14px;font-size:12px">Erro: '+(data.error||resp.status)+'</div>'; return; }

    // Tenta extrair array de registros — robusto a varios formatos que a IA pode retornar
    let records = [];
    const ext = data.extracted || data.result || data;
    if(Array.isArray(ext)){
      records = ext;
    } else if(typeof ext === 'object' && ext){
      // Procura por uma chave cujo valor seja array (records, items, data, project_materials, materials, equipments, joints, etc)
      const arrayKeys = Object.keys(ext).filter(k=>Array.isArray(ext[k]));
      if(arrayKeys.length){
        // Pega o MAIOR array (mais provavel de ser a lista de registros)
        let bestKey = arrayKeys[0];
        for(const k of arrayKeys){ if(ext[k].length > ext[bestKey].length) bestKey = k; }
        records = ext[bestKey];
      } else {
        // Sem array: assume que o proprio objeto eh UM unico registro
        records = [ext];
      }
    }
    // Filtra: cada record deve ser um objeto (nao primitivo)
    records = records.filter(r => r && typeof r === 'object' && !Array.isArray(r));

    if(!records.length){ statusEl.innerHTML = '<div style="background:var(--warning-l);color:var(--warning-h);border:1px solid var(--warning);border-radius:8px;padding:11px 14px;font-size:12px">IA não conseguiu extrair registros estruturados. Tente um documento mais claro.</div>'; return; }

    _aiImpData = records;
    statusEl.innerHTML = '<div style="background:var(--success-l);color:var(--success-h);border:1px solid var(--success);border-radius:8px;padding:11px 14px;font-size:12px"><i data-lucide="check-circle-2" style="width:14px;height:14px;display:inline-block;vertical-align:-2px"></i> IA extraiu <strong>'+records.length+' registros</strong>. Revise abaixo e clique Importar.</div>';
    _renderIcons();

    // Mostra preview
    const allKeys = [...new Set(records.flatMap(r=>Object.keys(r)))];
    const result = document.getElementById('ai-imp-result');
    result.style.display = 'block';
    result.innerHTML = '<div style="font-size:11.5px;color:var(--t6);margin-bottom:6px">Pré-visualização (até 10 registros):</div>'
      + '<div class="tbl-wrap" style="max-height:280px;overflow:auto"><table><thead><tr>'+allKeys.map(k=>'<th>'+san(k)+'</th>').join('')+'</tr></thead><tbody>'
      + records.slice(0,10).map(r=>'<tr>'+allKeys.map(k=>{
          let v = r[k];
          if(v==null || v==='') return '<td style="font-size:11px;color:var(--t5)">—</td>';
          // Se eh objeto/array, serializa em JSON curto
          if(typeof v === 'object') v = JSON.stringify(v);
          return '<td style="font-size:11px">'+san(String(v).slice(0,80))+'</td>';
        }).join('')+'</tr>').join('')
      + '</tbody></table></div>';

    document.getElementById('ai-imp-footer').innerHTML = '<button class="btn bg" onclick="document.getElementById(\'ai-import-overlay\').remove()">Cancelar</button>'
      + '<button class="btn bp" onclick="confirmAIImport(\''+view+'\')"><i data-lucide="check"></i>Importar '+records.length+' registros</button>';
    _renderIcons();
  } catch(e){
    statusEl.innerHTML = '<div style="background:var(--danger-l);color:var(--danger-h);border:1px solid var(--danger);border-radius:8px;padding:11px 14px;font-size:12px" id="__se_box"></div>';
    const __seBox = document.getElementById('__se_box'); if(__seBox) __seBox.textContent = 'Erro: ' + (e.message||e);
  }
}

async function confirmAIImport(view){
  if(!_aiImpData || !_aiImpData.length){ toast('Sem dados','warn'); return; }
  const mapInfo = VIEW_TABLE_MAP[view];
  if(!mapInfo){ toast('View não mapeada','err'); return; }

  toast('Cadastrando '+_aiImpData.length+' registros...','warn');

  // ───────── CASO ESPECIAL: MATERIAIS (catalogo + project_materials) ─────────
  if(view === 'mat'){
    try {
      let catalogAdded = 0;
      let pmAdded = 0;
      for(const r of _aiImpData){
        if(!r.code) continue;
        // 1) Upsert no materials_catalog (sem quantity)
        const catalogRec = { org_id: _org.id };
        ['code','description','category','material_type','diameter_in','pressure_class','schedule','ncm','unit','weight_per_unit','unit_price','supplier','notes'].forEach(k=>{
          if(r[k]!=null && r[k]!=='') catalogRec[k] = r[k];
        });
        // Verifica se ja existe
        const {data:exist} = await sb.from('materials_catalog').select('id').eq('org_id',_org.id).eq('code',r.code).is('deleted_at',null).maybeSingle();
        let materialId;
        if(exist){
          materialId = exist.id;
          // Atualiza dados do catalogo
          await sb.from('materials_catalog').update(catalogRec).eq('id',materialId);
        } else {
          const {data:ins, error:e1} = await sb.from('materials_catalog').insert(catalogRec).select('id').single();
          if(e1){ console.warn('catalog insert:', e1); continue; }
          materialId = ins.id;
          catalogAdded++;
        }
        // 2) Se ha quantidade e projeto, grava em project_materials
        const qty = parseFloat(r.quantity);
        if(qty > 0 && curProj){
          const {data:pmExist} = await sb.from('project_materials').select('id, qty_planned').eq('project_id',curProj).eq('material_id',materialId).maybeSingle();
          if(pmExist){
            // Soma a quantidade existente
            const novaQty = (parseFloat(pmExist.qty_planned)||0) + qty;
            await sb.from('project_materials').update({qty_planned: novaQty}).eq('id',pmExist.id);
          } else {
            await sb.from('project_materials').insert({org_id:_org.id, project_id:curProj, material_id:materialId, qty_planned: qty});
          }
          pmAdded++;
        }
      }
      const msg = catalogAdded+' novos no catálogo · '+pmAdded+' vinculados ao projeto';
      toast(msg,'ok');
      document.getElementById('ai-import-overlay').remove();
      _aiImpData = null;
      if(typeof reRenderViewWithLabels==='function') await reRenderViewWithLabels(view);
      return;
    } catch(e){ toast('Erro: '+(e.message||e),'err'); return; }
  }

  // ───────── PADRAO: insert direto na tabela ─────────
  const validFields = new Set((FIELD_SCHEMA[view]||[]).map(f=>f.name));
  const records = _aiImpData.map(r=>{
    const rec = { org_id: _org.id };
    if(mapInfo.reqProject) rec.project_id = curProj;
    if(mapInfo.extra) Object.assign(rec, mapInfo.extra);
    Object.entries(r).forEach(([k,v])=>{
      if(validFields.has(k) && v!=null && v!=='') rec[k] = v;
    });
    return rec;
  }).filter(r=>Object.keys(r).length > (mapInfo.reqProject?2:1));

  if(!records.length){ toast('Nenhum registro com campos válidos','warn'); return; }

  try {
    let imported = 0;
    for(let i=0; i<records.length; i+=100){
      const batch = records.slice(i, i+100);
      const {error} = await sb.from(mapInfo.table).insert(batch);
      if(error) throw error;
      imported += batch.length;
    }
    toast(imported+' registros cadastrados pela IA!','ok');
    document.getElementById('ai-import-overlay').remove();
    _aiImpData = null;
    if(typeof reRenderViewWithLabels==='function') await reRenderViewWithLabels(view);
  } catch(e){ toast('Erro: '+(e.message||e),'err'); }
}

// Aplica labels customizados em <th> da(s) tabela(s) do container.
// Match pelo TEXTO ATUAL do th contra o label padrão do schema (case-insensitive).
// Funciona mesmo quando algumas colunas da tabela não estão no schema.
function applyFieldLabels(view, container){
  const schema = FIELD_SCHEMA[view];
  if(!schema || !container || !container.querySelectorAll) return;
  // Mapa case-insensitive: label-padrao -> {name, label}
  const labelMap = {};
  schema.forEach(f => {
    const k = (f.label||'').trim().toLowerCase();
    if(k) labelMap[k] = f;
  });
  const tables = container.querySelectorAll('table');
  tables.forEach(table=>{
    const ths = table.querySelectorAll('thead th');
    ths.forEach((th, idx)=>{
      const currentText = (th.textContent||'').trim();
      const key = currentText.toLowerCase();
      const f = labelMap[key];
      if(!f) return;
      const customLabel = getFieldLabel(view, f.name, f.label);
      if(customLabel && customLabel !== currentText){
        th.textContent = customLabel;
      }
      if(!isFieldVisible(view, f.name)){
        th.style.display = 'none';
        table.querySelectorAll('tbody tr').forEach(tr=>{
          const td = tr.children[idx];
          if(td) td.style.display = 'none';
        });
      }
    });
  });
}

function openFieldsCustomization(view){
  const schema = FIELD_SCHEMA[view];
  if(!schema){ toast('View nao suporta customizacao ainda','warn'); return; }
  const fields = getOrderedFields(view);
  const viewNames = {
    quality_joints:'Mapa de Juntas',
    quality_reports:'Relatórios END',
    com:'Comissionamento (Sistemas TH)',
    mat:'Materiais',
    equip:'Equipamentos NR-13',
    maint:'Manutenção (OS)',
    sold:'Soldadores · Qualificação',
    cal:'Calibração de Instrumentos',
    pend:'Pendências / NCs',
    rdo:'RDO / RDC',
    paint:'Pintura Industrial',
    scaf:'Andaime',
    prod:'Parâmetros HH'
  };
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'fields-cust-overlay';
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="mbox" style="max-width:680px"><button class="mclose" onclick="document.getElementById(\'fields-cust-overlay\').remove()"><i data-lucide="x"></i></button>'
    + '<div class="mtitle"><i data-lucide="settings" style="color:var(--primary)"></i>Personalizar colunas — '+(viewNames[view]||view)+'</div>'
    + '<div style="background:var(--primary-l);border-left:3px solid var(--primary);padding:10px 14px;border-radius:6px;font-size:12px;color:var(--primary-h);margin-bottom:14px">Renomeie campos conforme a terminologia da sua empresa, esconda colunas que você não usa e arraste para reordenar. As mudanças valem para toda a sua organização.</div>'
    + '<div id="fields-list" style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto">'
    + fields.map(f=>'<div class="field-row" data-field="'+f.name+'" draggable="true" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--t1);border:1px solid var(--t3);border-radius:8px">'
        + '<i data-lucide="grip-vertical" style="width:16px;height:16px;color:var(--t5);cursor:grab"></i>'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t7);font-weight:600;cursor:pointer;user-select:none"><input type="checkbox" '+(f.visible?'checked':'')+' data-name="'+f.name+'" data-prop="visible" style="width:auto;height:16px"> Visível</label>'
        + '<div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">'
        + '<span style="font-size:10px;color:var(--t5);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Campo: '+f.name+' ('+f.type+')</span>'
        + '<input type="text" value="'+san(f.label)+'" data-name="'+f.name+'" data-prop="label" placeholder="Nome a exibir" style="padding:6px 10px;border:1px solid var(--t3);border-radius:6px;font-size:12.5px;font-family:inherit;width:100%">'
        + '</div></div>').join('')
    + '</div>'
    + '<div class="mfooter"><button class="btn bg" onclick="document.getElementById(\'fields-cust-overlay\').remove()">Cancelar</button><button class="btn bo" onclick="resetFieldsCustomization(\''+view+'\')"><i data-lucide="rotate-ccw"></i>Restaurar padrão</button><button class="btn bp" onclick="saveFieldsCustomization(\''+view+'\')"><i data-lucide="check"></i>Salvar</button></div>'
    + '</div>';
  document.body.appendChild(overlay);
  _renderIcons();

  // Drag and drop
  let draggedEl = null;
  overlay.querySelectorAll('.field-row').forEach(row=>{
    row.addEventListener('dragstart', ()=>{ draggedEl = row; row.style.opacity='.4'; });
    row.addEventListener('dragend', ()=>{ row.style.opacity='1'; draggedEl = null; });
    row.addEventListener('dragover', e=>e.preventDefault());
    row.addEventListener('drop', e=>{
      e.preventDefault();
      if(draggedEl && draggedEl !== row){
        const list = document.getElementById('fields-list');
        const rows = [...list.children];
        const dIdx = rows.indexOf(draggedEl);
        const tIdx = rows.indexOf(row);
        if(dIdx < tIdx) list.insertBefore(draggedEl, row.nextSibling);
        else list.insertBefore(draggedEl, row);
      }
    });
  });
}

async function saveFieldsCustomization(view){
  const overlay = document.getElementById('fields-cust-overlay');
  if(!overlay) return;
  const rows = overlay.querySelectorAll('.field-row');
  const updates = [];
  rows.forEach((row, idx)=>{
    const labelInput = row.querySelector('input[data-prop="label"]');
    const visibleInput = row.querySelector('input[data-prop="visible"]');
    updates.push({
      org_id: _org.id,
      view_name: view,
      field_name: row.dataset.field,
      custom_label: labelInput.value.trim() || null,
      is_visible: visibleInput.checked,
      display_order: idx,
      updated_at: new Date().toISOString()
    });
  });
  try {
    const {error} = await sb.from('org_field_customizations').upsert(updates, {onConflict:'org_id,view_name,field_name'});
    if(error) throw error;
    toast('Colunas personalizadas','ok');
    overlay.remove();
    await loadFieldCustomizations();
    await reRenderViewWithLabels(view);
  } catch(e){ toast('Erro: '+(e.message||e),'err'); }
}
async function resetFieldsCustomization(view){
  if(!confirm('Restaurar todos os campos desta view ao padrão? Suas customizações serão apagadas.')) return;
  const {error} = await sb.from('org_field_customizations').delete().eq('org_id',_org.id).eq('view_name',view);
  if(error){ toast('Erro: '+error.message,'err'); return; }
  toast('Restaurado ao padrão','ok');
  document.getElementById('fields-cust-overlay')?.remove();
  await loadFieldCustomizations();
  await reRenderViewWithLabels(view);
}
// Re-renderiza a view e DEPOIS aplica os labels customizados (com pequeno delay)
async function reRenderViewWithLabels(view){
  // Primeiro recarrega o cache de dados do banco (loadExtra cobre quase tudo)
  try {
    if(typeof loadExtra==='function') await loadExtra();
    // Views especiais que precisam reload extra
    if((view==='quality_joints' || view==='quality_reports') && typeof loadCore==='function') await loadCore();
    if((view==='isos' || view==='projects' || view==='mat' || view==='panel') && typeof loadAll==='function') await loadAll();
  } catch(e){ console.warn('reRenderViewWithLabels loadExtra:', e); }

  const viewToFn = {quality_joints:rQualityJoints, quality_reports:rQualityReports, com:rCom, mat:rMat, equip:rEquip, maint:rMaint, sold:rSold, cal:rCal, pend:rPend, rdo:rRdo, paint:rPaint, scaf:rScaf, prod:rProd};
  if(viewToFn[view]){
    const r = viewToFn[view]();
    if(r && typeof r.then === 'function') await r;
  }
  // Mapa view -> id do container
  const mapView = {panel:'vpanel',projects:'vp',isos:'vi',map:'vmap',pend:'vpend',rdo:'vrdo',mat:'vmat',sold:'vsold',com:'vcom',imp:'vimp',gantt:'vgantt',int:'vint',prod:'vprod',dash:'vdash',team:'vteam',plan:'vplan',equip:'vequip',maint:'vmaint',paint:'vpaint',scaf:'vscaf',cal:'vcal',quality_joints:'vquality_joints',quality_reports:'vquality_reports'};
  const containerId = mapView[view];
  if(!containerId) return;
  // Espera o DOM atualizar
  setTimeout(()=>{
    const container = document.getElementById(containerId);
    if(container) applyFieldLabels(view, container);
  }, 100);
  setTimeout(()=>{
    const container = document.getElementById(containerId);
    if(container) applyFieldLabels(view, container);
  }, 400);
}

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// HELPER GLOBAL: remove modais dinâmicos residuais
// ═══════════════════════════════════════════════════
