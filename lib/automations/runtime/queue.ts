export interface DurableAutomationQueue {
  enqueue(runId: string): Promise<void>
  claim(workerId: string, leaseSeconds?: number): Promise<{ runId: string; receipt: string } | null>
  ack(receipt: string): Promise<void>
  retry(receipt: string, delaySeconds: number, reason: string): Promise<void>
}

/** HTTP handlers only enqueue. A separate cron/worker claims durable jobs. */
export class SupabaseAutomationQueue implements DurableAutomationQueue {
  constructor(private readonly client: any) {}
  async enqueue(runId: string) { const { error } = await this.client.from('automation_jobs').insert({ run_id: runId }); if (error) throw error }
  async claim(workerId: string, leaseSeconds = 60) { const { data, error } = await this.client.rpc('claim_automation_job', { p_worker_id: workerId, p_lease_seconds: leaseSeconds }); if (error) throw error; const job = data?.[0]; return job ? { runId: job.run_id, receipt: job.receipt } : null }
  async ack(receipt: string) { const { error } = await this.client.rpc('ack_automation_job', { p_receipt: receipt }); if (error) throw error }
  async retry(receipt: string, delaySeconds: number, reason: string) { const { error } = await this.client.rpc('retry_automation_job', { p_receipt: receipt, p_delay_seconds: delaySeconds, p_reason: reason }); if (error) throw error }
}
