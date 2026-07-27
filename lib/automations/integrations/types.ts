export type Provider = 'ycloud' | 'instagram' | 'google-calendar' | 'ai' | 'http'

export type AutomationContext = {
  organizationId: string
  actorId: string
  workflowId?: string
  executionId?: string
}

export type CredentialRecord = {
  id: string
  organizationId: string
  provider: Provider
  ciphertext: string
  iv: string
  authTag: string
  keyVersion: number
  expiresAt?: string
  createdBy: string
}

export type TokenSet = {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  scope?: string
}

export interface CredentialRepository {
  insert(record: Omit<CredentialRecord, 'id'>): Promise<CredentialRecord>
  findById(id: string): Promise<CredentialRecord | null>
  update(id: string, patch: Partial<CredentialRecord>): Promise<void>
}

export interface AuditSink {
  write(event: AuditEvent): Promise<void>
}

export type AuditEvent = {
  organizationId: string
  actorId: string
  action: 'workflow.created' | 'workflow.edited' | 'workflow.published' | 'workflow.activated' | 'credential.created' | 'credential.updated' | 'credential.used'
  resourceType: 'workflow' | 'credential'
  resourceId: string
  metadata?: Record<string, unknown>
  occurredAt: string
}

export type IdempotentRequest = { idempotencyKey: string }

export class UnsupportedOperationError extends Error {
  readonly code = 'OFFICIAL_API_UNSUPPORTED'
  constructor(provider: Provider, operation: string, alternative?: string) {
    super(`${provider}: a operação “${operation}” não é suportada pela API oficial conectada.${alternative ? ` ${alternative}` : ''}`)
    this.name = 'UnsupportedOperationError'
  }
}
