describe('3) Hub Planejador → Tubulação', () => {
  beforeEach(() => { cy.loginPIA(); });

  it('Função global openPlannerForCurrentProject existe', () => {
    cy.window().then(win => {
      expect(typeof win.openPlannerForCurrentProject).to.eq('function');
    });
  });

  it('Função global openDisciplineAIModal existe (stub do lazy-load)', () => {
    cy.window().then(win => {
      expect(typeof win.openDisciplineAIModal).to.eq('function');
    });
  });

  it('A11y do painel principal', () => {
    cy.wait(2000);
    cy.injectAxe();
    cy.checkA11yCustom('painel-pos-login');
  });
});
