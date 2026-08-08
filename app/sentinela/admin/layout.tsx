import { redirect } from 'next/navigation'
import { requireSentinelaAdmin, SentinelaAuthorizationError } from '@/lib/sentinela/authorization'

export default async function SentinelaAdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSentinelaAdmin()
  } catch (error) {
    if (error instanceof SentinelaAuthorizationError) {
      redirect(error.status === 401 ? '/login' : '/sentinela')
    }
    throw error
  }

  return children
}
