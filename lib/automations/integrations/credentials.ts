import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { audit } from './audit.ts'
import type { AuditSink, AutomationContext, CredentialRepository, Provider } from './types.ts'

type Keyring = { currentVersion: number; keys: Record<number, Buffer> }

export function keyringFromEnvironment(env = process.env): Keyring {
  const version = Number(env.AUTOMATION_CREDENTIAL_KEY_VERSION ?? '1')
  const encoded = env[`AUTOMATION_CREDENTIAL_KEY_V${version}`] ?? env.AUTOMATION_CREDENTIAL_KEY
  if (!encoded) throw new Error('Chave do cofre não configurada fora do banco.')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('A chave do cofre deve ter 32 bytes em base64.')
  return { currentVersion: version, keys: { [version]: key } }
}

export class CredentialVault {
  private repository: CredentialRepository
  private auditSink: AuditSink
  private keyring: Keyring
  constructor(repository: CredentialRepository, auditSink: AuditSink, keyring: Keyring) {
    this.repository = repository
    this.auditSink = auditSink
    this.keyring = keyring
  }

  async create(context: AutomationContext, provider: Provider, secret: Record<string, unknown>) {
    const encrypted = this.encrypt(secret)
    const record = await this.repository.insert({ ...encrypted, organizationId: context.organizationId, provider, createdBy: context.actorId })
    await audit(this.auditSink, context, 'credential.created', 'credential', record.id, { provider })
    return record.id
  }

  async read(context: AutomationContext, credentialId: string, provider?: Provider) {
    const record = await this.repository.findById(credentialId)
    if (!record || record.organizationId !== context.organizationId || (provider && record.provider !== provider)) {
      throw new Error('Credencial não encontrada para esta organização.')
    }
    const key = this.keyring.keys[record.keyVersion]
    if (!key) throw new Error(`Versão ${record.keyVersion} da chave do cofre indisponível.`)
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(record.authTag, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()])
    await audit(this.auditSink, context, 'credential.used', 'credential', credentialId, { provider: record.provider })
    return JSON.parse(plaintext.toString('utf8')) as Record<string, unknown>
  }

  private encrypt(secret: Record<string, unknown>) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.keyring.keys[this.keyring.currentVersion], iv)
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(secret), 'utf8'), cipher.final()])
    return { ciphertext: encrypted.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), keyVersion: this.keyring.currentVersion }
  }
}

export function credentialReference(credentialId: string) {
  return { credentialId }
}
