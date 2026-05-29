// Audita inconsistência de Importar Excel: views com botão openImportExcel(view)
// que não têm FIELD_SCHEMA (mapeamento de colunas fica vazio) ou VIEW_TABLE_MAP (sem destino).
const fs = require('fs');
const s = fs.readFileSync('hydrostec_v9.html', 'utf8');

// views chamadas em openImportExcel('X') / exportViewToExcel('X')
const importViews = new Set(), exportViews = new Set();
let m;
const reI = /openImportExcel\(\s*['"]([a-z0-9_]+)['"]/gi;
while ((m = reI.exec(s))) importViews.add(m[1]);
const reE = /exportViewToExcel\(\s*['"]([a-z0-9_]+)['"]/gi;
while ((m = reE.exec(s))) exportViews.add(m[1]);

// chaves de FIELD_SCHEMA (entre 'const FIELD_SCHEMA = {' e o fechamento) e VIEW_TABLE_MAP
function keysOf(varName) {
  const start = s.indexOf('const ' + varName + ' = {');
  if (start < 0) return new Set();
  // pega ~8000 chars a partir do início (suficiente p/ o objeto)
  const chunk = s.slice(start, start + 12000);
  const keys = new Set();
  const re = /^\s{2}([a-z0-9_]+)\s*:/gim;
  let mm;
  while ((mm = re.exec(chunk))) keys.add(mm[1]);
  return keys;
}
const fieldKeys = keysOf('FIELD_SCHEMA');
const tableKeys = keysOf('VIEW_TABLE_MAP');

const importNoSchema = [...importViews].filter(v => !fieldKeys.has(v)).sort();
const importNoTable = [...importViews].filter(v => !tableKeys.has(v)).sort();

console.log(JSON.stringify({
  import_buttons: [...importViews].sort(),
  export_buttons: [...exportViews].sort(),
  FIELD_SCHEMA_keys: [...fieldKeys].sort(),
  IMPORT_SEM_FIELD_SCHEMA_quebrado: importNoSchema,
  IMPORT_SEM_VIEW_TABLE_MAP: importNoTable
}, null, 1));
