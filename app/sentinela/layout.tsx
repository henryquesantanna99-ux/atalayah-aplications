import type { Metadata } from 'next'
import './theme.css'

export const metadata: Metadata = { title: 'Sentinela', description: 'Uma jornada de fé, serviço e formação.' }

export default function SentinelaRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="sentinela-theme sentinela-noise min-h-screen">{children}</div>
}
