import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, MapPin, Calendar, Users, ChevronRight, X, LogOut } from 'lucide-react'
import { useConferences } from '@/hooks/useConferences'
import { useAuthContext } from '@/context/AuthContext'
import { CoverageBar } from '@/components/CoverageBar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { formatDateRange, coveragePercent } from '@/lib/helpers'
import { Conference } from '@/lib/types'

function ConferenceCard({ conf, onClick }: { conf: Conference; onClick: () => void }) {
  const pct = coveragePercent(conf.met_count || 0, conf.target_count || 0)

  const statusStyles: Record<string, string> = {
    active: 'border-l-4 border-l-blue-500',
    upcoming: 'border-l-4 border-l-slate-600',
    completed: 'border-l-4 border-l-slate-700 opacity-70',
  }

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Active' },
    upcoming: { bg: 'bg-[var(--bg-deep)]', text: 'text-[var(--text-secondary)]', label: 'Upcoming' },
    completed: { bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-muted)]', label: 'Completed' },
  }

  const badge = statusBadge[conf.status] || statusBadge.upcoming

  return (
    <button
      onClick={onClick}
      className={`w-full bg-[var(--bg-elevated)] rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${statusStyles[conf.status] || ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
          <h3 className="text-[var(--text)] font-semibold text-base leading-tight truncate">{conf.name}</h3>
        </div>
        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-4 text-[var(--text-secondary)] text-xs mb-3">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {conf.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDateRange(conf.start_date, conf.end_date)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)] mr-2">
          {conf.met_count}/{conf.target_count} met
        </span>
        <div className="flex-1">
          <CoverageBar met={conf.met_count || 0} total={conf.target_count || 0} showLabel={false} />
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{pct}%</span>
      </div>
    </button>
  )
}

interface NewConferenceModalProps {
  onClose: () => void
  onCreate: (data: {
    name: string
    location: string
    start_date: string
    end_date: string
  }) => Promise<void>
}

function NewConferenceModal({ onClose, onCreate }: NewConferenceModalProps) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.location || !form.start_date || !form.end_date) return
    setLoading(true)
    setError(null)
    try {
      await onCreate(form)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create conference')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-[var(--bg-elevated)] rounded-t-3xl sm:rounded-2xl p-6 safe-bottom">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[var(--text)] font-bold text-lg">New Conference</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-deep)] hover:bg-[var(--bg-deep)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Conference Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. SaaStr Annual 2025"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--bg-deep)] disabled:text-[var(--text-muted)] text-[var(--text)] font-semibold py-3.5 rounded-xl transition-colors text-sm mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create Conference'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ConferenceSelector() {
  const navigate = useNavigate()
  const { conferences, loading, createConference } = useConferences()
  const { profile, signOut } = useAuthContext()
  const [showModal, setShowModal] = useState(false)

  const active = conferences.filter((c) => c.status === 'active')
  const upcoming = conferences.filter((c) => c.status === 'upcoming')
  const past = conferences.filter((c) => c.status === 'completed')

  const handleCreate = async (data: {
    name: string
    location: string
    start_date: string
    end_date: string
  }) => {
    // Determine status based on dates
    const now = new Date()
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    let status: Conference['status'] = 'upcoming'
    if (now >= start && now <= end) status = 'active'
    else if (now > end) status = 'completed'

    await createConference({ ...data, status })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">Conf Hunting</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Your networking war room</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs py-2 px-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{profile?.name || 'Sign out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--bg-elevated)] rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-[var(--bg-deep)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[var(--bg-deep)] rounded w-1/2 mb-4" />
                <div className="h-2 bg-[var(--bg-deep)] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
                  Active Now
                </h2>
                <div className="space-y-3">
                  {active.map((conf) => (
                    <ConferenceCard
                      key={conf.id}
                      conf={conf}
                      onClick={() => navigate(`/conference/${conf.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Upcoming
                </h2>
                <div className="space-y-3">
                  {upcoming.map((conf) => (
                    <ConferenceCard
                      key={conf.id}
                      conf={conf}
                      onClick={() => navigate(`/conference/${conf.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Past
                </h2>
                <div className="space-y-3">
                  {past.map((conf) => (
                    <ConferenceCard
                      key={conf.id}
                      conf={conf}
                      onClick={() => navigate(`/conference/${conf.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {conferences.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎪</div>
                <h3 className="text-[var(--text)] font-semibold text-lg mb-2">No conferences yet</h3>
                <p className="text-[var(--text-secondary)] text-sm">Create your first conference to get started</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-5 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent safe-bottom">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-[var(--text)] font-semibold py-4 rounded-2xl transition-colors shadow-xl shadow-blue-900/30"
        >
          <Plus className="w-5 h-5" />
          New Conference
        </button>
      </div>

      {/* New Conference Modal */}
      {showModal && (
        <NewConferenceModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
