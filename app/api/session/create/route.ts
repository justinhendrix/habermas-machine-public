import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSessionCode } from '@/lib/session-code'
import { checkInstructorSecret } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { question, groupSize, instructorSecret } = body

    if (!checkInstructorSecret(instructorSecret)) {
      return NextResponse.json({ error: 'Invalid instructor secret' }, { status: 401 })
    }

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    if (question.trim().length > 1000) {
      return NextResponse.json({ error: 'Question is too long (max 1000 characters)' }, { status: 400 })
    }

    const safeGroupSize = Math.max(2, Math.min(8, Number(groupSize) || 5))

    // Generate unique session code
    let code: string
    let attempts = 0
    do {
      code = generateSessionCode()
      const existing = await prisma.session.findUnique({ where: { code } })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })
    }

    const session = await prisma.session.create({
      data: {
        code,
        question: question.trim(),
        groupSize: safeGroupSize,
        phase: 'JOINING',
        instructorSecret: '(redacted)',
      },
    })

    return NextResponse.json({
      id: session.id,
      code: session.code,
      question: session.question,
      phase: session.phase,
    })
  } catch (err: any) {
    console.error('Error creating session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
