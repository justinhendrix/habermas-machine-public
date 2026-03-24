import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkInstructorSecret } from '@/lib/auth'

/** Take first 4 unique candidates by index, map to response shape */
function dedup4(candidates: any[]) {
  const seen = new Set<number>()
  const result: any[] = []
  for (const c of candidates) {
    if (seen.has(c.candidateIndex)) continue
    seen.add(c.candidateIndex)
    result.push({
      id: c.id,
      index: c.candidateIndex,
      text: c.text,
      rationale: c.rationale,
      bordaScore: c.bordaScore,
      isWinner: c.isWinner,
    })
    if (result.length >= 4) break
  }
  return result
}

// GET session state — polled by both students and instructor
// Pass ?secret=X for instructor view (includes participant IDs)
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const secret = req.nextUrl.searchParams.get('secret')
    const isInstructor = secret ? checkInstructorSecret(secret) : false

    const session = await prisma.session.findUnique({
      where: { code: params.code },
      include: {
        participants: {
          select: { id: true, displayName: true, groupId: true },
        },
        groups: {
          include: {
            participants: {
              select: { id: true, displayName: true },
            },
            opinions: {
              select: { id: true, participantId: true },
            },
            candidateStatements: {
              orderBy: [{ round: 'asc' }, { candidateIndex: 'asc' }, { id: 'asc' }],
            },
            critiques: {
              select: { id: true, participantId: true },
            },
            finalPreferences: {
              select: { id: true, participantId: true, preference: true },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Count rankings per group per round
    const rankingCounts: Record<string, { initial: number; revised: number }> = {}
    for (const group of session.groups) {
      const initialCandidates = group.candidateStatements.filter(c => c.round === 'INITIAL')
      const revisedCandidates = group.candidateStatements.filter(c => c.round === 'REVISED')

      let initialRankers = 0
      let revisedRankers = 0

      if (initialCandidates.length > 0) {
        const rankings = await prisma.ranking.findMany({
          where: { candidateStatementId: { in: initialCandidates.map(c => c.id) } },
          select: { participantId: true },
          distinct: ['participantId'],
        })
        initialRankers = rankings.length
      }

      if (revisedCandidates.length > 0) {
        const rankings = await prisma.ranking.findMany({
          where: { candidateStatementId: { in: revisedCandidates.map(c => c.id) } },
          select: { participantId: true },
          distinct: ['participantId'],
        })
        revisedRankers = rankings.length
      }

      rankingCounts[group.id] = { initial: initialRankers, revised: revisedRankers }
    }

    return NextResponse.json({
      id: session.id,
      code: session.code,
      question: session.question,
      phase: session.phase,
      groupSize: session.groupSize,
      createdAt: session.createdAt,
      participantCount: session.participants.length,
      // Only expose participant IDs to instructor; students see names only
      participants: session.participants.map(p => ({
        ...(isInstructor ? { id: p.id } : {}),
        displayName: p.displayName,
        groupId: p.groupId,
      })),
      groups: session.groups.map(g => ({
        id: g.id,
        name: g.name,
        number: g.number,
        participantCount: g.participants.length,
        participants: g.participants.map(p => ({
          ...(isInstructor ? { id: p.id } : {}),
          displayName: p.displayName,
        })),
        opinionCount: g.opinions.length,
        critiqueCount: g.critiques.length,
        initialRankingCount: rankingCounts[g.id]?.initial || 0,
        revisedRankingCount: rankingCounts[g.id]?.revised || 0,
        finalPreferenceCount: g.finalPreferences.length,
        preferenceBreakdown: {
          initial: g.finalPreferences.filter(p => p.preference === 'INITIAL').length,
          revised: g.finalPreferences.filter(p => p.preference === 'REVISED').length,
        },
        candidates: {
          // Dedup: take first 4 per round (duplicates can occur if generate is called twice)
          initial: dedup4(g.candidateStatements.filter(c => c.round === 'INITIAL')),
          revised: dedup4(g.candidateStatements.filter(c => c.round === 'REVISED')),
        },
      })),
    })
  } catch (err: any) {
    console.error('Error fetching session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
