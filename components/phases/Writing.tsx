'use client'

import { useState, useEffect } from 'react'

export function PhaseWriting({
  session,
  participantId,
  group,
}: {
  session: any
  participantId: string
  group: any
}) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load existing opinion on mount
  useEffect(() => {
    fetch(`/api/opinion?participantId=${participantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.opinion) {
          setText(data.opinion.text)
          setSubmitted(true)
        }
      })
      .catch(() => {})
  }, [participantId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, text: text.trim() }),
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

  const charCount = text.length
  const groupTotal = group?.participantCount || 0
  const submitted_count = group?.opinionCount || 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate mb-2">Write Your Opinion</h3>
        <p className="text-sm text-gray-600 mb-4">
          Share your honest view on the question. Aim for 100–250 words.
          Your opinion will be used (anonymously within your group) to generate candidate group statements.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setSubmitted(false) }}
            placeholder="Type your opinion here…"
            rows={6}
            maxLength={2000}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-y"
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${charCount > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount}/2000 characters
            </span>
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : submitted ? 'Update Opinion' : 'Submit Opinion'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {submitted && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              ✓ Opinion submitted! You can edit it until the instructor advances to the next phase.
            </p>
          </div>
        )}
      </div>

      {/* Group progress */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <p className="text-sm text-gray-600">
          <strong>{submitted_count}</strong> of <strong>{groupTotal}</strong> group members have submitted.
          {submitted_count < groupTotal && ' Waiting for others…'}
          {submitted_count >= groupTotal && ' All opinions are in!'}
        </p>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${groupTotal ? (submitted_count / groupTotal) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}
