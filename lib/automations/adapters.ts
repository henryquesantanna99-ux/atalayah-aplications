export type AdapterRequest = { operation: string; payload: Record<string, unknown>; idempotencyKey: string }
export interface AutomationAdapter { execute(request: AdapterRequest): Promise<{ externalId: string; status: 'accepted' | 'completed' }> }
export type AdapterName = 'crm' | 'whatsapp' | 'instagram' | 'ai' | 'google-calendar'

export class AdapterRegistry {
  private adapters = new Map<AdapterName, AutomationAdapter>()
  register(name: AdapterName, adapter: AutomationAdapter) { this.adapters.set(name, adapter) }
  execute(name: AdapterName, request: AdapterRequest) {
    const adapter = this.adapters.get(name)
    if (!adapter) throw new Error(`Adapter not configured: ${name}`)
    if (!request.operation || !request.idempotencyKey || !request.payload) throw new Error('Invalid adapter request')
    return adapter.execute(structuredClone(request))
  }
}
