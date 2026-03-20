import type { Priority } from './types'

const BASE_SCORES = {
  met:      { must_meet: 30, should_meet: 20, nice_to_have: 10 },
  note:     { must_meet: 15, should_meet: 10, nice_to_have: 5 },
  followup: { must_meet: 15, should_meet: 10, nice_to_have: 5 },
} as const

export type ScoringAction = keyof typeof BASE_SCORES

export interface ScoreBonuses {
  firstOfDay: boolean
  firstHour: boolean
  streakMultiplier: number
}

export function calculateScore(
  action: ScoringAction,
  priority: Priority,
  bonuses: ScoreBonuses
): number {
  let score = BASE_SCORES[action][priority]
  if (bonuses.firstOfDay) score += 10
  if (bonuses.firstHour) score += 5
  return Math.round(score * bonuses.streakMultiplier)
}

export function isFirstInteractionOfDay(recentTimestamps: string[]): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return !recentTimestamps.some(ts => new Date(ts) >= today)
}

export function isFirstHourOfConference(conferenceStart: string): boolean {
  const start = new Date(conferenceStart)
  const now = new Date()
  return now.getTime() - start.getTime() < 60 * 60 * 1000
}
