import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Submit final preference (initial vs revised winner)
export async function POST(req: NextRequest) {
  try {
    const {
      participantId,
      preference,
      feltRepresented,
      processFair,
      revisedImproved,
      reflection,
    } = await req.json()

    if (!participantId || !preference) {
      return NextResponse.json({ error: 'participantId and preference required' }, { status: 400 })
    }

    if (!['INITIAL', 'REVISED'].includes(preference)) {
      return NextResponse.json({ error: 'preference must be INITIAL or REVISED' }, { status: 400 })
    }

    if (reflection && reflection.length > 2000) {
      return NextResponse.json({ error: 'Reflection must be under 2000 characters' }, { status: 400 })
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { session: true },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    if (participant.session.phase !== 'COMPARISON') {
      return NextResponse.json({ error: 'Not in comparison phase' }, { status: 400 })
    }

    if (!participant.groupId) {
      return NextResponse.json({ error: 'Not assigned to a group' }, { status: 400 })
    }

    // Upsert
    const existing = await prisma.finalPreference.findFirst({
      where: { participantId, sessionId: participant.sessionId },
    })

    const data = {
      preference,
      feltRepresented: feltRepresented || null,
      processFair: processFair || null,
      revisedImproved: revisedImproved || null,
      reflection: reflection?.trim() || null,
    }

    if (existing) {
      const updated = await prisma.finalPreference.update({
        where: { id: existing.id },
        data,
      })
      return NextResponse.json({ id: updated.id, updated: true })
    }

    const pref = await prisma.finalPreference.create({
      data: {
        ...data,
        participantId,
        groupId: participant.groupId,
        sessionId: participant.sessionId,
      },
    })

    return NextResponse.json({ id: pref.id })
  } catch (err: any) {
    console.error('Error submitting preference:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
