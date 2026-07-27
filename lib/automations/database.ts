import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from './runtime/types'

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface AutomationDatabase {
  public: {
    Tables: {
      automation_runs: Table<{
        id: string; workflow_id: string; workflow_version_id: string; requested_by: string
        idempotency_key: string; input: Json; output: Json | null; status: string
        created_at: string; started_at: string | null; finished_at: string | null
      }>
      automation_workflow_versions: Table<{
        id: string; workflow_id: string; version: number; definition: Json
        published_at: string | null; created_at: string
      }>
      automation_node_attempts: Table<{
        id: string; run_id: string; node_id: string; node_type: string; node_version: number
        attempt: number; idempotency_key: string; input: Json | null; output: Json | null
        ports: string[] | null; error: Json | null; status: string; created_at: string; finished_at: string | null
      }>
      automation_run_events: Table<{
        sequence: number; run_id: string; type: string; payload: Json; created_at: string
      }>
      automation_jobs: Table<{
        id: number; run_id: string; available_at: string; lease_until: string | null
        worker_id: string | null; receipt: string | null; attempts: number; last_error: string | null; created_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      enqueue_automation_run: { Args: { p_workflow_id: string; p_requested_by: string; p_input: Json; p_idempotency_key: string }; Returns: string }
      claim_automation_job: { Args: { p_worker_id: string; p_lease_seconds?: number }; Returns: { run_id: string; receipt: string }[] }
      ack_automation_job: { Args: { p_receipt: string }; Returns: undefined }
      retry_automation_job: { Args: { p_receipt: string; p_delay_seconds: number; p_reason: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type AutomationClient = SupabaseClient<AutomationDatabase>
