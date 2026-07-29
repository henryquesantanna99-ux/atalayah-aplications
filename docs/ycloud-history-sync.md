# Sincronização de histórico YCloud

Toda integração é server-side. `YCLOUD_API_KEY` é lida apenas nas rotas do servidor e nunca deve usar o prefixo `NEXT_PUBLIC_`.

## Disponibilidade do histórico

O endpoint e o direito de consultar histórico dependem do produto/conta contratados na YCloud. Confirme com a YCloud o endpoint disponível para a conta e configure `YCLOUD_HISTORY_URL`; a aplicação **não presume** que todas as contas tenham histórico. Sem essa variável, a sincronização falha de forma explícita, mas o webhook continua durável em `ycloud_webhook_events` e pode ser reprocessado.

## Operação

1. Aplique a migration `040_ycloud_history_sync.sql`.
2. Configure `YCLOUD_HISTORY_URL`, `YCLOUD_API_KEY`, `YCLOUD_WHATSAPP_FROM`, `YCLOUD_INITIAL_SYNC_FROM` (ISO-8601) e `CRON_SECRET`.
3. Faça a carga controlada com `POST /api/ycloud/sync`, corpo `{ "mode": "initial", "maxPages": 5 }`, autenticado como admin. Repita enquanto `hasMore` for verdadeiro.
4. Após uma indisponibilidade use `mode: "recovery"`. Agende `mode: "reconcile"` periodicamente para contas Coexistence. Jobs podem autenticar com `Authorization: Bearer $CRON_SECRET`.

A rotina pagina por cursor e limita cada execução a 100 páginas. O checkpoint é salvo após cada página. Quando o provedor encerra o cursor, a próxima janela começa no `endTime` da execução anterior. O upsert usa o ID estável da mensagem (`id`, `messageId` ou `externalId`). Importação e webhook chamam a mesma função `normalizeYCloudEvent`.

## Fallback e observabilidade

Cada payload de webhook é armazenado antes do processamento com fingerprint, estado, tentativas, timestamps e último erro. Consulte eventos `failed`/`pending` no Supabase. Um admin pode executar `POST /api/ycloud/webhook/reprocess` com `{ "id": "..." }`; reprocessar é seguro porque mensagens usam upsert. Configure alertas para eventos não processados antigos e crescimento de falhas.
