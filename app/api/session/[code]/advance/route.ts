import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { nextPhase } from '@/lib/phase'
import { assignGroups } from '@/lib/grouping'
import { checkInstructorSecret } from '@/lib/auth'

// POST: Advance session to next phase (instructor only)
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { instructorSecret } = await req.json()

    if (!checkInstructorSecret(instructorSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { code: params.code },
      include: {
        participants: true,
        groups: {
          include: {
            candidateStatements: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const next = nextPhase(session.phase as any)
    if (!next) {
      return NextResponse.json({ error: 'Session is already complete' }, { status: 400 })
    }

    // Phase-specific guardrails
    if (session.phase === 'JOINING' && next === 'WRITING') {
      if (session.participants.length < 2) {
        return NextResponse.json(
          { error: 'Need at least 2 participants to start' },
          { status: 400 }
        )
      }

      // Assign groups if they don't exist
      if (session.groups.length === 0) {
        const assignments = assignGroups(
          session.participants.map(p => p.id),
          session.groupSize
        )

        for (const group of assignments) {
          const created = await prisma.group.create({
            data: {
              sessionId: session.id,
              name: group.groupName,
              number: group.groupNumber,
            },
          })

          await prisma.participant.updateMany({
            where: { id: { in: group.participantIds } },
            data: { groupId: created.id },
          })
        }
      }
    }

    // WRITING → RANKING_INITIAL: ensure candidates have been generated
    if (session.phase === 'WRITING' && next === 'RANKING_INITIAL') {
      const groupsWithoutCandidates = session.groups.filter(
        g => g.candidateStatements.filter(c => c.round === 'INITIAL').length === 0
      )
      if (groupsWithoutCandidates.length > 0) {
        const names = groupsWithoutCandidates.map(g => g.name).join(', ')
        return NextResponse.json(
          { error: `Generate initial candidates first. Missing: ${names}` },
          { status: 400 }
        )
      }
    }

    // RANKING_INITIAL → CRITIQUE: ensure votes have been tallied (a winner exists)
    if (session.phase === 'RANKING_INITIAL' && next === 'CRITIQUE') {
      const groupsWithoutWinner = session.groups.filter(
        g => !g.candidateStatements.some(c => c.round === 'INITIAL' && c.isWinner)
      )
      if (groupsWithoutWinner.length > 0) {
        const names = groupsWithoutWinner.map(g => g.name).join(', ')
        return NextResponse.json(
          { error: `Tally initial votes first. No winner in: ${names}` },
          { status: 400 }
        )
      }
    }

    // CRITIQUE → RANKING_REVISED: ensure revised candidates have been generated
    if (session.phase === 'CRITIQUE' && next === 'RANKING_REVISED') {
      const groupsWithoutRevised = session.groups.filter(
        g => g.candidateStatements.filter(c => c.round === 'REVISED').length === 0
      )
      if (groupsWithoutRevised.length > 0) {
        const names = groupsWithoutRevised.map(g => g.name).join(', ')
        return NextResponse.json(
          { error: `Generate revised candidates first. Missing: ${names}` },
          { status: 400 }
        )
      }
    }

    // RANKING_REVISED → COMPARISON: ensure revised votes have been tallied
    if (session.phase === 'RANKING_REVISED' && next === 'COMPARISON') {
      const groupsWithoutWinner = session.groups.filter(
        g => !g.candidateStatements.some(c => c.round === 'REVISED' && c.isWinner)
      )
      if (groupsWithoutWinner.length > 0) {
        const names = groupsWithoutWinner.map(g => g.name).join(', ')
        return NextResponse.json(
          { error: `Tally revised votes first. No winner in: ${names}` },
          { status: 400 }
        )
      }
    }

    // Update phase
    await prisma.session.update({
      where: { id: session.id },
      data: { phase: next },
    })

    return NextResponse.json({ phase: next })
  } catch (err: any) {
    console.error('Error advancing phase:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
