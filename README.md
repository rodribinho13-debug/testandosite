# PROJECT.IA

**SaaS comercial de engenharia multi-disciplina** — Tubulação, Civil, Elétrica, Pintura, Caldeiraria e Hidráulica em um só lugar, com IA por disciplina, importação Excel universal e isolamento multi-tenant.

---

## O que o sistema faz

- **HUB Planejador** com views por disciplina: Folhas/Isos, Mapa de Juntas, Materiais, Concretagens, Estruturas, SPDA, Cabos, Quadros Elétricos, Pintura DFT, Andaimes, Hidráulica.
- **IAs por disciplina** (Gemini Vision): sobe um PDF de isométrico, ficha de concretagem, diagrama unifilar, mapa de juntas — a IA extrai os dados estruturados e cadastra em N tabelas certas, com revisão humana antes do INSERT.
- **Orçamento + Curva S** com importação BOM, integração com WBS hierárquica, comparativo planejado × realizado.
- **RDO Diário** com upload de foto manuscrita (IA OCR), pacotes do dia, efetivo, equipamentos.
- **PCP** com geração de pacotes semanais via IA.
- **Compras + Fornecedores + Catálogo Materiais + Composições** (kit Suprimentos).
- **Qualidade**: Mapa de Juntas, Soldadores, Calibração de Instrumentos, Pendências/NCs, Laudos END.
- **Multi-tenant** rigoroso via Supabase RLS (cada org só vê seus dados).
- **IA Conversacional** com Google Search grounding + upload multimodal — pergunte sobre seu próprio projeto.

## Stack

- **Frontend**: HTML/JS vanilla + design system próprio (tokens CSS variables).
- **Backend**: Supabase (Postgres + RLS + Edge Functions Deno).
- **IA**: Gemini (Vision + text) com extração estruturada em JSON.
- **PWA**: Service Worker com stale-while-revalidate.
- **Hospedagem**: Vercel (frontend) + Supabase (backend).

## Estrutura

```
.
├── hydrostec_v9.html       # app principal (entry point)
├── index.html              # landing comercial
├── privacy.html            # política de privacidade (LGPD)
├── assets/
│   ├── css/                # tokens + estilos
│   └── js/                 # módulos lazy-loaded (orcamento, rdo, pcp, etc.)
├── custom_views.js         # customização de campos por org
├── manifest.json           # PWA manifest
├── sw.js                   # service worker
├── supabase/               # edge functions + config
├── migrations/             # SQL migrations versionadas
└── _docs/                  # documentação interna (prompts, auditorias)
```

## Deploy

1. **Hospedar no Vercel**:
   - https://vercel.com/new → Import Git Repository
   - Framework: Other / Build: (vazio) / Output: (vazio)
   - O `.vercelignore` já protege `_docs/`, `_backups_*/`, `_archive_legacy/`, `MINHAS_CREDENCIAIS.txt`, etc.

2. **Supabase** (já configurado):
   - URL e anon key embutidos no JS (públicos por design, RLS protege os dados).
   - Edge functions deployadas: `ia-iso`, `ia-rdo`, `chat-projeto`, `ai-router`, etc.

## Auditoria de produção

Antes do lançamento comercial, rode a auditoria completa:
- `_docs/PROMPT_AUDITORIA_TOTAL_PRODUCAO.md` — checklist de 9 fases (smoke test, performance, cadastro real, IAs com PDFs sintéticos, multi-tenant, segurança, padronização de botões).
- `_docs/_test_assets/` — 20 XLSX + 9 PDFs sintéticos pra testar as IAs.

## Versão

`projectia-v9.2.6` — ver `sw.js`

## Autor

Rodrigo Brandão · [@rodribinho13-debug](https://github.com/rodribinho13-debug) · rodribinho13@gmail.com

## Licença

Proprietary. Todos os direitos reservados.
