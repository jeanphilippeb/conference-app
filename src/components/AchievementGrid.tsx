import type { Target } from '@/lib/types'

interface Badge {
  id: string
  name: string
  emoji: string
  earned: boolean
}

interface AchievementGridProps {
  targets: Target[]
  lifetimeScore: number
}

export function AchievementGrid({ targets, lifetimeScore }: AchievementGridProps) {
  const badges = computeBadges(targets, lifetimeScore)

  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-6">
      {badges.map(badge => (
        <div key={badge.id} className="flex flex-col items-center gap-2">
          <span
            className="text-3xl transition-all"
            style={{ opacity: badge.earned ? 1 : 0.2, filter: badge.earned ? 'none' : 'grayscale(1)' }}
          >
            {badge.emoji}
          </span>
          <span className={`text-xs text-center leading-tight ${badge.earned ? 'text-slate-300' : 'text-slate-600'}`}>
            {badge.name}
          </span>
        </div>
      ))}
    </div>
  )
}

function computeBadges(targets: Target[], lifetimeScore: number): Badge[] {
  const allInteractions = targets.flatMap(t => t.interactions || [])
  const metInteractions = allInteractions.filter(i => i.status === 'met')
  const mustMeetTargets = targets.filter(t => t.priority === 'must_meet')
  const mustMeetMet = mustMeetTargets.filter(t =>
    (t.interactions || []).some(i => i.status === 'met')
  )
  const confScore = metInteractions.reduce((sum, i: any) => sum + (i.score || 0), 0)

  const hourBuckets: Record<string, number> = {}
  metInteractions.forEach(i => {
    const h = new Date(i.met_at).toISOString().slice(0, 13)
    hourBuckets[h] = (hourBuckets[h] || 0) + 1
  })
  const maxInHour = Math.max(0, ...Object.values(hourBuckets))

  const dayBuckets: Record<string, number> = {}
  metInteractions.forEach(i => {
    const d = new Date(i.met_at).toDateString()
    dayBuckets[d] = (dayBuckets[d] || 0) + 1
  })
  const maxInDay = Math.max(0, ...Object.values(dayBuckets))

  const metWithNotes = metInteractions.filter(i => (i.notes || '').length > 20).length
  const notesCoverage = metInteractions.length > 0 ? metWithNotes / metInteractions.length : 0

  const earlyBird = metInteractions.filter(i => new Date(i.met_at).getHours() < 10).length >= 3

  return [
    { id: 'on_fire',    name: 'On Fire',    emoji: '🔥', earned: maxInHour >= 5 },
    { id: 'note_taker', name: 'Note Taker', emoji: '📝', earned: notesCoverage >= 0.8 },
    { id: 'sniper',     name: 'Sniper',     emoji: '🎯', earned: checkSniper(targets) },
    { id: 'closer',     name: 'Closer',     emoji: '🏆', earned: confScore >= 500 },
    { id: 'grand_slam', name: 'Grand Slam', emoji: '👑', earned: mustMeetTargets.length > 0 && mustMeetMet.length === mustMeetTargets.length },
    { id: 'goat',       name: 'GOAT',       emoji: '🐐', earned: lifetimeScore >= 1000 },
    { id: 'iron_will',  name: 'Iron Will',  emoji: '🦾', earned: maxInDay >= 10 },
    { id: 'early_bird', name: 'Early Bird', emoji: '🐦', earned: earlyBird },
    { id: 'iron_will2', name: 'First Blood',emoji: '⚡', earned: metInteractions.length >= 1 },
  ]
}

function checkSniper(targets: Target[]): boolean {
  const companies = [...new Set(targets.filter(t => t.priority === 'must_meet').map(t => t.company))]
  return companies.some(company => {
    const companyMustMeet = targets.filter(t => t.priority === 'must_meet' && t.company === company)
    return companyMustMeet.length > 0 && companyMustMeet.every(t =>
      (t.interactions || []).some(i => i.status === 'met')
    )
  })
}
