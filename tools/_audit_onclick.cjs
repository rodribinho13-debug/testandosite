// Audita "botões mortos": onclick="FN(...)" onde FN (identificador simples) não
// está definido em lugar nenhum (function FN / window.FN= / const FN= / stub).
const fs = require('fs');
const jsFiles = fs.readdirSync('assets/js')
  .filter(f => f.endsWith('.js') && !f.includes('.bak') && f !== 'v9-app.js' && f !== 'v9-fields.js')
  .map(f => 'assets/js/' + f);
const files = ['hydrostec_v9.html', 'custom_views.js'].concat(jsFiles);

const defined = new Set();
const addDefs = (s) => {
  let m;
  const pats = [
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /(?:window|w|self)\.([A-Za-z_$][\w$]*)\s*=/g,
    /(?:^|[\s;{])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function/g,
    /\b([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function/g,      // métodos de objeto
    /makeStub\([^,]+,\s*['"]([A-Za-z_$][\w$]*)['"]\)/g,        // stubs do module-loader
  ];
  for (const re of pats) while ((m = re.exec(s))) defined.add(m[1]);
};
for (const f of files) addDefs(fs.readFileSync(f, 'utf8'));

// Built-ins / globais permitidos
const ok = new Set(['alert','confirm','prompt','window','document','event','this','return','if','console','open','close','print','location','history','setTimeout','setInterval','Math','JSON','Object','Array','String','Number','Boolean','Date','parseInt','parseFloat','void','typeof','new','delete','navigator']);

const report = {};
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  const re = /onclick\s*=\s*\\?["']\s*([A-Za-z_$][\w$]*)\s*\(/g;
  const miss = {};
  while ((m = re.exec(s))) {
    const fn = m[1];
    if (ok.has(fn) || defined.has(fn)) continue;
    miss[fn] = (miss[fn] || 0) + 1;
  }
  if (Object.keys(miss).length) report[f] = miss;
}
console.log(JSON.stringify(report, null, 1));
