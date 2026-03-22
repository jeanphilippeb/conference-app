import { useLeaderboard, LeaderboardEntry } from '@/hooks/useLeaderboard'
import { getInitialsColorClass, coveragePercent } from '@/lib/helpers'
import type { Target } from '@/lib/types'
import { RefreshCw } from 'lucide-react'

interface LeaderboardProps {
  conferenceId: string
  conferenceName?: string
  onClose: () => void
}

export function Leaderboard({ conferenceId, conferenceName, onClose }: LeaderboardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full rounded-t-3xl flex flex-col"
        style={{ background: 'var(--bg-card)', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-600" />
        </div>
        <LeaderboardContent conferenceId={conferenceId} conferenceName={conferenceName} targets={[]} />
      </div>
    </div>
  )
}

export function LeaderboardContent({ conferenceId, conferenceName, targets, entries: entriesProp, loading: loadingProp }: {
  conferenceId?: string
  conferenceName?: string
  targets: Target[]
  // When called from GameSheet, data is pre-loaded and passed as props
  entries?: LeaderboardEntry[]
  loading?: boolean
}) {
  // Fallback: fetch independently when not pre-loaded (e.g. standalone Leaderboard modal)
  const { entries: fetchedEntries, loading: fetchedLoading } = useLeaderboard(conferenceId)
  const entries = entriesProp ?? fetchedEntries
  const loading = loadingProp ?? fetchedLoading

  const totalTargets = targets.length
  const totalMet = targets.filter(t => (t.interactions || []).some(i => i.status === 'met')).length
  const mustMeetTotal = targets.filter(t => t.priority === 'must_meet').length
  const mustMeetDone = targets.filter(t =>
    t.priority === 'must_meet' && (t.interactions || []).some(i => i.status === 'met')
  ).length
  const totalPct = coveragePercent(totalMet, totalTargets)
  const mustMeetPct = coveragePercent(mustMeetDone, mustMeetTotal)

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-2 pb-3 flex-shrink-0">
        <h2 className="text-[var(--text)] font-black text-xl tracking-tight">Leaderboard</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
          {conferenceName || 'All-time scores'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm text-center py-12">
            No interactions yet — be first on the board!
          </p>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="px-4 mb-4">
                {top3.map((entry, idx) => (
                  <PodiumRow key={entry.userId} entry={entry} rank={idx + 1} />
                ))}
              </div>
            )}

            {/* Rest of the list */}
            {rest.length > 0 && (
              <div className="px-4 space-y-1.5">
                <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-widest mb-2 px-1">
                  Others
                </p>
                {rest.map((entry, idx) => (
                  <CompactRow key={entry.userId} entry={entry} rank={idx + 4} />
                ))}
              </div>
            )}

            {/* Team Coverage */}
            {conferenceId && totalTargets > 0 && (
              <div className="mx-4 mt-5 rounded-2xl p-4" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-widest mb-3">
                  Team Coverage
                </p>
                <div className="space-y-3">
                  <CoverageBar label={`Total met`} value={totalMet} total={totalTargets} pct={totalPct} />
                  {mustMeetTotal > 0 && (
                    <CoverageBar label="Must-Meet" value={mustMeetDone} total={mustMeetTotal} pct={mustMeetPct} gold />
                  )}
                </div>
                {mustMeetTotal > 0 && (
                  <p className="text-center text-[var(--text-muted)] text-xs mt-3">
                    {mustMeetDone < mustMeetTotal
                      ? `${mustMeetTotal - mustMeetDone} Must-Meet left for Grand Slam 👑`
                      : '👑 Grand Slam achieved!'}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const RANK_STYLES: Record<number, { border: string; badge: string; glow: string }> = {
  1: { border: '#FBBF24', badge: '🥇', glow: 'rgba(251,191,36,0.12)' },
  2: { border: '#94a3b8', badge: '🥈', glow: 'rgba(148,163,184,0.08)' },
  3: { border: '#cd7c3f', badge: '🥉', glow: 'rgba(205,124,63,0.08)' },
}

function PodiumRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const style = RANK_STYLES[rank]
  const initial = entry.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colorClass = getInitialsColorClass(entry.name)
  const isFirst = rank === 1

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-2"
      style={{
        background: style.glow,
        border: `1px solid ${style.border}30`,
        boxShadow: isFirst ? `0 0 20px ${style.glow}` : undefined,
      }}
    >
      <span className="text-xl w-6 text-center flex-shrink-0">{style.badge}</span>

      <div className="relative flex-shrink-0">
        <div className={`${isFirst ? 'w-12 h-12' : 'w-10 h-10'} rounded-full flex items-center justify-center overflow-hidden text-sm font-bold text-[var(--text)] ${colorClass}`}>
          {entry.avatarUrl
            ? <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="" />
            : initial
          }
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full overflow-hidden border-2 flex items-center justify-center"
          style={{ borderColor: 'var(--bg-card)', background: 'var(--bg-elevated)' }}
        >
          <img
            src={entry.level.icon} alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              el.parentElement!.innerHTML = `<span style="font-size:10px">${entry.level.emoji}</span>`
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[var(--text)] font-bold leading-tight truncate ${isFirst ? 'text-base' : 'text-sm'}`}>
          {entry.name}
        </p>
        <p className="text-[var(--text-secondary)] text-xs mt-0.5 truncate">
          {entry.level.emoji} {entry.level.creatureName}
          {entry.metCount > 0 && <span className="text-[var(--text-muted)]"> · {entry.metCount} met</span>}
        </p>
      </div>

      <div className="flex flex-col items-end flex-shrink-0">
        <span className="font-black" style={{ color: '#FBBF24', fontSize: isFirst ? '20px' : '16px' }}>
          {entry.conferenceScore}
        </span>
        <span className="text-[var(--text-muted)] text-[10px]">pts</span>
      </div>
    </div>
  )
}

function CompactRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const initial = entry.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colorClass = getInitialsColorClass(entry.name)

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: 'var(--bg-elevated)' }}
    >
      <span className="w-5 text-center text-xs font-bold text-[var(--text-muted)] flex-shrink-0">{rank}</span>

      <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold text-[var(--text)] flex-shrink-0 ${colorClass}`}>
        {entry.avatarUrl
          ? <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="" />
          : initial
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[var(--text)] text-sm font-medium truncate">{entry.name}</p>
        <p className="text-[var(--text-muted)] text-[10px] truncate">{entry.level.emoji} {entry.level.creatureName}</p>
      </div>

      <span className="text-sm font-black flex-shrink-0" style={{ color: '#FBBF24' }}>
        {entry.conferenceScore}
      </span>
    </div>
  )
}

function CoverageBar({ label, value, total, pct, gold }: {
  label: string; value: number; total: number; pct: number; gold?: boolean
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[var(--text-secondary)] text-xs">{label}</span>
        <span className="text-[var(--text-secondary)] text-xs">{value}/{total} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-[var(--bg-deep)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: gold ? 'linear-gradient(90deg,#FBBF24,#F59E0B)' : '#10b981' }}
        />
      </div>
    </div>
  )
}
