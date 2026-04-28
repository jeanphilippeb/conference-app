import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  MessageSquare,
  UserCheck,
  UserX,
  Share2,
} from 'lucide-react'
import { useTargets } from '@/hooks/useTargets'
import { useAuthContext } from '@/context/AuthContext'
import { useGame } from '@/context/GameContext'
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
import { SortKey, PriorityFilter, StatusFilter } from '@/lib/filterTypes'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { buildInteractionsCsv, shareOrDownloadCsv } from '@/lib/exportCsv'

interface ConferenceInfo {
  name: string
  start_date: string
  end_date: string
}

const LEFT_ACTION_WIDTH = 80  // "Add Note" button width
const RIGHT_ACTION_WIDTH = 80 // "Met/Unmet" button width

function SwipeableTargetRow({ target, currentUserId, onClick, onMarkMet, onMarkUnmet, onAddNote, swipedId, setSwipedId }: {
  target: Target
  currentUserId: string | undefined
  onClick: () => void
  onMarkMet: (target: Target) => void
  onMarkUnmet: (target: Target) => void
  onAddNote: (target: Target) => void
  swipedId: string | null
  setSwipedId: (id: string | null) => void
}) {
  const initials = getInitials(target.first_name, target.last_name)
  const colorClass = getInitialsColorClass(`${target.first_name} ${target.last_name}`)
  const dotClass = getPriorityDotClass(target.priority)

  const metInteractions = (target.interactions || []).filter(i => i.status === 'met')
  const isMetByAnyone = metInteractions.length > 0
  const isMetByCurrentUser = currentUserId
    ? metInteractions.some(i => i.user_id === currentUserId)
    : false

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const swipeDir = swipedId === `${target.id}-left` ? 'left' : swipedId === `${target.id}-right` ? 'right' : null
  const snappedX = swipeDir === 'left' ? -RIGHT_ACTION_WIDTH : swipeDir === 'right' ? LEFT_ACTION_WIDTH : 0

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
    setOffsetX(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dy > 30) { setIsDragging(false); setOffsetX(0); return }
    const clamped = Math.max(-RIGHT_ACTION_WIDTH * 1.2, Math.min(LEFT_ACTION_WIDTH * 1.2, dx + snappedX))
    setOffsetX(clamped)
  }

  const handleTouchEnd = () => {
    if (!isDragging) { setOffsetX(0); return }
    setIsDragging(false)
    const threshold = 40
    if (offsetX < -threshold) {
      setSwipedId(`${target.id}-left`)
    } else if (offsetX > threshold) {
      setSwipedId(`${target.id}-right`)
    } else {
      setSwipedId(null)
    }
    setOffsetX(0)
  }

  const displayX = isDragging ? offsetX : snappedX

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      {/* Left action (revealed by right swipe): Add Note */}
      <div
        className="absolute inset-y-0 left-0 flex items-center"
        style={{ width: LEFT_ACTION_WIDTH }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setSwipedId(null); onAddNote(target) }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 bg-blue-600 text-white active:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Note</span>
        </button>
      </div>

      {/* Right action (revealed by left swipe): Mark Met / Unmet */}
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: RIGHT_ACTION_WIDTH }}
      >
        {isMetByCurrentUser ? (
          <button
            onClick={(e) => { e.stopPropagation(); setSwipedId(null); onMarkUnmet(target) }}
            className="w-full h-full flex flex-col items-center justify-center gap-1 bg-orange-600 text-white active:bg-orange-700 transition-colors"
          >
            <UserX className="w-5 h-5" />
            <span className="text-[10px] font-medium">Unmet</span>
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setSwipedId(null); onMarkMet(target) }}
            className="w-full h-full flex flex-col items-center justify-center gap-1 bg-emerald-600 text-white active:bg-emerald-700 transition-colors"
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] font-medium">Met</span>
          </button>
        )}
      </div>

      {/* Sliding row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swipeDir) { setSwipedId(null) } else { onClick() } }}
        className="relative bg-[var(--bg)] flex items-center gap-3 px-4 py-3 active:bg-[var(--bg-elevated)] transition-colors"
        style={{
          transform: `translateX(${displayX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
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
              <span className="text-white font-bold text-sm">{initials}</span>
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
            {target.booth_number && (
              <>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-deep)] text-[var(--text-secondary)] font-medium flex-shrink-0">#{target.booth_number}</span>
              </>
            )}
          </div>
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isMetByAnyone && (
            <span className="text-xs text-emerald-400 font-medium">
              {metInteractions.length > 1 ? `${metInteractions.length}×` : '✓'}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </div>
  )
}

export function ListView() {
  const { conferenceId } = useParams<{ conferenceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { targets, loading, createInteraction, deleteInteraction } = useTargets(conferenceId)
  const { triggerMet } = useGame()
  const [conference, setConference] = useState<ConferenceInfo | null>(null)
  const { setContext } = useGameSheet()

  const [swipedId, setSwipedId] = useState<string | null>(null)

  const [noteTarget, setNoteTarget] = useState<Target | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null)
  const noteInputRef = useRef<HTMLTextAreaElement>(null)

  // Close any open swipe row when the window scrolls
  useEffect(() => {
    if (!swipedId) return
    const handler = () => setSwipedId(null)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [swipedId])

  const handleMarkMet = useCallback(async (target: Target) => {
    try {
      const { pts } = await triggerMet(target.priority)
      await createInteraction(target.id, '', 'met', pts)
    } catch (err) {
      console.error('Failed to mark as met:', err)
    }
  }, [triggerMet, createInteraction])

  const handleMarkUnmet = useCallback(async (target: Target) => {
    if (!user?.id) return
    const userInteractions = (target.interactions || []).filter(i => i.user_id === user.id)
    try {
      for (const interaction of userInteractions) {
        await deleteInteraction(interaction.id)
      }
    } catch (err) {
      console.error('Failed to mark as unmet:', err)
    }
  }, [user?.id, deleteInteraction])

  const handleAddNote = useCallback((target: Target) => {
    setNoteTarget(target)
    setNoteText('')
    setNoteSaveError(null)
    setTimeout(() => noteInputRef.current?.focus(), 100)
  }, [])

  const handleSaveNote = useCallback(async () => {
    if (!noteTarget || !noteText.trim()) return
    setNoteSaving(true)
    setNoteSaveError(null)
    try {
      await createInteraction(noteTarget.id, noteText.trim(), 'met', 0)
      setNoteTarget(null)
      setNoteText('')
    } catch (err: any) {
      setNoteSaveError(err.message || 'Failed to save. Please try again.')
    } finally {
      setNoteSaving(false)
    }
  }, [noteTarget, noteText, createInteraction])

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

  const {
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    priorityFilter,
    setPriorityFilter,
    statusFilter,
    setStatusFilter,
    companyFilter,
    setCompanyFilter,
    sort,
    setSort,
    showSortMenu,
    setShowSortMenu,
  } = useFilterPersistence(conferenceId)

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

  const uniqueCompanies = useMemo(() => {
    const companies = targets.map(t => t.company).filter(Boolean)
    return [...new Set(companies)].sort((a, b) => a.localeCompare(b))
  }, [targets])

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

  const filteredSortedTargets = useMemo(() => {
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
  }, [targets, priorityFilter, statusFilter, companyFilter, sort, searchQuery])

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-6">
      {/* Header */}
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
            onClick={() => shareOrDownloadCsv(
              buildInteractionsCsv(targets, conference?.name ?? ''),
              `${(conference?.name ?? 'conference').replace(/\s+/g, '_')}_interactions.csv`
            )}
            disabled={loading || targets.length === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0 disabled:opacity-40"
            title="Export interactions"
          >
            <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
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
            <button disabled className="flex items-center justify-center w-8 h-8 bg-blue-600">
              <List className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => navigate(`/conference/${conferenceId}/grid`)}
              className="flex items-center justify-center w-8 h-8 hover:bg-[var(--bg-deep)] transition-colors"
            >
              <LayoutGrid className="w-4 h-4 text-[var(--text-secondary)]" />
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

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 pb-2">
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
              <SwipeableTargetRow
                key={target.id}
                target={target}
                currentUserId={user?.id}
                onClick={() => navigate(`/conference/${conferenceId}/target/${target.id}`)}
                onMarkMet={handleMarkMet}
                onMarkUnmet={handleMarkUnmet}
                onAddNote={handleAddNote}
                swipedId={swipedId}
                setSwipedId={setSwipedId}
              />
            ))}
          </div>
          <p className="text-center text-[var(--text-muted)] text-xs py-6">
            {filteredSortedTargets.length} result{filteredSortedTargets.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Note input modal */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNoteTarget(null)} />
          <div className="relative w-full max-w-lg bg-[var(--bg-elevated)] rounded-t-2xl p-4 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text)] font-semibold text-sm">
                Note — {noteTarget.first_name} {noteTarget.last_name}
              </h3>
              <button onClick={() => setNoteTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-deep)]">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <textarea
              ref={noteInputRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="What did you talk about?"
              rows={3}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
            />
            {noteSaveError && (
              <p className="mt-1.5 text-xs text-red-400">{noteSaveError}</p>
            )}
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim() || noteSaving}
              className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm disabled:opacity-40 active:bg-blue-700 transition-colors"
            >
              {noteSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
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
