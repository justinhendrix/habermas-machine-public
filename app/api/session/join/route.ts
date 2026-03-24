import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { code, displayName, reconnectToken } = await req.json()

    if (!code?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    if (displayName.trim().length > 50) {
      return NextResponse.json({ error: 'Name is too long (max 50 characters)' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { code: code.trim().toUpperCase() },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found. Check your code.' }, { status: 404 })
    }

    if (session.phase !== 'JOINING' && session.phase !== 'WRITING') {
      return NextResponse.json(
        { error: 'This session is no longer accepting new participants.' },
        { status: 400 }
      )
    }

    // Check for duplicate name in session
    const existingName = await prisma.participant.findFirst({
      where: { sessionId: session.id, displayName: displayName.trim() },
    })

    if (existingName) {
      // Only allow rejoin if the client provides the correct reconnect token
      if (reconnectToken && reconnectToken === existingName.reconnectToken) {
        return NextResponse.json({
          participantId: existingName.id,
          reconnectToken: existingName.reconnectToken,
          sessionId: session.id,
          sessionCode: session.code,
          groupId: existingName.groupId,
        })
      }
      // Name taken and no valid token — reject
      return NextResponse.json(
        { error: 'That name is already taken in this session. Choose a different name.' },
        { status: 409 }
      )
    }

    // Generate a reconnect token for this participant
    const token = randomBytes(16).toString('hex')

    const participant = await prisma.participant.create({
      data: {
        sessionId: session.id,
        displayName: displayName.trim(),
        reconnectToken: token,
      },
    })

    return NextResponse.json({
      participantId: participant.id,
      reconnectToken: token,
      sessionId: session.id,
      sessionCode: session.code,
      groupId: null,
    })
  } catch (err: any) {
    console.error('Error joining session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
