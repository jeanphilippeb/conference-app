import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  X,
  Plus,
  CheckCircle2,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react'
import { useTargets } from '@/hooks/useTargets'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAuthContext } from '@/context/AuthContext'
import { useGameSheet } from '@/context/GameSheetContext'
import { GameHeaderButton } from '@/components/GameHeaderButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StreakBanner } from '@/components/StreakBanner'
import { coveragePercent, getInitials, getInitialsColorClass } from '@/lib/helpers'
import { Target, Priority } from '@/lib/types'
import { supabase } from '@/lib/supabase'

type PriorityFilter = 'all' | Priority
type StatusFilter = 'all' | 'met' | 'not_met' | 'contacted'
type SortKey = 'priority' | 'name' | 'company' | 'recent'

interface ConferenceInfo {
  name: string
  start_date: string
  end_date: string
}

function TargetTile({ target, currentUserId, onClick }: {
  target: Target
  currentUserId: string | undefined
  onClick: () => void
}) {
  const initials = getInitials(target.first_name, target.last_name)
  const colorClass = getInitialsColorClass(`${target.first_name} ${target.last_name}`)

  const metInteractions = (target.interactions || []).filter(i => i.status === 'met')
  const isMetByAnyone = metInteractions.length > 0
  const isMetByCurrentUser = currentUserId
    ? metInteractions.some(i => i.user_id === currentUserId)
    : false

  const priorityBorderStyle: Record<Priority, string> = {
    must_meet: 'border-l-4 border-l-red-500',
    should_meet: 'border-l-4 border-l-orange-500',
    nice_to_have: '',
  }

  const metByUser = metInteractions[0]?.profile

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-[var(--bg-elevated)] transition-all active:scale-[0.97] ${priorityBorderStyle[target.priority]}`}
      style={{ aspectRatio: '11/14' }}
    >
      {target.photo_url ? (
        <img
          src={target.photo_url}
          alt={`${target.first_name} ${target.last_name}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
      )}

      {isMetByAnyone && (
        <div className="absolute inset-0 bg-emerald-500/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {isMetByCurrentUser && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {isMetByAnyone && metByUser && (
          <div className="flex items-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {metByUser.avatar_url ? (
                <img src={metByUser.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-white text-[8px] font-bold">
                  {metByUser.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <p className="text-white font-semibold text-xs leading-tight truncate flex-1">
            {target.first_name} {target.last_name}
          </p>
          {target.booth_number && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 text-white/80 font-medium flex-shrink-0">
              #{target.booth_number}
            </span>
          )}
        </div>
        <p className="text-white/70 text-[10px] leading-tight truncate">{target.company}</p>
      </div>
    </button>
  )
}

function SkeletonTile() {
  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] animate-pulse" style={{ aspectRatio: '11/14' }} />
  )
}

export function GridView() {
  const { conferenceId } = useParams<{ conferenceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { targets, loading, refetch } = useTargets(conferenceId)
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

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('priority')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useRealtimeSync(conferenceId, refetch)

  const uniqueCompanies = useMemo(() => {
    const companies = targets.map(t => t.company).filter(Boolean)
    return [...new Set(companies)].sort((a, b) => a.localeCompare(b))
  }, [targets])

  const filteredTargets = useMemo(() => {
    let list = targets

    if (priorityFilter !== 'all') {
      list = list.filter(t => t.priority === priorityFilter)
    }

    if (statusFilter === 'met') {
      list = list.filter(t => (t.interactions || []).some(i => i.status === 'met'))
    } else if (statusFilter === 'not_met') {
      list = list.filter(t => !(t.interactions || []).some(i => i.status === 'met'))
    } else if (statusFilter === 'contacted') {
      list = list.filter(t => t.contacted)
    }

    if (companyFilter) {
      list = list.filter(t => t.company === companyFilter)
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
          const order: Record<string, number> = { must_meet: 0, should_meet: 1, nice_to_have: 2 }
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
  }, [targets, priorityFilter, statusFilter, companyFilter, sort, searchQuery])

  const metCount = useMemo(() =>
    targets.filter(t => (t.interactions || []).some(i => i.status === 'met')).length,
    [targets]
  )

  const mustMeetTotal = useMemo(() => targets.filter(t => t.priority === 'must_meet').length, [targets])
  const mustMeetDone = useMemo(() =>
    targets.filter(t => t.priority === 'must_meet' && (t.interactions || []).some(i => i.status === 'met')).length,
    [targets]
  )

  const totalCount = targets.length
  const pct = coveragePercent(metCount, totalCount)

  const priorityFilters: { key: PriorityFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'must_meet', label: 'Must Meet' },
    { key: 'should_meet', label: 'Should Meet' },
    { key: 'nice_to_have', label: 'Nice to Have' },
  ]

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Any Status' },
    { key: 'met', label: 'Met ✓' },
    { key: 'not_met', label: 'Not Met' },
    { key: 'contacted', label: '📞 Contacted' },
  ]

  const sortLabels: Record<SortKey, string> = {
    priority: 'Priority',
    name: 'Name',
    company: 'Company',
    recent: 'Recently Added',
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-8">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm pt-12 pb-0">

        {/* Row 1: back · name/stats · points · coverage */}
        <div className="flex items-center gap-2 px-4 pb-2">
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
          <GameHeaderButton />
          <button
            onClick={() => navigate(`/conference/${conferenceId}/coverage`)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0"
          >
            <BarChart2 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Row 2: list/card toggle · theme · sort · search */}
        <div className="flex items-center gap-2 px-4 pb-2">
          {/* List / Grid toggle pill */}
          <div className="flex items-center rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
            <button
              onClick={() => navigate(`/conference/${conferenceId}`)}
              className="flex items-center justify-center w-8 h-8 hover:bg-[var(--bg-deep)] transition-colors"
            >
              <List className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <button disabled className="flex items-center justify-center w-8 h-8 bg-blue-600">
              <LayoutGrid className="w-4 h-4 text-white" />
            </button>
          </div>
          <ThemeToggle />
          {/* Sort */}
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-deep)] transition-colors border border-[var(--border)]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {sortLabels[sort]}
          </button>
          {/* Search */}
          <button
            onClick={() => { setSearchOpen(!searchOpen); setSearchQuery('') }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors ml-auto"
          >
            {searchOpen ? <X className="w-4 h-4 text-[var(--text-secondary)]" /> : <Search className="w-4 h-4 text-[var(--text-secondary)]" />}
          </button>
        </div>

        {/* Sort dropdown */}
        {showSortMenu && (
          <div className="absolute left-4 right-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-40 overflow-hidden">
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

        {/* Search input */}
        {searchOpen && (
          <div className="px-4 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, company, role..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Streak banner */}
        <StreakBanner />

        {/* Priority filter chips */}
        <div className="flex items-center gap-2 px-4 pt-1 pb-1 overflow-x-auto">
          {priorityFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setPriorityFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                priorityFilter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-deep)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-2 px-4 pt-1 pb-2 overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-deep)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Company filter chips */}
        {uniqueCompanies.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
            <button
              onClick={() => setCompanyFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                companyFilter === null
                  ? 'bg-slate-600 text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-deep)]'
              }`}
            >
              All Co.
            </button>
            {uniqueCompanies.map((company) => (
              <button
                key={company}
                onClick={() => setCompanyFilter(companyFilter === company ? null : company)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  companyFilter === company
                    ? 'bg-slate-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-deep)]'
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="px-3 mt-2">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonTile key={i} />)}
          </div>
        ) : filteredTargets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--text-muted)] text-sm">
              {searchQuery ? 'No results found' : 'No targets yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredTargets.map((target) => (
              <TargetTile
                key={target.id}
                target={target}
                currentUserId={user?.id}
                onClick={() => navigate(`/conference/${conferenceId}/target/${target.id}`)}
              />
            ))}
          </div>
        )}
      </div>

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
