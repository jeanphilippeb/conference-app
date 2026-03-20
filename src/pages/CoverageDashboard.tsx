import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Target, Profile, Priority } from '@/lib/types'
import { getInitials, getInitialsColorClass, coveragePercent } from '@/lib/helpers'

interface TargetWithInteractions extends Target {
  interactions: Array<{
    id: string
    target_id: string
    user_id: string
    status: import('@/lib/types').InteractionStatus
    notes?: string
    met_at: string
    created_at: string
    profile?: Profile
  }>
}

interface RepStat {
  userId: string
  name: string
  avatarUrl?: string
  metCount: number
  recentTargets: Array<{ name: string; company: string }>
}

interface PriorityBreakdown {
  priority: Priority
  label: string
  total: number
  met: number
}

export function CoverageDashboard() {
  const { conferenceId } = useParams<{ conferenceId: string }>()
  const navigate = useNavigate()

  const [targets, setTargets] = useState<TargetWithInteractions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conferenceId) return

    async function fetchData() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('conference_targets')
        .select('*, interactions:conference_interactions(*, profile:conference_profiles(id, name, avatar_url))')
        .eq('conference_id', conferenceId)

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setTargets((data as TargetWithInteractions[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [conferenceId])

  const metTargets = useMemo(
    () => targets.filter(t => (t.interactions || []).some(i => i.status === 'met')),
    [targets]
  )

  const totalCount = targets.length
  const metCount = metTargets.length
  const pct = coveragePercent(metCount, totalCount)

  // Per-rep breakdown
  const repStats = useMemo<RepStat[]>(() => {
    const map = new Map<string, RepStat>()

    for (const target of targets) {
      const metInteractions = (target.interactions || []).filter(i => i.status === 'met')
      for (const interaction of metInteractions) {
        const profile = interaction.profile
        if (!profile) continue
        const existing = map.get(interaction.user_id)
        const targetName = `${target.first_name} ${target.last_name}`.trim()
        if (existing) {
          existing.metCount++
          if (existing.recentTargets.length < 3) {
            existing.recentTargets.push({ name: targetName, company: target.company })
          }
        } else {
          map.set(interaction.user_id, {
            userId: interaction.user_id,
            name: profile.name || 'Unknown',
            avatarUrl: profile.avatar_url,
            metCount: 1,
            recentTargets: [{ name: targetName, company: target.company }],
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.metCount - a.metCount)
  }, [targets])

  // Priority breakdown
  const priorityBreakdowns = useMemo<PriorityBreakdown[]>(() => {
    const priorities: Priority[] = ['must_meet', 'should_meet', 'nice_to_have']
    const labels: Record<Priority, string> = {
      must_meet: 'Must Meet',
      should_meet: 'Should Meet',
      nice_to_have: 'Nice to Have',
    }
    return priorities.map(priority => {
      const inPriority = targets.filter(t => t.priority === priority)
      const metInPriority = inPriority.filter(t =>
        (t.interactions || []).some(i => i.status === 'met')
      )
      return {
        priority,
        label: labels[priority],
        total: inPriority.length,
        met: metInPriority.length,
      }
    })
  }, [targets])

  // Top unmet must_meet targets
  const topUnmetMustMeet = useMemo(
    () =>
      targets
        .filter(
          t =>
            t.priority === 'must_meet' &&
            !(t.interactions || []).some(i => i.status === 'met')
        )
        .slice(0, 5),
    [targets]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Loading coverage data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate(`/conference/${conferenceId}`)}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text)] rounded-xl text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm pt-12 pb-4 px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/conference/${conferenceId}`)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-[var(--text)] font-bold text-lg">Team Coverage</h1>
            <p className="text-[var(--text-secondary)] text-xs">How the team is tracking</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Overall stat */}
        <div className="bg-[var(--bg-elevated)] rounded-2xl p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[var(--text-secondary)] text-sm mb-1">Overall coverage</p>
              <p className="text-[var(--text)] text-4xl font-bold">
                {metCount}
                <span className="text-[var(--text-secondary)] text-2xl font-medium">/{totalCount}</span>
              </p>
              <p className="text-[var(--text-secondary)] text-sm mt-0.5">targets met</p>
            </div>
            <div className="text-right">
              <p className={`text-5xl font-bold ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pct}%
              </p>
            </div>
          </div>
          <div className="h-3 bg-[var(--bg-deep)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Priority breakdown */}
        <div>
          <h2 className="text-[var(--text)] font-semibold text-sm mb-3">By Priority</h2>
          <div className="space-y-3">
            {priorityBreakdowns.map(breakdown => {
              const bPct = coveragePercent(breakdown.met, breakdown.total)
              return (
                <div key={breakdown.priority} className="bg-[var(--bg-elevated)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        breakdown.priority === 'must_meet'
                          ? 'bg-red-500'
                          : breakdown.priority === 'should_meet'
                          ? 'bg-orange-500'
                          : 'bg-slate-500'
                      }`} />
                      <span className="text-[var(--text)] text-sm font-medium">{breakdown.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[var(--text)] text-sm font-semibold">
                        {breakdown.met}/{breakdown.total}
                      </span>
                      <span className="text-[var(--text-secondary)] text-xs ml-1.5">({bPct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        breakdown.priority === 'must_meet'
                          ? 'bg-red-500'
                          : breakdown.priority === 'should_meet'
                          ? 'bg-orange-500'
                          : 'bg-slate-500'
                      }`}
                      style={{ width: `${bPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Per-rep breakdown */}
        {repStats.length > 0 && (
          <div>
            <h2 className="text-[var(--text)] font-semibold text-sm mb-3">Per Rep</h2>
            <div className="space-y-3">
              {repStats.map(rep => {
                const repPct = totalCount > 0 ? Math.round((rep.metCount / totalCount) * 100) : 0
                const colorClass = getInitialsColorClass(rep.name)
                const initials = getInitials(
                  rep.name.split(' ')[0] || '',
                  rep.name.split(' ')[1] || ''
                )
                return (
                  <div key={rep.userId} className="bg-[var(--bg-elevated)] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${colorClass}`}>
                        {rep.avatarUrl ? (
                          <img src={rep.avatarUrl} className="w-full h-full object-cover" alt={rep.name} />
                        ) : (
                          <span className="text-[var(--text)] text-xs font-bold">{initials}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text)] font-semibold text-sm truncate">{rep.name}</p>
                        <p className="text-[var(--text-secondary)] text-xs">{rep.metCount} met</p>
                      </div>
                      <span className="text-[var(--text)] font-bold text-sm">{repPct}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${repPct}%` }}
                      />
                    </div>
                    {rep.recentTargets.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">Last met</p>
                        {rep.recentTargets.map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                            <p className="text-[var(--text-secondary)] text-xs truncate">
                              {t.name}
                              {t.company ? <span className="text-[var(--text-muted)]"> · {t.company}</span> : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top unmet Must Meet */}
        {topUnmetMustMeet.length > 0 && (
          <div>
            <h2 className="text-[var(--text)] font-semibold text-sm mb-3">
              Unmet Must Meet{' '}
              <span className="text-red-400 font-normal">({topUnmetMustMeet.length})</span>
            </h2>
            <div className="space-y-2">
              {topUnmetMustMeet.map(target => {
                const colorClass = getInitialsColorClass(`${target.first_name} ${target.last_name}`)
                const initials = getInitials(target.first_name, target.last_name)
                return (
                  <div
                    key={target.id}
                    className="bg-[var(--bg-elevated)] rounded-xl p-3 flex items-center gap-3 border-l-4 border-l-red-500"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${colorClass}`}>
                      {target.photo_url ? (
                        <img src={target.photo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[var(--text)] text-xs font-bold">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text)] text-sm font-medium truncate">
                        {target.first_name} {target.last_name}
                      </p>
                      <p className="text-[var(--text-secondary)] text-xs truncate">
                        {[target.role, target.company].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {totalCount === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-sm">No targets found for this conference</p>
          </div>
        )}
      </div>
    </div>
  )
}
