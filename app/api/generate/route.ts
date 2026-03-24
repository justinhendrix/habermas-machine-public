import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/llm'
import { buildInitialCandidatesPrompt, buildRevisedCandidatesPrompt } from '@/lib/prompts'
import { parseCandidates } from '@/lib/prompts-parse'
import { checkInstructorSecret } from '@/lib/auth'

// POST: Generate candidate statements for a group (instructor only)
export async function POST(req: NextRequest) {
  try {
    const { groupId, round, instructorSecret } = await req.json()

    if (!checkInstructorSecret(instructorSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!groupId || !round) {
      return NextResponse.json({ error: 'groupId and round are required' }, { status: 400 })
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        session: true,
        opinions: { include: { participant: { select: { displayName: true } } } },
        critiques: true,
        candidateStatements: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const opinions = group.opinions.map(o => o.text)

    if (opinions.length === 0) {
      return NextResponse.json({ error: 'No opinions submitted in this group' }, { status: 400 })
    }

    // Check if candidates already exist for this round
    const existingCandidates = group.candidateStatements.filter(c => c.round === round)
    if (existingCandidates.length > 0) {
      return NextResponse.json({
        message: 'Candidates already generated for this round',
        candidates: existingCandidates,
      })
    }

    let promptData: { system: string; user: string }

    if (round === 'INITIAL') {
      promptData = buildInitialCandidatesPrompt(opinions)
    } else if (round === 'REVISED') {
      // Get winning initial statement
      const initialWinner = group.candidateStatements.find(
        c => c.round === 'INITIAL' && c.isWinner
      )
      if (!initialWinner) {
        return NextResponse.json(
          { error: 'No initial winner found. Complete initial ranking first.' },
          { status: 400 }
        )
      }

      const critiques = group.critiques.map(c => ({
        good: c.good,
        missing: c.missing,
        unfair: c.unfair,
        changes: c.changes,
      }))

      if (critiques.length === 0) {
        return NextResponse.json({ error: 'No critiques submitted yet' }, { status: 400 })
      }

      promptData = buildRevisedCandidatesPrompt(opinions, initialWinner.text, critiques)
    } else {
      return NextResponse.json({ error: 'Invalid round (use INITIAL or REVISED)' }, { status: 400 })
    }

    // Call LLM
    const rawResponse = await generateText(promptData.user, promptData.system)
    const candidates = parseCandidates(rawResponse)

    if (candidates.length !== 4) {
      console.error('Expected 4 candidates, got', candidates.length, 'Raw:', rawResponse)
      return NextResponse.json(
        { error: `AI generated ${candidates.length} candidates instead of 4. Please retry.` },
        { status: 500 }
      )
    }

    // Store candidates
    const created = []
    for (let i = 0; i < candidates.length; i++) {
      const c = await prisma.candidateStatement.create({
        data: {
          groupId: group.id,
          sessionId: group.sessionId,
          round,
          candidateIndex: i,
          text: candidates[i].text,
          rationale: candidates[i].rationale,
        },
      })
      created.push(c)
    }

    return NextResponse.json({ candidates: created })
  } catch (err: any) {
    console.error('Error generating candidates:', err)
    return NextResponse.json(
      { error: 'Failed to generate candidates. Please try again.' },
      { status: 500 }
    )
  }
}
