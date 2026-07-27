'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clock3, Copy, Loader2, SkipForward, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type NodeEvent = {
  id: number
  node_id: string
  state: 'running' | 'completed' | 'skipped' | 'failed'
  sanitized_input: unknown
  sanitized_output: unknown
  error: string | null
}

const nodeStyles = {
  running: 'text-blue-600 bg-blue-50',
  completed: 'text-green-700 bg-green-50',
  skipped: 'text-zinc-600 bg-zinc-100',
  failed: 'text-red-700 bg-red-50',
}

export function AutomationTestListener({ workflowId }: { workflowId: string }) {
  const [session, setSession] = useState<{ id: string; url: string; expiresAt: string; state: string } | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Record<string, NodeEvent>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())
  const sessionId = session?.id

  const listen = useCallback(async () => {
    setLoading(true)
    setNodes({})
    setSelected(null)
    setExecutionId(null)
    const response = await fetch(`/api/automations/workflows/${workflowId}/test-sessions`, { method: 'POST' })
    const data = await response.json()
    setLoading(false)
    if (response.ok) setSession(data)
  }, [workflowId])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase.channel(`automation-test-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'automation_webhook_test_sessions', filter: `id=eq.${sessionId}`,
      }, (event) => {
        const row = event.new as { state: string; execution_id?: string }
        setSession((current) => current ? { ...current, state: row.state } : current)
        if (row.execution_id) setExecutionId(row.execution_id)
      }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [sessionId, supabase])

  useEffect(() => {
    if (!executionId) return
    const channel = supabase.channel(`automation-execution-${executionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'automation_node_executions', filter: `execution_id=eq.${executionId}`,
      }, (event) => {
        const row = event.new as NodeEvent
        if (row?.node_id) setNodes((current) => ({ ...current, [row.node_id]: row }))
      }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [executionId, supabase])

  const active = session && (session.state === 'waiting' || session.state === 'claimed')
  const inspected = selected ? nodes[selected] : null

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Teste do webhook</h3>
          <p className="text-sm text-muted-foreground">Cada URL aceita exatamente um evento.</p>
        </div>
        <Button onClick={listen} disabled={loading || Boolean(active)}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
          Escutar evento de teste
        </Button>
      </div>

      {session && <div className="space-y-2">
        <div className="flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-xs">{session.url}</code>
          <Button size="icon" variant="outline" aria-label="Copiar URL" onClick={() => navigator.clipboard.writeText(session.url)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {active ? `Escutando até ${new Date(session.expiresAt).toLocaleTimeString()}` : 'Escuta encerrada. Inicie uma nova sessão para testar novamente.'}
        </p>
      </div>}

      <div className="flex flex-wrap gap-2">
        {Object.values(nodes).map((node) => <button key={node.node_id} onClick={() => setSelected(node.node_id)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${nodeStyles[node.state]}`}>
          {node.state === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
          {node.state === 'completed' && <Check className="h-3 w-3" />}
          {node.state === 'skipped' && <SkipForward className="h-3 w-3" />}
          {node.state === 'failed' && <XCircle className="h-3 w-3" />}
          {node.node_id}
        </button>)}
      </div>

      {inspected && <div className="grid gap-3 md:grid-cols-2">
        <JsonPanel title="Entrada sanitizada" value={inspected.sanitized_input} />
        <JsonPanel title="Saída sanitizada" value={inspected.sanitized_output ?? inspected.error} />
      </div>}
    </section>
  )
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <div><h4 className="mb-1 text-sm font-medium">{title}</h4>
    <pre className="max-h-72 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-100">{JSON.stringify(value, null, 2)}</pre>
  </div>
}
