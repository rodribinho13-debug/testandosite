#!/usr/bin/env node
/* PROJECT.IA - Build de producao via esbuild
 * Gera bundles minificados em dist/ a partir dos modulos JS.
 * Uso: npm install (1x) + npm run build
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const C = { green:'\x1b[32m', yellow:'\x1b[33m', cyan:'\x1b[36m', reset:'\x1b[0m', bold:'\x1b[1m' };
const log = (s) => console.log(s);

log(`${C.bold}${C.cyan}\n[esbuild] PROJECT.IA Production Build${C.reset}\n`);

let esbuild;
try {
  esbuild = await import('esbuild');
} catch (e) {
  log(`${C.yellow}esbuild nao instalado. Rode:${C.reset}\n  npm install\n\nDepois:\n  npm run build\n`);
  process.exit(1);
}

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

const targets = [
  { in: 'assets/js/v9-app.js',         out: 'dist/v9-app.min.js' },
  { in: 'assets/js/saas-modules.js',   out: 'dist/saas-modules.min.js' },
  { in: 'assets/js/security.js',       out: 'dist/security.min.js' },
  { in: 'assets/js/ia-chat.js',        out: 'dist/ia-chat.min.js' },
  { in: 'custom_views.js',             out: 'dist/custom_views.min.js' }
];

for (const t of targets) {
  const inP = join(ROOT, t.in);
  const outP = join(ROOT, t.out);
  if (!existsSync(inP)) { log(`  skip: ${t.in} (nao existe)`); continue; }
  await esbuild.build({
    entryPoints: [inP],
    bundle: false,
    minify: true,
    sourcemap: true,
    target: 'es2020',
    outfile: outP,
    legalComments: 'none',
    logLevel: 'silent'
  });
  const origSize = (statSync(inP).size/1024).toFixed(1);
  const minSize = (statSync(outP).size/1024).toFixed(1);
  log(`  ${C.green}OK${C.reset} ${t.in} (${origSize}KB) -> ${t.out} (${minSize}KB)`);
}

log(`\n${C.bold}${C.green}Build concluido em dist/${C.reset}\n`);
log(`Para usar em producao: substitua os src dos <script> apontando para dist/*.min.js`);
log(`Source maps gerados em .map para debug.\n`);
