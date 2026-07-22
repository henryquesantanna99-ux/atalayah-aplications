# Arquitetura da Inteligência Espiritual

## Objetivo

O módulo transforma indicações musicais em evidências coletivas para apoiar o discernimento da liderança. Ele não avalia indivíduos, não produz diagnóstico espiritual e não substitui decisões pastorais.

Cada indicação é uma expressão espiritual composta por três fontes:

1. a música indicada;
2. a letra, usada como linguagem temática;
3. as respostas do membro, usadas para contextualizar necessidades, emoções, convicções e próximos passos.

## Limites entre domínios

### Curadoria Musical

Responde se uma música é adequada ao repertório. Considera conteúdo, cantabilidade, viabilidade técnica, momento do culto e validação da liderança. Suas ações permanecem nos menus **Indicações**, **Votação** e **Repertórios**.

### Inteligência Espiritual

Responde quais padrões coletivos estão presentes nas expressões recebidas em uma data. Trabalha no menu **Inteligência**, mantém execuções e resumos próprios e nunca transforma popularidade em decisão automática de repertório.

Os domínios podem consumir a mesma indicação, mas não compartilham conclusões.

## Pipeline

1. **Coleta:** registra música, identificação contextual opcional e respostas do membro.
2. **Enriquecimento:** reutiliza LRCLIB e Soundcharts para obter letra e metadados ausentes. O enriquecimento ocorre internamente na execução diária.
3. **Classificação:** estrutura temas, necessidades, emoções, próximos passos e convicções. A letra contribui para temas; necessidades e emoções exigem contexto fornecido pelo membro.
4. **Quantificação:** conta recorrências sem interpretação pastoral.
5. **Segmentação:** distribui recorrências pelos grupos disponíveis, atualmente tribo, faixa etária e ministério.
6. **Associações:** aponta elementos que apareceram juntos, sem afirmar causalidade.
7. **Evolução:** compara percentuais com coletas anteriores e identifica crescimento, redução e surgimento de padrões.
8. **Discernimento:** apresenta evidências organizadas para leitura da liderança.
9. **Resposta ministerial:** oferece recomendações e rascunhos; qualquer decisão continua manual.

## Componentes existentes reaproveitados

- `app/louvor/actions.ts`: persistência e enriquecimento inicial de indicações.
- `lib/music/lrclib.ts` e `lib/music/soundcharts.ts`: integrações de letra e metadados.
- `lib/spiritual-intelligence/daily-analysis.ts`: classificação fallback, agregação, segmentação, associações e evolução.
- `app/(app)/louvor-admin/spiritual-intelligence-actions.ts`: orquestra enriquecimento, classificação e persistência do processamento coletivo por data.
- `app/(app)/louvor-admin/shared.ts`: centraliza autorização, tipos e leitura do perfil ministerial usados pelos domínios administrativos.
- Tabelas `spiritual_intelligence_runs`, `spiritual_intelligence_classifications` e `spiritual_intelligence_daily_summaries`: histórico separado do domínio musical.

## Fluxo da interface administrativa

O Louvor Admin mantém quatro áreas independentes:

- **Votação:** configura o termômetro público de músicas.
- **Indicações:** organiza entradas por data e permite curadoria musical.
- **Inteligência:** executa uma única análise coletiva por data e apresenta panorama, segmentação, associações e evolução.
- **Repertórios:** cria e revisa rascunhos antes de enviá-los a uma escala.

## Separações estruturais realizadas

O pipeline coletivo foi removido do arquivo geral de actions e isolado em `spiritual-intelligence-actions.ts`. As actions individuais legadas de análise temática/musical e enriquecimento manual foram removidas após a confirmação de que não possuíam consumidores. O enriquecimento continua automático no envio e, quando necessário, na análise coletiva diária.

O arquivo geral ainda reúne votação, indicações e repertório. Esses domínios podem ser separados gradualmente em módulos próprios, preservando os contratos usados pela interface durante a transição.

Também devem ser adicionados segmentos apenas quando houver dados confiáveis e consentidos. Campos ausentes não devem ser inferidos pela IA.
