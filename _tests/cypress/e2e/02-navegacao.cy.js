describe('2) Navegação — views principais renderizam', () => {
  beforeEach(() => {
    cy.loginPIA();
    cy.collectConsoleErrors();
  });

  // Usa as rotas internas do goV() — mais robusto que clicar por texto
  const routes = [
    { route: 'panel',     label: 'Painel' },
    { route: 'projects',  label: 'Projetos' },
    { route: 'isos',      label: 'Folhas/Isos' },
    { route: 'map',       label: 'Mapa de Juntas' },
    { route: 'mat',       label: 'Materiais' },
    { route: 'plan',      label: 'Calculadora HH' },
    { route: 'sold',      label: 'Soldadores' },
    { route: 'cal',       label: 'Calibração' }
  ];

  routes.forEach(r => {
    it(`Abre "${r.label}" sem erros JS`, () => {
      cy.goToView(r.route);
      cy.get('body').should('be.visible');
      cy.assertNoConsoleErrors();
    });
  });
});
