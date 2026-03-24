'use client'

export function PhaseComplete({
  session,
  group,
}: {
  session: any
  group: any
}) {
  const initialWinner = (group?.candidates?.initial || []).find((c: any) => c.isWinner)
  const revisedWinner = (group?.candidates?.revised || []).find((c: any) => c.isWinner)
  const prefBreakdown = group?.preferenceBreakdown

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-3">
          <span className="text-2xl">✓</span>
        </div>
        <h3 className="text-lg font-semibold text-slate">Deliberation Complete</h3>
        <p className="text-sm text-gray-500 mt-1">
          Thank you for participating in this deliberation exercise.
        </p>
      </div>

      {/* Results */}
      {(initialWinner || revisedWinner) && (
        <div className="grid md:grid-cols-2 gap-4">
          {initialWinner && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Initial Winner</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{initialWinner.text}</p>
              <p className="text-xs text-gray-400 mt-2">Score: {initialWinner.bordaScore} pts</p>
            </div>
          )}
          {revisedWinner && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Revised Winner</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{revisedWinner.text}</p>
              <p className="text-xs text-gray-400 mt-2">Score: {revisedWinner.bordaScore} pts</p>
            </div>
          )}
        </div>
      )}

      {/* Preference breakdown */}
      {prefBreakdown && (prefBreakdown.initial > 0 || prefBreakdown.revised > 0) && (
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">Group Preference</p>
          <div className="flex justify-center gap-8">
            <div>
              <p className="text-2xl font-bold text-primary">{prefBreakdown.initial}</p>
              <p className="text-xs text-gray-500">Preferred Initial</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{prefBreakdown.revised}</p>
              <p className="text-xs text-gray-500">Preferred Revised</p>
            </div>
          </div>
        </div>
      )}

      {/* Pedagogical note */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <p className="font-medium mb-2">Reflect on this experience:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Did the AI accurately capture your group&apos;s views?</li>
          <li>Did the critique-and-revision cycle improve the statement?</li>
          <li>Were minority perspectives preserved or flattened?</li>
          <li>What was gained or lost by having an AI mediate this process?</li>
          <li>Would you trust a process like this for real civic decisions?</li>
        </ul>
        <p className="text-xs mt-3 text-blue-600">
          This was a classroom simulation inspired by research — not a validated civic decision system.
        </p>
      </div>
    </div>
  )
}
