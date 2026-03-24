import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/llm'
import { buildDebriefPrompt } from '@/lib/prompts'
import { checkInstructorSecret } from '@/lib/auth'

// POST: Generate debrief summary (instructor only)
export async function POST(req: NextRequest) {
  try {
    const { sessionId, instructorSecret } = await req.json()

    if (!checkInstructorSecret(instructorSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        groups: {
          include: {
            opinions: true,
            candidateStatements: true,
            critiques: true,
            finalPreferences: true,
            participants: { select: { displayName: true } },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const groupData = session.groups.map(g => {
      const initialWinner = g.candidateStatements.find(
        c => c.round === 'INITIAL' && c.isWinner
      )
      const revisedWinner = g.candidateStatements.find(
        c => c.round === 'REVISED' && c.isWinner
      )

      return {
        name: g.name,
        participantCount: g.participants.length,
        opinions: g.opinions.map(o => o.text),
        initialWinner: initialWinner?.text || '(not generated)',
        revisedWinner: revisedWinner?.text || '(not generated)',
        critiques: g.critiques.map(c => ({
          good: c.good,
          missing: c.missing,
          unfair: c.unfair,
          changes: c.changes,
        })),
        preferencesSplit: {
          initial: g.finalPreferences.filter(p => p.preference === 'INITIAL').length,
          revised: g.finalPreferences.filter(p => p.preference === 'REVISED').length,
        },
      }
    })

    const { system, user } = buildDebriefPrompt({
      question: session.question,
      groups: groupData,
    })

    const summary = await generateText(user, system)

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error('Error generating debrief:', err)
    return NextResponse.json(
      { error: 'Failed to generate debrief. Please try again.' },
      { status: 500 }
    )
  }
}
