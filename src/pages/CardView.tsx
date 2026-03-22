import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Target, Interaction } from '@/lib/types'
import { PointsFloater } from '@/components/PointsFloater'
import { formatDistanceToNow, parseISO } from 'date-fns'

function InteractionItem({ interaction }: { interaction: Interaction }) {
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

  return (
    <div className="flex gap-3 py-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${colorClass}`}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="text-[var(--text)] text-xs font-bold">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
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
        {interaction.notes && (
          <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed">{interaction.notes}</p>
        )}
        {interaction.follow_up && (
          <p className="text-blue-400 text-xs mt-1">Follow-up: {interaction.follow_up}</p>
        )}
      </div>
    </div>
  )
}

export function CardView() {
  const { conferenceId, targetId } = useParams<{ conferenceId: string; targetId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { targets, createInteraction, updateInteractionNotes } = useTargets(conferenceId)
  const { triggerMet, triggerNote, getStreakMultiplier } = useGame()
  const { isListening, isSupported, startListening, stopListening } = useSpeechToText()

  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [markingMet, setMarkingMet] = useState(false)
  const [floatingPts, setFloatingPts] = useState<number | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNoteRef = useRef('')
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)

  const target: Target | undefined = targets.find(t => t.id === targetId)

  const metInteractions = (target?.interactions || []).filter(i => i.status === 'met')
  const isMetByAnyone = metInteractions.length > 0
  const isMetByCurrentUser = user?.id
    ? metInteractions.some(i => i.user_id === user.id)
    : false
  const myInteraction = user?.id
    ? target?.interactions?.find(i => i.user_id === user.id && i.status === 'met')
    : undefined

  // Load existing note from my interaction
  useEffect(() => {
    if (myInteraction?.notes && note === '') {
      setNote(myInteraction.notes)
      prevNoteRef.current = myInteraction.notes
    }
  }, [myInteraction?.id])

  // Auto-save debounce
  const autoSave = useCallback(async (text: string) => {
    if (!myInteraction) return
    setSaving(true)
    try {
      await updateInteractionNotes(myInteraction.id, text)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)

      // Award note score if note became substantial (>20 chars) for the first time
      const wasShort = prevNoteRef.current.length <= 20
      const isNowLong = text.length > 20
      if (wasShort && isNowLong && target) {
        const pts = calculateScore('note', target.priority, {
          firstOfDay: false,
          firstHour: false,
          streakMultiplier: getStreakMultiplier(),
        })
        triggerNote(target.priority, pts)
      }
      prevNoteRef.current = text
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }, [myInteraction, updateInteractionNotes, target, triggerNote, getStreakMultiplier])

  const handleNoteChange = (text: string) => {
    setNote(text)
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(text), 2000)
  }

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening((text) => {
        setNote(prev => {
          const newNote = prev ? `${prev} ${text}` : text
          handleNoteChange(newNote)
          return newNote
        })
      })
      noteTextareaRef.current?.focus()
    }
  }

  const handleMarkMet = async () => {
    if (!targetId || !target) return
    setMarkingMet(true)
    try {
      const { pts } = await triggerMet(target.priority)

      // Create interaction with score
      await createInteraction(targetId, note, 'met', pts)

      // Show points floater
      setFloatingPts(pts)
    } catch (err) {
      console.error(err)
    } finally {
      setMarkingMet(false)
    }
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
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

        <div className="absolute top-12 left-0 right-0 flex items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
          </button>
          <button
            onClick={() => navigate(`/conference/${conferenceId}/target/${targetId}/edit`)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-[var(--text)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-2">
        {/* Identity */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-[var(--text)] font-bold text-[28px] leading-tight tracking-tight">
                {target.first_name} {target.last_name}
              </h1>
              {target.company && (
                <p className="text-[var(--text-secondary)] text-base mt-0.5">{target.company}</p>
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
            <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold mt-1 ${priorityBadge.bg} ${priorityBadge.text}`}>
              {getPriorityLabel(target.priority)}
            </span>
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
                <InteractionItem key={interaction.id} interaction={interaction} />
              ))}
            </div>
          </div>
        )}

        {/* Note input (shown after meeting) */}
        {isMetByCurrentUser && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">My Notes</h3>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              {saving && (
                <span className="text-xs text-[var(--text-muted)]">Saving...</span>
              )}
            </div>
            <div className="relative">
              <textarea
                ref={noteTextareaRef}
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="What did you talk about?"
                rows={4}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none pr-12"
              />
              {isSupported && (
                <button
                  onClick={handleMicToggle}
                  className={`absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    isListening
                      ? 'bg-red-500 text-[var(--text)] animate-pulse'
                      : 'bg-[var(--bg-deep)] text-[var(--text-secondary)] hover:bg-[var(--bg-deep)]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--border)] px-5 py-4 safe-bottom">
        {isMetByCurrentUser ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">
                {metInteractions.length > 1
                  ? `Met by ${metInteractions.length} people`
                  : 'You met them'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick note (optional)..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm pr-12"
              />
              {isSupported && (
                <button
                  onClick={handleMicToggle}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isListening ? 'bg-red-500 text-[var(--text)] animate-pulse' : 'bg-[var(--bg-deep)] text-[var(--text-secondary)]'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <button
              onClick={handleMarkMet}
              disabled={markingMet}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[var(--text)] transition-all text-base ${
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
          </div>
        )}
      </div>
    </div>
  )
}
