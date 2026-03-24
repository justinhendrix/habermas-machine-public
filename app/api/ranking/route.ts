import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Submit rankings for a set of candidates
export async function POST(req: NextRequest) {
  try {
    const { participantId, rankings } = await req.json()
    // rankings: [{ candidateId: string, rank: number }]

    if (!participantId || !rankings?.length) {
      return NextResponse.json({ error: 'participantId and rankings required' }, { status: 400 })
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { session: true },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Validate phase
    const validPhases = ['RANKING_INITIAL', 'RANKING_REVISED']
    if (!validPhases.includes(participant.session.phase)) {
      return NextResponse.json({ error: 'Not in a ranking phase' }, { status: 400 })
    }

    // Validate all ranks are 1-4 and unique
    const ranks = rankings.map((r: any) => r.rank)
    const sorted = [...ranks].sort()
    if (sorted.join(',') !== '1,2,3,4') {
      return NextResponse.json({ error: 'Must rank all 4 candidates (1-4, no ties)' }, { status: 400 })
    }

    // Validate candidateIds belong to participant's group and correct round
    if (participant.groupId) {
      const round = participant.session.phase === 'RANKING_INITIAL' ? 'INITIAL' : 'REVISED'
      const validCandidates = await prisma.candidateStatement.findMany({
        where: { groupId: participant.groupId, round },
        select: { id: true },
      })
      const validIds = new Set(validCandidates.map(c => c.id))
      const allValid = rankings.every((r: any) => validIds.has(r.candidateId))
      if (!allValid) {
        return NextResponse.json({ error: 'Invalid candidate IDs' }, { status: 400 })
      }
    }

    // Delete any existing rankings by this participant for these candidates
    await prisma.ranking.deleteMany({
      where: {
        participantId,
        candidateStatementId: { in: rankings.map((r: any) => r.candidateId) },
      },
    })

    // Create new rankings
    for (const r of rankings) {
      await prisma.ranking.create({
        data: {
          participantId,
          candidateStatementId: r.candidateId,
          rank: r.rank,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error submitting ranking:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Check if participant has already ranked
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get('participantId')
  const round = req.nextUrl.searchParams.get('round')

  if (!participantId) {
    return NextResponse.json({ error: 'participantId required' }, { status: 400 })
  }

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  })

  if (!participant?.groupId) {
    return NextResponse.json({ hasRanked: false })
  }

  const candidates = await prisma.candidateStatement.findMany({
    where: { groupId: participant.groupId, round: round || 'INITIAL' },
  })

  const existingRankings = await prisma.ranking.findMany({
    where: {
      participantId,
      candidateStatementId: { in: candidates.map(c => c.id) },
    },
  })

  return NextResponse.json({
    hasRanked: existingRankings.length === 4,
    rankings: existingRankings.map(r => ({
      candidateId: r.candidateStatementId,
      rank: r.rank,
    })),
  })
}
