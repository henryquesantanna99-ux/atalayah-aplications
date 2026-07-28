# Diagnóstico e arquitetura da Análise Temática v2

## Diagnóstico da versão anterior

A implementação anterior já separava classificação e agregação, mas classificava temas apenas como listas de rótulos. Não havia dimensão, polaridade ou evidência tipada por achado; as “associações” eram somente coocorrências sem limiar amostral; e discernimento e recomendações eram textos fixos, sem o contexto salvo em **Seu Ministério**. As barras existentes não distinguiam composição, segmentação e correlação.

## Pipeline v2

1. **Classificação:** uma chamada estruturada por indicação produz achados com tema, dimensão, polaridade, fonte e evidência. A ausência de letra confirmada é explícita e restringe a análise a respostas e metadados.
2. **Quantificação:** `quantifyDimensions` calcula contagens e percentuais em código.
3. **Segmentação:** as agregações determinísticas preservam somente dados autodeclarados. Faixa etária e região já existem; gênero, estado e país foram adicionados como campos opcionais mínimos, mas ainda precisam de coleta na experiência de cadastro acordada com o time.
4. **Correlação:** `detectCorrelations` compara cada segmento à linha de base e só marca relevância com amostra mínima de 3 e diferença absoluta mínima de 15 pontos percentuais.
5. **Interpretação:** uma chamada independente recebe métricas, correlações, exemplos reais e o perfil de **Seu Ministério**. A saída é estruturada e persistida.
6. **Ações:** a mesma etapa editorial produz ações tipadas, cada uma com justificativa e referência ao achado de origem, limitada às músicas analisadas.

Os artefatos intermediários são persistidos em `spiritual_intelligence_classifications` e `spiritual_intelligence_daily_summaries`. Relatórios históricos continuam legíveis pelos campos antigos, mas precisam ser regerados para obter correlações, interpretação, ações e gráficos v2.

## Privacidade

O relatório hoje é restrito ao fluxo administrativo e exibe nomes para dar concretude aos exemplos, conforme solicitado. Antes de ampliar o acesso, o time deve decidir uma política de anonimização parcial e registrá-la como regra de produto.
