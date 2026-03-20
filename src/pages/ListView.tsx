import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal,
  X,
  BarChart2,
  Plus,
} from 'lucide-react'
import { useTargets } from '@/hooks/useTargets'
import { useAuthContext } from '@/context/AuthContext'
import { useGameSheet } from '@/context/GameSheetContext'
import { GameHeaderButton } from '@/components/GameHeaderButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StreakBanner } from '@/components/StreakBanner'
import {
  getInitials,
  getInitialsColorClass,
  getPriorityDotClass,
  coveragePercent,
} from '@/lib/helpers'
import { Target, Priority } from '@/lib/types'
import { supabase } from '@/lib/supabase'

type SortKey = 'priority' | 'name' | 'company' | 'recent'
type FilterType = 'all' | Priority | 'met' | 'not_met'

interface ConferenceInfo {
  name: string
  start_date: string
  end_date: string
}

function TargetRow({ target, currentUserId, onClick }: {
  target: Target
  currentUserId: string | undefined
  onClick: () => void
}) {
  const initials = getInitials(target.first_name, target.last_name)
  const colorClass = getInitialsColorClass(`${target.first_name} ${target.last_name}`)
  const dotClass = getPriorityDotClass(target.priority)

  const metInteractions = (target.interactions || []).filter(i => i.status === 'met')
  const isMetByAnyone = metInteractions.length > 0
  const isMetByCurrentUser = currentUserId
    ? metInteractions.some(i => i.user_id === currentUserId)
    : false

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)]/50 active:bg-[var(--bg-elevated)] transition-colors"
    >
      {/* Avatar */}
      <div className={`relative w-11 h-11 rounded-full flex-shrink-0 overflow-hidden ${colorClass}`}>
        {target.photo_url ? (
          <img
            src={target.photo_url}
            alt={`${target.first_name} ${target.last_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[var(--text)] font-bold text-sm">{initials}</span>
          </div>
        )}
        {isMetByCurrentUser && (
          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className="text-[var(--text)] font-medium text-sm truncate">
            {target.first_name} {target.last_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[var(--text-secondary)] text-xs truncate">{target.company}</span>
          {target.role && (
            <>
              <span className="text-[var(--text-muted)] text-xs">·</span>
              <span className="text-[var(--text-muted)] text-xs truncate">{target.role}</span>
            </>
          )}
        </div>
      </div>

      {/* Met indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isMetByAnyone && (
          <span className="text-xs text-emerald-400 font-medium">
            {metInteractions.length > 1 ? `${metInteractions.length}×` : '✓'}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
    </button>
  )
}

export function ListView() {
  const { conferenceId } = useParams<{ conferenceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { targets, loading } = useTargets(conferenceId)
  const [conference, setConference] = useState<ConferenceInfo | null>(null)
  const { setContext } = useGameSheet()

  useEffect(() => {
    if (!conferenceId) return
    supabase
      .from('conference_conferences')
      .select('name, start_date, end_date')
      .eq('id', conferenceId)
      .single()
      .then(({ data }) => {
        if (data) {
          setConference(data as ConferenceInfo)
          setContext({ conferenceId, conferenceName: (data as ConferenceInfo).name })
        }
      })
    return () => setContext(undefined)
  }, [conferenceId, setContext])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortKey>('priority')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const metCount = useMemo(
    () => targets.filter(t => (t.interactions || []).some(i => i.status === 'met')).length,
    [targets]
  )
  const totalCount = targets.length
  const pct = coveragePercent(metCount, totalCount)

  const mustMeetTotal = useMemo(() => targets.filter(t => t.priority === 'must_meet').length, [targets])
  const mustMeetDone = useMemo(
    () => targets.filter(t => t.priority === 'must_meet' && (t.interactions || []).some(i => i.status === 'met')).length,
    [targets]
  )

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'must_meet', label: 'Must Meet' },
    { key: 'should_meet', label: 'Should Meet' },
    { key: 'nice_to_have', label: 'Nice to Meet' },
    { key: 'met', label: 'Met ✓' },
    { key: 'not_met', label: 'Not Met' },
  ]

  const sortLabels: Record<SortKey, string> = {
    priority: 'Priority',
    name: 'Name',
    company: 'Company',
    recent: 'Recently Added',
  }

  const filteredSortedTargets = useMemo(() => {
    let list = targets

    if (filter === 'must_meet' || filter === 'should_meet' || filter === 'nice_to_have') {
      list = list.filter(t => t.priority === filter)
    } else if (filter === 'met') {
      list = list.filter(t => (t.interactions || []).some(i => i.status === 'met'))
    } else if (filter === 'not_met') {
      list = list.filter(t => !(t.interactions || []).some(i => i.status === 'met'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      )
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'priority': {
          const order: Record<string, number> = {
            must_meet: 0, should_meet: 1, nice_to_have: 2,
          }
          return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
        }
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case 'company':
          return (a.company || '').localeCompare(b.company || '')
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })
  }, [targets, filter, sort, searchQuery])

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm pt-12 pb-0">
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[var(--text)] font-bold text-base truncate">
              {conference?.name || '...'}
            </h1>
            <p className="text-[var(--text-secondary)] text-xs whitespace-nowrap">
              {metCount}/{totalCount} met · {pct}%
              {mustMeetTotal > 0 && mustMeetDone < mustMeetTotal && (
                <> · {mustMeetTotal - mustMeetDone} left 👑</>
              )}
              {mustMeetTotal > 0 && mustMeetDone >= mustMeetTotal && (
                <> · <span style={{ color: '#FBBF24' }}>Grand Slam 👑</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setSearchOpen(!searchOpen); setSearchQuery('') }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors"
            >
              {searchOpen ? <X className="w-4 h-4 text-[var(--text-secondary)]" /> : <Search className="w-4 h-4 text-[var(--text-secondary)]" />}
            </button>
            <GameHeaderButton />
            <button
              onClick={() => navigate(`/conference/${conferenceId}/coverage`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors"
            >
              <BarChart2 className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <ThemeToggle />
            {/* List / Grid toggle pill */}
            <div className="flex items-center rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
              <button disabled className="flex items-center justify-center w-7 h-7 bg-blue-600">
                <List className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={() => navigate(`/conference/${conferenceId}/grid`)}
                className="flex items-center justify-center w-7 h-7 hover:bg-[var(--bg-deep)] transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>
        </div>

        {/* Search bar (toggleable) */}
        {searchOpen && (
          <div className="px-4 pb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, company, tags..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Streak banner */}
        <StreakBanner />

        {/* Filter chips + sort */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-[var(--text)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-deep)]'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-deep)] transition-colors ml-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {sortLabels[sort]}
          </button>
        </div>

        {/* Sort dropdown */}
        {showSortMenu && (
          <div className="absolute right-4 top-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-40 overflow-hidden">
            {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setSort(key); setShowSortMenu(false) }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  sort === key
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-deep)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-px">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-[var(--bg-elevated)]" />
              <div className="flex-1">
                <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSortedTargets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] text-sm">
            {searchQuery ? 'No results found' : 'No targets yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[var(--divider)]">
            {filteredSortedTargets.map((target) => (
              <TargetRow
                key={target.id}
                target={target}
                currentUserId={user?.id}
                onClick={() => navigate(`/conference/${conferenceId}/target/${target.id}`)}
              />
            ))}
          </div>
          <p className="text-center text-[var(--text-muted)] text-xs py-6">
            {filteredSortedTargets.length} result{filteredSortedTargets.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Add target button */}
      <button
        onClick={() => navigate(`/conference/${conferenceId}/add`)}
        className="fixed right-4 bottom-8 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-blue-900/40 transition-colors z-20"
      >
        <Plus className="w-5 h-5 text-[var(--text)]" />
      </button>
    </div>
  )
}
