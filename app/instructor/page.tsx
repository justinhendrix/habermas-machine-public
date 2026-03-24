'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PRESET_QUESTIONS = [
  'Should AI systems be required to disclose when they are interacting with humans?',
  'Should social media platforms be liable for algorithmic amplification of harmful content?',
  'Should governments ban the use of facial recognition technology in public spaces?',
  'Should there be a universal basic income to address AI-driven job displacement?',
]

const PHASE_LABELS: Record<string, string> = {
  JOINING: 'Joining',
  WRITING: 'Writing',
  RANKING_INITIAL: 'Ranking',
  CRITIQUE: 'Critique',
  RANKING_REVISED: 'Revised Ranking',
  COMPARISON: 'Comparison',
  COMPLETE: 'Complete',
}

interface SessionSummary {
  id: string
  code: string
  question: string
  phase: string
  groupSize: number
  createdAt: string
  participantCount: number
  groupCount: number
}

export default function InstructorPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [question, setQuestion] = useState('')
  const [groupSize, setGroupSize] = useState(5)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Load secret from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('instructorSecret')
    if (stored) {
      setSecret(stored)
      setAuthenticated(true)
      fetchSessions(stored)
    }
  }, [])

  async function fetchSessions(s: string) {
    setLoadingSessions(true)
    try {
      const res = await fetch(`/api/session/list?secret=${encodeURIComponent(s)}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
        setAuthenticated(true)
      } else {
        setAuthenticated(false)
        setSessions([])
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleAuthenticate(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) return
    sessionStorage.setItem('instructorSecret', secret.trim())
    await fetchSessions(secret.trim())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim() || !question.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorSecret: secret.trim(),
          question: question.trim(),
          groupSize,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create session')
      sessionStorage.setItem('instructorSecret', secret.trim())
      router.push(`/instructor/${data.code}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  // If not yet authenticated, show just the secret field
  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-slate mb-4">Instructor Dashboard</h1>
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor Secret
              </label>
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Enter your instructor secret"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-dark transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Past Sessions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate">My Sessions</h2>
          {loadingSessions && <span className="text-xs text-gray-400">Loading…</span>}
        </div>

        {sessions.length === 0 && !loadingSessions ? (
          <p className="text-sm text-gray-500">No sessions yet. Create one below.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <a
                key={s.id}
                href={`/instructor/${s.code}`}
                className="block border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-primary">{s.code}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        s.phase === 'COMPLETE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {PHASE_LABELS[s.phase] || s.phase}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1">{s.question}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(s.createdAt)} · {s.participantCount} student{s.participantCount !== 1 ? 's' : ''} · {s.groupCount} group{s.groupCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-gray-300 text-sm mt-1">→</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Create New Session */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-slate mb-4">Create New Session</h2>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deliberation Question
            </label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Type a question for your class to deliberate on…"
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Or choose a preset:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors text-left"
                  >
                    {q.length > 60 ? q.slice(0, 60) + '…' : q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Size
            </label>
            <input
              type="number"
              value={groupSize}
              onChange={e => setGroupSize(Math.max(2, Math.min(8, parseInt(e.target.value) || 5)))}
              min={2}
              max={8}
              className="w-24 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended: 4–6 students per group. Min 2, max 8.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : 'Create Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
