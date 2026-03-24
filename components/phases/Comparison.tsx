'use client'

import { useState } from 'react'

export function PhaseComparison({
  session,
  participantId,
  group,
}: {
  session: any
  participantId: string
  group: any
}) {
  const [preference, setPreference] = useState<'INITIAL' | 'REVISED' | null>(null)
  const [feltRepresented, setFeltRepresented] = useState<number | null>(null)
  const [processFair, setProcessFair] = useState<number | null>(null)
  const [revisedImproved, setRevisedImproved] = useState<number | null>(null)
  const [reflection, setReflection] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initialWinner = (group?.candidates?.initial || []).find((c: any) => c.isWinner)
  const revisedWinner = (group?.candidates?.revised || []).find((c: any) => c.isWinner)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!preference) {
      setError('Please select which statement you prefer')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          preference,
          feltRepresented,
          processFair,
          revisedImproved,
          reflection: reflection.trim() || null,
        }),
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

  const prefBreakdown = group?.preferenceBreakdown
  const totalPrefs = group?.finalPreferenceCount || 0
  const groupTotal = group?.participantCount || 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate mb-4">Final Comparison</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compare the initial and revised winning statements. Which better represents your group?
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Side-by-side statements */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Initial */}
            <label
              className={`block cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                preference === 'INITIAL'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="preference"
                  value="INITIAL"
                  checked={preference === 'INITIAL'}
                  onChange={() => setPreference('INITIAL')}
                  className="accent-primary"
                />
                <span className="text-sm font-semibold text-gray-700">Initial Statement</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {initialWinner?.text || 'Not available'}
              </p>
            </label>

            {/* Revised */}
            <label
              className={`block cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                preference === 'REVISED'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="preference"
                  value="REVISED"
                  checked={preference === 'REVISED'}
                  onChange={() => setPreference('REVISED')}
                  className="accent-primary"
                />
                <span className="text-sm font-semibold text-gray-700">Revised Statement</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {revisedWinner?.text || 'Not available'}
              </p>
            </label>
          </div>

          {/* Likert scales */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Optional reflection (1 = strongly disagree, 5 = strongly agree):</p>

            <LikertRow
              label="I felt represented in the final statement"
              value={feltRepresented}
              onChange={setFeltRepresented}
            />
            <LikertRow
              label="The process was fair"
              value={processFair}
              onChange={setProcessFair}
            />
            <LikertRow
              label="The revised statement improved on the initial one"
              value={revisedImproved}
              onChange={setRevisedImproved}
            />
          </div>

          {/* Reflection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Any thoughts on this process? (optional)
            </label>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              rows={3}
              placeholder="What did you learn? What surprised you?"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !preference || submitted}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : submitted ? '✓ Submitted' : 'Submit Final Preference'}
          </button>
        </form>

        {submitted && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              ✓ Thank you! Waiting for others… ({totalPrefs}/{groupTotal})
            </p>
          </div>
        )}

        {/* Show results if available */}
        {prefBreakdown && (prefBreakdown.initial > 0 || prefBreakdown.revised > 0) && submitted && (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-2">Group Preference:</p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{prefBreakdown.initial}</p>
                <p className="text-xs text-gray-500">Initial</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{prefBreakdown.revised}</p>
                <p className="text-xs text-gray-500">Revised</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LikertRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-sm text-gray-600 sm:w-2/3">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
              value === n
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
