/**
 * Borda Count Ranking Aggregation
 *
 * Each student ranks all 4 candidates from 1st to 4th.
 * Points are assigned inversely to rank:
 *   rank 1 → 4 points
 *   rank 2 → 3 points
 *   rank 3 → 2 points
 *   rank 4 → 1 point
 *
 * The candidate with the highest total Borda score wins.
 * Ties are broken by number of first-place votes.
 *
 * To swap in a different aggregation method (e.g., instant runoff),
 * replace the aggregateRankings function while keeping the same interface.
 */

interface RankingInput {
  candidateId: string
  rank: number // 1-4
}

interface AggregationResult {
  candidateId: string
  bordaScore: number
  firstPlaceVotes: number
  isWinner: boolean
}

/** Convert a rank (1-4) to Borda points. Rank 1 = highest points. */
export function bordaPoints(rank: number, candidateCount: number = 4): number {
  return candidateCount - rank + 1
}

/**
 * Aggregate rankings from multiple voters using Borda count.
 * Returns results sorted by score (descending), with winner flagged.
 */
export function aggregateRankings(
  rankings: RankingInput[],
  candidateCount: number = 4
): AggregationResult[] {
  // Tally scores per candidate
  const scores: Record<string, { bordaScore: number; firstPlaceVotes: number }> = {}

  for (const { candidateId, rank } of rankings) {
    if (!scores[candidateId]) {
      scores[candidateId] = { bordaScore: 0, firstPlaceVotes: 0 }
    }
    scores[candidateId].bordaScore += bordaPoints(rank, candidateCount)
    if (rank === 1) {
      scores[candidateId].firstPlaceVotes += 1
    }
  }

  // Sort by Borda score (desc), then first-place votes (desc) for tie-breaking
  const results: AggregationResult[] = Object.entries(scores)
    .map(([candidateId, { bordaScore, firstPlaceVotes }]) => ({
      candidateId,
      bordaScore,
      firstPlaceVotes,
      isWinner: false,
    }))
    .sort((a, b) => {
      if (b.bordaScore !== a.bordaScore) return b.bordaScore - a.bordaScore
      return b.firstPlaceVotes - a.firstPlaceVotes
    })

  // Mark the winner
  if (results.length > 0) {
    results[0].isWinner = true
  }

  return results
}

/** Plain-English explanation of the Borda count method, for display in the UI */
export const AGGREGATION_EXPLANATION =
  'Ranking uses Borda count: your 1st choice gets 4 points, 2nd gets 3, ' +
  '3rd gets 2, 4th gets 1. The candidate with the most total points wins. ' +
  'If there is a tie, the candidate with more first-place votes wins.'
