#!/usr/bin/env node
/* PROJECT.IA - Detector de arquivos JS truncados
 * Roda com: node tools/check-truncation.mjs
 * Detecta sinais clássicos de truncamento pelo linter/Edit:
 *   - Tamanho < 200 bytes (muito pequeno pra ser real)
 *   - Termina abruptamente (sem ; } ) etc)
 *   - Chaves/parênteses/colchetes desbalanceados
 *   - Strings/templates abertos no final
 */
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
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
log(`  Detector de arquivos JS truncados`);
log(`========================================${C.reset}\n`);

// Coletar todos os JS em assets/js
const jsDir = join(ROOT, 'assets', 'js');
let files = [];
try {
  files = readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => 'assets/js/'+f);
} catch(e) { err('Pasta assets/js não encontrada'); process.exit(1); }
// Tb checa custom_views.js na raiz
if(existsSync(join(ROOT, 'custom_views.js'))) files.push('custom_views.js');

log(`${C.bold}Verificando ${files.length} arquivos...${C.reset}\n`);

for(const rel of files){
  const p = join(ROOT, rel);
  if(!existsSync(p)){ warn(`${rel} não existe`); continue; }
  const buf = readFileSync(p, 'utf-8');
  const size = buf.length;

  // 1. Tamanho mínimo razoável (pula stubs como "// removed")
  if(size < 200){
    if(buf.trim().startsWith('//')) {
      log(`  ${C.dim}─${C.reset} ${rel} ${C.dim}(stub ${size}B, ignorando)${C.reset}`);
      continue;
    }
    err(`${rel} muito pequeno: ${size} bytes`);
    continue;
  }

  // 2. Sintaxe JS (delega pro node --check)
  let syntaxOK = true;
  try {
    execSync(`node --check "${p}"`, {stdio: 'pipe'});
  } catch(e) {
    err(`${rel} ERRO DE SINTAXE — possível truncamento`);
    const stderr = e.stderr?.toString() || '';
    const m = stderr.match(/SyntaxError: .*/);
    if(m) log(`     ${C.dim}${m[0]}${C.reset}`);
    syntaxOK = false;
    continue;
  }

  // 3. Termina corretamente? (verifica últimos 40 chars sem whitespace)
  const tail = buf.replace(/\s+$/, '').slice(-50);
  const lastChar = tail.slice(-1);
  // Caracteres válidos no fim de um JS: ; } ) ] " ' `
  const validEnd = /[;\}\)\]\"'`*]/.test(lastChar);
  if(!validEnd){
    err(`${rel} termina abruptamente: "...${tail}"`);
    continue;
  }

  ok(`${rel} ${C.dim}(${size}B)${C.reset}`);
}

log(`\n${C.bold}========================================`);
if(errors > 0){
  log(`  ${C.red}${errors} arquivo(s) suspeito(s) de truncamento${C.reset}`);
  log(`  ${C.dim}Compare com backup mais recente.${C.reset}`);
  process.exit(1);
} else {
  log(`  ${C.green}Todos arquivos íntegros (${files.length} verificados)${C.reset}`);
}
log(`========================================${C.reset}\n`);
