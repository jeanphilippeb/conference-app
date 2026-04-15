import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  MessageSquare,
  Linkedin,
  Mic,
  MicOff,
  Check,
  CheckCircle2,
  User,
  Pencil,
  Trash2,
  X,
  MoreHorizontal,
  PhoneCall,
  AlertCircle,
} from 'lucide-react'
import { useTargets } from '@/hooks/useTargets'
import { useAuthContext } from '@/context/AuthContext'
import { useGame } from '@/context/GameContext'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import {
  getInitials,
  getInitialsColorClass,
  getPriorityLabel,
  getPriorityBadgeClasses,
} from '@/lib/helpers'
import { calculateScore } from '@/lib/scoring'
import { Target, Interaction, CompanyStatus } from '@/lib/types'
import { PointsFloater } from '@/components/PointsFloater'
import { formatDistanceToNow, parseISO } from 'date-fns'

const COMPANY_STATUS_CONFIG: Record<CompanyStatus, { label: string; className: string }> = {
  new_suspect: { label: 'New suspect', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  active_lead:  { label: 'Active lead',  className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  prospect:     { label: 'Prospect',     className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  customer:     { label: 'Customer',     className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
}

function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  const config = COMPANY_STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function InteractionItem({
  interaction,
  isOwn,
  onDelete,
  onEditSave,
}: {
  interaction: Interaction
  isOwn?: boolean
  onDelete?: () => Promise<void>
  onEditSave?: (notes: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(interaction.notes || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [swiped, setSwiped] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)

  const profile = interaction.profile
  const name = profile?.name || 'Unknown'
  const initials = name.charAt(0).toUpperCase()
  const colorClass = getInitialsColorClass(name)
  const timeAgo = interaction.met_at
    ? formatDistanceToNow(parseISO(interaction.met_at), { addSuffix: true })
    : ''

  const statusLabel: Record<string, string> = {
    met: 'Met',
    attempted: 'Attempted',
    no_show: 'No show',
  }

  useEffect(() => {
    if (isEditing) setSwiped(false)
  }, [isEditing])

  // Close swipe when tapping elsewhere
  useEffect(() => {
    if (!swiped) return
    const handler = (e: TouchEvent | MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setSwiped(false)
      }
    }
    document.addEventListener('touchstart', handler)
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('mousedown', handler)
    }
  }, [swiped])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > 20) return // vertical scroll, ignore
    if (dx < -50) setSwiped(true)
    else if (dx > 20) setSwiped(false)
  }

  const handleSave = async () => {
    if (!onEditSave) return
    setSaving(true)
    setSaveError(null)
    try {
      await onEditSave(editText)
      setIsEditing(false)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save notes. Please try again.')
      // Keep edit mode open for retry
    } finally {
      setSaving(false)
    }
  }

  const ACTIONS_WIDTH = 88 // px — two 44px buttons

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      {/* Swipe action buttons — revealed on swipe left */}
      {isOwn && (
        <div
          className="absolute right-0 top-0 bottom-0 flex"
          style={{ width: ACTIONS_WIDTH }}
        >
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { setSwiped(false); setIsEditing(true); setEditText(interaction.notes || '') }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-600 text-white text-[10px] font-medium"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            disabled={deleting}
            onClick={async () => {
              setSwiped(false)
              setDeleting(true)
              try { await onDelete?.() } catch { /* silent */ } finally { setDeleting(false) }
            }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white text-[10px] font-medium disabled:opacity-60"
          >
            {deleting
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />
            }
            {deleting ? '' : 'Delete'}
          </button>
        </div>
      )}

      {/* Row content — slides left on swipe */}
      <div
        className="flex gap-3 py-3 bg-[var(--bg-elevated)] transition-transform duration-200"
        style={{ transform: swiped ? `translateX(-${ACTIONS_WIDTH}px)` : 'translateX(0)' }}
        onTouchStart={isOwn && !isEditing ? handleTouchStart : undefined}
        onTouchEnd={isOwn && !isEditing ? handleTouchEnd : undefined}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${colorClass}`}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-[var(--text)] text-xs font-bold">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="text-[var(--text)] text-sm font-medium">{name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                interaction.status === 'met'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[var(--bg-deep)] text-[var(--text-secondary)]'
              }`}>
                {statusLabel[interaction.status] || interaction.status}
              </span>
              {interaction.score != null && interaction.score > 0 && (
                <span className="text-xs font-bold" style={{ color: '#FBBF24' }}>
                  +{interaction.score}
                </span>
              )}
              <span className="text-[var(--text-muted)] text-xs">{timeAgo}</span>
            </div>
            {isOwn && !isEditing && (
              <button
                onClick={() => setSwiped(s => !s)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                autoFocus
                rows={3}
                className="w-full bg-[var(--bg)] border border-blue-500 rounded-xl px-3 py-2 text-sm text-[var(--text)] resize-none outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs text-white font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 bg-[var(--bg-deep)] rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancel
                </button>
              </div>
              {saveError && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {saveError}
                </div>
              )}
            </div>
          ) : (
            <>
              {interaction.notes && (
                <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed">{interaction.notes}</p>
              )}
              {interaction.follow_up && (
                <p className="text-blue-400 text-xs mt-1">Follow-up: {interaction.follow_up}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function CardView() {
  const { conferenceId, targetId } = useParams<{ conferenceId: string; targetId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { targets, loading: targetsLoading, createInteraction, updateInteractionNotes, deleteInteraction, deleteInteractions, toggleContacted } = useTargets(conferenceId)
  const { triggerMet, triggerNote, getStreakMultiplier } = useGame()
  const { isListening, isSupported, startListening, stopListening } = useSpeechToText()

  const [markingMet, setMarkingMet] = useState(false)
  const [floatingPts, setFloatingPts] = useState<number | null>(null)
  const [addingNote, setAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [confirmUnmet, setConfirmUnmet] = useState(false)
  const [markingUnmet, setMarkingUnmet] = useState(false)
  const [togglingContacted, setTogglingContacted] = useState(false)
  const newNoteRef = useRef<HTMLTextAreaElement>(null)

  const target: Target | undefined = targets.find(t => t.id === targetId)

  const metInteractions = (target?.interactions || []).filter(i => i.status === 'met')
  const isMetByAnyone = metInteractions.length > 0
  const myInteractions = user?.id
    ? metInteractions.filter(i => i.user_id === user.id)
    : []
  const isMetByCurrentUser = myInteractions.length > 0

  const handleMarkMet = async () => {
    if (!targetId || !target) return
    setMarkingMet(true)
    try {
      const { pts } = await triggerMet(target.priority)
      await createInteraction(targetId, '', 'met', pts)
      setFloatingPts(pts)
    } catch (err) {
      console.error(err)
    } finally {
      setMarkingMet(false)
    }
  }

  const handleSaveNewNote = async () => {
    if (!targetId || !target || !newNote.trim()) return
    setSavingNew(true)
    try {
      // If user wasn't met yet, award met points (same as "I Met Them" flow)
      let score = 0
      if (!isMetByCurrentUser) {
        const { pts } = await triggerMet(target.priority)
        score = pts
        setFloatingPts(pts)
      }
      await createInteraction(targetId, newNote.trim(), 'met', score)
      setNewNote('')
      setAddingNote(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNew(false)
    }
  }

  const handleMarkUnmet = async () => {
    if (!targetId || !user?.id || myInteractions.length === 0) return
    setMarkingUnmet(true)
    try {
      await deleteInteractions(myInteractions.map(i => i.id))
      setConfirmUnmet(false)
    } catch (err) {
      console.error(err)
    } finally {
      setMarkingUnmet(false)
    }
  }

  const handleEditSave = async (interactionId: string, notes: string, prevNotes: string) => {
    await updateInteractionNotes(interactionId, notes)
    // Award note score if note became substantial for the first time
    if (target && prevNotes.length <= 20 && notes.length > 20) {
      const pts = calculateScore('note', target.priority, {
        firstOfDay: false,
        firstHour: false,
        streakMultiplier: getStreakMultiplier(),
      })
      triggerNote(target.priority, pts)
    }
  }

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening((text) => {
        if (addingNote) {
          setNewNote(prev => prev ? `${prev} ${text}` : text)
        }
      })
      if (addingNote) newNoteRef.current?.focus()
    }
  }

  const handleToggleContacted = async () => {
    if (!target || togglingContacted) return
    setTogglingContacted(true)
    try {
      await toggleContacted(target.id, !target.contacted)
    } catch (err) {
      console.error('Failed to update contacted status:', err)
      alert('Failed to update contacted status. Please check your connection and try again.')
    } finally {
      setTogglingContacted(false)
    }
  }

  if (targetsLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-[var(--text)] font-medium mb-2">Target not found</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">This target may have been deleted or moved.</p>
          <button
            onClick={() => navigate(`/conference/${conferenceId}`)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Back to conference
          </button>
        </div>
      </div>
    )
  }

  const initials = getInitials(target.first_name, target.last_name)
  const colorClass = getInitialsColorClass(`${target.first_name} ${target.last_name}`)
  const priorityBadge = getPriorityBadgeClasses(target.priority)

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
      {floatingPts !== null && (
        <PointsFloater points={floatingPts} onDone={() => setFloatingPts(null)} />
      )}

      {/* Sticky nav bar — always visible */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-12 pb-2 pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => navigate(`/conference/${conferenceId}/target/${targetId}/edit`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors pointer-events-auto"
        >
          <Edit2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Hero photo area */}
      <div className="relative" style={{ height: '45vh', minHeight: 240 }}>
        {target.photo_url ? (
          <img
            src={target.photo_url}
            alt={`${target.first_name} ${target.last_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${colorClass}`}>
            <span className="text-[var(--text)] font-bold" style={{ fontSize: '5rem' }}>{initials}</span>
          </div>
        )}

        {isMetByAnyone && (
          <div className="absolute inset-0 bg-emerald-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/20 to-transparent" />

      </div>

      {/* Content */}
      <div className="px-5 pt-2">
        {/* Identity */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[var(--text)] font-bold text-[28px] leading-tight tracking-tight">
              {target.first_name} {target.last_name}
            </h1>
            <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${priorityBadge.bg} ${priorityBadge.text}`}>
              {getPriorityLabel(target.priority)}
            </span>
          </div>
          {target.company && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[var(--text-secondary)] text-base">{target.company}</p>
              {target.company_status && (
                <CompanyStatusBadge status={target.company_status} />
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {target.role && (
              <p className="text-[var(--text-muted)] text-sm">{target.role}</p>
            )}
            {target.booth_number && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium border border-[var(--border)]">
                Booth #{target.booth_number}
              </span>
            )}
          </div>
        </div>

        {/* Contact actions */}
        {(target.phone || target.email || target.linkedin_url) && (
          <div className="flex gap-3 mb-5">
            {target.phone && (
              <>
                <a
                  href={`https://wa.me/${target.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 flex-1 bg-[var(--bg-elevated)] rounded-xl py-3 hover:bg-[var(--bg-deep)] transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] text-[var(--text-secondary)]">WhatsApp</span>
                </a>
                <a
                  href={`tel:${target.phone}`}
                  className="flex flex-col items-center gap-1 flex-1 bg-[var(--bg-elevated)] rounded-xl py-3 hover:bg-[var(--bg-deep)] transition-colors"
                >
                  <Phone className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Call</span>
                </a>
                <a
                  href={`sms:${target.phone}`}
                  className="flex flex-col items-center gap-1 flex-1 bg-[var(--bg-elevated)] rounded-xl py-3 hover:bg-[var(--bg-deep)] transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">SMS</span>
                </a>
              </>
            )}
            {target.email && (
              <a
                href={`mailto:${target.email}`}
                className="flex flex-col items-center gap-1 flex-1 bg-[var(--bg-elevated)] rounded-xl py-3 hover:bg-[var(--bg-deep)] transition-colors"
              >
                <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                <span className="text-[10px] text-[var(--text-secondary)]">Email</span>
              </a>
            )}
            {target.linkedin_url && (
              <a
                href={target.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 flex-1 bg-[var(--bg-elevated)] rounded-xl py-3 hover:bg-[var(--bg-deep)] transition-colors"
              >
                <Linkedin className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] text-[var(--text-secondary)]">LinkedIn</span>
              </a>
            )}
          </div>
        )}

        {/* Contacted toggle */}
        <button
          onClick={handleToggleContacted}
          disabled={togglingContacted}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium mb-4 transition-colors disabled:opacity-50 ${
            target.contacted
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-sky-500/40 hover:text-sky-400'
          }`}
        >
          {togglingContacted ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4" />
              {target.contacted ? 'Contacted' : 'Mark as Contacted'}
            </>
          )}
        </button>

        {/* Pre-notes / Context */}
        {target.pre_notes && (
          <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 mb-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Context</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{target.pre_notes}</p>
          </div>
        )}

        {/* Tags */}
        {target.tags && target.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {target.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-[var(--bg-elevated)] rounded-full text-xs text-[var(--text-secondary)] border border-[var(--border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Interactions */}
        {(target.interactions || []).length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Interactions</h3>
            <div className="bg-[var(--bg-elevated)] rounded-2xl px-4 divide-y divide-[var(--divider)]">
              {(target.interactions || []).map((interaction) => (
                <InteractionItem
                  key={interaction.id}
                  interaction={interaction}
                  isOwn={interaction.user_id === user?.id}
                  onDelete={() => deleteInteraction(interaction.id)}
                  onEditSave={(notes) => handleEditSave(interaction.id, notes, interaction.notes || '')}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--border)] px-5 py-4 safe-bottom">
        {isMetByCurrentUser ? (
          addingNote ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">New meeting note</span>
                <button
                  onClick={() => { setAddingNote(false); setNewNote(''); stopListening(); }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
              <div className="relative">
                <textarea
                  ref={newNoteRef}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="What did you talk about this time?"
                  rows={3}
                  autoFocus
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none pr-12"
                />
                {isSupported && (
                  <button
                    onClick={handleMicToggle}
                    className={`absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      isListening
                        ? 'bg-red-500 text-[var(--text)] animate-pulse'
                        : 'bg-[var(--bg-deep)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <button
                onClick={handleSaveNewNote}
                disabled={savingNew || !newNote.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[var(--text)] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-sm"
              >
                {savingNew ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Note
                  </>
                )}
              </button>
            </div>
          ) : confirmUnmet ? (
            <div className="space-y-2">
              <p className="text-center text-sm text-[var(--text-secondary)]">Remove your "met" status? This will delete your interaction records.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleMarkUnmet}
                  disabled={markingUnmet}
                  className="flex-1 py-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {markingUnmet
                    ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    : 'Yes, mark as unmet'
                  }
                </button>
                <button
                  onClick={() => setConfirmUnmet(false)}
                  className="flex-1 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-deep)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 font-semibold text-sm truncate">
                  {metInteractions.length > 1
                    ? `Met by ${metInteractions.length} people`
                    : 'You met them'}
                </span>
              </div>
              <button
                onClick={() => setAddingNote(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-[var(--bg-deep)] transition-colors text-sm text-[var(--text-secondary)] font-medium flex-shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                Add note
              </button>
              <button
                onClick={() => setConfirmUnmet(true)}
                title="Mark as unmet"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-red-500/50 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
          )
        ) : addingNote ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">New meeting note</span>
              <button
                onClick={() => { setAddingNote(false); setNewNote(''); stopListening(); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Cancel
              </button>
            </div>
            <div className="relative">
              <textarea
                ref={newNoteRef}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="What did you talk about?"
                rows={3}
                autoFocus
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none pr-12"
              />
              {isSupported && (
                <button
                  onClick={handleMicToggle}
                  className={`absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    isListening
                      ? 'bg-red-500 text-[var(--text)] animate-pulse'
                      : 'bg-[var(--bg-deep)] text-[var(--text-secondary)]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
            <button
              onClick={handleSaveNewNote}
              disabled={savingNew || !newNote.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[var(--text)] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-sm"
            >
              {savingNew ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
              <button
                onClick={handleMarkMet}
                disabled={markingMet}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[var(--text)] transition-all text-base ${
                  isMetByAnyone
                    ? 'bg-emerald-700 hover:bg-emerald-600'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/40'
                } disabled:opacity-50`}
              >
                {markingMet ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    {isMetByAnyone ? 'I Also Met Them' : 'I Met Them'}
                  </>
                )}
              </button>
              <button
                onClick={() => setAddingNote(true)}
                className="flex items-center gap-1.5 px-3 py-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-[var(--bg-deep)] transition-colors text-sm text-[var(--text-secondary)] font-medium flex-shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                Note
              </button>
          </div>
        )}
      </div>
    </div>
  )
}
