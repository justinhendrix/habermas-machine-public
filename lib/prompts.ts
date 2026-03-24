/**
 * Prompt templates for AI-generated candidate statements.
 *
 * Two generation rounds:
 *   1. Initial candidates — synthesize opinions into 4 distinct group statements
 *   2. Revised candidates — incorporate critiques of the initial winner
 *
 * Plus a debrief summary for instructor discussion.
 */

const SYSTEM_BASE = `You are a neutral mediator helping a small group find common ground on a policy question. Your job is to draft candidate group statements that the group will vote on.

CRITICAL RULES:
- Synthesize common ground across the opinions provided
- Preserve genuine disagreement — do NOT force consensus where none exists
- Do NOT flatten minority views into bland, both-sides mush
- Do NOT invent arguments, facts, or positions not present in the submissions
- Use formulations like "The group agrees that…" or "Many members support… while others emphasize…"
- Only use first-person plural ("we believe") when it genuinely reflects a shared view
- If there is no consensus, clearly articulate the structure of disagreement
- Avoid partisan slogans, overconfident claims, and false balance
- Be faithful to the actual input — if a view was expressed by one person, don't claim it is widely shared
- Each candidate should be 80–140 words
- Produce EXACTLY 4 meaningfully DISTINCT candidates (different framings, emphases, structures — not minor rewording)
- Include a 1-sentence rationale for each candidate explaining what viewpoints it tries to reconcile

Respond with valid JSON in this exact format:
{
  "candidates": [
    { "text": "...", "rationale": "..." },
    { "text": "...", "rationale": "..." },
    { "text": "...", "rationale": "..." },
    { "text": "...", "rationale": "..." }
  ]
}`

export function buildInitialCandidatesPrompt(opinions: string[]): {
  system: string
  user: string
} {
  const numbered = opinions.map((o, i) => `Opinion ${i + 1}: ${o}`).join('\n\n')

  return {
    system: SYSTEM_BASE,
    user: `Here are ${opinions.length} individual opinions from group members on a policy question. Draft 4 candidate group statements.

${numbered}

Remember: produce exactly 4 distinct candidates as JSON. Each 80–140 words with a rationale.`,
  }
}

export function buildRevisedCandidatesPrompt(
  opinions: string[],
  winningInitialStatement: string,
  critiques: { good: string; missing: string; unfair: string; changes: string }[]
): { system: string; user: string } {
  const numbered = opinions.map((o, i) => `Opinion ${i + 1}: ${o}`).join('\n\n')

  const critiqueText = critiques
    .map(
      (c, i) =>
        `Critique ${i + 1}:
  Good: ${c.good || '(none)'}
  Missing: ${c.missing || '(none)'}
  Unfair/Misrepresented: ${c.unfair || '(none)'}
  Suggested changes: ${c.changes || '(none)'}`
    )
    .join('\n\n')

  return {
    system:
      SYSTEM_BASE +
      `\n\nADDITIONAL CONTEXT FOR REVISION:
You are now revising based on critiques of the initial winning statement.
- Preserve what was praised as "good"
- Add what was flagged as "missing" (if it reflects actual opinions)
- Fix what was called "unfair" or "misrepresented"
- Apply suggested changes where reasonable
- Still aim for broad group support
- Do NOT over-correct — balance critique response with fidelity to all original opinions
- Still produce 4 distinct revised candidates`,

    user: `ORIGINAL OPINIONS:
${numbered}

WINNING INITIAL STATEMENT (being revised):
${winningInitialStatement}

CRITIQUES FROM GROUP MEMBERS:
${critiqueText}

Based on the original opinions and these critiques, draft 4 revised candidate group statements. Each should address the critiques while still aiming for broad support. Produce exactly 4 distinct candidates as JSON, each 80–140 words with a rationale.`,
  }
}

export function buildDebriefPrompt(data: {
  question: string
  groups: {
    name: string
    participantCount: number
    opinions: string[]
    initialWinner: string
    revisedWinner: string
    critiques: { good: string; missing: string; unfair: string; changes: string }[]
    preferencesSplit: { initial: number; revised: number }
  }[]
}): { system: string; user: string } {
  const groupSummaries = data.groups
    .map(
      g => `## ${g.name} (${g.participantCount} participants)

### Original Opinions:
${g.opinions.map((o, i) => `${i + 1}. ${o}`).join('\n')}

### Initial Winning Statement:
${g.initialWinner}

### Critiques:
${g.critiques.map((c, i) => `- Critique ${i + 1}: Good: "${c.good}" | Missing: "${c.missing}" | Unfair: "${c.unfair}" | Changes: "${c.changes}"`).join('\n')}

### Revised Winning Statement:
${g.revisedWinner}

### Final Preference:
- Preferred initial: ${g.preferencesSplit.initial}
- Preferred revised: ${g.preferencesSplit.revised}`
    )
    .join('\n\n---\n\n')

  return {
    system: `You are helping a university instructor debrief a classroom deliberation exercise. Generate a concise discussion guide based on the session data.

This is AI-GENERATED INSTRUCTOR SUPPORT, not ground truth. Label it clearly as such.

Structure your response as:
1. **Session Summary** — 2-3 sentence overview
2. **Group Journeys** — For each group, a 2-3 sentence summary of how their statement evolved
3. **Cross-Group Patterns** — What themes appeared across groups? Where did groups diverge?
4. **Discussion Questions** — 4-5 specific questions for class discussion, tied to what actually happened
5. **Pedagogical Takeaways** — What does this exercise reveal about AI-mediated deliberation?

Keep it under 800 words. Be specific — reference actual content from the session.`,

    user: `DELIBERATION QUESTION: "${data.question}"

NUMBER OF GROUPS: ${data.groups.length}

${groupSummaries}

Generate a debrief discussion guide for the instructor.`,
  }
}
