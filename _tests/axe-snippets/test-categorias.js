/**
 * PROJECT.IA — Teste rápido de cadastro multi-categoria
 *
 * USO:
 * 1. Faça login no PROJECT.IA
 * 2. Selecione um projeto ativo
 * 3. Abra F12 → Console
 * 4. Cole esse script inteiro e pressione Enter
 * 5. Em 10-15s aparece relatório no console mostrando OK/FAIL por categoria
 *
 * O script insere ~14 registros sintéticos cobrindo:
 * materials_catalog, project_materials, lines, joints, supports,
 * structural_em_records, electrical_cables, eletroduct_runs, electrical_panels.
 *
 * Após o teste, todos os registros são marcados como deleted_at (não poluem o app).
 */
(async function piaTestAllCategories(){
  'use strict';
  const log = (msg, color = '#1E40AF') => console.log('%c'+msg, 'color:'+color+';font-weight:bold');
  const ok = (msg) => console.log('%c✓ '+msg, 'color:#059669;font-weight:bold');
  const fail = (msg, err) => console.error('✗ '+msg, err);

  if(!window.sb) return fail('window.sb não disponível — faça login primeiro');
  if(!window._org) return fail('window._org não disponível — recarregue após login');
  const orgId = window._org.id;
  const projectId = (window._curProject && window._curProject.id) || window.curProj;
  if(!projectId) return fail('Nenhum projeto ativo. Selecione um projeto antes.');

  const runId = 'TEST-' + Date.now();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#7C3AED');
  log('🧪 PROJECT.IA Multi-Category Test', '#7C3AED');
  log(`   org: ${orgId}`, '#475569');
  log(`   project: ${projectId}`, '#475569');
  log(`   runId: ${runId}`, '#475569');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#7C3AED');

  const results = [];
  const _track = (name, ok, err) => { results.push({ name, ok, err: err ? (err.message || String(err)) : null }); };

  // 1) MATERIAIS
  try {
    const cat = await window.sb.from('materials_catalog').insert({
      org_id: orgId, code: `${runId}-MAT-001`, description: 'Tubo TEST 10in', category: 'tubo',
      material_type: 'aco carbono', diameter_in: 10, schedule: 'STD', unit: 'm'
    }).select('id').single();
    if(cat.error) throw cat.error;
    const pm = await window.sb.from('project_materials').insert({
      org_id: orgId, project_id: projectId, material_id: cat.data.id, qty_planned: 25
    }).select('id').single();
    if(pm.error) throw pm.error;
    ok('Materiais (catalog + project_materials)');
    _track('Materiais', true);
  } catch(e){ fail('Materiais', e); _track('Materiais', false, e); }

  // 2) JUNTAS
  try {
    const lineTag = `${runId}-LINE-A1`;
    const lineIns = await window.sb.from('lines').insert({ org_id: orgId, project_id: projectId, tag: lineTag }).select('id').single();
    if(lineIns.error) throw lineIns.error;
    for(const jt of ['topo','encaixe','flangeada']){
      const r = await window.sb.from('joints').insert({
        org_id: orgId, project_id: projectId, line_id: lineIns.data.id,
        joint_number: `${runId}-J-${jt}`, joint_type: jt, diameter_in: 6
      }).select('id').single();
      if(r.error) throw r.error;
    }
    ok('Juntas (3 com tipos diferentes + linha auto-criada)');
    _track('Juntas', true);
  } catch(e){ fail('Juntas', e); _track('Juntas', false, e); }

  // 3) SUPORTES
  try {
    for(const st of ['fixo','mola','deslizante']){
      const r = await window.sb.from('supports').insert({
        org_id: orgId, project_id: projectId,
        code: `${runId}-SUP-${st}`, support_type: st, weight_kg: 20
      }).select('id').single();
      if(r.error) throw r.error;
    }
    ok('Suportes (3 com tipos diferentes)');
    _track('Suportes', true);
  } catch(e){ fail('Suportes', e); _track('Suportes', false, e); }

  // 4) ESTRUTURAS METÁLICAS
  try {
    for(const ems of [
      { code: `${runId}-EM-W150`, perfil: 'W150x18', quantity: 5, weight_kg: 90 },
      { code: `${runId}-EM-L50`, perfil: 'L50x50x6', quantity: 12, weight_kg: 24 }
    ]){
      const r = await window.sb.from('structural_em_records').insert({
        org_id: orgId, project_id: projectId, ...ems
      }).select('id').single();
      if(r.error) throw r.error;
    }
    ok('Estruturas metálicas (2)');
    _track('Estruturas metálicas', true);
  } catch(e){ fail('Estruturas metálicas', e); _track('Estruturas metálicas', false, e); }

  // 5) CABOS
  try {
    for(const cb of [
      { cable_tag: `${runId}-CB001`, voltage_v: 380, cross_section_mm2: 16, length_m: 50 },
      { cable_tag: `${runId}-CB002`, voltage_v: 220, cross_section_mm2: 4, length_m: 25 }
    ]){
      const r = await window.sb.from('electrical_cables').insert({
        org_id: orgId, project_id: projectId, ...cb
      }).select('id').single();
      if(r.error) throw r.error;
    }
    ok('Cabos elétricos (2)');
    _track('Cabos', true);
  } catch(e){ fail('Cabos', e); _track('Cabos', false, e); }

  // 6) ELETRODUTOS
  try {
    for(const ed of [
      { tag: `${runId}-EL001`, diameter_mm: 25, length_m: 30 },
      { tag: `${runId}-EL002`, diameter_mm: 50, length_m: 15 }
    ]){
      const r = await window.sb.from('eletroduct_runs').insert({
        org_id: orgId, project_id: projectId, ...ed
      }).select('id').single();
      if(r.error) throw r.error;
    }
    ok('Eletrodutos (2)');
    _track('Eletrodutos', true);
  } catch(e){ fail('Eletrodutos', e); _track('Eletrodutos', false, e); }

  // 7) PAINÉIS
  try {
    const r = await window.sb.from('electrical_panels').insert({
      org_id: orgId, project_id: projectId,
      panel_tag: `${runId}-PNL001`, panel_type: 'CCM', protection_class: 'IP55'
    }).select('id').single();
    if(r.error) throw r.error;
    ok('Painéis elétricos (1)');
    _track('Painéis', true);
  } catch(e){ fail('Painéis', e); _track('Painéis', false, e); }

  // CLEANUP
  log('\n🧹 Limpando registros de teste...', '#64748B');
  const now = new Date().toISOString();
  const like = runId+'%';
  try {
    await window.sb.from('materials_catalog').update({ deleted_at: now }).like('code', like);
    await window.sb.from('joints').update({ deleted_at: now }).like('joint_number', like);
    await window.sb.from('supports').update({ deleted_at: now }).like('code', like);
    await window.sb.from('lines').update({ deleted_at: now }).like('tag', like);
    await window.sb.from('structural_em_records').delete().like('code', like);
    await window.sb.from('electrical_cables').delete().like('cable_tag', like);
    await window.sb.from('eletroduct_runs').delete().like('tag', like);
    await window.sb.from('electrical_panels').delete().like('panel_tag', like);
    ok('Cleanup completo');
  } catch(e){ fail('Cleanup', e); }

  // RELATÓRIO FINAL
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#7C3AED');
  log('📊 RELATÓRIO FINAL', '#1E40AF');
  console.table(results.map(r => ({ Categoria: r.name, Status: r.ok ? '✓ OK' : '✗ FAIL', Erro: r.err || '' })));
  const okCount = results.filter(r => r.ok).length;
  const totalCount = results.length;
  log(`${okCount}/${totalCount} categorias funcionando`, okCount === totalCount ? '#059669' : '#DC2626');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#7C3AED');

  return { okCount, totalCount, runId, results };
})();
