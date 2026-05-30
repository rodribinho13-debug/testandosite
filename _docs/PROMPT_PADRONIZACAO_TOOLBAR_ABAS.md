# PROMPT — Padronização da barra de ações (toolbar) por aba

**Arquivo alvo:** `hydrostec_v9.html` → função `rHdr()` (≈ linha 1976), objeto `cfg` (chaveado por `curView`), renderizado em `#hdr-acts`.
**Objetivo:** reduzir o excesso de botões nas abas e deixar TODAS com o mesmo conjunto enxuto e consistente.

---

## Padrão oficial (template)

Toda aba de listagem/cadastro deve expor, nesta ordem, SOMENTE:

1. **Cadastrar via IA** — `class="btn bia"`, ícone `sparkles`. Único ponto de entrada de IA.
2. **Excel ▾** — `class="btn bg"`, menu dropdown com **Importar Excel** + **Exportar Excel** (padrão `pia-excel-wrap` já usado em `isos`, `mat`, `paint`, etc.).
3. **+ Novo** — `class="btn bp"`, ícone `plus` (ou o "novo" específico da aba, ex.: "Novo Equipamento").
4. **Personalizar** — `class="btn bo"`, ícone `settings` → `openFieldsCustomization('<view>')`.

Use as views `paint`, `mat` ou `quality_reports` no `cfg` como **referência de marcação exata** (HTML do dropdown, ids `tb-excel-btn-<view>` / `tb-excel-menu-<view>`, wiring `openImportExcel('<view>')` e `exportViewToExcel('<view>')`).

---

## O que está errado hoje (abas a corrigir)

Três views fogem do padrão — usam **"Importar Excel" solto** (`btn bg`) + um **"IA" solto** (`openAIImport`) em vez do dropdown Excel unificado e do botão único "Cadastrar via IA":

| View | Chave `cfg` | Botões atuais | Ação |
|---|---|---|---|
| Manutenção | `maint` | Corretiva · Nova OS · **Importar Excel** · **IA** · Personalizar | padronizar |
| Equipamentos NR-13 | `equip` | Cadastrar via IA · Novo Equipamento · **Importar Excel** · **IA** · Personalizar | padronizar |
| Parâmetros HH | `prod` | Restaurar padrões · Novo parâmetro · **Importar Excel** · **IA** · Personalizar | padronizar |

---

## Regras de transformação

1. **Remover o "Importar Excel" solto** (`btn bg` com `openImportExcel(...)`) e substituí-lo pelo **dropdown "Excel ▾"** padrão (Importar + Exportar), com os ids/handlers da view correspondente.
2. **Remover o botão "IA" solto** (`openAIImport('<view>')`) quando já existir/passar a existir o **"Cadastrar via IA"**. Não pode haver dois botões de IA na mesma barra.
   - `equip` já tem "Cadastrar via IA" (`openEquipAIModal()`) → apenas remover o "IA" redundante.
   - `maint` e `prod` não têm "Cadastrar via IA" hoje → trocar o "IA" solto por um único botão **"Cadastrar via IA"** (manter o handler de IA que já funciona para a aba; se hoje é `openAIImport('<view>')`, manter esse handler sob o rótulo "Cadastrar via IA", ícone `sparkles`).
3. **Preservar as ações de criação próprias do domínio** (não são "excesso", são necessárias):
   - `maint`: manter **Corretiva** (`oMaintOS(null,'corretiva_emergencial')`) e **Nova OS** (`oMaintOS(null,'preventiva')`) — são tipos de OS distintos.
   - `equip`: manter **Novo Equipamento** (`oEquip(null)`).
   - `prod`: manter **Novo parâmetro** (`oProd(null)`) e **Restaurar padrões** (`seedDefaultParams()`).
4. **Manter "Personalizar"** (`openFieldsCustomization('<view>')`) ao final.
5. **Ordem final** em cada aba: `Cadastrar via IA` → ações de criação do domínio → `Excel ▾` → `Personalizar`.
6. **Não tocar** nas views que já estão corretas (`isos`, `mat`, `sold`, `com`, `pend`, `rdo`, `quality_joints`, `quality_reports`, `paint`, `scaf`, `cal`) nem na `gantt` (toolbar P6/MS Project é específica e deve permanecer).

---

## Verificações antes de concluir

- Confirmar que `exportViewToExcel('maint')`, `exportViewToExcel('equip')` e `exportViewToExcel('prod')` existem/funcionam; se alguma view não suportar exportação, deixar o dropdown só com "Importar Excel" (não criar botão de exportação quebrado).
- Confirmar que `openImportExcel('<view>')` continua válido para as 3 views.
- Garantir ids únicos do dropdown por view: `tb-excel-btn-maint`/`tb-excel-menu-maint`, idem `equip` e `prod`.
- Rodar `_renderIcons()` continua sendo chamado ao final de `rHdr()` (já é) para os ícones `data-lucide`.

## Critérios de aceite

- Nenhuma aba exibe simultaneamente "Importar Excel" solto **e** dropdown "Excel ▾".
- Nenhuma aba exibe dois botões de IA.
- `maint`, `equip` e `prod` ficam visualmente idênticas ao padrão de `paint`/`mat` (mesmas classes, mesmo dropdown), preservando só os botões de criação próprios.
- Sem erros no console ao alternar entre as abas; importar/exportar Excel e "Cadastrar via IA" funcionam em cada uma.

## Cuidados de implementação

- O `cfg` em `rHdr()` é um objeto de **template strings** longas numa única linha por view. Editar com cuidado para não quebrar aspas/crase.
- **Atenção a truncamento:** após editar `hydrostec_v9.html`, validar que o arquivo continua íntegro (termina em `</html>` e o total de linhas não caiu). Conferir com `grep -c "</html>" hydrostec_v9.html`.
- Subir o cache buster do Service Worker (`sw.js`, constante `V`) após a alteração para forçar atualização em produção.
