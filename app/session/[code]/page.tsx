'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { PhaseJoining } from '@/components/phases/Joining'
import { PhaseWriting } from '@/components/phases/Writing'
import { PhaseRanking } from '@/components/phases/Ranking'
import { PhaseCritique } from '@/components/phases/Critique'
import { PhaseComparison } from '@/components/phases/Comparison'
import { PhaseComplete } from '@/components/phases/Complete'

interface SessionData {
  id: string
  code: string
  question: string
  phase: string
  groupSize: number
  groups: any[]
  participantCount: number
  participants: any[]
}

export default function SessionPage() {
  const params = useParams()
  const code = params.code as string
  const [session, setSession] = useState<SessionData | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [myGroupId, setMyGroupId] = useState<string | null>(null)
  const [myGroup, setMyGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resolve participantId and groupId from localStorage on mount
  useEffect(() => {
    // Find participant ID — check all localStorage keys for a match
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith('participant-')) {
        const pid = localStorage.getItem(key)
        if (pid) {
          setParticipantId(pid)
          break
        }
      }
    }

    // Check for cached groupId
    const cachedGroupId = localStorage.getItem(`groupId-${code}`)
    if (cachedGroupId) {
      setMyGroupId(cachedGroupId)
    }
  }, [code])

  // Once we have participantId, resolve groupId if we don't have it
  const resolveGroupId = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/participant/${pid}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.groupId) {
        setMyGroupId(data.groupId)
        localStorage.setItem(`groupId-${code}`, data.groupId)
        return data.groupId
      }
    } catch {}
    return null
  }, [code])

  useEffect(() => {
    if (participantId && !myGroupId) {
      resolveGroupId(participantId)
    }
  }, [participantId, myGroupId, resolveGroupId])

  // Poll session state — 3s when waiting for group, 5s otherwise
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${code}`)
      if (!res.ok) {
        setError('Session not found')
        return
      }
      const data = await res.json()

      // Try to extract participantId from session.id if not set
      if (!participantId && data.id) {
        const stored = localStorage.getItem(`participant-${data.id}`)
        if (stored) setParticipantId(stored)
      }

      setSession(data)

      // Match group from data
      let gid = myGroupId || localStorage.getItem(`groupId-${code}`)

      // If no groupId yet and we have a participantId, try to resolve it
      if (!gid && participantId) {
        gid = await resolveGroupId(participantId)
      }

      if (gid && data.groups) {
        const group = data.groups.find((g: any) => g.id === gid)
        setMyGroup(group || null)
      }
    } catch {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [code, participantId, myGroupId, resolveGroupId])

  // Set up polling — faster when group not resolved
  useEffect(() => {
    fetchSession()

    // Clear existing interval
    if (pollRef.current) clearInterval(pollRef.current)

    // Poll faster (2s) when we don't have a group yet, normal (5s) otherwise
    const interval = myGroup ? 5000 : 2000
    pollRef.current = setInterval(fetchSession, interval)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchSession, myGroup])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading session…</div>
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Session not found'}</p>
        <a href="/" className="text-primary underline mt-4 inline-block">← Back to home</a>
      </div>
    )
  }

  if (!participantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You need to join this session first.</p>
        <a href={`/?code=${session.code}`} className="text-primary underline">Join session {session.code}</a>
      </div>
    )
  }

  // Phase progress bar
  const phases = ['JOINING', 'WRITING', 'RANKING_INITIAL', 'CRITIQUE', 'RANKING_REVISED', 'COMPARISON', 'COMPLETE']
  const phaseLabels = ['Join', 'Write', 'Rank', 'Critique', 'Revise', 'Compare', 'Done']
  const currentIndex = phases.indexOf(session.phase)

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-gray-400">Session {session.code}</span>
          {myGroup && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {myGroup.name}
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-slate leading-snug">{session.question}</h2>
      </div>

      {/* Phase Progress */}
      <div className="flex items-center gap-1 px-1">
        {phaseLabels.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div
              className={`h-1.5 rounded-full mb-1 transition-colors ${
                i <= currentIndex ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
            <span className={`text-[10px] ${
              i === currentIndex ? 'text-primary font-semibold' : 'text-gray-400'
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Phase Content */}
      {session.phase === 'JOINING' && (
        <PhaseJoining session={session} participantId={participantId} />
      )}

      {session.phase === 'WRITING' && (
        <PhaseWriting
          session={session}
          participantId={participantId}
          group={myGroup}
        />
      )}

      {session.phase === 'RANKING_INITIAL' && (
        <PhaseRanking
          session={session}
          participantId={participantId}
          group={myGroup}
          round="INITIAL"
        />
      )}

      {session.phase === 'CRITIQUE' && (
        <PhaseCritique
          session={session}
          participantId={participantId}
          group={myGroup}
        />
      )}

      {session.phase === 'RANKING_REVISED' && (
        <PhaseRanking
          session={session}
          participantId={participantId}
          group={myGroup}
          round="REVISED"
        />
      )}

      {session.phase === 'COMPARISON' && (
        <PhaseComparison
          session={session}
          participantId={participantId}
          group={myGroup}
        />
      )}

      {session.phase === 'COMPLETE' && (
        <PhaseComplete session={session} group={myGroup} />
      )}
    </div>
  )
}
