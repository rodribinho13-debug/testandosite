describe('4) Modal Cadastro via IA', () => {
  beforeEach(() => {
    cy.loginPIA();
    // Pré-aquece o lazy-load do modal IA (1ª chamada baixa o módulo, demoradinho)
    cy.window().then(win => {
      if (typeof win.openDisciplineAIModal === 'function') {
        win.openDisciplineAIModal('tubulacao');
      }
    });
    // Espera o modal aparecer (lazy-load + IIFE async)
    cy.contains(/Cadastro via IA|Fase 1 de 3/i, { timeout: 15000 })
      .filter(':visible')
      .should('exist');
  });

  it('Modal mostra Fase 1 de 3 (upload)', () => {
    cy.contains(/Fase 1 de 3|Upload do documento/i).should('exist');
  });

  it('Modal tem zona de upload e seletor de tipo', () => {
    // Texto "Clique ou arraste" pode demorar pra renderizar — espera explicita
    cy.get('#dai-drop, [class*=drop]', { timeout: 8000 }).should('exist');
    cy.contains(/Clique ou arraste/i, { timeout: 8000 }).should('exist');
    cy.get('#dai-type', { timeout: 5000 }).should('exist');
  });

  it('A11y do modal IA', () => {
    cy.wait(500);
    cy.injectAxe();
    cy.checkA11yCustom('modal-ia-tubulacao');
  });
});
