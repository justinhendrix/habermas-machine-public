import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Submit an opinion
export async function POST(req: NextRequest) {
  try {
    const { participantId, text } = await req.json()

    if (!participantId || !text?.trim()) {
      return NextResponse.json({ error: 'Participant ID and text are required' }, { status: 400 })
    }

    if (text.trim().length > 2000) {
      return NextResponse.json({ error: 'Opinion is too long (max 2000 characters)' }, { status: 400 })
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { session: true },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    if (participant.session.phase !== 'WRITING') {
      return NextResponse.json({ error: 'Not in writing phase' }, { status: 400 })
    }

    if (!participant.groupId) {
      return NextResponse.json({ error: 'Not assigned to a group yet' }, { status: 400 })
    }

    // Upsert — allow editing opinion during writing phase
    const existing = await prisma.opinion.findFirst({
      where: { participantId, sessionId: participant.sessionId },
    })

    if (existing) {
      const updated = await prisma.opinion.update({
        where: { id: existing.id },
        data: { text: text.trim() },
      })
      return NextResponse.json({ id: updated.id, updated: true })
    }

    const opinion = await prisma.opinion.create({
      data: {
        participantId,
        groupId: participant.groupId,
        sessionId: participant.sessionId,
        text: text.trim(),
      },
    })

    return NextResponse.json({ id: opinion.id })
  } catch (err: any) {
    console.error('Error submitting opinion:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get participant's opinion
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get('participantId')
  if (!participantId) {
    return NextResponse.json({ error: 'participantId required' }, { status: 400 })
  }

  const opinion = await prisma.opinion.findFirst({
    where: { participantId },
  })

  return NextResponse.json({ opinion })
}
