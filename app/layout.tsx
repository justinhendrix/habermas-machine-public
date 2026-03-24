import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Habermas Machine — Classroom Deliberation Simulator',
  description: 'A classroom simulation of AI-mediated democratic deliberation, inspired by the Habermas Machine research protocol.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-primary text-white py-3 px-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-tight">
              Habermas Machine
            </a>
            <span className="text-xs text-blue-200 hidden sm:inline">
              Classroom Deliberation Simulator
            </span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-gray-400 py-6 px-4">
          A pedagogical simulation inspired by{' '}
          <a href="https://arxiv.org/pdf/2601.05904" className="underline" target="_blank" rel="noopener">
            &ldquo;Can AI Mediation Improve Democratic Deliberation?&rdquo;
          </a>
          {' '}· Not a validated civic decision system.
        </footer>
      </body>
    </html>
  )
}
