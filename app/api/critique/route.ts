import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Submit a critique
export async function POST(req: NextRequest) {
  try {
    const { participantId, good, missing, unfair, changes } = await req.json()

    if (!participantId) {
      return NextResponse.json({ error: 'participantId required' }, { status: 400 })
    }

    // At least one field should have content
    if (!good?.trim() && !missing?.trim() && !unfair?.trim() && !changes?.trim()) {
      return NextResponse.json({ error: 'Please fill in at least one critique field' }, { status: 400 })
    }

    // Length limits (each field max 2000 chars)
    const MAX_CRITIQUE = 2000
    if ((good?.length || 0) > MAX_CRITIQUE || (missing?.length || 0) > MAX_CRITIQUE ||
        (unfair?.length || 0) > MAX_CRITIQUE || (changes?.length || 0) > MAX_CRITIQUE) {
      return NextResponse.json({ error: 'Each critique field must be under 2000 characters' }, { status: 400 })
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { session: true },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    if (participant.session.phase !== 'CRITIQUE') {
      return NextResponse.json({ error: 'Not in critique phase' }, { status: 400 })
    }

    if (!participant.groupId) {
      return NextResponse.json({ error: 'Not assigned to a group' }, { status: 400 })
    }

    // Upsert — allow editing during critique phase
    const existing = await prisma.critique.findFirst({
      where: { participantId, sessionId: participant.sessionId },
    })

    const data = {
      good: good?.trim() || '',
      missing: missing?.trim() || '',
      unfair: unfair?.trim() || '',
      changes: changes?.trim() || '',
    }

    if (existing) {
      const updated = await prisma.critique.update({
        where: { id: existing.id },
        data,
      })
      return NextResponse.json({ id: updated.id, updated: true })
    }

    const critique = await prisma.critique.create({
      data: {
        ...data,
        participantId,
        groupId: participant.groupId,
        sessionId: participant.sessionId,
      },
    })

    return NextResponse.json({ id: critique.id })
  } catch (err: any) {
    console.error('Error submitting critique:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get participant's critique
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get('participantId')
  if (!participantId) {
    return NextResponse.json({ error: 'participantId required' }, { status: 400 })
  }

  const critique = await prisma.critique.findFirst({
    where: { participantId },
  })

  return NextResponse.json({ critique })
}
