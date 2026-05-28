/* ============================================================
   PROJECT.IA — HUB Planejador Unificado (v3 — design corporativo)
   Paleta única (preto/cinza/azul), ícones SVG, sem emojis.
   Layout lateral inspirado em SaaS profissionais (Vobi, Linear).
   ============================================================ */
(function(){
'use strict';
const w = window, d = document;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function getProjectId(){ if(w._curProject && w._curProject.id) return w._curProject.id; if(w.curProj) return w.curProj; try { return localStorage.getItem('pia.curProj'); } catch(_){ return null; } }
function getProjectName(){ try { if(w._curProject && w._curProject.name) return w._curProject.name; const ps = w.projects || []; const id = getProjectId(); const p = ps.find(x => String(x.id)===String(id)); return p ? p.name : ''; } catch(_){ return ''; } }

/* ============================================================
   ÍCONES SVG (Feather/Lucide style, monocromático)
   ============================================================ */
const I = {
  // Disciplinas
  pipe:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h6a3 3 0 0 1 3 3v6"/><path d="M21 12h-6a3 3 0 0 0-3-3V3"/><path d="M3 6h2M3 18h2M19 6h2M19 18h2"/></svg>',
  building:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>',
  bolt:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>',
  brush:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
  flame:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  // Sub-seções
  cog:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  wrench:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  book:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  // Cards/ferramentas
  'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  combine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18H5a3 3 0 0 1-3-3v-1"/><path d="M14 2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2"/><path d="M20 2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2"/><path d="M20 22a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"/><path d="M14 22a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"/></svg>',
  anchor:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
  grid:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',
  calc:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  trend:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>',
  cable:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a2 2 0 0 1-2-2V5h6v2a2 2 0 0 1-2 2Z"/><path d="M3 5V3M7 5V3"/><path d="M19 15V6.5a3.5 3.5 0 0 0-7 0v11a3.5 3.5 0 0 1-7 0V9"/></svg>',
  layers:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  box:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  bricks:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/></svg>',
  hardhat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>',
  route:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
  server:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  clipboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>',
  columns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
  // UI controls
  x:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  external:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  arrowR:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  chev:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
};
function ico(name, size, color){
  const sz = size || 18;
  const c = color || 'currentColor';
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:'+sz+'px;height:'+sz+'px;color:'+c+';flex-shrink:0">'+
    (I[name]||I['file-text']).replace('<svg ', '<svg width="'+sz+'" height="'+sz+'" ')+
  '</span>';
}

/* ============================================================
   PALETA ÚNICA — corporativa
   ============================================================ */
const C = {
  bg:       '#FAFBFC',
  card:     '#FFFFFF',
  border:   '#E5E7EB',
  borderSoft:'#F1F5F9',
  text:     '#0F172A',
  textSub:  '#475569',
  textMute: '#94A3B8',
  hover:    '#F8FAFC',
  active:   '#EFF6FF',
  accent:   '#2563EB',
  accentSoft:'#DBEAFE',
  divider:  '#E2E8F0'
};

/* ============================================================
   ESTRUTURA — disciplinas + ferramentas
   ============================================================ */
const DISCIPLINAS = [
  {
    id: 'tubulacao', nome: 'Tubulação', icon: 'pipe',
    sections: [
      { titulo: 'Engenharia', icon: 'cog', cards: [
        { id:'isos',   nome:'Folhas / Isos',         desc:'Isométricos, % avanço, T.H./Torque', icon:'file-text', native:'isos' },
        { id:'juntas', nome:'Mapa de Juntas',        desc:'Soldadores, END, RX, LP/PM',         icon:'combine',   native:'quality_joints' },
        { id:'sup',    nome:'Suportes',              desc:'Cadastro de suportes',               icon:'anchor',    eng:'supports' },
        { id:'em',     nome:'Estruturas Metálicas',  desc:'Estruturas EM',                      icon:'grid',      eng:'em' },
        { id:'mat',    nome:'Materiais do Projeto',  desc:'BOM, requisições',                   icon:'package',   native:'mat' }
      ]},
      { titulo: 'Ferramentas', icon: 'wrench', cards: [
        { id:'calc',   nome:'Calculadora HH',        desc:'HH por junta e diâmetro',            icon:'calc',      native:'calchh' },
        { id:'plan',  nome:'Planejamento',         desc:'Efetivo + parâmetros HH + cronograma',icon:'calendar',  planning:true },
        { id:'hyc',    nome:'HYCONTROL Semanal',     desc:'Avanço semanal',                     icon:'trend',     eng:'hycontrol' }
      ]},
      { titulo: 'Referências', icon: 'book', cards: [
        { id:'refs',   nome:'Normas Técnicas',       desc:'ASME, PETROBRAS, ABNT',              icon:'bookmark',  native:'refs' },
        { id:'ccab',   nome:'Catálogo de Cabos',     desc:'Prysmian, NBR-5410',                 icon:'cable',     native:'cablecat' },
        { id:'perf',   nome:'Perfis Estruturais',    desc:'Gerdau, Arcelor',                    icon:'layers',    native:'perfis' }
      ]}
    ]
  },
  {
    id: 'civil', nome: 'Civil', icon: 'building',
    sections: [
      { titulo: 'Engenharia', icon: 'cog', cards: [
        { id:'tdraw', nome:'Desenho Técnico',        desc:'Plantas, cortes, fundações, armaduras', icon:'file-text', tdraw:'civil' },
        { id:'concr', nome:'Concretagens',           desc:'Programação e ensaios CP',           icon:'box',       native:'civil_concr' },
        { id:'elem',  nome:'Elementos Estruturais',  desc:'Vigas, pilares, lajes, fundações',   icon:'bricks',    native:'civil_elem' },
        { id:'sinapi',nome:'Insumos Civis SINAPI',   desc:'Catálogo SINAPI mensal',             icon:'hardhat',   native:'civil_sinapi' }
      ]},
      { titulo: 'Ferramentas', icon: 'wrench', cards: [
        { id:'plan',  nome:'Planejamento',         desc:'Efetivo + parâmetros HH + cronograma',icon:'calendar',  planning:true },
        { id:'calc',  nome:'Calculadora HH',         desc:'HH por atividade civil',             icon:'calc',      native:'calchh' }
      ]}
    ]
  },
  {
    id: 'eletrica', nome: 'Elétrica', icon: 'bolt',
    sections: [
      { titulo: 'Engenharia', icon: 'cog', cards: [
        { id:'tdraw',     nome:'Desenho Técnico',    desc:'Unifilar, diagramas, malhas, P&ID',  icon:'file-text', tdraw:'eletrica' },
        { id:'cabos',     nome:'Cabos (lançamento)', desc:'Cabos, bandejas, percurso',          icon:'cable',     eng:'cables' },
        { id:'eletroduct',nome:'Eletrodutos',        desc:'Eletrodutos e percursos',            icon:'route',     eng:'eletroduct' },
        { id:'paineis',   nome:'Sala de Controle',   desc:'Painéis, distribuição',              icon:'server',    native:'elec_panels' },
        { id:'spda',      nome:'SPDA',               desc:'Proteção contra descargas',          icon:'bolt',      native:'elec_spda' },
        { id:'specs',     nome:'Specs Elétricas',    desc:'Especificações técnicas',            icon:'clipboard', native:'elec_specs' }
      ]},
      { titulo: 'Planejamento', icon: 'wrench', cards: [
        { id:'plan',  nome:'Planejamento',         desc:'Efetivo + parâmetros HH + cronograma',icon:'calendar',  planning:true }
      ]},
      { titulo: 'Referências', icon: 'book', cards: [
        { id:'ccab', nome:'Catálogo de Cabos',       desc:'Prysmian, NBR-5410',                 icon:'cable',     native:'cablecat' }
      ]}
    ]
  },
  {
    id: 'pintura', nome: 'Pintura', icon: 'brush',
    sections: [
      { titulo: 'Engenharia', icon: 'cog', cards: [
        { id:'tdraw', nome:'Desenho Técnico',        desc:'Esquemas, mapas de pintura',         icon:'file-text', tdraw:'pintura' },
        { id:'paint', nome:'Inspeções DFT',          desc:'Esquemas Petrobras',                 icon:'brush',     native:'paint' },
        { id:'scaf',  nome:'Andaimes',               desc:'Montagem, inspeção',                 icon:'columns',   native:'scaf' }
      ]},
      { titulo: 'Planejamento', icon: 'wrench', cards: [
        { id:'plan',  nome:'Planejamento',         desc:'Efetivo + parâmetros HH + cronograma',icon:'calendar',  planning:true }
      ]}
    ]
  },
  {
    id: 'caldeiraria', nome: 'Caldeiraria', icon: 'flame',
    sections: [
      { titulo: 'Engenharia', icon: 'cog', cards: [
        { id:'tdraw', nome:'Desenho Técnico',        desc:'Estruturas, detalhes de solda, perfis', icon:'file-text', tdraw:'caldeiraria' },
        { id:'em',    nome:'Estruturas Metálicas',   desc:'Perfis, certificados',               icon:'grid',      eng:'em' },
        { id:'perf',  nome:'Perfis Estruturais',     desc:'Gerdau, Arcelor',                    icon:'layers',    native:'perfis' }
      ]},
      { titulo: 'Ferramentas', icon: 'wrench', cards: [
        { id:'plan',  nome:'Planejamento',         desc:'Efetivo + parâmetros HH + cronograma',icon:'calendar',  planning:true },
        { id:'calc',  nome:'Calculadora HH',         desc:'HH por atividade',                   icon:'calc',      native:'calchh' }
      ]}
    ]
  }
];

const SHORTCUT_TO_HASH = {
  folhas:'sheets', juntas:'joints', suportes:'supports', em:'em', materiais:'materials',
  cabos:'cables', eletroduct:'eletroduct', paineis:'panels', calc_hh:'calc',
  hycontrol:'hycontrol', refs:'refs', cablecat:'cablecat', perfis:'profiles', sinapi:'civilins'
};

// Mapa de nativeView -> ID do <div> no v9 (descobertos via inspeção)
// O v9 segue padrão "v" + nome, exceto isos→vi e panel→vp.
const NATIVE_DIV_ID = {
  isos:'vi', panel:'vp', mat:'vmat', rdo:'vrdo', sold:'vsold',
  quality_joints:'vquality_joints', quality_reports:'vquality_reports',
  paint:'vpaint', scaf:'vscaf',
  civil_concr:'vcivil_concr', civil_elem:'vcivil_elem', civil_sinapi:'vcivil_sinapi',
  elec_panels:'velec_panels', elec_spda:'velec_spda', elec_specs:'velec_specs',
  hydraulic:'vhydraulic', equip:'vequip', maint:'vmaint',
  pend:'vpend', com:'vcom', cal:'vcal',
  // Ferramentas integradas (antes em iframe)
  calchh:'vcalchh', refs:'vrefs', cablecat:'vcablecat', perfis:'vperfis'
};

// Map nativeView -> nome da função renderer no v9 (rIsos, rMat, etc.)
// Quando movemos o div pro Hub, chamamos a renderer DIRETAMENTE sem passar pelo goV
// (que destruiria o Hub via hook do PIAShell.unmount).
const NATIVE_RENDERER = {
  isos:'rIsos', panel:'rPanel', mat:'rMat', rdo:'rRdo', sold:'rSold',
  quality_joints:'rQualityJoints', quality_reports:'rQualityReports',
  paint:'rPaint', scaf:'rScaf',
  civil_concr:'rCivilConcr', civil_elem:'rCivilElem', civil_sinapi:'rCivilSinapi',
  elec_panels:'rElecPanels', elec_spda:'rElecSpda', elec_specs:'rElecSpecs',
  hydraulic:'rHydraulic', equip:'rEquip', maint:'rMaint',
  pend:'rPend', com:'rCom', cal:'rCal',
  // Ferramentas integradas (antes em iframe)
  calchh:'rCalcHH', refs:'rRefs', cablecat:'rCablecat', perfis:'rPerfis'
};

// Guarda para restauração: { divEl, parentEl, nextSiblingEl, prevDisplay }
let _nativeBackup = null;

function restoreNativeView(){
  if(!_nativeBackup) return;
  try {
    const b = _nativeBackup;
    if(b.parentEl && b.divEl){
      // devolve elemento ao pai original na mesma posição
      if(b.nextSiblingEl && b.nextSiblingEl.parentNode === b.parentEl){
        b.parentEl.insertBefore(b.divEl, b.nextSiblingEl);
      } else {
        b.parentEl.appendChild(b.divEl);
      }
      b.divEl.style.display = b.prevDisplay || 'none';
      b.divEl.style.padding = b.prevPadding || '';
    }
  } catch(e){ console.warn('[hub-unified] restore failed', e); }
  _nativeBackup = null;
}

async function buildHubUrl(disciplina, viewHash){
  const HUBS = {
    tubulacao:   'hydrostec_planejador.html',
    civil:       'hydrostec_planejador_civil.html',
    eletrica:    'hydrostec_planejador_eletrica.html',
    pintura:     'hydrostec_planejador_pintura.html',
    caldeiraria: 'hydrostec_planejador_caldeiraria.html'
  };
  let url = HUBS[disciplina] || HUBS.tubulacao;
  const pid = getProjectId();
  const nm = getProjectName();
  const qs = [];
  if(pid) qs.push('project=' + encodeURIComponent(pid));
  if(nm)  qs.push('name=' + encodeURIComponent(nm));
  qs.push('embedded=1');
  qs.push('hide_sidebar=1'); // Pede ao Hub pra esconder a sidebar dele
  try {
    if(w.sb && w.sb.auth){
      const s = (await w.sb.auth.getSession()).data.session;
      if(s){
        qs.push('_at=' + encodeURIComponent(s.access_token));
        if(s.refresh_token) qs.push('_rt=' + encodeURIComponent(s.refresh_token));
      }
    }
  } catch(_){}
  url += '?' + qs.join('&');
  if(viewHash) url += '#' + viewHash;
  return url;
}

let _curDisc = 'tubulacao';
let _curCard = null;

// Estado do "modo focal" — sidebar do v9 escondida
let _focusBackup = null;

function enterFocusMode(){
  if(_focusBackup) return; // já está em modo focal
  const sidebar = d.querySelector('aside.sidebar');
  const content = d.querySelector('.content');
  if(!sidebar) return;
  _focusBackup = {
    sidebarDisplay: sidebar.style.display,
    contentMarginLeft: content ? content.style.marginLeft : '',
    contentWidth: content ? content.style.width : '',
    contentPadding: content ? content.style.padding : ''
  };
  sidebar.style.display = 'none';
  if(content){
    // Como o .content já não tem mais o sidebar ao lado, ocupa 100%
    content.style.marginLeft = '0';
    content.style.width = '100%';
    content.style.padding = '0';
  }
}
function exitFocusMode(){
  if(!_focusBackup) return;
  const sidebar = d.querySelector('aside.sidebar');
  const content = d.querySelector('.content');
  if(sidebar) sidebar.style.display = _focusBackup.sidebarDisplay;
  if(content){
    content.style.marginLeft = _focusBackup.contentMarginLeft;
    content.style.width = _focusBackup.contentWidth;
    content.style.padding = _focusBackup.contentPadding;
  }
  _focusBackup = null;
}

function setDisc(id){
  if(!DISCIPLINAS.find(x=>x.id===id)) return;
  restoreNativeView(); // se havia view nativa no painel, devolve antes de trocar disciplina
  _curDisc = id;
  _curCard = null;
  try { localStorage.setItem('pia.hub.lastDisc', id); } catch(_){}
  paintTopTabs();
  paintSidebar();
  paintWelcome();
}

function openUnifiedHub(){
  const pid = getProjectId();
  if(!pid){
    if(w.toast) w.toast('Selecione um projeto primeiro','warn'); else alert('Selecione um projeto primeiro');
    if(typeof w.goV === 'function') w.goV('projects');
    return;
  }
  // Só lê do localStorage se _curDisc ainda não foi explicitamente setado por setDisc/openDisc
  if(!_curDisc){ try { _curDisc = localStorage.getItem('pia.hub.lastDisc') || 'tubulacao'; } catch(_){ _curDisc = 'tubulacao'; } }
  _curCard = null;

  let ov = d.getElementById('pia-hubu');
  if(ov) ov.remove();
  ov = d.createElement('div');
  ov.id = 'pia-hubu';
  ov.style.cssText = 'position:fixed;inset:0;background:'+C.bg+';z-index:9640;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  ov.innerHTML = `
    <!-- HEADER -->
    <div style="padding:10px 20px;background:${C.card};border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:12px;flex-shrink:0;height:54px;box-sizing:border-box">
      <button id="pia-hubu-back" title="Voltar ao menu principal do PROJECT.IA" style="background:${C.card};border:1px solid ${C.border};color:${C.textSub};padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:6px;font-family:inherit;flex-shrink:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span>Menu</span>
      </button>
      <div style="width:1px;height:24px;background:${C.border}"></div>
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <div style="width:30px;height:30px;border-radius:8px;background:${C.text};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;letter-spacing:-.5px">PI</div>
        <div style="min-width:0">
          <div style="font-size:13.5px;font-weight:700;color:${C.text};letter-spacing:-.2px">HUB do Planejador</div>
          <div style="font-size:11px;color:${C.textMute};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(getProjectName()||'sem projeto')}</div>
        </div>
      </div>
      <button id="pia-hubu-close" title="Fechar" style="background:transparent;border:1px solid ${C.border};color:${C.textSub};width:32px;height:32px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center">${ico('x',16)}</button>
    </div>

    <!-- TABS DISCIPLINA -->
    <div id="pia-hubu-tabs" style="background:${C.card};padding:0 20px;border-bottom:1px solid ${C.border};display:flex;gap:0;overflow-x:auto;flex-shrink:0;height:42px"></div>

    <!-- BODY: SIDEBAR + CONTEÚDO -->
    <div style="flex:1;display:flex;min-height:0">
      <div id="pia-hubu-side" style="width:260px;background:${C.card};border-right:1px solid ${C.border};overflow:auto;flex-shrink:0;padding:12px 8px"></div>
      <div style="flex:1;position:relative;background:${C.bg};min-width:0">
        <div id="pia-hubu-content" style="position:absolute;inset:0;overflow:auto"></div>
        <iframe id="pia-hubu-frame" style="display:none;width:100%;height:100%;border:none;background:#fff"></iframe>
      </div>
    </div>
  `;
  if(w.PIAShell && w.PIAShell.inlineWrap && w.PIAShell.inlineWrap(ov,'hub-unified','tab-hub-unified')){
    /* inline mode */
  } else {
    d.body.appendChild(ov);
  }

  // Esconde a sidebar do v9 enquanto o Hub está aberto
  enterFocusMode();

  d.getElementById('pia-hubu-close').onclick = ()=> {
    restoreNativeView();
    exitFocusMode();
    ov.remove();
  };
  d.getElementById('pia-hubu-back').onclick = ()=> {
    restoreNativeView();
    exitFocusMode();
    ov.remove();
  };
  // Hover state dos botões
  ['pia-hubu-close'].forEach(id => {
    const b = d.getElementById(id);
    if(!b) return;
    const bg = b.style.background;
    b.onmouseover = ()=> b.style.background = C.hover;
    b.onmouseout  = ()=> b.style.background = bg;
  });

  paintTopTabs();
  paintSidebar();
  paintWelcome();
}

function paintTopTabs(){
  const wrap = d.getElementById('pia-hubu-tabs');
  if(!wrap) return;
  wrap.innerHTML = DISCIPLINAS.map(disc => {
    const active = disc.id === _curDisc;
    return `<button data-disc="${disc.id}" class="hubu-tab" style="
      background:transparent;border:none;
      border-bottom:2px solid ${active ? C.accent : 'transparent'};
      padding:0 16px;cursor:pointer;height:42px;
      display:inline-flex;align-items:center;gap:8px;
      font-weight:${active ? '700' : '500'};font-size:12.5px;
      color:${active ? C.text : C.textSub};
      transition:all .12s;white-space:nowrap;
      font-family:inherit;
    ">
      ${ico(disc.icon, 15, active ? C.accent : C.textMute)}
      <span>${esc(disc.nome)}</span>
    </button>`;
  }).join('');
  wrap.querySelectorAll('.hubu-tab').forEach(b => {
    b.onmouseover = ()=> { if(b.dataset.disc !== _curDisc) b.style.color = C.text; };
    b.onmouseout  = ()=> { if(b.dataset.disc !== _curDisc) b.style.color = C.textSub; };
    b.onclick = ()=> setDisc(b.dataset.disc);
  });
}

function paintSidebar(){
  const side = d.getElementById('pia-hubu-side');
  if(!side) return;
  const disc = DISCIPLINAS.find(x => x.id === _curDisc) || DISCIPLINAS[0];
  side.innerHTML = disc.sections.map(sec => `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:6px;padding:6px 10px 4px;color:${C.textMute};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px">
        ${ico(sec.icon, 12, C.textMute)}
        <span>${esc(sec.titulo)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:1px">
        ${sec.cards.map(card => renderSidebarItem(disc, card)).join('')}
      </div>
    </div>
  `).join('');

  side.querySelectorAll('.hubu-item').forEach(el => {
    el.onclick = ()=>{
      const cardId = el.dataset.cardId;
      const native = el.dataset.native || '';
      const hub    = el.dataset.hub || '';
      const tdraw  = el.dataset.tdraw || '';
      const eng    = el.dataset.eng || '';
      const planning = el.dataset.planning === '1';
      _curCard = cardId;
      paintSidebar();
      activateCard(native, hub, tdraw, eng, planning);
    };
  });
}

function renderSidebarItem(disc, card){
  const isActive = _curCard === card.id;
  // verde = nativo v9 ou eng module, amarelo = tdraw (Desenho Técnico), azul = HUB clássico
  const dotColor = (card.native || card.eng) ? '#10B981' : (card.tdraw ? '#F59E0B' : C.accent);
  return `
    <button class="hubu-item"
      data-card-id="${esc(card.id)}"
      data-native="${esc(card.native||'')}"
      data-hub="${esc(card.hub||'')}"
      data-tdraw="${esc(card.tdraw||'')}"
      data-eng="${esc(card.eng||'')}"
      data-planning="${card.planning?'1':''}"
      style="
        background:${isActive ? C.active : 'transparent'};
        border:none;cursor:pointer;text-align:left;
        padding:8px 10px;border-radius:6px;
        display:flex;align-items:center;gap:10px;
        transition:background .12s;
        font-family:inherit;
        position:relative;
      "
    >
      ${isActive ? '<span style="position:absolute;left:0;top:8px;bottom:8px;width:2px;background:'+C.accent+';border-radius:2px"></span>' : ''}
      ${ico(card.icon, 16, isActive ? C.accent : C.textSub)}
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:12.5px;font-weight:${isActive ? '700' : '600'};color:${C.text};line-height:1.2">${esc(card.nome)}</span>
        <span style="display:block;font-size:10.5px;color:${C.textMute};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${esc(card.desc||'')}</span>
      </span>
      <span title="${card.native?'Integrado':'Em iframe'}" style="width:6px;height:6px;border-radius:50%;background:${dotColor};flex-shrink:0"></span>
    </button>
  `;
}

// Adiciona hover suave nos items (com event delegation pra preservar estado active)
d.addEventListener('mouseover', function(e){
  const it = e.target.closest && e.target.closest('.hubu-item');
  if(!it || !d.getElementById('pia-hubu-side')?.contains(it)) return;
  const id = it.dataset.cardId;
  if(id === _curCard) return;
  it.style.background = C.hover;
});
d.addEventListener('mouseout', function(e){
  const it = e.target.closest && e.target.closest('.hubu-item');
  if(!it || !d.getElementById('pia-hubu-side')?.contains(it)) return;
  const id = it.dataset.cardId;
  if(id === _curCard) return;
  it.style.background = 'transparent';
});

function paintWelcome(){
  restoreNativeView(); // se sair da view nativa pra welcome, devolve o elemento ao v9
  const content = d.getElementById('pia-hubu-content');
  const frame   = d.getElementById('pia-hubu-frame');
  if(!content || !frame) return;
  frame.style.display = 'none';
  frame.src = 'about:blank';
  content.style.display = 'block';
  const disc = DISCIPLINAS.find(x => x.id === _curDisc) || DISCIPLINAS[0];
  const all = disc.sections.flatMap(s => s.cards);
  const nativos = all.filter(c => c.native).length;
  const iframes = all.filter(c => c.hub).length;

  content.innerHTML = `
    <div style="padding:48px 40px;max-width:680px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px">
        <div style="width:54px;height:54px;border-radius:12px;background:${C.text};display:flex;align-items:center;justify-content:center;color:#fff">${ico(disc.icon, 28, '#fff')}</div>
        <div>
          <div style="font-size:11px;color:${C.textMute};font-weight:600;text-transform:uppercase;letter-spacing:.6px">Disciplina selecionada</div>
          <div style="font-size:22px;font-weight:700;color:${C.text};letter-spacing:-.4px;margin-top:2px">${esc(disc.nome)}</div>
        </div>
      </div>

      <div style="background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:20px 22px;margin-bottom:14px">
        <div style="font-size:13.5px;font-weight:700;color:${C.text};margin-bottom:6px">Selecione uma ferramenta na lateral</div>
        <div style="font-size:12.5px;color:${C.textSub};line-height:1.55">
          ${all.length} ferramentas disponíveis nesta disciplina, todas integradas ao PROJECT.IA com carregamento direto.
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:16px 18px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:#10B981"></span>
            <div style="font-size:10.5px;color:${C.textSub};font-weight:600;text-transform:uppercase;letter-spacing:.5px">Integradas</div>
          </div>
          <div style="font-size:28px;font-weight:800;color:${C.text};line-height:1">${nativos}</div>
          <div style="font-size:11px;color:${C.textMute};margin-top:3px">Carregam direto no PROJECT.IA</div>
        </div>
        <div style="background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:16px 18px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${C.accent}"></span>
            <div style="font-size:10.5px;color:${C.textSub};font-weight:600;text-transform:uppercase;letter-spacing:.5px">Em iframe</div>
          </div>
          <div style="font-size:28px;font-weight:800;color:${C.text};line-height:1">${iframes}</div>
          <div style="font-size:11px;color:${C.textMute};margin-top:3px">Abrem neste painel</div>
        </div>
      </div>

      <div style="background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;color:${C.textSub};font-size:12px">
        Para trocar de disciplina, use as abas no topo.
      </div>
    </div>
  `;
}

async function activateCard(nativeView, hubKey, tdrawDisc, engMod, planning){
  // Sempre restaura uma view nativa anterior (se houver) antes de trocar
  restoreNativeView();

  const content = d.getElementById('pia-hubu-content');
  const frame   = d.getElementById('pia-hubu-frame');

  // CASO PLANEJAMENTO — fecha o Hub Unified e abre Planning em tela cheia
  // O Planning cria SEU PRÓPRIO overlay (#pia-planning-overlay) com position:fixed.
  // O Hub é reaberto via PIAHubUnified.openDisc() quando o user clica Voltar.
  // NÃO mexemos no .content do v9 — ele fica intacto por baixo, preservando
  // #vp, #vd, etc. (evita erro "Cannot set properties of null" em rProj()).
  if(planning && typeof w.openPlanning === 'function'){
    try {
      const overlay = d.getElementById('pia-hubu');
      const discAtual = _curDisc;
      // Marca a disciplina pra reabrir o Hub no Voltar
      try { w.__piaHubReopenDisc = discAtual; } catch(_){}
      // Restaura qualquer view nativa que estivesse movida pra dentro do hub
      restoreNativeView();
      // Remove overlay do Hub (libera tela cheia)
      if(overlay) overlay.remove();
      // Sai do modo focal — mas como o Planning vai cobrir tudo com z-index alto,
      // não importa se a sidebar do v9 fica visível por baixo
      try { exitFocusMode(); } catch(_){}
      // Abre Planning — ele criará seu próprio overlay fullscreen
      const pid = getProjectId();
      await w.openPlanning(pid);
      return;
    } catch(e){
      console.warn('[hub-unified] planning fallback:', e);
    }
  }

  // CASO -1 — Engineering Module (eng): mesma técnica do tdraw, com #veng-<modId>
  if(engMod && w.PIAEngModule){
    try {
      await w.PIAEngModule.open(engMod);
      const divEl = d.getElementById('veng-' + engMod);
      if(!divEl){ throw new Error('Container #veng-' + engMod + ' não criado'); }
      _nativeBackup = {
        nativeView: '__eng_'+engMod+'__',
        divEl,
        parentEl: divEl.parentNode,
        nextSiblingEl: divEl.nextSibling,
        prevDisplay: 'none', // virtual, só vive no Hub
        prevPadding: divEl.style.padding || ''
      };
      if(content){
        content.style.display = 'block';
        content.innerHTML = '';
        content.appendChild(divEl);
        divEl.style.display = 'block';
        divEl.style.padding = '0';
      }
      if(frame){ frame.style.display = 'none'; frame.src = 'about:blank'; }
      return;
    } catch(e){
      console.warn('[hub-unified] eng module fallback:', e);
      restoreNativeView();
      exitFocusMode();
      const ov = d.getElementById('pia-hubu');
      if(ov) ov.remove();
      try { if(w.PIAEngModule) w.PIAEngModule.open(engMod); } catch(_){}
      return;
    }
  }

  // CASO 0 — Desenho Técnico (tdraw): garante container, ativa disciplina, move pro painel
  if(tdrawDisc && w.PIATDraw){
    try {
      // 1. Setar disciplina e carregar
      w.PIATDraw.setDisciplina(tdrawDisc);
      // 2. Garantir que existe o #vtdraw no DOM
      let divEl = d.getElementById('vtdraw');
      if(!divEl){
        // Aciona o open uma vez pra criar o container
        await w.PIATDraw.open(tdrawDisc);
        divEl = d.getElementById('vtdraw');
      }
      if(!divEl){ throw new Error('Container #vtdraw não criado'); }
      _nativeBackup = {
        nativeView: '__tdraw__',
        divEl,
        parentEl: divEl.parentNode,
        nextSiblingEl: divEl.nextSibling,
        // #vtdraw é virtual (só vive dentro do Hub) — sempre restaura como hidden
        prevDisplay: 'none',
        prevPadding: divEl.style.padding || ''
      };
      if(content){
        content.style.display = 'block';
        content.innerHTML = '';
        content.appendChild(divEl);
        divEl.style.display = 'block';
        divEl.style.padding = '0';
      }
      // Renderiza (load + render no painel do Hub)
      await w.PIATDraw.open(tdrawDisc);
      if(frame){ frame.style.display = 'none'; frame.src = 'about:blank'; }
      return;
    } catch(e){
      console.warn('[hub-unified] tdraw fallback:', e);
      restoreNativeView();
      exitFocusMode();
      const ov = d.getElementById('pia-hubu');
      if(ov) ov.remove();
      try { if(w.PIATDraw) w.PIATDraw.open(tdrawDisc); } catch(_){}
      return;
    }
  }

  // CASO A — View NATIVA do v9: move o <div vXxx> pro painel direito
  if(nativeView){
    try {
      // 1. Identifica o div da view ANTES de mexer com goV
      const divId = NATIVE_DIV_ID[nativeView] || ('v' + nativeView);
      const divEl = d.getElementById(divId);
      if(!divEl){ throw new Error('Div da view não encontrado: ' + divId); }
      // 2. Salva localização original
      _nativeBackup = {
        nativeView,
        divEl,
        parentEl: divEl.parentNode,
        nextSiblingEl: divEl.nextSibling,
        prevDisplay: divEl.style.display || 'block',
        prevPadding: divEl.style.padding || ''
      };
      // 3. Move o div pro painel direito do Hub ANTES de renderizar
      // (renderizar antes faria PIAShell.unmount destruir o Hub via hook do goV)
      if(content){
        content.style.display = 'block';
        content.innerHTML = ''; // limpa welcome screen
        content.appendChild(divEl);
        divEl.style.display = 'block';
        divEl.style.padding = '20px 24px';
      }
      // 4. Chama a renderer DIRETAMENTE (não via goV) pra evitar hook do PIAShell
      // Atualiza curView no v9 sem disparar o hook
      try { w.curView = nativeView; } catch(_){}
      const rendererName = NATIVE_RENDERER[nativeView];
      if(rendererName && typeof w[rendererName] === 'function'){
        try { w[rendererName](); } catch(rerr){ console.warn('[hub-unified] renderer error', rendererName, rerr); }
      }
      if(frame){ frame.style.display = 'none'; frame.src = 'about:blank'; }
      return;
    } catch(e){
      console.warn('[hub-unified] move-native fallback:', e);
      restoreNativeView();
      // Cai pro modo antigo: fecha hub, restaura focus e abre v9 normal
      exitFocusMode();
      const ov = d.getElementById('pia-hubu');
      if(ov) ov.remove();
      try { if(typeof w.goV === 'function') w.goV(nativeView); } catch(_){}
      return;
    }
  }

  // CASO B — View do HUB clássico: carrega iframe
  if(hubKey){
    if(content) content.style.display = 'none';
    if(frame){
      frame.style.display = 'block';
      frame.style.opacity = '0';
      const viewHash = SHORTCUT_TO_HASH[hubKey] || '';
      const url = await buildHubUrl(_curDisc, viewHash);
      frame.src = url;
      frame.onload = ()=>{
        frame.style.transition = 'opacity .2s';
        frame.style.opacity = '1';
        try {
          const doc = frame.contentDocument;
          if(doc){
            const st = doc.createElement('style');
            st.textContent = `
              .sidebar, aside.sidebar, .side-nav, #sidebar { display: none !important; }
              .header, header.app-header, .topbar { display: none !important; }
              .file-warning, #file-warning { display: none !important; }
              body { padding-top: 0 !important; margin: 0 !important; }
              main, .content, .main-content { padding: 0 !important; }
            `;
            doc.head.appendChild(st);
          }
        } catch(e){ /* cross-origin ou outro erro — silencioso */ }
      };
    }
    return;
  }

  // FALLBACK — sem nada selecionado, mostra welcome
  paintWelcome();
}

// ============================================================
// API PÚBLICA
// ============================================================
function openDisc(disciplinaId, viewHash){
  setDisc(disciplinaId || 'tubulacao');
  openUnifiedHub();
  if(viewHash){
    // Procura card pelo hash e ativa
    const disc = DISCIPLINAS.find(x => x.id === _curDisc);
    if(disc){
      const cards = disc.sections.flatMap(s => s.cards);
      const c = cards.find(c => c.hub === viewHash || c.id === viewHash || c.native === viewHash);
      if(c){
        _curCard = c.id;
        paintSidebar();
        activateCard(c.native||'', c.hub||'', c.tdraw||'', c.eng||'', !!c.planning);
      }
    }
  }
}

function refresh(){
  // Recarrega dados se algum card estiver ativo
  if(_curCard){
    const disc = DISCIPLINAS.find(x => x.id === _curDisc);
    if(disc){
      const cards = disc.sections.flatMap(s => s.cards);
      const c = cards.find(c => c.id === _curCard);
      if(c) activateCard(c.native||'', c.hub||'', c.tdraw||'', c.eng||'', !!c.planning);
    }
  }
}

// Volta da view atual pra welcome screen da disciplina (NÃO fecha o Hub)
function goBack(){
  console.log('[hub-unified] goBack() iniciado. _curDisc:', _curDisc, '_curCard:', _curCard);
  try {
    _curCard = null;
    // Restaura view nativa se houver (planejamento não tem, mas outras views sim)
    try { restoreNativeView(); } catch(e){ console.warn('[hub-unified] restoreNativeView falhou:', e); }
    // Re-renderiza sidebar sem card ativo
    try { paintSidebar(); } catch(e){ console.warn('[hub-unified] paintSidebar falhou:', e); }
    // Garante que iframe está escondido e content visível
    const frame = d.getElementById('pia-hubu-frame');
    const content = d.getElementById('pia-hubu-content');
    if(frame){ frame.style.display = 'none'; try { frame.src = 'about:blank'; } catch(_){} }
    if(content){ content.style.display = 'block'; }
    // Mostra welcome screen
    try { paintWelcome(); } catch(e){ console.error('[hub-unified] paintWelcome falhou:', e); }
    console.log('[hub-unified] goBack() concluído OK');
  } catch(err){
    console.error('[hub-unified] goBack() ERROR:', err);
  }
}

// API PÚBLICA
function openDisc(disciplinaId, viewHash){
  setDisc(disciplinaId || 'tubulacao');
  openUnifiedHub();
  if(viewHash){
    const disc = DISCIPLINAS.find(x => x.id === _curDisc);
    if(disc){
      const cards = disc.sections.flatMap(s => s.cards);
      const c = cards.find(c => c.hub === viewHash || c.id === viewHash || c.native === viewHash);
      if(c){
        _curCard = c.id;
        paintSidebar();
        activateCard(c.native||'', c.hub||'', c.tdraw||'', c.eng||'', !!c.planning);
      }
    }
  }
}

function refresh(){
  if(_curCard){
    const disc = DISCIPLINAS.find(x => x.id === _curDisc);
    if(disc){
      const cards = disc.sections.flatMap(s => s.cards);
      const c = cards.find(c => c.id === _curCard);
      if(c) activateCard(c.native||'', c.hub||'', c.tdraw||'', c.eng||'', !!c.planning);
    }
  }
}

w.PIAHubUnified = {
  open: openUnifiedHub,
  openDisc,
  refresh,
  setDisc,
  goBack
};

})();
