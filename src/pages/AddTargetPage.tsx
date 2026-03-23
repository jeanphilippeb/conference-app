import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Save, Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Priority } from '@/lib/types'
import { clearTargetsCache } from '@/hooks/useTargets'

const PRIORITY_OPTIONS: { value: Priority; label: string; description: string }[] = [
  { value: 'must_meet', label: 'Must Meet', description: 'Critical contact for this conference' },
  { value: 'should_meet', label: 'Should Meet', description: 'Important but not critical' },
  { value: 'nice_to_have', label: 'Nice to Have', description: 'Would be good to connect' },
]

interface FormData {
  first_name: string
  last_name: string
  company: string
  role: string
  booth_number: string
  priority: Priority
  phone: string
  email: string
  linkedin_url: string
  photo_url: string
  pre_notes: string
  tags: string[]
}

const DEFAULT_FORM: FormData = {
  first_name: '',
  last_name: '',
  company: '',
  role: '',
  booth_number: '',
  priority: 'should_meet',
  phone: '',
  email: '',
  linkedin_url: '',
  photo_url: '',
  pre_notes: '',
  tags: [],
}

export function AddTargetPage() {
  const { conferenceId, targetId } = useParams<{ conferenceId: string; targetId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(!!targetId)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const errorRef = useRef<HTMLParagraphElement | null>(null)

  const isEdit = !!targetId

  // Scroll error into view so it's always visible
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  // Load existing target for edit
  useEffect(() => {
    if (!targetId) return
    setFetchLoading(true)
    supabase
      .from('conference_targets')
      .select('*')
      .eq('id', targetId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Target not found')
        } else {
          setForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            company: data.company || '',
            role: data.role || '',
            booth_number: data.booth_number || '',
            priority: data.priority || 'should_meet',
            phone: data.phone || '',
            email: data.email || '',
            linkedin_url: data.linkedin_url || '',
            photo_url: data.photo_url || '',
            pre_notes: data.pre_notes || '',
            tags: data.tags || [],
          })
        }
        setFetchLoading(false)
      })
  }, [targetId])

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const handleDelete = async () => {
    if (!targetId || !window.confirm('Delete this target? This cannot be undone.')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('conference_targets').delete().eq('id', targetId)
      if (error) throw error
      if (conferenceId) clearTargetsCache(conferenceId)
      navigate(`/conference/${conferenceId}`, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to delete target')
      setDeleting(false)
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.company) {
      setError('First name, last name and company are required')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        company: form.company,
        role: form.role || null,
        booth_number: form.booth_number || null,
        priority: form.priority,
        phone: form.phone || null,
        email: form.email || null,
        linkedin_url: form.linkedin_url || null,
        photo_url: form.photo_url || null,
        pre_notes: form.pre_notes || null,
        tags: form.tags.length > 0 ? form.tags : null,
        conference_id: conferenceId,
        added_by: user?.id,
      }

      if (isEdit && targetId) {
        const { error } = await supabase
          .from('conference_targets')
          .update(payload)
          .eq('id', targetId)
        if (error) throw error
        if (conferenceId) clearTargetsCache(conferenceId)
        navigate(-1)
      } else {
        const { data, error } = await supabase
          .from('conference_targets')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        if (conferenceId) clearTargetsCache(conferenceId)
        navigate(`/conference/${conferenceId}/target/${data.id}`, { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save target')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm pt-12 pb-3 px-4 flex items-center gap-3 border-b border-[var(--border)]">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-deep)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-[var(--text)] font-bold text-base flex-1">
          {isEdit ? 'Edit Target' : 'Add Target'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="John"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Smith"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
              required
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Company <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
            required
          />
        </div>

        {/* Role + Booth */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Role / Title</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
              placeholder="VP of Sales"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Booth #</label>
            <input
              type="text"
              value={form.booth_number}
              onChange={(e) => handleChange('booth_number', e.target.value)}
              placeholder="e.g. A42"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Priority</label>
          <div className="space-y-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('priority', opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  form.priority === opt.value
                    ? opt.value === 'must_meet'
                      ? 'border-red-500 bg-red-500/10'
                      : opt.value === 'should_meet'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-blue-500 bg-blue-500/10'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-slate-600'
                }`}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  opt.value === 'must_meet' ? 'bg-red-500' :
                  opt.value === 'should_meet' ? 'bg-orange-500' : 'bg-slate-500'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    form.priority === opt.value ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'
                  }`}>{opt.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">Contact Info</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Phone number"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Email address"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          <input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => handleChange('linkedin_url', e.target.value)}
            placeholder="LinkedIn URL"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
        </div>

        {/* Photo URL */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Photo URL</label>
          <input
            type="url"
            value={form.photo_url}
            onChange={(e) => handleChange('photo_url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          {form.photo_url && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={form.photo_url}
                alt="Preview"
                className="w-12 h-12 rounded-full object-cover border border-[var(--border)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-xs text-[var(--text-muted)]">Photo preview</span>
            </div>
          )}
        </div>

        {/* Pre-notes */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Context / Notes</label>
          <textarea
            value={form.pre_notes}
            onChange={(e) => handleChange('pre_notes', e.target.value)}
            placeholder="Who is this person? Why are they important? What do you want to discuss?"
            rows={4}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tags</label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag, press Enter"
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-deep)] hover:bg-[var(--bg-deep)] disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-deep)] rounded-full text-xs text-[var(--text-secondary)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p ref={errorRef} className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
      </form>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--border)] px-5 py-4 safe-bottom">
        <div className="flex gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-14 flex items-center justify-center rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors flex-shrink-0"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-400" />
              )}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.first_name || !form.last_name || !form.company}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--bg-deep)] disabled:text-[var(--text-muted)] text-[var(--text)] font-bold py-4 rounded-2xl transition-colors text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEdit ? 'Save Changes' : 'Add Target'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
