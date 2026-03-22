import { useState } from 'react'
import { X } from 'lucide-react'
import type { Target } from '@/lib/types'

interface Badge {
  id: string
  name: string
  emoji: string
  earned: boolean
  howToEarn: string
}

interface AchievementGridProps {
  targets: Target[]
  lifetimeScore: number
}

export function AchievementGrid({ targets, lifetimeScore }: AchievementGridProps) {
  const [tooltip, setTooltip] = useState<Badge | null>(null)
  const badges = computeBadges(targets, lifetimeScore)

  return (
    <>
      <div className="grid grid-cols-3 gap-x-4 gap-y-6">
        {badges.map(badge => (
          <button
            key={badge.id}
            onClick={() => setTooltip(badge)}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${badge.earned ? 'bg-[var(--bg-deep)]' : ''}`}>
              <span
                className="text-3xl leading-none"
                style={badge.earned ? {} : { opacity: 0.25, filter: 'grayscale(1)' }}
              >
                {badge.emoji}
              </span>
              {badge.earned && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-elevated)] flex items-center justify-center">
                  <span className="text-[6px] text-white font-black">✓</span>
                </div>
              )}
            </div>
            <span className={`text-xs text-center leading-tight font-medium ${badge.earned ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
              {badge.name}
            </span>
          </button>
        ))}
      </div>

      {/* How-to-earn tooltip sheet */}
      {tooltip && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setTooltip(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm mx-auto rounded-t-3xl px-6 py-6 safe-bottom"
            style={{ background: 'var(--bg-elevated)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-9 h-1 rounded-full bg-[var(--border)]" />
            </div>

            <div className="flex items-start gap-4 mb-4">
              <span
                className="text-5xl flex-shrink-0"
                style={{ opacity: tooltip.earned ? 1 : 0.3, filter: tooltip.earned ? 'none' : 'grayscale(1)' }}
              >
                {tooltip.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[var(--text)] font-bold text-lg">{tooltip.name}</h3>
                  {tooltip.earned
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Earned ✓</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-deep)] text-[var(--text-muted)]">Locked</span>
                  }
                </div>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{tooltip.howToEarn}</p>
              </div>
            </div>

            <button
              onClick={() => setTooltip(null)}
              className="w-full py-3 rounded-2xl bg-[var(--bg-deep)] text-[var(--text-secondary)] text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
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
    {
      id: 'first_blood',
      name: 'First Blood',
      emoji: '⚡',
      earned: metInteractions.length >= 1,
      howToEarn: 'Record your very first meeting. Tap "I Met Them" on any contact to unlock.',
    },
    {
      id: 'grand_slam',
      name: 'Grand Slam',
      emoji: '👑',
      earned: mustMeetTargets.length > 0 && mustMeetMet.length === mustMeetTargets.length,
      howToEarn: `Meet every single Must Meet contact at this conference. You've met ${mustMeetMet.length}/${mustMeetTargets.length} so far.`,
    },
    {
      id: 'on_fire',
      name: 'On Fire',
      emoji: '🔥',
      earned: maxInHour >= 5,
      howToEarn: `Meet 5 or more people within the same hour. Your best hour so far: ${maxInHour} meeting${maxInHour !== 1 ? 's' : ''}.`,
    },
    {
      id: 'iron_will',
      name: 'Iron Will',
      emoji: '🦾',
      earned: maxInDay >= 10,
      howToEarn: `Meet 10 or more people in a single day. Your best day so far: ${maxInDay} meeting${maxInDay !== 1 ? 's' : ''}.`,
    },
    {
      id: 'note_taker',
      name: 'Note Taker',
      emoji: '📝',
      earned: notesCoverage >= 0.8,
      howToEarn: `Add notes to at least 80% of your meetings. Current coverage: ${metInteractions.length > 0 ? Math.round(notesCoverage * 100) : 0}%.`,
    },
    {
      id: 'early_bird',
      name: 'Early Bird',
      emoji: '🐦',
      earned: earlyBird,
      howToEarn: 'Meet 3 or more people before 10am on any conference day.',
    },
    {
      id: 'sniper',
      name: 'Sniper',
      emoji: '🎯',
      earned: checkSniper(targets),
      howToEarn: 'Meet every Must Meet contact from the same company. Mark all key people from one target company.',
    },
    {
      id: 'closer',
      name: 'Closer',
      emoji: '🏆',
      earned: confScore >= 500,
      howToEarn: `Score 500+ points in a single conference. Current conference score: ${confScore} pts.`,
    },
    {
      id: 'goat',
      name: 'GOAT',
      emoji: '🐐',
      earned: lifetimeScore >= 1000,
      howToEarn: `Reach 1,000 lifetime points across all conferences. You're at ${lifetimeScore} pts.`,
    },
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
