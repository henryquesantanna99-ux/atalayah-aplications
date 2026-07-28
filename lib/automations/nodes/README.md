# Registry de nós de automação

Cada definição possui um identificador estável, categoria, versão, schema Zod, portas,
variáveis produzidas, formulário declarativo e executor. Use `executeNode` apenas no
runner server-side; credenciais são referências resolvidas por `ExecutionContext.secrets`.

## Interpolação

A única sintaxe aceita é `{{caminho.da.variavel}}`, por exemplo
`{{trigger.contact.phone}}`. Um campo formado somente por uma expressão preserva o
tipo original; dentro de texto, objetos e listas são serializados como JSON.

O editor deve chamar `variablesAvailableAt(nodeId, graph, nodeRegistry)`. A função
percorre somente arestas de entrada e, assim, nunca oferece variáveis de nós futuros,
desconectados ou de outros ramos. Antes de salvar, use `invalidInterpolationPaths`
para rejeitar referências que não estão nessa lista.

## Integrações

Executores de integrações delegam para adapters injetados pelo servidor. O adapter
HTTP implementa autenticação, retries, paginação e seleção; os demais encapsulam os
SDKs de CRM, mensageria, IA, Google Agenda e marketing. Em comunicação, o schema
valida o formato contra as capacidades exportadas em `communicationCapabilities`.
Toda operação de IA exige um JSON Schema e valida a resposta antes de liberá-la.
