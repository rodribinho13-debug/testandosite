describe('5) Acessibilidade WCAG 2.1 AA — todas as views', () => {
  beforeEach(() => { cy.loginPIA(); });

  const pages = [
    { route: 'panel',    label: 'painel' },
    { route: 'projects', label: 'projetos' },
    { route: 'isos',     label: 'folhas-isos' },
    { route: 'map',      label: 'mapa-juntas' },
    { route: 'mat',      label: 'materiais' },
    { route: 'plan',     label: 'calculadora-hh' }
  ];

  pages.forEach(p => {
    it(`A11y: ${p.label}`, () => {
      cy.goToView(p.route);
      cy.wait(1200);
      cy.injectAxe();
      cy.checkA11yCustom(`view-${p.label}`);
    });
  });
});
