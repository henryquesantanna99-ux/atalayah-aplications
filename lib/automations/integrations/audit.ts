import { maskSensitive } from './privacy.ts'
import type { AuditEvent, AuditSink, AutomationContext } from './types.ts'

export async function audit(
  sink: AuditSink,
  context: AutomationContext,
  action: AuditEvent['action'],
  resourceType: AuditEvent['resourceType'],
  resourceId: string,
  metadata?: Record<string, unknown>,
) {
  await sink.write({
    organizationId: context.organizationId,
    actorId: context.actorId,
    action,
    resourceType,
    resourceId,
    metadata: maskSensitive(metadata) as Record<string, unknown> | undefined,
    occurredAt: new Date().toISOString(),
  })
}
