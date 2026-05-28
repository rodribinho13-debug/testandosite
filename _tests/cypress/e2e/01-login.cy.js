describe('1) Login & autenticação', () => {
  it('Tela de login renderiza sem erros JS', () => {
    cy.visit('/hydrostec_v9.html');
    cy.dismissWarnings();
    cy.collectConsoleErrors();
    cy.get('#si-em', { timeout: 10000 }).should('be.visible');
    cy.get('#si-pw').should('be.visible');
    cy.get('button[type=submit], form button').filter(':visible').should('exist');
  });

  it('Login com credenciais válidas leva ao painel', () => {
    cy.loginPIA();
    cy.url().should('include', 'hydrostec_v9.html');
    // Sidebar ou área principal deve estar visível
    cy.get('aside, nav.sidebar, #sidebar').first().should('be.visible');
  });

  it('A11y na tela de login (axe-core WCAG 2.1 AA)', () => {
    cy.visit('/hydrostec_v9.html');
    cy.dismissWarnings();
    cy.wait(1500);
    cy.injectAxe();
    cy.checkA11yCustom('login');
  });
});
