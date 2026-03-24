'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

export default function InstructorDashboard() {
  const params = useParams()
  const code = params.code as string
  const [session, setSession] = useState<any>(null)
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [tallying, setTallying] = useState<Record<string, boolean>>({})
  const [debrief, setDebrief] = useState<string | null>(null)
  const [generatingDebrief, setGeneratingDebrief] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Load instructor secret from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('instructorSecret')
    if (stored) setSecret(stored)
  }, [])

  // Poll session state
  const fetchSession = useCallback(async () => {
    try {
      const s = sessionStorage.getItem('instructorSecret') || ''
      const res = await fetch(`/api/session/${code}?secret=${encodeURIComponent(s)}`)
      if (!res.ok) { setError('Session not found'); return }
      setSession(await res.json())
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }, [code])

  useEffect(() => {
    fetchSession()
    const interval = setInterval(fetchSession, 5000)
    return () => clearInterval(interval)
  }, [fetchSession])

  // Actions
  async function advancePhase() {
    setActionError('')
    try {
      const res = await fetch(`/api/session/${code}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorSecret: secret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchSession()
    } catch (err: any) { setActionError(err.message) }
  }

  async function generateCandidates(groupId: string, round: string) {
    setGenerating(prev => ({ ...prev, [groupId]: true }))
    setActionError('')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2 min client timeout
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, round, instructorSecret: secret }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchSession()
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Generation timed out. Try again — Opus can take up to 60 seconds.'
        : (err.message || 'Generation failed. Try again.')
      setActionError(msg)
    } finally {
      setGenerating(prev => ({ ...prev, [groupId]: false }))
    }
  }

  async function generateAllCandidates(round: string) {
    if (!session?.groups) return
    setActionError('')
    for (const group of session.groups) {
      // Skip groups that already have candidates for this round
      const existing = round === 'INITIAL'
        ? group.candidates.initial.length
        : group.candidates.revised.length
      if (existing > 0) continue
      await generateCandidates(group.id, round)
    }
  }

  async function tallyVotes(groupId: string, round: string) {
    setTallying(prev => ({ ...prev, [groupId]: true }))
    setActionError('')
    try {
      const res = await fetch('/api/ranking/tally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, round, instructorSecret: secret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchSession()
    } catch (err: any) { setActionError(err.message) }
    finally { setTallying(prev => ({ ...prev, [groupId]: false })) }
  }

  async function tallyAll(round: string) {
    if (!session?.groups) return
    for (const group of session.groups) {
      await tallyVotes(group.id, round)
    }
  }

  async function generateDebriefSummary() {
    setGeneratingDebrief(true)
    setActionError('')
    try {
      const res = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, instructorSecret: secret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDebrief(data.summary)
    } catch (err: any) { setActionError(err.message) }
    finally { setGeneratingDebrief(false) }
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading…</div>
  if (error || !session) {
    return <div className="text-center py-12 text-red-600">{error || 'Session not found'}</div>
  }

  const phaseLabels: Record<string, string> = {
    JOINING: 'Joining',
    WRITING: 'Writing Opinions',
    RANKING_INITIAL: 'Ranking Initial Statements',
    CRITIQUE: 'Critiquing Winner',
    RANKING_REVISED: 'Ranking Revised Statements',
    COMPARISON: 'Final Comparison',
    COMPLETE: 'Complete',
  }

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?code=${session.code}`
    : ''

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Session Code</p>
            <p className="text-4xl font-mono font-bold text-primary tracking-widest">{session.code}</p>
            {joinUrl && (
              <p className="text-xs text-gray-500 mt-2">
                Share: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{joinUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(joinUrl)}
                  className="ml-2 text-primary underline text-xs"
                >copy</button>
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              session.phase === 'COMPLETE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {phaseLabels[session.phase] || session.phase}
            </span>
            <p className="text-xs text-gray-400 mt-1">
              {session.participantCount} participant{session.participantCount !== 1 ? 's' : ''}
              {' · '}
              {session.groups.length} group{session.groups.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-700">{session.question}</p>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* Phase Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate mb-4">Controls</h3>

        {/* JOINING */}
        {session.phase === 'JOINING' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {session.participantCount} student{session.participantCount !== 1 ? 's have' : ' has'} joined.
              Share the session code and wait for everyone.
            </p>
            {session.participantCount < 4 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-700">
                Only {session.participantCount} participants — consider waiting for more to form meaningful groups.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {session.participants.map((p: any) => (
                <span key={p.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{p.displayName}</span>
              ))}
            </div>
            <button onClick={advancePhase} className="btn-primary">
              Start Deliberation (Assign Groups)
            </button>
          </div>
        )}

        {/* WRITING */}
        {session.phase === 'WRITING' && (() => {
          const total = session.groups.reduce((s: number, g: any) => s + g.participantCount, 0)
          const done = session.groups.reduce((s: number, g: any) => s + g.opinionCount, 0)
          const missing = total - done
          return (
            <div className="space-y-3">
              <GroupProgress groups={session.groups} metric="opinionCount" label="opinions" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => generateAllCandidates('INITIAL')}
                  disabled={Object.values(generating).some(Boolean)}
                  className="btn-secondary"
                >
                  {Object.values(generating).some(Boolean) ? 'Generating…' : 'Generate All Initial Candidates'}
                </button>
                <button onClick={advancePhase} className="btn-primary">
                  Advance to Ranking
                  {missing > 0 && ` (${missing} pending)`}
                </button>
              </div>
            </div>
          )
        })()}

        {/* RANKING_INITIAL */}
        {session.phase === 'RANKING_INITIAL' && (() => {
          const total = session.groups.reduce((s: number, g: any) => s + g.participantCount, 0)
          const done = session.groups.reduce((s: number, g: any) => s + g.initialRankingCount, 0)
          const missing = total - done
          return (
            <div className="space-y-3">
              <GroupProgress groups={session.groups} metric="initialRankingCount" label="ranked" />
              <div className="flex flex-wrap gap-2">
                {session.groups.some((g: any) => g.candidates.initial.length === 0) && (
                  <button
                    onClick={() => generateAllCandidates('INITIAL')}
                    disabled={Object.values(generating).some(Boolean)}
                    className="btn-secondary"
                  >
                    {Object.values(generating).some(Boolean) ? 'Generating…' : 'Generate Missing Candidates'}
                  </button>
                )}
                <button
                  onClick={() => tallyAll('INITIAL')}
                  disabled={Object.values(tallying).some(Boolean)}
                  className="btn-secondary"
                >
                  {Object.values(tallying).some(Boolean) ? 'Tallying…' : 'Tally All Votes'}
                </button>
                <button onClick={advancePhase} className="btn-primary">
                  Advance to Critique{missing > 0 ? ` (${missing} haven't ranked)` : ''}
                </button>
              </div>
            </div>
          )
        })()}

        {/* CRITIQUE */}
        {session.phase === 'CRITIQUE' && (() => {
          const total = session.groups.reduce((s: number, g: any) => s + g.participantCount, 0)
          const done = session.groups.reduce((s: number, g: any) => s + g.critiqueCount, 0)
          const missing = total - done
          return (
            <div className="space-y-3">
              <GroupProgress groups={session.groups} metric="critiqueCount" label="critiques" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => generateAllCandidates('REVISED')}
                  disabled={Object.values(generating).some(Boolean)}
                  className="btn-secondary"
                >
                  {Object.values(generating).some(Boolean) ? 'Generating…' : 'Generate All Revised Candidates'}
                </button>
                <button onClick={advancePhase} className="btn-primary">
                  Advance to Revised Ranking{missing > 0 ? ` (${missing} pending)` : ''}
                </button>
              </div>
            </div>
          )
        })()}

        {/* RANKING_REVISED */}
        {session.phase === 'RANKING_REVISED' && (() => {
          const total = session.groups.reduce((s: number, g: any) => s + g.participantCount, 0)
          const done = session.groups.reduce((s: number, g: any) => s + g.revisedRankingCount, 0)
          const missing = total - done
          return (
            <div className="space-y-3">
              <GroupProgress groups={session.groups} metric="revisedRankingCount" label="ranked" />
              <div className="flex flex-wrap gap-2">
                {session.groups.some((g: any) => g.candidates.revised.length === 0) && (
                  <button
                    onClick={() => generateAllCandidates('REVISED')}
                    disabled={Object.values(generating).some(Boolean)}
                    className="btn-secondary"
                  >
                    {Object.values(generating).some(Boolean) ? 'Generating…' : 'Generate Missing Revised'}
                  </button>
                )}
                <button
                  onClick={() => tallyAll('REVISED')}
                  disabled={Object.values(tallying).some(Boolean)}
                  className="btn-secondary"
                >
                  {Object.values(tallying).some(Boolean) ? 'Tallying…' : 'Tally All Votes'}
                </button>
                <button onClick={advancePhase} className="btn-primary">
                  Advance to Comparison{missing > 0 ? ` (${missing} haven't ranked)` : ''}
                </button>
              </div>
            </div>
          )
        })()}

        {/* COMPARISON */}
        {session.phase === 'COMPARISON' && (() => {
          const total = session.groups.reduce((s: number, g: any) => s + g.participantCount, 0)
          const done = session.groups.reduce((s: number, g: any) => s + g.finalPreferenceCount, 0)
          const missing = total - done
          return (
            <div className="space-y-3">
              <GroupProgress groups={session.groups} metric="finalPreferenceCount" label="voted" />
              <button onClick={advancePhase} className="btn-primary">
                Complete Session{missing > 0 ? ` (${missing} haven't voted)` : ''}
              </button>
            </div>
          )
        })()}

        {/* COMPLETE */}
        {session.phase === 'COMPLETE' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Session complete. Use the group details below for debrief.</p>
            <button
              onClick={generateDebriefSummary}
              disabled={generatingDebrief}
              className="btn-secondary"
            >
              {generatingDebrief ? 'Generating Debrief…' : 'Generate Debrief Discussion Guide'}
            </button>
          </div>
        )}
      </div>

      {/* Final Adopted Statements — shown when session is complete */}
      {session.phase === 'COMPLETE' && session.groups.length > 0 && (() => {
        const statements = session.groups.map((g: any) => {
          const revisedWinner = g.candidates.revised.find((c: any) => c.isWinner)
          const initialWinner = g.candidates.initial.find((c: any) => c.isWinner)
          const adopted = revisedWinner || initialWinner
          const prefBreakdown = g.preferenceBreakdown
          return { name: g.name, statement: adopted, prefBreakdown }
        })
        const copyText = `DELIBERATION QUESTION:\n${session.question}\n\n` +
          statements.map((s: any) =>
            `${s.name}:\n${s.statement?.text || '(no statement adopted)'}\n` +
            (s.prefBreakdown ? `Preference: ${s.prefBreakdown.initial} initial / ${s.prefBreakdown.revised} revised` : '')
          ).join('\n\n')

        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate">Final Adopted Statements</h3>
              <button
                onClick={() => navigator.clipboard.writeText(copyText)}
                className="text-xs text-primary underline"
              >Copy all</button>
            </div>
            <div className="space-y-4">
              {statements.map((s: any) => (
                <div key={s.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-primary">{s.name}</h4>
                    {s.prefBreakdown && (s.prefBreakdown.initial > 0 || s.prefBreakdown.revised > 0) && (
                      <span className="text-xs text-gray-500">
                        Preferred revised: {s.prefBreakdown.revised} / Preferred initial: {s.prefBreakdown.initial}
                      </span>
                    )}
                  </div>
                  {s.statement ? (
                    <p className="text-sm text-gray-800 leading-relaxed">{s.statement.text}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No statement adopted</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Debrief summary */}
      {debrief && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate">Debrief Discussion Guide</h3>
            <button
              onClick={() => navigator.clipboard.writeText(debrief)}
              className="text-xs text-primary underline"
            >Copy</button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-700 mb-3">
            This is AI-generated instructor support, not ground truth.
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {debrief}
          </div>
        </div>
      )}

      {/* Group Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate">Groups</h3>
        {session.groups.map((group: any) => (
          <GroupCard
            key={group.id}
            group={group}
            session={session}
            expanded={expandedGroups[group.id] || false}
            onToggle={() => toggleGroup(group.id)}
            onGenerate={(round: string) => generateCandidates(group.id, round)}
            onTally={(round: string) => tallyVotes(group.id, round)}
            generating={generating[group.id]}
            tallying={tallying[group.id]}
          />
        ))}
      </div>

      {/* Inline styles for button classes */}
      <style jsx global>{`
        .btn-primary {
          @apply bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors;
        }
        .btn-secondary {
          @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors;
        }
      `}</style>
    </div>
  )
}

function GroupProgress({ groups, metric, label }: { groups: any[]; metric: string; label: string }) {
  const totalStudents = groups.reduce((sum: number, g: any) => sum + g.participantCount, 0)
  const totalSubmitted = groups.reduce((sum: number, g: any) => sum + (g[metric] || 0), 0)
  const overallPct = totalStudents ? Math.round((totalSubmitted / totalStudents) * 100) : 0
  const missing = totalStudents - totalSubmitted

  return (
    <div className="space-y-2">
      {/* Overall status */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${
          overallPct >= 100 ? 'text-green-600' : overallPct >= 80 ? 'text-green-600' : 'text-gray-500'
        }`}>
          {overallPct >= 100
            ? '✓ All students have submitted'
            : overallPct >= 80
            ? `✓ Ready to advance (${missing} still pending)`
            : `${totalSubmitted}/${totalStudents} ${label} — waiting for more`
          }
        </span>
      </div>
      {groups.map((g: any) => {
        const count = g[metric] || 0
        const total = g.participantCount
        const pct = total ? Math.round((count / total) * 100) : 0
        return (
          <div key={g.id} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 w-20">{g.name}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-primary'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">
              {count}/{total} {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GroupCard({
  group,
  session,
  expanded,
  onToggle,
  onGenerate,
  onTally,
  generating,
  tallying,
}: {
  group: any
  session: any
  expanded: boolean
  onToggle: () => void
  onGenerate: (round: string) => void
  onTally: (round: string) => void
  generating?: boolean
  tallying?: boolean
}) {
  const hasInitial = group.candidates.initial.length > 0
  const hasRevised = group.candidates.revised.length > 0
  const initialWinner = group.candidates.initial.find((c: any) => c.isWinner)
  const revisedWinner = group.candidates.revised.find((c: any) => c.isWinner)

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-slate">{group.name}</h4>
          <span className="text-xs text-gray-400">
            {group.participantCount} members
          </span>
        </div>
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Participants */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Members</p>
            <div className="flex flex-wrap gap-1">
              {group.participants.map((p: any) => (
                <span key={p.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.displayName}</span>
              ))}
            </div>
          </div>

          {/* Per-group generate/tally buttons */}
          <div className="flex flex-wrap gap-2">
            {!hasInitial && (
              <button onClick={() => onGenerate('INITIAL')} disabled={generating} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50">
                {generating ? 'Generating…' : 'Generate Initial'}
              </button>
            )}
            {hasInitial && !initialWinner && (
              <button onClick={() => onTally('INITIAL')} disabled={tallying} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-50">
                {tallying ? 'Tallying…' : 'Tally Initial'}
              </button>
            )}
            {!hasRevised && initialWinner && (
              <button onClick={() => onGenerate('REVISED')} disabled={generating} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50">
                {generating ? 'Generating…' : 'Generate Revised'}
              </button>
            )}
            {hasRevised && !revisedWinner && (
              <button onClick={() => onTally('REVISED')} disabled={tallying} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-50">
                {tallying ? 'Tallying…' : 'Tally Revised'}
              </button>
            )}
          </div>

          {/* Initial candidates */}
          {hasInitial && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Initial Candidates</p>
              <div className="space-y-2">
                {group.candidates.initial.map((c: any) => (
                  <div
                    key={c.id}
                    className={`text-xs p-3 rounded-md border ${
                      c.isWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">#{c.index + 1}</span>
                      {c.bordaScore > 0 && <span className="text-gray-500">{c.bordaScore} pts</span>}
                      {c.isWinner && <span className="font-semibold text-yellow-700">Winner</span>}
                    </div>
                    <p className="text-gray-700">{c.text}</p>
                    <p className="text-gray-500 italic mt-1">{c.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revised candidates */}
          {hasRevised && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Revised Candidates</p>
              <div className="space-y-2">
                {group.candidates.revised.map((c: any) => (
                  <div
                    key={c.id}
                    className={`text-xs p-3 rounded-md border ${
                      c.isWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">#{c.index + 1}</span>
                      {c.bordaScore > 0 && <span className="text-gray-500">{c.bordaScore} pts</span>}
                      {c.isWinner && <span className="font-semibold text-yellow-700">Winner</span>}
                    </div>
                    <p className="text-gray-700">{c.text}</p>
                    <p className="text-gray-500 italic mt-1">{c.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preference breakdown */}
          {(group.preferenceBreakdown.initial > 0 || group.preferenceBreakdown.revised > 0) && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Final Preference</p>
              <div className="flex gap-4 text-sm">
                <span>Initial: <strong>{group.preferenceBreakdown.initial}</strong></span>
                <span>Revised: <strong>{group.preferenceBreakdown.revised}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
