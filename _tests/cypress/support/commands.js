// PROJECT.IA — Custom Commands

/**
 * Remove banners que aparecem em file:// (#file-warning) e outros warnings
 * que poluem cy.contains. Sempre chamada após o cy.visit().
 */
Cypress.Commands.add('dismissWarnings', () => {
  cy.window({ log: false }).then(win => {
    const fw = win.document.getElementById('file-warning');
    if (fw) fw.remove();
    // Remove outros banners conhecidos que podem atrapalhar
    win.document.querySelectorAll('[data-warning], .file-warning, .banner-warning').forEach(el => el.remove());
  });
});

/**
 * Login completo com retry e tratamento robusto.
 * Uso: cy.loginPIA()
 */
Cypress.Commands.add('loginPIA', () => {
  const email = Cypress.env('email') || 'rodrigojsbrandao@gmail.com';
  const pass = Cypress.env('password') || 'Project2026';

  cy.visit('/hydrostec_v9.html');
  cy.dismissWarnings();

  // Aguarda input de email aparecer (IDs reais: si-em, si-pw)
  cy.get('#si-em, input[type=email]:visible', { timeout: 15000 }).first()
    .should('be.visible')
    .clear({ force: true })
    .type(email, { delay: 30, force: true });

  cy.get('#si-pw, input[type=password]:visible').first()
    .clear({ force: true })
    .type(pass, { delay: 30, force: true });

  // Botão de submit — procura por texto OU type=submit
  cy.get('button[type=submit]:visible, button:visible')
    .contains(/entrar|login/i)
    .first()
    .click({ force: true });

  // Espera a sidebar ou menu principal aparecer (indicador real de login OK)
  cy.get('aside, nav.sidebar, #sidebar, [class*=sidebar]', { timeout: 25000 })
    .first()
    .should('be.visible');
});

/**
 * Navega direto pra uma view via função global goV (mais robusto que clicar)
 */
Cypress.Commands.add('goToView', (route) => {
  cy.window().then(win => {
    if (typeof win.goV === 'function') win.goV(route);
  });
  cy.wait(1500); // espera render + lazy-load
});

/**
 * Audit a11y axe-core
 */
Cypress.Commands.add('checkA11yCustom', (label = 'page') => {
  cy.window().then(async (win) => {
    if (!win.axe) return;
    const results = await win.axe.run(win.document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
    const violations = results.violations || [];
    if (violations.length) {
      cy.task('log', `\n[A11Y][${label}] ${violations.length} violação(ões)`);
      cy.task('table', violations.map(v => ({
        rule: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        description: (v.help || '').slice(0, 80)
      })));
      cy.writeFile(`cypress/fixtures/a11y-${label}.json`, violations, { log: false });
    } else {
      cy.task('log', `[A11Y][${label}] ✓ Sem violações`);
    }
  });
});

// Coleta de console errors
let consoleErrors = [];
Cypress.Commands.add('collectConsoleErrors', () => {
  consoleErrors = [];
  cy.window().then(win => {
    const origErr = win.console.error;
    win.console.error = (...args) => {
      consoleErrors.push(args.map(a => String(a)).join(' '));
      origErr.apply(win.console, args);
    };
    win.addEventListener('error', e => consoleErrors.push('Error: ' + (e.message || e.error)));
    win.addEventListener('unhandledrejection', e => consoleErrors.push('Promise rejection: ' + e.reason));
  });
});

Cypress.Commands.add('assertNoConsoleErrors', () => {
  const ignore = [
    /get_panel_counters/, /daily_reports/, /Unsafe attempt to load/,
    /chrome-extension/, /favicon/, /404.*manifest/,
    /pending_status = text/, /operator does not exist/
  ];
  const real = consoleErrors.filter(e => !ignore.some(re => re.test(e)));
  if (real.length) {
    cy.task('log', `[CONSOLE] ${real.length} erro(s):\n  ` + real.slice(0, 5).join('\n  '));
  }
  expect(real, 'console errors').to.have.length(0);
});
