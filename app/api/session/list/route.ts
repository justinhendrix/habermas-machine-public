import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkInstructorSecret } from '@/lib/auth'

// GET: List all sessions (instructor only)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || !checkInstructorSecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            participants: true,
            groups: true,
          },
        },
      },
    })

    return NextResponse.json(
      sessions.map(s => ({
        id: s.id,
        code: s.code,
        question: s.question,
        phase: s.phase,
        groupSize: s.groupSize,
        createdAt: s.createdAt,
        participantCount: s._count.participants,
        groupCount: s._count.groups,
      }))
    )
  } catch (err: any) {
    console.error('Error listing sessions:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
