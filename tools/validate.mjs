#!/usr/bin/env node
/* PROJECT.IA - Validador multiplataforma (Win/Linux/Mac)
 * Roda com: node tools/validate.mjs   ou   npm run validate
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = { red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', cyan:'\x1b[36m', dim:'\x1b[2m', reset:'\x1b[0m', bold:'\x1b[1m' };

let errors = 0, warnings = 0;
const log = (s) => console.log(s);
const ok  = (s) => log(`  ${C.green}✓${C.reset} ${s}`);
const err = (s) => { log(`  ${C.red}✗${C.reset} ${s}`); errors++; };
const warn= (s) => { log(`  ${C.yellow}⚠${C.reset} ${s}`); warnings++; };

log(`${C.bold}${C.cyan}\n========================================`);
log(`  PROJECT.IA - Validacao automatica`);
log(`========================================${C.reset}\n`);

// 1) Sintaxe JS
log(`${C.bold}[1/4]${C.reset} Sintaxe de arquivos JavaScript`);
const jsFiles = [
  'custom_views.js',
  'assets/js/security.js',
  'assets/js/saas-modules.js',
  'assets/js/ia-chat.js',
  'assets/js/v9-app.js',
  'sw.js'
];
for (const f of jsFiles) {
  const p = join(ROOT, f);
  if (!existsSync(p)) { warn(`${f} (nao existe, pulando)`); continue; }
  try {
    execSync(`node --check "${p}"`, { stdio: 'pipe' });
    ok(`${f} ${C.dim}(${(readFileSync(p).length/1024).toFixed(1)} KB)${C.reset}`);
  } catch (e) {
    err(`${f} - SINTAXE INVALIDA: ${e.stderr?.toString().split('\n')[0] || 'erro'}`);
  }
}

// 2) Balanceamento de tags HTML
log(`\n${C.bold}[2/4]${C.reset} Balanceamento de tags HTML`);
const htmlFiles = [
  'hydrostec_v9.html',
  'hydrostec_planejador.html',
  'hydrostec_planejador_civil.html',
  'hydrostec_planejador_eletrica.html',
  'hydrostec_planejador_pintura.html',
  'hydrostec_planejador_caldeiraria.html'
];
for (const f of htmlFiles) {
  const p = join(ROOT, f);
  if (!existsSync(p)) { warn(`${f} nao existe`); continue; }
  const html = readFileSync(p, 'utf-8');
  const opens = (html.match(/<script\b/g) || []).length;
  const closes = (html.match(/<\/script>/g) || []).length;
  if (opens !== closes) {
    err(`${f} desbalanceado: ${opens} <script>, ${closes} </script>`);
  } else {
    ok(`${f} ${C.dim}(<script>=${opens}, </script>=${closes})${C.reset}`);
  }
}

// 3) Fechamento de HTML + tamanho mínimo
log(`\n${C.bold}[3/4]${C.reset} Documentos HTML fechados + tamanho minimo`);
// Tamanho mínimo esperado (bytes) — detecta truncamento mesmo se balanceado
const MIN_SIZE = {
  'hydrostec_v9.html': 400_000,
  'hydrostec_planejador.html': 80_000,
  'hydrostec_planejador_civil.html': 40_000,
  'hydrostec_planejador_eletrica.html': 40_000,
  'hydrostec_planejador_pintura.html': 25_000,
  'hydrostec_planejador_caldeiraria.html': 25_000
};
for (const f of htmlFiles) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const buf = readFileSync(p);
  const html = buf.toString('utf-8').trimEnd();
  const size = buf.length;
  const minSize = MIN_SIZE[f] || 0;
  if (size < minSize) {
    err(`${f} muito pequeno: ${(size/1024).toFixed(0)}KB (min esperado: ${(minSize/1024).toFixed(0)}KB) — provavel TRUNCAMENTO`);
    continue;
  }
  if (!html.endsWith('</html>')) err(`${f} NAO termina em </html>`);
  else if (!html.includes('</body>')) err(`${f} sem </body>`);
  else ok(`${f} ${C.dim}(${(size/1024).toFixed(0)}KB)${C.reset}`);
}

// 4) JS extraidos sao parsable como modulo / script
log(`\n${C.bold}[4/4]${C.reset} Extracao de scripts inline (deteccao de corrupcao)`);
for (const f of htmlFiles) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const html = readFileSync(p, 'utf-8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, idx = 0, anyErr = false;
  while ((m = re.exec(html)) !== null) {
    idx++;
    const code = m[1].trim();
    if (!code) continue;
    // Tenta validar com Function constructor (catch syntax errors)
    try {
      new Function(code);
    } catch (e) {
      err(f + ' bloco inline #' + idx + ': ' + e.message.split('\n')[0]);
      anyErr = true;
    }
  }
  if (!anyErr) ok(`${f} (${idx} blocos inline OK)`);
}

// Sumario
log(`\n${C.bold}========================================`);
if (errors > 0) {
  log(`${C.red}  RESULTADO: ${errors} ERRO(S), ${warnings} aviso(s)${C.reset}`);
  log(`${C.bold}========================================${C.reset}\n`);
  log(`${C.red}  NAO publique. Restaure do backup: node tools/backup-v9.mjs restore${C.reset}\n`);
  process.exit(1);
} else if (warnings > 0) {
  log(`${C.yellow}  RESULTADO: OK com ${warnings} aviso(s)${C.reset}`);
} else {
  log(`${C.green}  RESULTADO: TUDO OK - seguro publicar${C.reset}`);
}
log(`${C.bold}========================================${C.reset}\n`);
process.exit(0);
