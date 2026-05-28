# PROMPT — IA especializada por aba (PROJECT.IA)

> Cole esse bloco inteiro na próxima conversa pra acionar a refatoração.

---

## Contexto

PROJECT.IA é um SaaS de engenharia industrial multi-disciplinar. Hoje algumas abas já têm IA especializada (ex.: **HUB Planejador → Folha ISO** faz extração detalhada de isométricos com roteamento automático pras tabelas certas, e a **IA Conversacional universal** lê todo o banco). O resto do sistema ainda é manual.

Quero **IA específica por aba**, com prompt e fluxo desenhados pro contexto daquela tela — não a IA genérica.

## O que precisa ser feito

### Fase A — Levantamento (sem código)

Mapeie todas as views do v9 (sidebar inteira: Geral, Engenharia, Planejamento, Qualidade, Suprimentos, Sistema) e separe em 3 listas:

1. **Já tem IA especializada funcionando** (ex.: Folha ISO, IA conversacional, IA Cadastro Total, IA por foto no RDO atual)
2. **Tem IA mas tá genérica/fraca** (precisa especializar o prompt)
3. **Não tem IA e faz sentido ter** (priorize por impacto comercial)

Entregue como tabela: `View | Estado atual | Tipo de IA proposta | Input esperado | Output esperado | Tabelas afetadas`.

### Fase B — IA do Orçamento (prioridade 1)

A IA do Orçamento recebe **desenho técnico (PDF/imagem) + memorial descritivo (PDF/DOCX/texto) + RT/especificações técnicas** e devolve um **detalhamento completo pro orçamentista**:

- Lista hierárquica de capítulos → grupos → subgrupos → linhas (compatível com a árvore WBS do `budget_items`)
- Pra cada linha: descrição, unidade, quantidade estimada (com método de cálculo explícito), composição sugerida (cruzando com `compositions` do banco), material de referência (cruzando com `materials_catalog`)
- Coeficiente de produtividade sugerido (cruzando com `hh_coefficients` por disciplina)
- Achados adicionais que o orçamentista pode ter esquecido (ex.: "memorial menciona pintura epóxi mas não vi capítulo de pintura no orçamento")
- Fonte de cada inferência (página do PDF, linha do memorial)

Fluxo: **extrair → revisar (células editáveis, igual a IA Cadastro Total) → confirmar → cadastrar em batch**. Reaproveitar o padrão já consolidado.

### Fase C — IA do RDO via foto manuscrita (prioridade 1)

Já existe o `daily-report-vision` mas é raso. Profissionalize:

- Aceitar foto do RDO de papel preenchido à mão pelo encarregado (forma comum em obra)
- OCR + interpretação contextual: data, frente de serviço, efetivo (nomes/funções/horas), atividades realizadas, % avanço por linha, ocorrências, condições climáticas, EPIs/anomalias
- **Tela de revisão obrigatória** antes de gravar (encarregado escreve feio, IA erra — orçamentista/engenheiro precisa validar)
- Auto-vincular ao `daily_reports` + criar registros em `daily_report_team`, `daily_report_activities`
- Se reconhecer pacotes que batem com PCP, marcar como "pacote XYZ avançado X%" e atualizar `pcp_packages` automaticamente
- Botão "ver foto original" sempre disponível no RDO gravado

### Fase D — IA por aba para os módulos restantes

Implemente IA especializada pra cada um destes, com prompt customizado:

| Aba | IA proposta |
|---|---|
| **Compras (RFQ/PO/AR)** | Receber email/PDF de cotação do fornecedor → extrair itens/preços/prazos → alimentar mapa comparativo automaticamente. Bonus: detectar inconsistências (item da RFQ não cotado, condição comercial diferente) |
| **Fornecedores** | Analisar histórico de KPIs (entregas no prazo, conformidade NF) e gerar parecer de homologação automatizado. Predizer risco de atraso em PO ativa baseado em padrão histórico |
| **Catálogo de materiais** | Já tem extração via PDF. Adicionar: sugestão de classe ABC automática baseada em valor × frequência de uso real (não só simulação) + sugestão de fornecedor preferido baseada em histórico |
| **Composições** | "Gerar composição via descrição em linguagem natural" — ex.: "soldagem topo a topo aço carbono Sch 40 com PQR ASME IX" → IA monta composição com insumos (mão de obra/material/equipamento) cruzando com catálogo |
| **PCP** | "Gerar pacotes semanais" a partir do cronograma físico + efetivo disponível + materiais já recebidos. IA sugere alocação otimizada |
| **Qualidade — Mapa de juntas** | Detectar juntas críticas (alta pressão, material nobre, NDT obrigatório) a partir do isométrico e marcar com flag automática |
| **Qualidade — Relatórios END** | Receber laudo PDF (LP/PM/RX/UT) → extrair achados, classificar conformidade, vincular à junta no mapa |
| **Equipamentos NR-13** | Ler PMTA/folha de dados PDF → extrair pressão de teste, fluido, área, MAWP e gerar memorial NR-13 com checklist de inspeção |
| **Manutenção (OS)** | A partir da descrição livre do problema, sugerir disciplina, severidade, técnico recomendado e ETA baseado em OS similares fechadas |

### Fase E — Validação e integração

- Cada IA é **lazy-loaded** (segue padrão `module-loader.js`)
- Cada IA é **multi-tenant via RLS** (`org_id` em todos os INSERTs, isolamento sem brecha)
- Cada IA tem **revisão obrigatória** antes de gravar (sem auto-commit silencioso)
- Cada IA emite evento `pia.ai_used` no `audit_log` (input hash, modelo usado, output count, tabelas afetadas)
- Cypress E2E pra cada nova IA (subir mock PDF/imagem → confirmar fluxo)
- Atualizar `usage_quota` (gastos de IA por org pro modelo freemium)

## Princípios não-negociáveis (NÃO MUDA)

1. **PRESERVAR 100% das funcionalidades atuais** — não quebrar nenhuma view, nenhum onclick, nenhum módulo existente
2. **Multi-tenant via RLS** — cada usuário só vê dados da própria org, **sem brecha**. Toda nova tabela precisa de policy. Toda view nova é SECURITY INVOKER
3. **Tokens v9** — `var(--t0/t1/t3/t6/t9)`, sem hardcoded violetas/azuis vibrantes. Botões primários só pros CTAs absolutamente principais (`btn bp`), resto `btn bg`. Padrão Sienge/Procore: sóbrio
4. **Sem emojis decorativos** no HTML — SVG inline com `currentColor`
5. **Adapter multi-IA** — usar o adapter existente (Gemini Pro 2.0 multimodal + fallback). NÃO hardcode endpoint
6. **Schema discovery dinâmico** — ler `information_schema` antes de INSERT pra descartar colunas inexistentes (lição da IA Cadastro Total)
7. **Anti-truncamento** — arquivos grandes via Python heredoc atomic write, nunca um Edit gigante
8. **Cypress + a11y** verde antes de fechar fase
9. **SW bump** a cada deploy
10. **Backup automático** antes de tocar em qualquer arquivo > 200 linhas

## Modo de execução

- **Fase por fase**, em sequência (A → B → C → D → E)
- **Só interrompa se ocorrer erro real** (não pause pedindo confirmação a cada step)
- Reporte progresso a cada fase concluída com: arquivos tocados + linhas + validação executada
- Se um item dentro da Fase D falhar, pule pra próximo item da fase, anote como pendente, e continue
- **Não** crie tabelas/edge functions sem antes verificar se já existem (reaproveitar `chat-projeto`, `discipline-ai-modal`, `ai-router`, etc.)

## Critério de aceite

- Todas as IAs propostas funcionando em modo extração → revisão → confirmação
- 0 regressões nas views existentes
- Cypress verde
- Multi-tenant validado (criar 2 orgs de teste, confirmar isolamento total)
- SW bumpado
- Documentação curta no `_docs/` listando: qual IA, qual prompt, qual input, qual output, qual tabela
