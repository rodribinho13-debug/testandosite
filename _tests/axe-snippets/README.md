# Auditoria de Acessibilidade — Snippets

3 formas de auditar a11y do PROJECT.IA, do mais rápido ao mais completo:

## 1. Cypress (recomendado pra CI)
Veja `../README.md` — roda auditoria em todas as views automaticamente.

## 2. Snippet completo (Console F12)
Abra `audit.js`, copie tudo, cole no Console (F12) do Chrome com o site aberto.
Mostra: console table + grupos clicáveis + overlay flutuante + botão de download JSON.

## 3. Snippet rápido (1 linha)
Abra `audit-quick.js`, copie a linha única, cole no Console.
Mostra só uma tabela simples no console. Bom pra audit ultra-rápido.

## Fluxo sugerido

Pra mapear a a11y de TODO o app:
1. Cole o snippet completo na tela de **login**
2. Faça login
3. Cole de novo no **painel**
4. Abra cada item da sidebar (Folhas, Materiais, Suportes, etc.) e cole o snippet em cada um
5. Abra os principais modais (criar projeto, IA isométrico, editar iso) e cole o snippet com o modal aberto

Cada execução salva um JSON com timestamp se você clicar em "Baixar relatório".
Compare os JSONs pra ver evolução das correções.
