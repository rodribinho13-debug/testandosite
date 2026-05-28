import 'cypress-axe';
import './commands';

// Não falhar testes por erros JS conhecidos do app
Cypress.on('uncaught:exception', (err) => {
  // Ignora erros de SyntaxError no contexto do file:// (já corrigido) e outros ruídos
  if (/Invalid or unexpected token|Unsafe attempt to load/.test(err.message)) return false;
  return true;
});

// Padroniza viewport e cookies entre testes
beforeEach(() => {
  Cypress.Cookies.debug(false);
});
