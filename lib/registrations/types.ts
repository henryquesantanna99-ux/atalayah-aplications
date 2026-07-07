export const PAYMENT_STATUSES = ['aguardando_pagamento','processando','pago','cancelado','rejeitado'] as const
export const REGISTRATION_STATUSES = ['rascunho','aguardando_pagamento','confirmada','cancelada'] as const
export type PaymentStatus = typeof PAYMENT_STATUSES[number]
export type RegistrationStatus = typeof REGISTRATION_STATUSES[number]
export type AgeClassification = 'Menor de idade' | 'Maior de idade' | 'Não informado'

export function classifyAge(age?: number | null): AgeClassification {
  if (age === null || age === undefined || Number.isNaN(age)) return 'Não informado'
  return age < 18 ? 'Menor de idade' : 'Maior de idade'
}

export const paymentLabels: Record<PaymentStatus, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  processando: 'Pagamento em processamento',
  pago: 'Pago',
  cancelado: 'Cancelado',
  rejeitado: 'Rejeitado',
}

export const registrationLabels: Record<RegistrationStatus, string> = {
  rascunho: 'Rascunho',
  aguardando_pagamento: 'Aguardando pagamento',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
}
