'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    setJoining(true)
    setError('')
    try {
      const sessionCode = code.trim().toUpperCase()
      // Include reconnect token if we have one (for rejoining after tab close)
      const storedToken = localStorage.getItem(`reconnect-${sessionCode}`) || undefined
      const res = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sessionCode,
          displayName: name.trim(),
          reconnectToken: storedToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')
      // Store participant ID and reconnect token
      localStorage.setItem(`participant-${data.sessionId}`, data.participantId)
      localStorage.setItem(`reconnect-${data.sessionCode}`, data.reconnectToken)
      router.push(`/session/${data.sessionCode}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Explainer */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-slate mb-4">Welcome to the Habermas Machine</h1>
        <div className="prose prose-sm text-gray-600 space-y-2">
          <p>
            This is a classroom simulation of <strong>AI-mediated democratic deliberation</strong>,
            inspired by the research protocol described in{' '}
            <em>&ldquo;Can AI Mediation Improve Democratic Deliberation?&rdquo;</em> (Tessler et al., Science 2024).
          </p>
          <p className="font-medium text-gray-700">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>You <strong>write your opinion</strong> on a question</li>
            <li>An AI drafts <strong>4 candidate group statements</strong> that try to capture common ground</li>
            <li>You <strong>rank</strong> the candidates — the group picks a winner</li>
            <li>You <strong>critique</strong> the winning statement</li>
            <li>The AI <strong>revises</strong> the statements based on your feedback</li>
            <li>You <strong>rank again</strong> — a revised winner is chosen</li>
            <li>You <strong>compare</strong> the initial and revised winners</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ This is a pedagogical simulation, not a validated civic decision system.
            The AI may make mistakes in summarizing opinions. The critique phase is your chance to correct misrepresentation.
          </p>
        </div>
      </div>

      {/* Join Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Join a Session</h2>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Display Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              maxLength={30}
              required
            />
          </div>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Session Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3BK7N"
              className="w-full border rounded-md px-3 py-2 text-sm font-mono tracking-wider uppercase focus:ring-2 focus:ring-primary focus:border-primary"
              maxLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={joining}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {joining ? 'Joining…' : 'Join Session'}
          </button>
        </form>
      </div>

      {/* Instructor Link */}
      <div className="text-center">
        <a
          href="/instructor"
          className="text-sm text-gray-500 hover:text-primary underline"
        >
          Instructor? Create a session →
        </a>
      </div>
    </div>
  )
}
