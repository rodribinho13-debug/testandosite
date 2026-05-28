/* ============================================================
   PROJECT.IA — Module Loader (lazy-load)
   Carrega scripts JS sob demanda. Reduz o boot inicial.
   ============================================================ */
(function(){
'use strict';
const w = window, d = document;

// Registry: name -> { src, deps, loaded:promise, expose }
const REGISTRY = {
  // ============== Dependências base (carregadas sob demanda)
  'pia-shell':       { src: 'assets/js/pia-shell.js?v=2',       expose: 'PIAShell' },
  'excel-export':    { src: 'assets/js/excel-export.js?v=6',    expose: 'PIAExcel' },
  'ai-router':       { src: 'assets/js/ai-router.js?v=1',       expose: 'PIAAIRouter' },

  // ============== Módulos UI (todos lazy)
  'compositions':    { src: 'assets/js/compositions.js?v=6',    expose: 'PIACompositions' },
  'budget':          { src: 'assets/js/budget.js?v=5',          deps: ['excel-export'], expose: 'PIABudget' },
  'orcamento':       { src: 'assets/js/orcamento.js?v=16',        deps: ['excel-export'], expose: 'PIAOrcamento' },
  'ai-orcamento':    { src: 'assets/js/ai-orcamento.js?v=2',     deps: ['ai-router'], expose: 'PIAIAOrcamento' },
  'ai-rdo':          { src: 'assets/js/ai-rdo.js?v=2',          deps: ['ai-router'], expose: 'PIAIARdo' },
  'ai-quotation':    { src: 'assets/js/ai-quotation.js?v=1',    deps: ['ai-router'], expose: 'PIAIAQuotation' },
  'ai-supplier':     { src: 'assets/js/ai-supplier.js?v=1',     deps: ['ai-router'], expose: 'PIAIASupplier' },
  'ai-catalog':      { src: 'assets/js/ai-catalog.js?v=1',      deps: ['ai-router'], expose: 'PIAIACatalog' },
  'ai-composition':  { src: 'assets/js/ai-composition.js?v=2',  deps: ['ai-router'], expose: 'PIAIAComposition' },
  'ai-pcp':          { src: 'assets/js/ai-pcp.js?v=1',          deps: ['ai-router'], expose: 'PIAIAPcp' },
  'ai-quality':      { src: 'assets/js/ai-quality.js?v=1',      deps: ['ai-router'], expose: 'PIAIAQuality' },
  'ai-equipment':    { src: 'assets/js/ai-equipment.js?v=1',    deps: ['ai-router'], expose: 'PIAIAEquipment' },
  'ai-maintenance':  { src: 'assets/js/ai-maintenance.js?v=1',  deps: ['ai-router'], expose: 'PIAIAMaintenance' },
  'budget-extras':   { src: 'assets/js/budget-extras.js?v=1',   deps: ['budget'] },
  'hh-params':       { src: 'assets/js/hh-params.js?v=4',       expose: 'PIAHHParams' },
  'electrical-base': { src: 'assets/js/electrical-base.js?v=4', expose: 'PIAElecBase' },
  'rdo':             { src: 'assets/js/rdo.js?v=9',             deps: ['excel-export','pia-shell'], expose: 'PIARDO' },
  'quotations':      { src: 'assets/js/quotations.js?v=10',      deps: ['excel-export'], expose: 'PIAQuotations' },
  'suppliers':       { src: 'assets/js/suppliers.js?v=4',       expose: 'PIASuppliers' },
  'materials-catalog':{ src: 'assets/js/materials-catalog.js?v=6', expose: 'PIAMaterialsCatalog' },
  'discipline-ai':   { src: 'assets/js/discipline-ai-modal.js?v=23' },
  'pcp':             { src: 'assets/js/pcp.js?v=6',             deps: ['pia-shell','excel-export'], expose: 'PIAPCP' },
  'planner-hub':     { src: 'assets/js/planner-hub.js?v=2',     deps: ['pia-shell'], expose: 'PIAPlannerHub' },
  'tdraw':           { src: 'assets/js/tdraw.js?v=12',           deps: ['pia-shell','excel-export'], expose: 'PIATDraw' },
  'eng-modules':     { src: 'assets/js/eng-modules.js?v=3',     deps: ['pia-shell','excel-export'], expose: 'PIAEngModule' },
  'hub-unified':     { src: 'assets/js/hub-unified.js?v=19',    deps: ['pia-shell','planner-hub','tdraw','eng-modules'], expose: 'PIAHubUnified' },
  'planning':        { src: 'assets/js/planejamento.js?v=3',     expose: 'PIAPlanning' },
  'rdo-diario':      { src: 'assets/js/rdo-diario.js?v=7',        expose: 'PIARDODiario' }
};

const _loading = {}; // name -> promise

function loadScript(src){
  return new Promise((resolve, reject) => {
    // Evita duplicar
    const existing = d.querySelector('script[data-pia-lazy="'+src+'"]');
    if(existing){
      if(existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', ()=> resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = d.createElement('script');
    s.src = src;
    s.async = false; // mantém ordem
    s.dataset.piaLazy = src;
    s.onload = ()=>{ s.dataset.loaded = '1'; resolve(); };
    s.onerror = (e)=>{ console.error('[lazy] falhou:', src, e); reject(new Error('Falha ao carregar '+src)); };
    d.head.appendChild(s);
  });
}

async function ensure(name){
  const def = REGISTRY[name];
  if(!def){ console.warn('[lazy] módulo desconhecido:', name); return; }
  // Se já tá exposto, retorna imediatamente
  if(def.expose && w[def.expose]) return w[def.expose];
  // Em carregamento? aguarda a promise existente
  if(_loading[name]) return _loading[name];

  console.log('[lazy] carregando módulo:', name, def.src);
  _loading[name] = (async ()=>{
    try {
      // Resolve deps primeiro
      if(def.deps && def.deps.length){
        await Promise.all(def.deps.map(dep => ensure(dep)));
      }
      // Carrega o script
      await loadScript(def.src);
      // Aguarda exposição global (pode ter IIFE assíncrona)
      // Aumentei de 60×30ms (1.8s) → 100×50ms (5s) pra acomodar arquivos grandes
      if(def.expose){
        for(let i = 0; i < 100; i++){
          if(w[def.expose]) {
            console.log('[lazy] módulo OK:', name, '→', def.expose);
            return w[def.expose];
          }
          await new Promise(r => setTimeout(r, 50));
        }
        console.error('[lazy] módulo carregou mas NÃO expôs', def.expose, '— provavelmente IIFE falhou. Verifique erros acima no console.');
        // Limpa cache de promise FALHADA pra próximo clique tentar de novo
        delete _loading[name];
        throw new Error('Módulo ' + name + ' falhou ao expor ' + def.expose + '. Veja console pra erro original.');
      }
    } catch(e) {
      // Limpa cache em erro pra permitir retry
      delete _loading[name];
      console.error('[lazy] falha ao carregar', name, ':', e);
      throw e;
    }
  })();
  return _loading[name];
}

/**
 * Wrapper: aguarda módulo carregar e chama método.
 * Uso: PIALazy.run('pcp','open')
 */
async function run(name, method /*, ...args*/){
  const args = Array.prototype.slice.call(arguments, 2);
  await ensure(name);
  const def = REGISTRY[name];
  const ns = def && def.expose ? w[def.expose] : null;
  if(!ns){ console.warn('[lazy] namespace ausente:', name); return; }
  const fn = ns[method];
  if(typeof fn !== 'function'){ console.warn('[lazy] método ausente:', name, method); return; }
  return fn.apply(ns, args);
}

w.PIALazy = { ensure, run, REGISTRY };

/* ============================================================
   STUBS GLOBAIS — funções esperadas pelo HTML inline (onclicks)
   Quando chamadas, fazem lazy-load do módulo correspondente e re-executam.
   Garante que onclick="openDisciplineAIModal('civil')" funcione mesmo
   antes do módulo discipline-ai-modal.js ter sido baixado.
   ============================================================ */
function makeStub(moduleName, globalFnName){
  // Se a função real já existe, não sobrescreve
  if(typeof w[globalFnName] === 'function' && !w[globalFnName].__isStub) return;
  const stub = async function(){
    const args = arguments;
    try {
      await ensure(moduleName);
      // Aguarda mais um pouco — algumas IIFE expõem global async
      for(let i = 0; i < 30; i++){
        if(typeof w[globalFnName] === 'function' && !w[globalFnName].__isStub) {
          return w[globalFnName].apply(w, args);
        }
        await new Promise(r => setTimeout(r, 30));
      }
      console.warn('[lazy stub] função não exposta após carga:', globalFnName);
      alert('Módulo de IA está carregando. Aguarde 1-2s e clique novamente.');
    } catch(e){
      console.error('[lazy stub] falha ao carregar:', moduleName, e);
      alert('Não foi possível carregar o módulo de IA. Recarregue a página.');
    }
  };
  stub.__isStub = true;
  w[globalFnName] = stub;
}

// Funções inline chamadas pelos onclicks do HTML
makeStub('discipline-ai', 'openDisciplineAIModal');

// Wrapper que carrega módulo planning e chama .open()
w.openPlanning = async function(projectId){
  try {
    await ensure('planning');
    if(w.PIAPlanning && typeof w.PIAPlanning.open === 'function'){
      return w.PIAPlanning.open(projectId);
    }
  } catch(e){
    console.error('[openPlanning] falhou:', e);
    alert('Nao foi possivel carregar o modulo de planejamento. Recarregue a pagina.');
  }
};

})();
