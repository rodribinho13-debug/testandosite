# Modelos de teste — PROJECT.IA

Esta pasta contém **planilhas e documentos de exemplo** para testar todas as IAs do sistema. Cada arquivo simula um documento real que um cliente típico subiria.

## Como testar

### 1. Modelos para **IA Importar** (botão IA na toolbar das views)
Abre a view correspondente no v9 → clica no botão **🤖 IA** → seleciona o arquivo → revisa → confirma.

| Arquivo | View destino | Botão IA |
|---|---|---|
| `rdo_modelo.csv` | RDO | RDO → IA |
| `materiais_modelo.csv` | Materiais | Materiais → IA |
| `soldadores_modelo.csv` | Soldadores | Soldadores → IA |
| `inspecao_pintura_modelo.csv` | Inspeções Pintura | Pintura → IA |
| `calibracoes_modelo.csv` | Calibrações | Calibração → IA |
| `pendencias_modelo.csv` | Pendências | Pendências → IA |
| `andaimes_modelo.csv` | Andaimes | Andaime → IA |

### 2. Modelos para **IA Disciplina** (botão "Subir PDF pra IA" / "Cadastrar via IA")
Abre a view → clica **"Subir PDF pra IA"** ou **"Cadastrar via IA"** → escolhe o tipo → faz upload → revisa → confirma.

| Arquivo | Disciplina | Tipo de documento |
|---|---|---|
| `juntas_modelo.csv` | Tubulação | Lista de juntas |
| `materiais_isometrico_modelo.csv` | Tubulação | Lista de materiais |
| `concretagens_modelo.csv` | Civil | Ficha de concretagem |
| `cabos_modelo.csv` | Elétrica | Lista de cabos |
| `eletrodutos_modelo.csv` | Elétrica | Lista de eletrodutos |
| `paineis_modelo.csv` | Elétrica | Lista de painéis |
| `estruturas_em_modelo.csv` | Caldeiraria | Lista de estruturas |
| `perfis_modelo.csv` | Caldeiraria | Tabela de perfis |
| `inspecao_dft_modelo.csv` | Pintura | Inspeção DFT |

### 3. Modelo para **IA Isométrico** (Folhas/Isos)
- `isometrico_modelo.html` — abre no navegador → Imprimir → Salvar como PDF → joga na IA Isométrico em Folhas/Isos.

### 4. Modelo para **IA RDO por foto manuscrita**
- `rdo_manuscrito_modelo.png` *(não incluído por padrão — você pode tirar foto de qualquer RDO real preenchido à mão e usar como modelo)*

## Dados realistas

Os modelos têm:
- **5 a 10 linhas** de exemplo (não tantas que demore na análise)
- **Dados coerentes** (TAGs, códigos, materiais reais de construção)
- **Mix de campos preenchidos e vazios** para testar tolerância
- **Edge cases**: caracteres especiais, números decimais, datas BR/ISO

## Notas

- Os modelos CSV são **UTF-8 com vírgula** como separador padrão (pt-BR usa `;` mas a IA aceita ambos).
- Você pode editar livremente — eles são pra **teste**, não dados reais.
- Após cadastrar via IA, **os dados vão para o seu projeto ativo** e podem ser apagados normalmente pela própria view.
