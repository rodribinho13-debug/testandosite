/**
 * Valida que TODAS as categorias secundárias do cadastro IA funcionam,
 * mesmo que o isométrico atual não tenha esses elementos.
 *
 * Insere dados sintéticos via supabase client (window.sb) e limpa no after().
 */
describe('6) Categorias secundárias — cadastro funciona pra todas', () => {
  let testRunId;
  let orgId, projectId;

  before(() => {
    cy.loginPIA();
    // Pega o primeiro projeto disponível da lista global do v9
    cy.window().then(win => {
      testRunId = 'TEST-' + Date.now();
      expect(win._org, 'window._org').to.exist;
      orgId = win._org.id;

      // Tenta nas várias fontes possíveis (mais robusto)
      projectId = (win._curProject && win._curProject.id) ||
                  win.curProj ||
                  (Array.isArray(win.projects) && win.projects[0] && win.projects[0].id);
      // Se ainda não achou, busca direto do Supabase
      if (!projectId) {
        cy.task('log', '[setup] _curProject vazio, buscando projeto via SQL...');
      }
    }).then(() => {
      if (!projectId) {
        cy.window().then(async (win) => {
          const r = await win.sb.from('projects').select('id, name')
            .eq('org_id', orgId).is('deleted_at', null).limit(1).single();
          if (r.error) throw new Error('Nenhum projeto disponível: ' + r.error.message);
          projectId = r.data.id;
          // Seta como ativo no v9
          win._curProject = { id: r.data.id, name: r.data.name };
          win.curProj = r.data.id;
          cy.task('log', `[setup] projeto carregado do banco: ${r.data.name} (${projectId})`);
        });
      }
    }).then(() => {
      cy.task('log', `[setup] org=${orgId} proj=${projectId} runId=${testRunId}`);
      expect(projectId, 'projeto ativo').to.be.a('string');
    });
  });

  it('Materiais — cria material no catálogo + linka ao projeto', () => {
    cy.window().then(async (win) => {
      const code = `${testRunId}-MAT-001`;
      const cat = await win.sb.from('materials_catalog').insert({
        org_id: orgId, code, description: 'Tubo TEST 10in STD A106 Gr.B',
        category: 'tubo', material_type: 'aco carbono A106 Gr.B',
        diameter_in: 10, schedule: 'STD', unit: 'm'
      }).select('id').single();
      if (cat.error) cy.task('log', `material_catalog fail: ${cat.error.message}`);
      expect(cat.error, 'materials_catalog insert').to.be.null;

      const pm = await win.sb.from('project_materials').insert({
        org_id: orgId, project_id: projectId, material_id: cat.data.id, qty_planned: 25
      }).select('id').single();
      if (pm.error) cy.task('log', `project_materials fail: ${pm.error.message}`);
      expect(pm.error, 'project_materials insert').to.be.null;
    });
  });

  it('Juntas — cria linha + 3 juntas com tipos diferentes', () => {
    cy.window().then(async (win) => {
      const lineTag = `${testRunId}-LINE-A1`;
      let lineId;
      const existing = await win.sb.from('lines').select('id').eq('org_id', orgId).eq('project_id', projectId).eq('tag', lineTag).limit(1);
      if (existing.data && existing.data[0]) lineId = existing.data[0].id;
      else {
        const ins = await win.sb.from('lines').insert({ org_id: orgId, project_id: projectId, tag: lineTag }).select('id').single();
        if (ins.error) cy.task('log', `lines fail: ${ins.error.message}`);
        expect(ins.error, 'lines insert').to.be.null;
        lineId = ins.data.id;
      }
      for (const jt of ['topo', 'encaixe', 'flangeada']) {
        const r = await win.sb.from('joints').insert({
          org_id: orgId, project_id: projectId, line_id: lineId,
          joint_number: `${testRunId}-J-${jt}`, joint_type: jt, diameter_in: 6
        }).select('id').single();
        if (r.error) cy.task('log', `joint fail (${jt}): ${r.error.message}`);
        expect(r.error, `joints insert ${jt}`).to.be.null;
      }
    });
  });

  it('Suportes — cria 3 suportes com diferentes tipos', () => {
    cy.window().then(async (win) => {
      for (const st of ['fixo', 'mola', 'deslizante']) {
        const r = await win.sb.from('supports').insert({
          org_id: orgId, project_id: projectId,
          code: `${testRunId}-SUP-${st}`, support_type: st, weight_kg: 20
        }).select('id').single();
        if (r.error) cy.task('log', `support fail (${st}): ${r.error.message}`);
        expect(r.error, `supports ${st}`).to.be.null;
      }
    });
  });

  it('Estruturas metálicas — cria 2 estruturas', () => {
    cy.window().then(async (win) => {
      for (const e of [
        { code: `${testRunId}-EM001`, perfil: 'W150x18', description: 'Coluna', quantity: 5, weight_kg: 90 },
        { code: `${testRunId}-EM002`, perfil: 'L50x50x6', description: 'Cantoneira', quantity: 12, weight_kg: 24 }
      ]) {
        const r = await win.sb.from('structural_em_records').insert({
          org_id: orgId, project_id: projectId, ...e
        }).select('id').single();
        if (r.error) cy.task('log', `EM fail (${e.code}): ${r.error.message} | ${r.error.details}`);
        expect(r.error, `EM ${e.code}`).to.be.null;
      }
    });
  });

  it('Cabos elétricos — cria 2 cabos', () => {
    cy.window().then(async (win) => {
      for (const c of [
        { cable_tag: `${testRunId}-CB001`, voltage_v: 380, cross_section_mm2: 16, length_m: 50 },
        { cable_tag: `${testRunId}-CB002`, voltage_v: 220, cross_section_mm2: 4, length_m: 25 }
      ]) {
        const r = await win.sb.from('electrical_cables').insert({
          org_id: orgId, project_id: projectId, ...c
        }).select('id').single();
        if (r.error) cy.task('log', `cable fail (${c.cable_tag}): ${r.error.message} | ${r.error.details}`);
        expect(r.error, `cable ${c.cable_tag}`).to.be.null;
      }
    });
  });

  it('Eletrodutos — cria 2 trechos', () => {
    cy.window().then(async (win) => {
      for (const c of [
        { tag: `${testRunId}-EL001`, diameter_mm: 25, length_m: 30 },
        { tag: `${testRunId}-EL002`, diameter_mm: 50, length_m: 15 }
      ]) {
        const r = await win.sb.from('eletroduct_runs').insert({
          org_id: orgId, project_id: projectId, ...c
        }).select('id').single();
        if (r.error) cy.task('log', `eletroduto fail (${c.tag}): ${r.error.message} | ${r.error.details}`);
        expect(r.error, `eletroduto ${c.tag}`).to.be.null;
      }
    });
  });

  it('Painéis elétricos — cria 1 painel', () => {
    cy.window().then(async (win) => {
      const r = await win.sb.from('electrical_panels').insert({
        org_id: orgId, project_id: projectId,
        panel_tag: `${testRunId}-PNL001`, panel_type: 'CCM', protection_class: 'IP55'
      }).select('id').single();
      if (r.error) cy.task('log', `panel fail: ${r.error.message} | ${r.error.details}`);
      expect(r.error, 'panel insert').to.be.null;
    });
  });

  // CLEANUP — usa Promise.allSettled pra não travar se uma tabela falhar
  after(() => {
    if (!testRunId) return;
    cy.window({ timeout: 30000 }).then(async (win) => {
      const like = `${testRunId}%`;
      const now = new Date().toISOString();
      const ops = [
        win.sb.from('materials_catalog').update({ deleted_at: now }).like('code', like),
        win.sb.from('joints').update({ deleted_at: now }).like('joint_number', like),
        win.sb.from('supports').update({ deleted_at: now }).like('code', like),
        win.sb.from('lines').update({ deleted_at: now }).like('tag', like),
        win.sb.from('structural_em_records').delete().like('code', like),
        win.sb.from('electrical_cables').delete().like('cable_tag', like),
        win.sb.from('eletroduct_runs').delete().like('tag', like),
        win.sb.from('electrical_panels').delete().like('panel_tag', like)
      ];
      const results = await Promise.allSettled(ops);
      const failed = results.filter(r => r.status === 'rejected').length;
      cy.task('log', `[cleanup] ${results.length - failed}/${results.length} limpezas OK (runId=${testRunId})`);
    });
  });
});
