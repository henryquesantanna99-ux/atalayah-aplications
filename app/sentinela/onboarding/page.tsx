import { getSentinelaContext } from '../_lib/data'
import { OnboardingClient } from './onboarding-client'

export default async function SentinelaOnboardingPage() {
  const { supabase, membership } = await getSentinelaContext()
  const [{ data: onboarding }, { data: avatar }] = await Promise.all([
    supabase.from('sentinela_onboarding').select('*').eq('membership_id', membership.id).maybeSingle(),
    supabase.from('sentinela_avatars').select('*').eq('membership_id', membership.id).maybeSingle(),
  ])
  return <OnboardingClient initialAnswers={onboarding?.answers ?? {}} initialAvatar={avatar?.configuration ?? {}} completed={onboarding?.status === 'completed'}/>
}
