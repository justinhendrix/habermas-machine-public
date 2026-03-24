'use client'

export function PhaseJoining({
  session,
  participantId,
}: {
  session: any
  participantId: string
}) {
  const me = session.participants.find((p: any) => p.id === participantId)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
          <span className="text-2xl">⏳</span>
        </div>
        <h3 className="text-lg font-semibold text-slate">Waiting for the session to start</h3>
        <p className="text-sm text-gray-500 mt-1">
          The instructor will begin the deliberation when everyone has joined.
        </p>
      </div>

      {me && (
        <p className="text-sm text-center text-gray-600">
          You joined as <strong>{me.displayName}</strong>
        </p>
      )}

      <div className="bg-gray-50 rounded-md p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {session.participantCount} participant{session.participantCount !== 1 ? 's' : ''} joined:
        </p>
        <div className="flex flex-wrap gap-2">
          {session.participants.map((p: any) => (
            <span
              key={p.id}
              className={`text-xs px-2 py-1 rounded-full ${
                p.id === participantId
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {p.displayName}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
