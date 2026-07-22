type SendConfirmationInput = {
  to: string | null
  name: string | null
  registrationId: string
  groupUrl?: string | null
}

type YCloudPayload = {
  from: string
  to: string
  type: 'text' | 'template'
  externalId: string
  category?: 'utility'
  useDirectSend?: boolean
  text?: { body: string }
  template?: {
    name: string
    language: { code: string; policy?: 'deterministic' }
    components: Array<{
      type: 'body'
      parameters: Array<{ type: 'text'; text: string }>
    }>
  }
}

function normalizePhone(rawPhone: string, defaultCountryCode: string) {
  const trimmed = rawPhone.trim()
  if (trimmed.startsWith('+')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith(defaultCountryCode)) return `+${digits}`
  return `+${defaultCountryCode}${digits}`
}

export async function sendRegistrationConfirmationWhatsApp({
  to,
  name,
  registrationId,
  groupUrl,
}: SendConfirmationInput) {
  const apiKey = process.env.YCLOUD_API_KEY
  const from = process.env.YCLOUD_WHATSAPP_FROM
  const defaultCountryCode = process.env.YCLOUD_DEFAULT_COUNTRY_CODE || '55'

  if (!apiKey || !from || !to) {
    return { sent: false, skipped: true, reason: 'YCloud não configurado ou WhatsApp ausente.' }
  }

  const normalizedTo = normalizePhone(to, defaultCountryCode)
  if (!normalizedTo) {
    return { sent: false, skipped: true, reason: 'WhatsApp inválido.' }
  }

  const participantName = name || 'participante'
  const accessUrl = groupUrl || process.env.REGISTRATION_GROUP_URL || ''
  const templateName = process.env.YCLOUD_TEMPLATE_NAME
  const language = process.env.YCLOUD_TEMPLATE_LANGUAGE || 'pt_BR'

  const payload: YCloudPayload = templateName
    ? {
        from,
        to: normalizedTo,
        type: 'template',
        externalId: registrationId,
        template: {
          name: templateName,
          language: { code: language, policy: 'deterministic' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: participantName },
                { type: 'text', text: accessUrl || 'Link em liberação' },
              ],
            },
          ],
        },
      }
    : {
        from,
        to: normalizedTo,
        type: 'text',
        externalId: registrationId,
        category: 'utility',
        useDirectSend: true,
        text: {
          body: `Olá, ${participantName}! Seu pagamento foi confirmado e sua inscrição no AtalaYah está aprovada.${accessUrl ? ` Entre no grupo por este link: ${accessUrl}` : ''}`,
        },
      }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).catch((error) => ({ ok: false, status: 0, json: async () => ({ error: error instanceof Error ? error.message : 'Erro desconhecido' }) } as Response))

  clearTimeout(timeout)
  const body = await response.json().catch(() => ({}))
  return {
    sent: response.ok,
    skipped: false,
    status: response.status,
    provider: 'ycloud',
    response: body,
  }
}
