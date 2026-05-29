const fs = require('fs');
const dir = process.cwd();
const jsFiles = fs.readdirSync('assets/js')
  .filter(f => f.endsWith('.js') && !f.includes('.bak') && f !== 'v9-app.js' && f !== 'v9-fields.js')
  .map(f => 'assets/js/' + f);
const files = ['hydrostec_v9.html', 'custom_views.js'].concat(jsFiles);

const defined = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  // id="X" | id='X' | id=\'X\' (escaped single quote inside JS strings)
  const re = /id=\\?["']([a-zA-Z0-9_\-]+)\\?["']/g;
  while ((m = re.exec(s))) defined.add(m[1]);
  // .id = "X" or setAttribute('id','X')
  const re2 = /\.id\s*=\s*["']([a-zA-Z0-9_\-]+)["']/g;
  while ((m = re2.exec(s))) defined.add(m[1]);
  const re3 = /setAttribute\(\s*["']id["']\s*,\s*["']([a-zA-Z0-9_\-]+)["']/g;
  while ((m = re3.exec(s))) defined.add(m[1]);
}

const report = {};
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  const re = /getElementById\(\s*["']([a-zA-Z0-9_\-]+)["']\s*\)/g;
  const miss = new Set();
  while ((m = re.exec(s))) {
    if (!defined.has(m[1])) miss.add(m[1]);
  }
  if (miss.size) report[f] = [...miss];
}
console.log(JSON.stringify(report, null, 1));
