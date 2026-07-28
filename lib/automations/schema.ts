import { z } from 'zod'

/**
 * Canonical, immutable representation stored in
 * automation_workflow_versions.graph_snapshot.
 *
 * Node configuration may contain an opaque `credentialId`, but never credential
 * values. Workers resolve that identifier through automation_credentials when a
 * run starts and must redact secret material before persisting run payloads.
 */

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export type AutomationJson =
  | z.infer<typeof jsonPrimitiveSchema>
  | AutomationJson[]
  | { [key: string]: AutomationJson }

export const automationJsonSchema: z.ZodType<AutomationJson> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(automationJsonSchema),
    z.record(z.string(), automationJsonSchema),
  ]),
)

const secretKeyPattern = /(^|_)(token|secret|password|api_key|authorization|cookie)($|_)/i

function containsSecretKey(value: AutomationJson): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey)
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, child]) => secretKeyPattern.test(key) || containsSecretKey(child),
    )
  }
  return false
}

export const automationPortSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  dataType: z.string().min(1).optional(),
  required: z.boolean().optional(),
})

export const automationNodeSnapshotSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  type: z.string().min(1),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  configuration: automationJsonSchema.refine((value) => !containsSecretKey(value), {
    message: 'Node configuration must reference credentials, never contain secrets',
  }),
  inputPorts: z.array(automationPortSchema),
  outputPorts: z.array(automationPortSchema),
  visualMetadata: z.record(z.string(), automationJsonSchema).default({}),
})

export const automationEdgeSnapshotSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  sourcePortId: z.string().min(1),
  targetPortId: z.string().min(1),
  visualMetadata: z.record(z.string(), automationJsonSchema).default({}),
})

export const automationGraphSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    workflowId: z.string().uuid(),
    nodes: z.array(automationNodeSnapshotSchema),
    edges: z.array(automationEdgeSnapshotSchema),
  })
  .superRefine((snapshot, context) => {
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id))
    const nodeKeys = new Set(snapshot.nodes.map((node) => node.key))

    if (nodeIds.size !== snapshot.nodes.length || nodeKeys.size !== snapshot.nodes.length) {
      context.addIssue({ code: 'custom', message: 'Node ids and keys must be unique' })
    }

    snapshot.edges.forEach((edge, index) => {
      if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index],
          message: 'Both edge endpoints must belong to this snapshot',
        })
      }
    })
  })

export type AutomationPort = z.infer<typeof automationPortSchema>
export type AutomationNodeSnapshot = z.infer<typeof automationNodeSnapshotSchema>
export type AutomationEdgeSnapshot = z.infer<typeof automationEdgeSnapshotSchema>
export type AutomationGraphSnapshot = z.infer<typeof automationGraphSnapshotSchema>

export function parseAutomationGraphSnapshot(value: unknown): AutomationGraphSnapshot {
  return automationGraphSnapshotSchema.parse(value)
}
