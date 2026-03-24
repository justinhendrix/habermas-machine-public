export const PHASES = [
  'JOINING',
  'WRITING',
  'RANKING_INITIAL',
  'CRITIQUE',
  'RANKING_REVISED',
  'COMPARISON',
  'COMPLETE',
] as const

export type Phase = (typeof PHASES)[number]

export function nextPhase(current: Phase): Phase | null {
  const i = PHASES.indexOf(current)
  return i < PHASES.length - 1 ? PHASES[i + 1] : null
}

export function previousPhase(current: Phase): Phase | null {
  const i = PHASES.indexOf(current)
  return i > 0 ? PHASES[i - 1] : null
}

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase)
}

const LABELS: Record<Phase, string> = {
  JOINING: 'Joining',
  WRITING: 'Write Your Opinion',
  RANKING_INITIAL: 'Rank Initial Statements',
  CRITIQUE: 'Critique the Winner',
  RANKING_REVISED: 'Rank Revised Statements',
  COMPARISON: 'Final Comparison',
  COMPLETE: 'Complete',
}

const DESCRIPTIONS: Record<Phase, string> = {
  JOINING: 'Waiting for the instructor to start the session…',
  WRITING: 'Share your opinion on the question below.',
  RANKING_INITIAL:
    'The AI has drafted 4 candidate group statements. Rank them from best to worst.',
  CRITIQUE:
    'Read the winning statement and share what\'s good, what\'s missing, and what should change.',
  RANKING_REVISED:
    'The AI has revised the statements based on your critiques. Rank the new candidates.',
  COMPARISON:
    'Compare the initial and revised winners. Which better represents your group?',
  COMPLETE: 'The deliberation is complete. Thank you for participating!',
}

export function phaseLabel(phase: Phase): string {
  return LABELS[phase] || phase
}

export function phaseDescription(phase: Phase): string {
  return DESCRIPTIONS[phase] || ''
}
