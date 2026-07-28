import { z } from "zod";
import { defineNode, type ExecutionContext, type FormField, type NodeCategory, type NodeDefinition, type ProducedVariable } from "./types";
import { interpolateDeep } from "./interpolation";

const expression = z.string().min(1);
const record = z.record(z.string(), z.unknown()).default({});
const base = z.object({ name: z.string().min(1).optional() });
const oneInput = [{ id: "input", label: "Entrada" }] as const;
const oneOutput = [{ id: "output", label: "Saída" }] as const;
const result: ProducedVariable[] = [{ path: "node.result", label: "Resultado", type: "unknown" }];
const field = (key: string, label: string, control: FormField["control"] = "text", options?: string[]): FormField => ({ key, label, control, options });

function delegated(
  id: string, label: string, category: NodeCategory, schema: z.ZodType,
  form: FormField[], options: Partial<Pick<NodeDefinition, "inputs" | "outputs" | "produces">> = {},
): NodeDefinition {
  return defineNode({
    id, label, category, version: 1, configSchema: schema,
    inputs: options.inputs ?? oneInput, outputs: options.outputs ?? oneOutput,
    produces: options.produces ?? result, form,
    async execute(config, context) {
      const parsed = schema.parse(config);
      const input = interpolateDeep(parsed, context.variables);
      if (category === "http") {
        if (!context.adapters.http) throw new Error("Adapter server-side ausente para http");
        return context.adapters.http(input as Record<string, unknown>);
      }
      if (category === "communication") {
        if (!context.adapters.communication) throw new Error("Adapter server-side ausente para communication");
        const provider = (input as { provider?: unknown }).provider;
        return context.adapters.communication(String(provider), id, input);
      }
      const adapter = category === "calendar" ? context.adapters.calendar
        : category === "marketing" ? context.adapters.marketing
        : category === "trigger" ? context.adapters.trigger : context.adapters.crm;
      if (!adapter) throw new Error(`Adapter server-side ausente para ${category}`);
      return adapter(id, input);
    },
  });
}

const triggerSchema = base.extend({ filters: record.optional() });
const triggerVars: ProducedVariable[] = [
  { path: "trigger.id", label: "ID do evento", type: "string" },
  { path: "trigger.contact.phone", label: "Telefone do contato", type: "string" },
  { path: "trigger.contact.email", label: "E-mail do contato", type: "string" },
  { path: "trigger.payload", label: "Payload", type: "object" },
];
const triggers = [
  ["trigger.webhook", "Webhook"], ["trigger.message_received", "Mensagem recebida"],
  ["trigger.card_created", "Card criado"], ["trigger.card_updated", "Card atualizado"],
  ["trigger.stage_changed", "Mudança de etapa"], ["trigger.tag_added", "Tag adicionada"],
  ["trigger.tag_removed", "Tag removida"], ["trigger.field_changed", "Campo alterado"],
  ["trigger.form_received", "Formulário recebido"], ["trigger.schedule", "Agendamento"],
  ["trigger.cron", "Cron"], ["trigger.manual", "Execução manual"],
].map(([id, label]) => delegated(id, label, "trigger", triggerSchema, [field("filters", "Filtros", "json")], {
  inputs: [], produces: triggerVars,
}));

export const httpRequestNode = delegated("http.request", "HTTP Request", "http", base.extend({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: expression, headers: record, query: record,
  authentication: z.discriminatedUnion("type", [
    z.object({ type: z.literal("none") }), z.object({ type: z.literal("bearer"), secret: z.string().min(1) }),
    z.object({ type: z.literal("basic"), usernameSecret: z.string(), passwordSecret: z.string() }),
    z.object({ type: z.literal("apiKey"), placement: z.enum(["header", "query"]), name: z.string(), secret: z.string() }),
  ]).default({ type: "none" }),
  body: z.discriminatedUnion("type", [z.object({ type: z.literal("none") }), z.object({ type: z.literal("json"), value: z.unknown() }), z.object({ type: z.literal("form"), value: record }), z.object({ type: z.literal("multipart"), value: record })]).default({ type: "none" }),
  timeoutMs: z.number().int().positive().max(120_000).default(30_000),
  retries: z.number().int().min(0).max(10).default(0),
  pagination: z.object({ type: z.enum(["none", "page", "cursor"]), maxPages: z.number().int().positive().max(100).default(1) }).default({ type: "none", maxPages: 1 }),
  select: z.array(z.string()).default([]),
}), [field("method", "Método", "select", ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]), field("url", "URL"), field("headers", "Headers", "key-value"), field("query", "Query params", "key-value"), field("authentication", "Autenticação", "json"), field("body", "Corpo", "json"), field("timeoutMs", "Timeout", "number"), field("retries", "Tentativas", "number"), field("pagination", "Paginação", "json"), field("select", "Selecionar campos", "json")], { produces: [{ path: "node.status", label: "Status", type: "number" }, { path: "node.headers", label: "Headers", type: "object" }, { path: "node.body", label: "Resposta", type: "unknown" }] });

const comparison = z.object({ left: z.unknown(), operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith", "in", "exists", "matches"]), right: z.unknown().optional() });
const logicNodes = [
  ["logic.if", "IF", comparison], ["logic.and", "AND", z.object({ conditions: z.array(comparison).min(2) })],
  ["logic.or", "OR", z.object({ conditions: z.array(comparison).min(2) })], ["logic.not", "NOT", z.object({ value: z.boolean() })],
  ["logic.compare", "Comparador", comparison], ["logic.boolean", "Operador booleano", z.object({ value: z.unknown(), operator: z.enum(["truthy", "falsy"]) })],
  ["logic.switch", "Switch", z.object({ value: z.unknown(), cases: z.array(z.object({ id: z.string(), value: z.unknown(), order: z.number().int() })).min(1), fallback: z.boolean().default(true) })],
  ["logic.merge", "Merge", z.object({ strategy: z.enum(["append", "combine", "first"]) })],
  ["logic.split", "Split", z.object({ value: z.array(z.unknown()), batchSize: z.number().int().positive().default(1) })],
  ["logic.wait", "Espera", z.object({ durationMs: z.number().int().nonnegative().max(86_400_000) })],
] as const;

const crmSchema = base.extend({ cardId: expression.optional(), fields: record, contact: record.optional(), tags: z.array(z.string()).optional(), ownerId: expression.optional(), stageId: expression.optional(), source: z.string().optional(), value: z.number().optional(), notes: z.string().optional() });
const crmNodes = [["crm.create_card", "Criar card"], ["crm.update_card", "Atualizar card"], ["crm.move_stage", "Mover etapa"], ["crm.edit_fields", "Editar campos"], ["crm.set_source", "Definir origem"], ["crm.set_tags", "Editar tags"], ["crm.custom_fields", "Campos personalizados"], ["crm.assign_owner", "Definir responsável"], ["crm.set_value", "Definir valor"], ["crm.update_contact", "Atualizar contato"], ["crm.add_note", "Adicionar observação"]].map(([id, label]) => delegated(id, label, "crm", crmSchema, [field("cardId", "Card"), field("fields", "Campos", "key-value"), field("contact", "Contato", "json"), field("tags", "Tags", "json"), field("ownerId", "Responsável"), field("stageId", "Etapa"), field("source", "Origem"), field("value", "Valor", "number"), field("notes", "Observações", "textarea")]));

const providerCapabilities = {
  whatsapp: ["text", "template", "image", "video", "audio", "document"],
  instagram: ["text", "image", "video"], email: ["text", "html", "attachment"], sms: ["text"], internal: ["text"],
} as const;
export const communicationCapabilities = providerCapabilities;
const communicationSchema = base.extend({ provider: z.enum(["whatsapp", "instagram", "email", "sms", "internal"]), recipient: expression, contentType: z.enum(["text", "html", "template", "image", "video", "audio", "document", "attachment"]), content: z.unknown(), templateId: z.string().optional(), mediaUrl: z.string().url().optional() }).superRefine((value, ctx) => {
  if (!(providerCapabilities[value.provider] as readonly string[]).includes(value.contentType)) ctx.addIssue({ code: "custom", path: ["contentType"], message: `Formato não suportado por ${value.provider}` });
});
const communicationNodes = [["communication.whatsapp", "WhatsApp"], ["communication.instagram", "Instagram Direct"], ["communication.email", "E-mail"], ["communication.sms", "SMS"], ["communication.template", "Template"], ["communication.media", "Mídia"], ["communication.internal_notification", "Notificação interna"]].map(([id, label]) => delegated(id, label, "communication", communicationSchema, [field("provider", "Provedor", "select", Object.keys(providerCapabilities)), field("recipient", "Destinatário"), field("contentType", "Formato", "select"), field("content", "Conteúdo", "json"), field("templateId", "Template"), field("mediaUrl", "Mídia")]));

const aiSchema = base.extend({ model: z.string().min(1), instructions: z.string().min(1), input: z.unknown(), outputSchema: z.record(z.string(), z.unknown()), temperature: z.number().min(0).max(2).default(0) });
const aiNodes = [["ai.generate_reply", "Gerar resposta"], ["ai.classify_intent", "Classificar intenção"], ["ai.summarize", "Resumir conversa"], ["ai.extract_structured", "Extrair dados estruturados"], ["ai.sentiment", "Avaliar sentimento"], ["ai.choose_branch", "Escolher ramificação"]].map(([id, label]) => defineNode({ id, label, category: "ai" as const, version: 1, configSchema: aiSchema, inputs: oneInput, outputs: oneOutput, produces: [{ path: "node.structured", label: "Saída estruturada", type: "object" as const }], form: [field("model", "Modelo"), field("instructions", "Instruções", "textarea"), field("input", "Entrada", "json"), field("outputSchema", "JSON Schema de saída", "json")], async execute(config, context) { const parsed = aiSchema.parse(config); if (!context.adapters.ai) throw new Error("Adapter server-side ausente para IA"); const output = await context.adapters.ai(id, interpolateDeep(parsed, context.variables)); return z.fromJSONSchema(parsed.outputSchema).parse(output); } }));

const calendarSchema = base.extend({ calendarId: z.string(), eventId: expression.optional(), title: z.string().optional(), start: expression, end: expression, timezone: z.string().min(1), guests: z.array(z.string().email()).default([]), reminders: z.array(z.object({ method: z.enum(["email", "popup"]), minutes: z.number().int().nonnegative() })).default([]), deduplicationKey: expression.optional() });
const calendarNodes = [["calendar.create", "Criar evento"], ["calendar.update", "Atualizar evento"], ["calendar.cancel", "Cancelar evento"], ["calendar.availability", "Consultar disponibilidade"]].map(([id, label]) => delegated(id, label, "calendar", calendarSchema, [field("calendarId", "Agenda"), field("eventId", "Evento"), field("title", "Título"), field("start", "Início"), field("end", "Fim"), field("timezone", "Timezone"), field("guests", "Convidados", "json"), field("reminders", "Lembretes", "json"), field("deduplicationKey", "Chave de deduplicação")]));

const marketingSchema = base.extend({ provider: z.string().min(1), contactId: expression.optional(), audienceId: expression.optional(), campaignId: expression.optional(), event: z.string().optional(), score: z.number().optional(), assigneeId: expression.optional(), url: z.string().url().optional(), payload: record });
const marketingNodes = [["marketing.add_audience", "Adicionar à audiência"], ["marketing.remove_audience", "Remover da audiência"], ["marketing.conversion", "Registrar conversão"], ["marketing.send_campaign", "Disparar campanha"], ["marketing.assign_lead", "Atribuir lead"], ["marketing.score", "Aplicar scoring"], ["marketing.external_webhook", "Chamar webhook externo"]].map(([id, label]) => delegated(id, label, "marketing", marketingSchema, [field("provider", "Provedor"), field("contactId", "Contato"), field("audienceId", "Audiência"), field("campaignId", "Campanha"), field("event", "Evento"), field("score", "Score", "number"), field("assigneeId", "Responsável"), field("url", "URL"), field("payload", "Payload", "json")]));

const dataNodes = [
  ["data.transform_json", "Transformar JSON", z.object({ value: z.unknown(), mapping: record })], ["data.set_variable", "Definir variável", z.object({ key: z.string().regex(/^[A-Za-z_$][\w$]*$/), value: z.unknown() })],
  ["data.format_date", "Formatar data", z.object({ value: expression, format: z.string(), timezone: z.string() })], ["data.filter_list", "Filtrar lista", z.object({ value: z.array(z.unknown()), condition: comparison })],
  ["data.delay", "Delay", z.object({ durationMs: z.number().int().nonnegative().max(86_400_000) })], ["data.deduplicate", "Deduplicar", z.object({ value: z.array(z.unknown()), key: z.string().optional() })],
  ["data.end", "Encerrar fluxo", z.object({ status: z.enum(["success", "failed", "cancelled"]), message: z.string().optional() })],
] as const;

function localNode([id, label, schema]: (typeof logicNodes)[number] | (typeof dataNodes)[number]): NodeDefinition {
  return defineNode({ id, label, category: id.startsWith("logic.") ? "logic" : "data", version: 1, configSchema: schema, inputs: oneInput, outputs: id === "data.end" ? [] : oneOutput, produces: result, form: [field("config", "Configuração", "json")], async execute(config, context) {
    const value = interpolateDeep(schema.parse(config), context.variables) as Record<string, unknown>;
    if (id.endsWith("delay") || id === "logic.wait") await new Promise((resolve, reject) => { const timer = setTimeout(resolve, Number(value.durationMs)); context.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(context.signal?.reason); }, { once: true }); });
    if (id === "data.set_variable") return { [String(value.key)]: value.value };
    if (id === "data.deduplicate") { const key = value.key as string | undefined; return Array.from(new Map((value.value as unknown[]).map((item) => [key && item && typeof item === "object" ? (item as Record<string, unknown>)[key] : JSON.stringify(item), item])).values()); }
    return value;
  } });
}

export const nodeDefinitions: readonly NodeDefinition[] = [
  ...triggers, httpRequestNode, ...logicNodes.map(localNode), ...crmNodes, ...communicationNodes,
  ...aiNodes, ...calendarNodes, ...marketingNodes, ...dataNodes.map(localNode),
];

export const nodeRegistry: ReadonlyMap<string, NodeDefinition> = new Map(nodeDefinitions.map((node) => [node.id, node]));
if (nodeRegistry.size !== nodeDefinitions.length) throw new Error("Identificadores duplicados no registry de automações");

export function getNodeDefinition(id: string): NodeDefinition {
  const definition = nodeRegistry.get(id);
  if (!definition) throw new Error(`Tipo de nó desconhecido: ${id}`);
  return definition;
}

export async function executeNode(id: string, config: unknown, context: ExecutionContext): Promise<unknown> {
  const definition = getNodeDefinition(id);
  return definition.execute(definition.configSchema.parse(config), context);
}
