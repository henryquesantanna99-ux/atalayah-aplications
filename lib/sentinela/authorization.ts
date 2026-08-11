import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { canManageRehearsals, type SentinelaGrant, type SentinelaRole } from './permissions'

export class SentinelaAuthorizationError extends Error {
  constructor(message: string, readonly status: 401 | 403 | 404 = 403) {
    super(message)
    this.name = 'SentinelaAuthorizationError'
  }
}

export async function loadSentinelaScope(seasonId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new SentinelaAuthorizationError('Não autenticado.', 401)

  let seasonQuery = supabase.from('sentinela_seasons').select('id, name, is_active')
  seasonQuery = seasonId ? seasonQuery.eq('id', seasonId) : seasonQuery.eq('is_active', true)
  const { data: season } = await seasonQuery.maybeSingle()
  if (!season) throw new SentinelaAuthorizationError('Temporada não encontrada.', 404)

  const { data: membership } = await supabase
    .from('sentinela_memberships')
    .select('id, season_id, user_id, role, grants')
    .eq('season_id', season.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) throw new SentinelaAuthorizationError('Sem acesso a esta temporada.')

  return {
    supabase,
    user,
    season,
    membership: {
      ...membership,
      role: membership.role as SentinelaRole,
      grants: membership.grants as SentinelaGrant[],
    },
  }
}

export async function requireSentinelaAdmin(seasonId?: string) {
  const scope = await loadSentinelaScope(seasonId)
  if (scope.membership.role !== 'journey_admin') {
    throw new SentinelaAuthorizationError('Acesso exclusivo da administração da jornada.')
  }
  return scope
}

export async function requireRehearsalManager(seasonId: string) {
  const scope = await loadSentinelaScope(seasonId)
  if (!canManageRehearsals(scope.membership)) {
    throw new SentinelaAuthorizationError('Sem permissão para administrar ensaios.')
  }
  return scope
}
