/*! PROJECT.IA - Excel Export Universal v2
 *  Excel profissional com BORDAS, CORES e formatação completa.
 *  Usa xlsx-js-style (fork do xlsx que suporta estilos).
 *
 *  Uso:
 *    PIAExcel.exportTable(tableElement, opts)
 *    PIAExcel.exportData(data, opts)
 */
(function(w,d){'use strict';
try {

const BLUE_HEADER = '1E40AF';     // azul cabeçalho
const LIGHT_BG    = 'EFF6FF';     // azul muito claro (zebra)
const TITLE_BG    = '0F172A';     // navy escuro (faixa título)
const BORDER_DK   = 'CBD5E1';     // cinza médio bordas

// Estilo de borda fina em todos os lados
const BORDER_THIN = {
  top:    { style: 'thin', color: { rgb: BORDER_DK } },
  bottom: { style: 'thin', color: { rgb: BORDER_DK } },
  left:   { style: 'thin', color: { rgb: BORDER_DK } },
  right:  { style: 'thin', color: { rgb: BORDER_DK } }
};
const BORDER_MEDIUM = {
  top:    { style: 'medium', color: { rgb: '1E40AF' } },
  bottom: { style: 'medium', color: { rgb: '1E40AF' } },
  left:   { style: 'medium', color: { rgb: '1E40AF' } },
  right:  { style: 'medium', color: { rgb: '1E40AF' } }
};

function styleTitle() {
  return {
    font:      { name: 'Calibri', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    fill:      { fgColor: { rgb: TITLE_BG } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border:    BORDER_MEDIUM
  };
}
function styleSubInfo() {
  return {
    font:      { name: 'Calibri', sz: 10, bold: false, italic: true, color: { rgb: '475569' } },
    fill:      { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border:    BORDER_THIN
  };
}
function styleHeader() {
  return {
    font:      { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill:      { fgColor: { rgb: BLUE_HEADER } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border:    BORDER_MEDIUM
  };
}
function styleCell(zebra) {
  return {
    font:      { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill:      zebra ? { fgColor: { rgb: LIGHT_BG } } : { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border:    BORDER_THIN
  };
}
function styleTotalRow() {
  return {
    font:      { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill:      { fgColor: { rgb: BLUE_HEADER } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border:    BORDER_MEDIUM
  };
}

function fmtCellValue(v){
  if(v == null) return '';
  if(typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function ensureXLSX(){
  return typeof w.XLSX !== 'undefined' && w.XLSX.utils;
}

function sanitizeFilename(s){
  return String(s||'export').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100);
}

function ts(){
  const d = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function tableToData(table){
  const rows = [];
  const headers = [];
  const ths = table.querySelectorAll('thead th, thead td');
  ths.forEach(th => { headers.push((th.textContent || '').trim()); });
  const trs = table.querySelectorAll('tbody tr');
  trs.forEach(tr => {
    if(tr.style.display === 'none') return;
    const tds = tr.querySelectorAll('td');
    if(tds.length === 1){
      const td = tds[0];
      const colspan = parseInt(td.getAttribute('colspan')||'1');
      if(colspan > 1) return;
      const txt = (td.textContent||'').trim().toLowerCase();
      if(/nenhum|sem dados|empty|vazio|sem registros/.test(txt)) return;
    }
    if(headers.length > 2 && tds.length < headers.length / 2) return;
    const row = {};
    tds.forEach((td, idx) => {
      const header = headers[idx] || `Col${idx+1}`;
      const clone = td.cloneNode(true);
      clone.querySelectorAll('button, svg, .btn, .actions, input, select').forEach(el => el.remove());
      row[header] = (clone.textContent || '').trim().replace(/\s+/g, ' ');
    });
    rows.push(row);
  });
  return { headers, rows };
}

function exportData(data, opts){
  if(!ensureXLSX()){ alert('Biblioteca XLSX nao carregada.'); return; }
  opts = opts || {};
  const fname = sanitizeFilename(opts.filename || 'export') + '_' + ts() + '.xlsx';

  const headers = opts.columns
    ? opts.columns.map(c => typeof c === 'string' ? c : (c.label || c.key))
    : (data.length > 0 ? Object.keys(data[0]) : []);
  const keys = opts.columns
    ? opts.columns.map(c => typeof c === 'string' ? c : (c.key || c.label))
    : headers;

  const orgName = (w._org && w._org.name) || '—';
  const projName = opts.project || '—';
  const now = new Date().toLocaleString('pt-BR');
  const ncols = Math.max(1, headers.length);

  // Monta planilha como objeto (cell-by-cell)
  const ws = {};
  let r = 0;

  // L1: Título
  ws[xc(0,r)] = { v: 'PROJECT.IA — ' + (opts.title || 'Relatório'), s: styleTitle(), t: 's' };
  for(let c=1;c<ncols;c++) ws[xc(c,r)] = { v:'', s: styleTitle(), t: 's' };
  r++;
  // L2: Subtítulo / contexto
  ws[xc(0,r)] = { v: (opts.subtitle || 'Exportado do sistema PROJECT.IA — Engenharia Industrial'), s: styleSubInfo(), t: 's' };
  for(let c=1;c<ncols;c++) ws[xc(c,r)] = { v:'', s: styleSubInfo(), t: 's' };
  r++;
  // L3: Empresa + Data
  ws[xc(0,r)] = { v: 'Empresa: ' + orgName, s: styleSubInfo(), t: 's' };
  ws[xc(1,r)] = { v: 'Projeto: ' + projName, s: styleSubInfo(), t: 's' };
  if(ncols >= 3){
    ws[xc(2,r)] = { v: 'Gerado em: ' + now, s: styleSubInfo(), t: 's' };
  }
  for(let c=3;c<ncols;c++) ws[xc(c,r)] = { v:'', s: styleSubInfo(), t: 's' };
  r++;
  // L4: Linha em branco
  for(let c=0;c<ncols;c++) ws[xc(c,r)] = { v:'', s: { fill:{ fgColor:{ rgb:'FFFFFF' } } }, t: 's' };
  r++;

  // L5: Cabeçalho da tabela
  const headerRow = r;
  headers.forEach((h, c) => { ws[xc(c,r)] = { v: h, s: styleHeader(), t: 's' }; });
  r++;

  // Dados
  const dataStart = r;
  data.forEach((row, idx) => {
    keys.forEach((k, c) => {
      const v = fmtCellValue(row[k]);
      const style = styleCell(idx % 2 === 1);
      // Alinhamento direita pra colunas numéricas
      const num = Number(String(v).replace(',','.').replace(/[^\d.-]/g,''));
      if(!isNaN(num) && /^[\d.,\-+\s%R$]+$/.test(v) && v.length < 30){
        style.alignment = Object.assign({}, style.alignment, { horizontal: 'right' });
      }
      ws[xc(c,r)] = { v: v, s: style, t: 's' };
    });
    r++;
  });

  // Linha total (opcional)
  if(opts.totals){
    const total = ['TOTAL'];
    keys.slice(1).forEach(k => {
      if(opts.totals[k]){
        const sum = data.reduce((s,row) => s + (Number(row[k]) || 0), 0);
        total.push(sum);
      } else total.push('');
    });
    total.forEach((v, c) => { ws[xc(c,r)] = { v: v, s: styleTotalRow(), t: typeof v === 'number' ? 'n' : 's' }; });
    r++;
  }

  // Define ref + larguras
  ws['!ref'] = w.XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:r-1,c:ncols-1} });
  ws['!cols'] = headers.map((h, idx) => {
    let maxLen = String(h).length;
    data.forEach(row => {
      const v = fmtCellValue(row[keys[idx]]);
      if(v.length > maxLen) maxLen = v.length;
    });
    return { wch: Math.min(45, Math.max(10, maxLen + 3)) };
  });
  // Merge das linhas título/subtítulo/info
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:ncols-1} },  // título
    { s:{r:1,c:0}, e:{r:1,c:ncols-1} }   // subtítulo
  ];
  // Altura das linhas
  ws['!rows'] = [
    { hpt: 28 }, // título
    { hpt: 18 }, // subtítulo
    { hpt: 16 }, // empresa
    { hpt: 6 },  // branco
    { hpt: 22 }  // cabeçalho
  ];
  // Auto-filter
  if(data.length > 0){
    ws['!autofilter'] = { ref: w.XLSX.utils.encode_range({
      s:{r:headerRow,c:0},
      e:{r:dataStart + data.length - 1, c:ncols-1}
    })};
  }
  // Freeze panes (cabeçalho fixo no topo)
  ws['!freeze'] = { xSplit: 0, ySplit: headerRow+1 };

  const wb = w.XLSX.utils.book_new();
  w.XLSX.utils.book_append_sheet(wb, ws, (opts.sheetName || 'Dados').slice(0,31));
  w.XLSX.writeFile(wb, fname);
}

// Helper: cria endereço A1, B1, etc
function xc(c, r){ return w.XLSX.utils.encode_cell({ r:r, c:c }); }

function exportTable(tableEl, opts){
  if(!tableEl){ alert('Tabela não encontrada nesta view.'); return; }
  const { headers, rows } = tableToData(tableEl);
  if(headers.length === 0){ alert('Tabela sem cabeçalho.'); return; }
  if(rows.length === 0){
    if(!confirm('Esta view não tem dados cadastrados ainda. Gerar Excel só com os cabeçalhos (modelo em branco)?')) return;
    const blanks = [{},{},{}].map(()=>{ const o={}; headers.forEach(h=>o[h]=''); return o; });
    exportData(blanks, Object.assign({ columns: headers, subtitle: '(modelo em branco — preencha manualmente)' }, opts || {}));
    return;
  }
  exportData(rows, Object.assign({ columns: headers }, opts || {}));
}

function injectButton(headerEl, opts){
  if(!headerEl) return;
  // Pega função de export
  const doExport = (e)=>{
    if(e) e.preventDefault();
    if(opts.onclick){ opts.onclick(); return; }
    const tbl = typeof opts.tableSelector === 'function' ? opts.tableSelector() : d.querySelector(opts.tableSelector);
    exportTable(tbl, opts);
  };

  // Se PIAExcelMenu + opts.importKey disponíveis, criar/substituir pelo dropdown unificado
  const canDropdown = w.PIAExcelMenu && opts.importKey && typeof w.openImportExcel === 'function';

  // Já existe wrap dropdown? não toca
  if(headerEl.querySelector('.pia-excel-wrap')) return;

  // Já existe botão simples antigo? Se podemos fazer dropdown agora, removemos o antigo
  const existingBtn = headerEl.querySelector('.pia-excel-btn');
  if(existingBtn){
    if(!canDropdown) return; // mantém o botão simples enquanto PIAExcelMenu não carrega
    existingBtn.remove();
  }

  if(canDropdown){
    const wrap = d.createElement('div');
    wrap.style.marginLeft = '6px';
    wrap.style.display = 'inline-block';
    const exportFnName = '__piaExport_' + opts.importKey.replace(/[^a-zA-Z0-9]/g,'_');
    w[exportFnName] = doExport;
    wrap.innerHTML = w.PIAExcelMenu({
      id: opts.importKey,
      onImport: "openImportExcel('" + opts.importKey + "')",
      onExport: exportFnName + "()"
    });
    headerEl.appendChild(wrap);
    return;
  }

  // Fallback: botao unico padronizado (cinza, sem verde isolado)
  const btn = d.createElement('button');
  btn.className = 'pia-excel-btn btn bg';
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exportar Excel';
  btn.title = 'Exportar pra Excel';
  btn.style.marginLeft = '6px';
  btn.onclick = doExport;
  headerEl.appendChild(btn);
}

const VIEW_CONFIGS = {
  vquality_joints: { filename:'mapa_juntas', title:'Mapa de Juntas', importKey:'quality_joints' },
  vquality_reports:{ filename:'relatorios_end', title:'Relatórios END (VS, LP, RT, TH)', importKey:'quality_reports' },
  vsold:           { filename:'soldadores', title:'Soldadores · Qualificação', importKey:'sold' },
  vcal:            { filename:'calibracao', title:'Calibração de Instrumentos', importKey:'cal' },
  vpend:           { filename:'pendencias_ncs', title:'Pendências / NCs', importKey:'pend' },
  vcom:            { filename:'comissionamento', title:'Comissionamento', importKey:'com' },
  vmat:            { filename:'catalogo_materiais', title:'Catálogo de Materiais', importKey:'mat' },
  vequip:          { filename:'equipamentos_nr13', title:'Equipamentos NR-13', importKey:'equip' },
  vmaint:          { filename:'manutencao_os', title:'Ordens de Manutenção', importKey:'maint' },
  vpaint:          { filename:'pintura_industrial', title:'Pintura Industrial', importKey:'paint' },
  vscaf:           { filename:'andaimes', title:'Andaimes', importKey:'scaf' },
  vcivil_concr:    { filename:'concretagens', title:'Concretagens', importKey:'civil_concr' },
  vcivil_elem:     { filename:'estruturas_concreto', title:'Estruturas de Concreto', importKey:'civil_elem' },
  velec_panels:    { filename:'quadros_eletricos', title:'Quadros Elétricos', importKey:'elec_panels' },
  velec_spda:      { filename:'spda_aterramento', title:'SPDA / Aterramento', importKey:'elec_spda' },
  velec_specs:     { filename:'specs_cabos', title:'Specs de Cabos', importKey:'elec_specs' },
  vhydraulic:      { filename:'sistemas_hidraulicos', title:'Sistemas Hidráulicos', importKey:'hydraulic' },
  vp:              { filename:'projetos', title:'Projetos' }
  // vi (Folhas/Isos) removido — a toolbar nativa de rIsos já tem "Exportar" próprio
};

function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  if(w.projects && w.curProj){ const p = w.projects.find(x => x.id === w.curProj); if(p) return p.name; }
  return null;
}

function autoInject(){
  Object.keys(VIEW_CONFIGS).forEach(viewId => {
    const view = d.getElementById(viewId);
    if(!view || view.style.display === 'none') return;
    const header = view.querySelector('.bc-row, .head, .toolbar, [class*="header"]');
    if(!header) return;
    const cfg = VIEW_CONFIGS[viewId];
    injectButton(header, {
      tableSelector: () => view.querySelector('table'),
      filename: cfg.filename,
      title: cfg.title,
      importKey: cfg.importKey,  // CRÍTICO: sem isso o dropdown nunca é gerado
      project: getProjectName()
    });
  });
}

function startAutoInject(){
  autoInject();
  if(typeof w.goV === 'function' && !w.goV._piaExcelHooked){
    const orig = w.goV;
    w.goV = function(){
      const r = orig.apply(this, arguments);
      setTimeout(autoInject, 300);
      return r;
    };
    w.goV._piaExcelHooked = true;
  }
  setInterval(autoInject, 3000);
}

if(d.readyState === 'loading'){
  d.addEventListener('DOMContentLoaded', ()=> setTimeout(startAutoInject, 800));
} else {
  setTimeout(startAutoInject, 800);
}

w.PIAExcel = { exportData, exportTable, injectButton, autoInject };

} catch(e){ console.warn('[pia-excel] init falhou:', e); }
})(window, document);
