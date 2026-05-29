/*! PROJECT.IA — Modais de cadastro manual (+ Novo) p/ Civil/Elétrica/Hidráulica
 *  Estas views tinham botões "+ Novo" mortos (oCivilPour, oElecPanel, etc. — funções
 *  inexistentes -> ReferenceError). Aqui implementamos um modal genérico dirigido por
 *  schema (colunas reais das tabelas) que insere {org_id, project_id?, ...campos} —
 *  mesma lógica do Importar Excel. Visual consistente (overlay/mbox/btn) com o app.
 *  Carregado via <script defer> no hydrostec_v9.html.
 */
(function (w, d) {
  'use strict';
  try {
    function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function today(){ return new Date().toISOString().slice(0,10); }
    function toast(msg, kind){ if(typeof w.toast === 'function') w.toast(msg, kind); else if(kind==='err') alert(msg); }

    // view -> { table, reqProject, title, fields:[{name,label,type,required,step,full,def}], fixed:{...} }
    var VIEWS = {
      civil_concr: { table:'civil_concrete_pours', reqProject:true, title:'Concretagem', fixed:{status:'lancado'}, fields:[
        {name:'pour_number',label:'Nº do lançamento',type:'text',required:true},
        {name:'pour_date',label:'Data',type:'date',required:true,def:today()},
        {name:'element_type',label:'Tipo de elemento',type:'text'},
        {name:'element_tag',label:'TAG do elemento',type:'text'},
        {name:'location',label:'Local',type:'text'},
        {name:'volume_m3',label:'Volume (m³)',type:'number',step:'0.01'},
        {name:'fck_required_mpa',label:'fck projeto (MPa)',type:'number',step:'0.1'},
        {name:'fck_actual_mpa',label:'fck real (MPa)',type:'number',step:'0.1'},
        {name:'slump_required_cm',label:'Slump projeto (cm)',type:'number',step:'0.1'},
        {name:'slump_actual_cm',label:'Slump real (cm)',type:'number',step:'0.1'},
        {name:'supplier',label:'Concreteira',type:'text'},
        {name:'truck_number',label:'Caminhão',type:'text'},
        {name:'responsible_engineer',label:'Engenheiro responsável',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      civil_elem: { table:'civil_concrete_elements', reqProject:true, title:'Elemento estrutural', fields:[
        {name:'tag',label:'TAG',type:'text',required:true},
        {name:'element_type',label:'Tipo (pilar/viga/laje...)',type:'text',required:true},
        {name:'name',label:'Nome',type:'text'},
        {name:'level_floor',label:'Nível / pavimento',type:'text'},
        {name:'location',label:'Local',type:'text'},
        {name:'fck_mpa',label:'fck (MPa)',type:'number',step:'0.1'},
        {name:'dimensions_mm',label:'Dimensões (mm)',type:'text'},
        {name:'volume_m3',label:'Volume (m³)',type:'number',step:'0.01'},
        {name:'steel_weight_kg',label:'Aço (kg)',type:'number',step:'0.01'},
        {name:'form_area_m2',label:'Área de forma (m²)',type:'number',step:'0.01'},
        {name:'concrete_date',label:'Data concretagem',type:'date'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      civil_sinapi: { table:'civil_insumos_catalog', reqProject:false, title:'Insumo SINAPI', fixed:{source:'manual'}, fields:[
        {name:'code',label:'Código',type:'text',required:true},
        {name:'description',label:'Descrição',type:'text',required:true,full:true},
        {name:'category',label:'Categoria',type:'text',required:true},
        {name:'unit',label:'Unidade',type:'text',required:true},
        {name:'hh_per_unit',label:'HH por unidade',type:'number',step:'0.0001'},
        {name:'material_cost_brl',label:'Custo material (R$)',type:'number',step:'0.01'},
        {name:'total_cost_brl',label:'Custo total (R$)',type:'number',step:'0.01'},
        {name:'team_composition',label:'Composição de equipe',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      elec_panels: { table:'electrical_panels', reqProject:true, title:'Quadro elétrico', fields:[
        {name:'tag',label:'TAG',type:'text',required:true},
        {name:'name',label:'Nome',type:'text'},
        {name:'panel_type',label:'Tipo',type:'text'},
        {name:'location',label:'Local',type:'text'},
        {name:'voltage_v',label:'Tensão (V)',type:'number',step:'1'},
        {name:'current_a',label:'Corrente (A)',type:'number',step:'0.1'},
        {name:'short_circuit_ka',label:'Icc (kA)',type:'number',step:'0.1'},
        {name:'ip_rating',label:'Grau IP',type:'text'},
        {name:'manufacturer',label:'Fabricante',type:'text'},
        {name:'model',label:'Modelo',type:'text'},
        {name:'installed_date',label:'Data instalação',type:'date'},
        {name:'status',label:'Status',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      elec_spda: { table:'electrical_grounding', reqProject:true, title:'Medição SPDA / Aterramento', fields:[
        {name:'location',label:'Local',type:'text',required:true},
        {name:'measurement_date',label:'Data da medição',type:'date',required:true,def:today()},
        {name:'measured_resistance_ohm',label:'Resistência medida (Ω)',type:'number',step:'0.01',required:true},
        {name:'required_resistance_ohm',label:'Resistência exigida (Ω)',type:'number',step:'0.01'},
        {name:'measurement_method',label:'Método',type:'text'},
        {name:'equipment_used',label:'Equipamento usado',type:'text'},
        {name:'spda_type',label:'Tipo de SPDA',type:'text'},
        {name:'result',label:'Resultado',type:'text'},
        {name:'responsible_engineer',label:'Engenheiro responsável',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      elec_specs: { table:'cable_specs_catalog', reqProject:false, title:'Spec de cabo', fields:[
        {name:'cable_type',label:'Tipo de cabo',type:'text',required:true},
        {name:'cross_section_mm2',label:'Seção (mm²)',type:'number',step:'0.01',required:true},
        {name:'conductor_count',label:'Nº de condutores',type:'number',step:'1'},
        {name:'voltage_rating',label:'Tensão',type:'text'},
        {name:'ampacity_air_a',label:'Ampacidade ar (A)',type:'number',step:'0.1'},
        {name:'ampacity_ground_a',label:'Ampacidade solo (A)',type:'number',step:'0.1'},
        {name:'manufacturer',label:'Fabricante',type:'text'},
        {name:'standard',label:'Norma',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]},
      hydraulic: { table:'hydraulic_systems', reqProject:true, title:'Sistema hidráulico', fields:[
        {name:'tag',label:'TAG',type:'text',required:true},
        {name:'system_type',label:'Tipo de sistema',type:'text',required:true},
        {name:'location',label:'Local',type:'text'},
        {name:'diameter_mm',label:'Diâmetro (mm)',type:'number',step:'0.1'},
        {name:'material',label:'Material',type:'text'},
        {name:'length_m',label:'Comprimento (m)',type:'number',step:'0.01'},
        {name:'fittings_count',label:'Nº de conexões',type:'number',step:'1'},
        {name:'test_pressure_bar',label:'Pressão de teste (bar)',type:'number',step:'0.1'},
        {name:'test_date',label:'Data do teste',type:'date'},
        {name:'test_result',label:'Resultado do teste',type:'text'},
        {name:'notes',label:'Observações',type:'textarea',full:true}
      ]}
    };

    function fieldHtml(f){
      var id = 'mf-' + f.name;
      var lbl = '<label style="font-size:11px;font-weight:600;color:var(--t7,#334155);display:block;margin-bottom:4px">' + esc(f.label) + (f.required ? ' <span style="color:var(--danger,#DC2626)">*</span>' : '') + '</label>';
      var st = 'width:100%;padding:8px 10px;border:1px solid var(--t3,#E5E7EB);border-radius:7px;font-size:12.5px;font-family:inherit;background:var(--t0,#fff);color:var(--t9,#0F172A);box-sizing:border-box';
      var inp;
      if(f.type === 'textarea'){
        inp = '<textarea id="' + id + '" rows="2" style="' + st + ';resize:vertical"></textarea>';
      } else {
        var step = f.step ? (' step="' + f.step + '"') : '';
        var val = f.def ? (' value="' + esc(f.def) + '"') : '';
        inp = '<input id="' + id + '" type="' + f.type + '"' + step + val + ' style="' + st + '">';
      }
      var span = f.full ? 'grid-column:1/-1' : '';
      return '<div style="' + span + '">' + lbl + inp + '</div>';
    }

    function openManualForm(view){
      var cfg = VIEWS[view];
      if(!cfg){ toast('Cadastro manual não disponível para esta aba.', 'warn'); return; }
      if(cfg.reqProject && !w.curProj){ toast('Selecione um projeto primeiro.', 'warn'); return; }
      var prev = d.getElementById('mf-overlay'); if(prev) prev.remove();
      var ov = d.createElement('div');
      ov.className = 'overlay open';
      ov.id = 'mf-overlay';
      ov.onclick = function(e){ if(e.target === ov) ov.remove(); };
      var grid = cfg.fields.map(fieldHtml).join('');
      ov.innerHTML =
        '<div class="mbox" style="max-width:720px">' +
          '<button class="mclose" id="mf-x"><i data-lucide="x"></i></button>' +
          '<div class="mtitle"><i data-lucide="plus" style="color:var(--primary)"></i> Novo — ' + esc(cfg.title) + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">' + grid + '</div>' +
          '<div id="mf-status" style="margin-bottom:8px"></div>' +
          '<div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">' +
            '<button class="btn bg" id="mf-cancel">Cancelar</button>' +
            '<button class="btn bp" id="mf-save">Salvar</button>' +
          '</div>' +
        '</div>';
      d.body.appendChild(ov);
      try { if(w.lucide && w.lucide.createIcons) w.lucide.createIcons(); } catch(_){}
      d.getElementById('mf-x').onclick = function(){ ov.remove(); };
      d.getElementById('mf-cancel').onclick = function(){ ov.remove(); };
      d.getElementById('mf-save').onclick = function(){ saveManualForm(view, ov); };
    }

    async function saveManualForm(view, ov){
      var cfg = VIEWS[view];
      var sb = w.sb;
      var status = ov.querySelector('#mf-status');
      var btn = ov.querySelector('#mf-save');
      if(!sb){ if(status) status.innerHTML = err('Supabase indisponível. Recarregue a página.'); return; }
      var rec = { org_id: (w._org && w._org.id) || null };
      if(cfg.reqProject){
        if(!w.curProj){ if(status) status.innerHTML = err('Selecione um projeto primeiro.'); return; }
        rec.project_id = w.curProj;
      }
      // Coleta campos
      var missing = [];
      for(var i=0;i<cfg.fields.length;i++){
        var f = cfg.fields[i];
        var el = ov.querySelector('#mf-' + f.name);
        var raw = el ? String(el.value || '').trim() : '';
        if(!raw){
          if(f.required) missing.push(f.label);
          continue;
        }
        if(f.type === 'number'){
          var num = (f.step === '1') ? parseInt(raw, 10) : parseFloat(raw.replace(',', '.'));
          if(isNaN(num)){ if(f.required) missing.push(f.label); continue; }
          rec[f.name] = num;
        } else {
          rec[f.name] = raw;
        }
      }
      if(missing.length){ if(status) status.innerHTML = err('Preencha os campos obrigatórios: ' + missing.join(', ')); return; }
      // Valores fixos (defaults de colunas NOT NULL sem input)
      if(cfg.fixed){ for(var k in cfg.fixed){ if(rec[k] == null) rec[k] = cfg.fixed[k]; } }

      btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = 'Salvando...';
      try {
        var r = await sb.from(cfg.table).insert(rec).select('id').single();
        if(r.error){
          if(status) status.innerHTML = err('Erro ao salvar: ' + r.error.message);
          toast('Erro ao salvar: ' + r.error.message, 'err');
          btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Salvar';
          return;
        }
        toast('Cadastrado com sucesso', 'ok');
        ov.remove();
        // Refresh da view atual (re-renderiza e re-consulta)
        try { if(typeof w.goV === 'function') w.goV(view); } catch(_){}
      } catch(e){
        if(status) status.innerHTML = err('Erro inesperado: ' + (e.message || e));
        btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Salvar';
      }
    }

    function err(msg){
      return '<div style="background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5;border-radius:8px;padding:9px 12px;font-size:12px">' + esc(msg) + '</div>';
    }

    // Expõe as funções globais que os onclicks do HTML chamam (eram botões mortos)
    w.openManualForm = openManualForm;
    w.oCivilPour   = function(){ openManualForm('civil_concr'); };
    w.oCivilElem   = function(){ openManualForm('civil_elem'); };
    w.oCivilSinapi = function(){ openManualForm('civil_sinapi'); };
    w.oElecPanel   = function(){ openManualForm('elec_panels'); };
    w.oElecSpda    = function(){ openManualForm('elec_spda'); };
    w.oElecSpec    = function(){ openManualForm('elec_specs'); };
    w.oHydraulic   = function(){ openManualForm('hydraulic'); };

  } catch(e){ console.error('[manual-forms] init falhou:', e); }
})(window, document);
