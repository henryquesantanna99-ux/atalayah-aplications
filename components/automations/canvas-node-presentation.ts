export type CanvasNodeStatus = 'success' | 'running' | 'skipped' | 'failed'
export const canvasNodePresentation: Record<CanvasNodeStatus, { label: string; className: string }> = {
  success: { label: 'Concluído', className: 'border-green-500 bg-green-50 text-green-900' },
  running: { label: 'Executando', className: 'border-blue-500 animate-pulse' },
  skipped: { label: 'Ignorado', className: 'border-slate-300 opacity-60' },
  failed: { label: 'Falhou', className: 'border-red-500 bg-red-50 text-red-900' },
}
