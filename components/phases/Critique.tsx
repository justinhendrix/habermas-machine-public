'use client'

import { useState, useEffect } from 'react'

export function PhaseCritique({
  session,
  participantId,
  group,
}: {
  session: any
  participantId: string
  group: any
}) {
  const [good, setGood] = useState('')
  const [missing, setMissing] = useState('')
  const [unfair, setUnfair] = useState('')
  const [changes, setChanges] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Find winning initial statement
  const winner = (group?.candidates?.initial || []).find((c: any) => c.isWinner)

  // Load existing critique
  useEffect(() => {
    fetch(`/api/critique?participantId=${participantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.critique) {
          setGood(data.critique.good || '')
          setMissing(data.critique.missing || '')
          setUnfair(data.critique.unfair || '')
          setChanges(data.critique.changes || '')
          setSubmitted(true)
        }
      })
      .catch(() => {})
  }, [participantId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!good.trim() && !missing.trim() && !unfair.trim() && !changes.trim()) {
      setError('Please fill in at least one field')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, good, missing, unfair, changes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const critiqueCount = group?.critiqueCount || 0
  const groupTotal = group?.participantCount || 0

  return (
    <div className="space-y-4">
      {/* Winning statement */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate mb-2">The Winning Initial Statement</h3>
        <p className="text-xs text-gray-500 mb-3">
          This statement won the Borda count vote in your group. Now critique it.
        </p>
        {winner ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{winner.text}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Winning statement not yet determined. Waiting for tally…
          </p>
        )}
      </div>

      {/* Critique form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate mb-2">Your Critique</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your critiques will help the AI revise the group statement. Be specific about what should change.
          Fill in at least one field.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What&apos;s good about this statement?
            </label>
            <textarea
              value={good}
              onChange={e => { setGood(e.target.value); setSubmitted(false) }}
              rows={2}
              placeholder="What does it get right? What should be preserved?"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What&apos;s missing or underrepresented?
            </label>
            <textarea
              value={missing}
              onChange={e => { setMissing(e.target.value); setSubmitted(false) }}
              rows={2}
              placeholder="Are any perspectives left out? What should be added?"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What feels unfair or misrepresented?
            </label>
            <textarea
              value={unfair}
              onChange={e => { setUnfair(e.target.value); setSubmitted(false) }}
              rows={2}
              placeholder="Does the statement distort any view? What feels wrong?"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What specific changes would you suggest?
            </label>
            <textarea
              value={changes}
              onChange={e => { setChanges(e.target.value); setSubmitted(false) }}
              rows={2}
              placeholder="How would you rewrite or improve it?"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">At least one field required</span>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : submitted ? 'Update Critique' : 'Submit Critique'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {submitted && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              ✓ Critique submitted! You can edit until the instructor advances.
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <p className="text-sm text-gray-600">
          <strong>{critiqueCount}</strong> of <strong>{groupTotal}</strong> critiques submitted.
          {critiqueCount < groupTotal && ' Waiting for others…'}
        </p>
      </div>
    </div>
  )
}
