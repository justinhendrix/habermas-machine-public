import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { aggregateRankings } from '@/lib/ranking'
import { checkInstructorSecret } from '@/lib/auth'

// POST: Tally rankings and set winner for a group (instructor only)
export async function POST(req: NextRequest) {
  try {
    const { groupId, round, instructorSecret } = await req.json()

    if (!checkInstructorSecret(instructorSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!groupId || !round) {
      return NextResponse.json({ error: 'groupId and round required' }, { status: 400 })
    }

    const candidates = await prisma.candidateStatement.findMany({
      where: { groupId, round },
      orderBy: { candidateIndex: 'asc' },
    })

    if (candidates.length !== 4) {
      return NextResponse.json({ error: 'Expected 4 candidates' }, { status: 400 })
    }

    // Get all rankings for these candidates
    const rankings = await prisma.ranking.findMany({
      where: { candidateStatementId: { in: candidates.map(c => c.id) } },
    })

    if (rankings.length === 0) {
      return NextResponse.json({ error: 'No rankings submitted yet' }, { status: 400 })
    }

    // Aggregate using Borda count
    const results = aggregateRankings(
      rankings.map(r => ({ candidateId: r.candidateStatementId, rank: r.rank }))
    )

    // Update candidates with scores and winner flag
    for (const result of results) {
      await prisma.candidateStatement.update({
        where: { id: result.candidateId },
        data: {
          bordaScore: result.bordaScore,
          isWinner: result.isWinner,
        },
      })
    }

    const winner = results.find(r => r.isWinner)

    return NextResponse.json({
      results,
      winnerId: winner?.candidateId,
      voterCount: rankings.length / 4,
    })
  } catch (err: any) {
    console.error('Error tallying rankings:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
