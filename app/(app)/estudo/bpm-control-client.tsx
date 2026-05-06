'use client'

import { BpmControl } from './bpm-control'

export function BpmControlClient({ originalBpm }: { originalBpm?: number | null }) {
  return <BpmControl originalBpm={originalBpm} />
}
