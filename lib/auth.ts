import { timingSafeEqual } from 'crypto'

/**
 * Timing-safe comparison of instructor secret.
 * Prevents timing attacks that could leak the secret character by character.
 */
export function checkInstructorSecret(provided: string): boolean {
  const expected = process.env.INSTRUCTOR_SECRET
  if (!expected || !provided) return false

  // Pad to same length to avoid leaking length information
  const maxLen = Math.max(provided.length, expected.length)
  const a = Buffer.alloc(maxLen, 0)
  const b = Buffer.alloc(maxLen, 0)
  a.write(provided)
  b.write(expected)

  return provided.length === expected.length && timingSafeEqual(a, b)
}
