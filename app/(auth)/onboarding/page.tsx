import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from './onboarding-wizard'
import { PendingScreen } from './pending-screen'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Onboarding complete and active → go to app
  if (profile?.onboarding_completed && profile?.status === 'active') {
    redirect('/dashboard')
  }

  // Onboarding complete but pending admin approval
  if (profile?.onboarding_completed && profile?.status === 'pending') {
    return <PendingScreen userId={user.id} />
  }

  // Needs to complete onboarding
  return (
    <OnboardingWizard
      userId={user.id}
      initialName={profile?.full_name ?? user.user_metadata?.full_name ?? ''}
    />
  )
}
