/**
 * Parse candidate statements from LLM responses.
 * Handles JSON in code blocks, raw JSON, and slightly malformed responses.
 */

interface Candidate {
  text: string
  rationale: string
}

export function parseCandidates(raw: string): Candidate[] {
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : raw.trim()

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.candidates && Array.isArray(parsed.candidates)) {
      return validateCandidates(parsed.candidates)
    }
    if (Array.isArray(parsed)) {
      return validateCandidates(parsed)
    }
  } catch {
    // Fall through to fuzzy extraction
  }

  // Try to find JSON object in the raw text
  const objectMatch = raw.match(/\{[\s\S]*"candidates"[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        return validateCandidates(parsed.candidates)
      }
    } catch {
      // Fall through
    }
  }

  // Try to find JSON array in the raw text
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) {
        return validateCandidates(parsed)
      }
    } catch {
      // Fall through
    }
  }

  console.error('Failed to parse candidates from LLM response:', raw.substring(0, 500))
  return []
}

function validateCandidates(items: any[]): Candidate[] {
  return items
    .filter(
      (item) =>
        item &&
        typeof item.text === 'string' &&
        item.text.trim().length > 0 &&
        typeof item.rationale === 'string'
    )
    .map((item) => ({
      text: item.text.trim(),
      rationale: item.rationale.trim(),
    }))
}
