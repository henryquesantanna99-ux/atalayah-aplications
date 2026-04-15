import { redirect } from 'next/navigation'

// Root page — redirect to login (middleware handles auth checks)
export default function RootPage() {
  redirect('/login')
}
