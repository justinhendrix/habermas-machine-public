import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Look up a participant's group assignment
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: params.id },
      select: { id: true, groupId: true, displayName: true, sessionId: true },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: participant.id,
      groupId: participant.groupId,
      displayName: participant.displayName,
      sessionId: participant.sessionId,
    })
  } catch (err: any) {
    console.error('Error fetching participant:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
