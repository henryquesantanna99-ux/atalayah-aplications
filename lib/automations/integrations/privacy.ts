const PHONE = /(?<!\d)(?:\+?\d[\s().-]*){8,15}(?!\d)/g
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const SENSITIVE_KEYS = /^(body|content|conversation|email|message|phone|prompt|response|text)$/i

export type DataPolicy = {
  consentGranted: boolean
  retentionDays: number
  purpose: string
}

export function assertConsent(policy: DataPolicy) {
  if (!policy.consentGranted) throw new Error(`Consentimento obrigatório para ${policy.purpose}.`)
  if (!Number.isInteger(policy.retentionDays) || policy.retentionDays < 1 || policy.retentionDays > 3650) {
    throw new Error('O período de retenção deve estar entre 1 e 3650 dias.')
  }
}

export function retentionDate(policy: DataPolicy, from = new Date()) {
  assertConsent(policy)
  return new Date(from.getTime() + policy.retentionDays * 86_400_000).toISOString()
}

export function maskSensitive(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEYS.test(key) && typeof value === 'string') return '[REDACTED]'
  if (typeof value === 'string') return value.replace(EMAIL, maskEmail).replace(PHONE, maskPhone)
  if (Array.isArray(value)) return value.map((item) => maskSensitive(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([nestedKey, nested]) => [nestedKey, maskSensitive(nested, nestedKey)]))
  }
  return value
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 ? `***${digits.slice(-4)}` : '[REDACTED]'
}
