export function normalizeWhatsAppPhone(rawPhone: unknown, defaultCountryCode = '55') {
  if (typeof rawPhone !== 'string') return ''
  const digits = rawPhone.trim().replace(/\D/g, '')
  if (!digits) return ''
  const countryDigits = defaultCountryCode.replace(/\D/g, '')
  return `+${digits.startsWith(countryDigits) ? digits : `${countryDigits}${digits}`}`
}

export function contactDisplayName(contact: { name: string | null; phone: string }) {
  return contact.name?.trim() || contact.phone || 'Contato desconhecido'
}
