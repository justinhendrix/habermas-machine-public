/**
 * Assign participants to groups of roughly equal size.
 * Uses Fisher-Yates shuffle then distributes evenly.
 * Groups differ by at most 1 participant.
 */

export function assignGroups(
  participantIds: string[],
  groupSize: number = 5
): { groupNumber: number; groupName: string; participantIds: string[] }[] {
  // Shuffle
  const shuffled = [...participantIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const numGroups = Math.max(1, Math.ceil(shuffled.length / groupSize))
  const groups: { groupNumber: number; groupName: string; participantIds: string[] }[] = []

  for (let g = 0; g < numGroups; g++) {
    groups.push({
      groupNumber: g + 1,
      groupName: groupName(g),
      participantIds: [],
    })
  }

  // Distribute round-robin for even sizes
  for (let i = 0; i < shuffled.length; i++) {
    groups[i % numGroups].participantIds.push(shuffled[i])
  }

  return groups
}

export function groupName(index: number): string {
  const letter = String.fromCharCode(65 + index) // A, B, C, ...
  return `Group ${letter}`
}
