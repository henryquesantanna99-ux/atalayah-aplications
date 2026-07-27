import { canvasNodePresentation, type CanvasNodeStatus } from './canvas-node-presentation'
export function CanvasNode({ status, name }: { status: CanvasNodeStatus; name: string }) {
  const view = canvasNodePresentation[status]
  return <div role="status" data-status={status} aria-label={`${name}: ${view.label}`} className={view.className}>{name}<span>{view.label}</span></div>
}
