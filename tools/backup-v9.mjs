#!/usr/bin/env node
/* PROJECT.IA - Backup automático do v9.html (e outros arquivos críticos)
 *
 * Uso:
 *   node tools/backup-v9.mjs           → cria backup com timestamp
 *   node tools/backup-v9.mjs restore   → restaura o backup mais recente
 *   node tools/backup-v9.mjs list      → lista backups disponíveis
 *
 * Backups vão pra _backups_auto/ com nome no formato:
 *   hydrostec_v9_YYYYMMDD_HHMMSS.html
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = join(ROOT, '_backups_auto');
const C = { red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', cyan:'\x1b[36m', dim:'\x1b[2m', bold:'\x1b[1m', reset:'\x1b[0m' };

// Arquivos críticos a backupar
const CRITICAL_FILES = [
  'hydrostec_v9.html',
  'assets/js/v9-app.js',
  'assets/js/sidebar-groups.js',
  'assets/js/compositions.js',
  'assets/js/budget.js',
  'assets/js/rdo.js',
  'assets/js/analytics.js',
  'assets/js/quotations.js',
  'assets/js/electrical-base.js',
  'assets/js/hh-params.js',
  'assets/js/pia-shell.js',
  'custom_views.js',
  'sw.js'
];

function timestamp(){
  const d = new Date();
  const p = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(){
  if(!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, {recursive:true});
}

function backup(){
  ensureDir();
  const ts = timestamp();
  let count = 0, totalBytes = 0;
  console.log(`${C.bold}${C.cyan}\n========================================`);
  console.log(`  Backup automático — ${ts}`);
  console.log(`========================================${C.reset}\n`);
  for(const rel of CRITICAL_FILES){
    const src = join(ROOT, rel);
    if(!existsSync(src)){
      console.log(`  ${C.yellow}⚠${C.reset} ${rel} ${C.dim}(não existe, pulando)${C.reset}`);
      continue;
    }
    const size = statSync(src).size;
    // Nome do backup preserva caminho original substituindo / por _
    const safeName = rel.replace(/[\/\\]/g, '_');
    const dst = join(BACKUP_DIR, `${ts}__${safeName}`);
    copyFileSync(src, dst);
    console.log(`  ${C.green}✓${C.reset} ${rel} ${C.dim}(${size} bytes)${C.reset}`);
    count++; totalBytes += size;
  }
  console.log(`\n${C.bold}${C.green}${count} arquivos backupados${C.reset} ${C.dim}(${(totalBytes/1024).toFixed(1)} KB total)${C.reset}`);
  console.log(`${C.dim}Local: ${BACKUP_DIR}${C.reset}\n`);
}

function listBackups(){
  ensureDir();
  const files = readdirSync(BACKUP_DIR).sort().reverse();
  if(files.length === 0){ console.log(`${C.yellow}Nenhum backup encontrado.${C.reset}`); return; }
  // Agrupa por timestamp
  const groups = {};
  for(const f of files){
    const m = f.match(/^(\d{8}_\d{6})__/);
    if(m){ (groups[m[1]] = groups[m[1]] || []).push(f); }
  }
  console.log(`${C.bold}\nBackups disponíveis (mais recente primeiro):${C.reset}\n`);
  Object.keys(groups).sort().reverse().slice(0, 20).forEach(ts => {
    const d = `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(9,11)}:${ts.slice(11,13)}:${ts.slice(13,15)}`;
    console.log(`  ${C.cyan}${d}${C.reset}  ${C.dim}(${groups[ts].length} arquivos)${C.reset}`);
  });
  console.log();
}

function restore(){
  ensureDir();
  const files = readdirSync(BACKUP_DIR).sort().reverse();
  if(files.length === 0){ console.log(`${C.red}Nenhum backup encontrado.${C.reset}`); process.exit(1); }
  // Pega o timestamp mais recente
  const latestTs = files[0].match(/^(\d{8}_\d{6})__/)?.[1];
  if(!latestTs){ console.log(`${C.red}Não consegui identificar timestamp.${C.reset}`); process.exit(1); }
  const toRestore = files.filter(f => f.startsWith(latestTs+'__'));
  console.log(`${C.bold}${C.yellow}\nRestaurando backup ${latestTs}...${C.reset}\n`);
  let count = 0;
  for(const f of toRestore){
    const src = join(BACKUP_DIR, f);
    const orig = f.replace(/^\d{8}_\d{6}__/, '').replace(/_/g, '/');
    // Heurística simples: reverter underscore por barra exceto pra "v9-app"
    // Melhor: salvamos com / preservado no metadata. Por enquanto:
    const tryPaths = [
      orig,
      orig.replace('assets/js/', 'assets/js/'),
      f.replace(/^\d{8}_\d{6}__/, '').replace(/^([^_]+)_/, '$1/').replace(/_/g, '/')
    ];
    let written = false;
    for(const p of tryPaths){
      const dst = join(ROOT, p);
      if(existsSync(dirname(dst))){
        copyFileSync(src, dst);
        console.log(`  ${C.green}✓${C.reset} ${p}`);
        count++; written = true; break;
      }
    }
    if(!written) console.log(`  ${C.yellow}⚠${C.reset} ${f} - não consegui mapear destino`);
  }
  console.log(`\n${C.green}${count} arquivos restaurados.${C.reset}\n`);
}

const cmd = process.argv[2] || 'backup';
if(cmd === 'list') listBackups();
else if(cmd === 'restore') restore();
else backup();
