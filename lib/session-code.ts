/**
 * Generate a short, readable session join code.
 * 6 characters, uppercase letters + digits.
 * Excludes ambiguous characters: 0/O, 1/I/L.
 */
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateSessionCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}
