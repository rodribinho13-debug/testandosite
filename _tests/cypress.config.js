const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:8765',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1366,
    viewportHeight: 768,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    pageLoadTimeout: 60000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      // axe-core terminal logger
      on('task', {
        log(msg) { console.log(msg); return null; },
        table(data) { console.table(data); return null; }
      });
    }
  }
});
