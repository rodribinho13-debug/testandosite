# PROJECT.IA — Suite de testes E2E + Acessibilidade

Cypress 14 + cypress-axe + axe-core 4.10 rodando contra o app local servido por http-server.

## ⚡ Setup rápido (Windows)

**Opção 1 — Script automático (recomendado):**

Dê duplo-clique em `RESET-E-INSTALAR.bat`. Ele:
- Fecha processos travados
- Limpa node_modules e cache
- Reinstala tudo do zero
- Verifica que Cypress está OK

**Opção 2 — Manual via PowerShell:**

```powershell
cd "C:\Users\Usuario\Downloads\SITE INTRANET\_tests"
npm install
```

## 🚀 Rodar testes

```powershell
npm test            # headless (CI mode)
npm run test:open   # interativo (Cypress GUI)
```

## ⚠️ Troubleshooting

### `EPERM: operation not permitted, rmdir`
Algum processo está com node_modules travado. Solução: **rode o `RESET-E-INSTALAR.bat`** que mata processos antes de limpar.

Causas comuns:
- **OneDrive sincronizando a pasta** — mova `_tests` pra fora do OneDrive (ex: `C:\dev\projectia-tests`)
- **Antivírus bloqueando** — adicione exceção pra pasta `_tests`
- **VS Code com terminal aberto na pasta** — feche

### `Cannot find module 'bluebird'`
Postinstall do Cypress falhou. Solução: rode `RESET-E-INSTALAR.bat`.

### `start-server-and-test não é reconhecido`
Significa que `npm install` falhou no meio. As deps não foram instaladas. Rode `RESET-E-INSTALAR.bat`.

### Node 24 incompatível
Cypress 14 oficialmente suporta Node 18-22. Se Node 24 der problema:
1. Instale [nvm-windows](https://github.com/coreybutler/nvm-windows)
2. `nvm install 20.18.0`
3. `nvm use 20.18.0`
4. Rode `RESET-E-INSTALAR.bat` novamente

### Cypress GUI não abre
Se `npm run test:open` falhar com erro de Electron:
```powershell
npx cypress verify
npx cypress install --force
```

## 📁 Specs disponíveis

| Spec | Cobre |
|------|-------|
| `01-login.cy.js` | Tela de login + autenticação + a11y |
| `02-navegacao.cy.js` | Cada item da sidebar abre sem erros JS |
| `03-hub-tubulacao.cy.js` | Hub Planejador → Tubulação → Folhas/Isos |
| `04-modal-cadastro-ia.cy.js` | Modal "Cadastro via IA" renderiza com todos os campos |
| `05-a11y-geral.cy.js` | Auditoria WCAG 2.1 AA em 6 views principais |

## 🛠 Helpers globais disponíveis nos specs

- `cy.loginPIA()` — login completo com `rodrigojsbrandao@gmail.com` / `Project2026`
- `cy.openView(label)` — clica item da sidebar
- `cy.checkA11yCustom(label)` — audit axe-core, salva JSON em `cypress/fixtures/a11y-<label>.json`
- `cy.collectConsoleErrors()` + `cy.assertNoConsoleErrors()` — JS errors detector

## 🔧 Alternativa zero-instalação: snippets axe-core

Em `axe-snippets/audit.js` há um script que você cola no Console (F12) e roda audit imediato. Veja `axe-snippets/README.md`.

## 🌐 CI/CD futuro (GitHub Actions)

```yaml
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd _tests && npm ci
      - run: cd _tests && npm test
```
