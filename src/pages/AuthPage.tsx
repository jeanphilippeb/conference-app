import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signInWithEmail, user } = useAuthContext()
  const navigate = useNavigate()

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="18" rx="2" stroke="white" strokeWidth="2" />
              <path d="M4 13h24" stroke="white" strokeWidth="2" />
              <circle cx="10" cy="6" r="2" fill="white" />
              <circle cx="22" cy="6" r="2" fill="white" />
              <rect x="8" y="17" width="4" height="4" rx="1" fill="white" />
              <rect x="14" y="17" width="4" height="4" rx="1" fill="white" />
              <rect x="20" y="17" width="4" height="4" rx="1" fill="white" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">ConferenceHQ</h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">Your networking war room</p>
        </div>

        {sent ? (
          /* Success state */
          <div className="bg-[var(--bg-elevated)] rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-[var(--text)] font-semibold text-lg mb-2">Check your email</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              We sent a magic link to <span className="text-[var(--text)] font-medium">{email}</span>.
              Click the link to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Sign in form */
          <div className="bg-[var(--bg-elevated)] rounded-2xl p-8">
            <h2 className="text-[var(--text)] font-semibold text-lg mb-1">Sign in</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">Enter your email to receive a magic link</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  autoComplete="email"
                  autoFocus
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
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--bg-deep)] disabled:text-[var(--text-muted)] text-[var(--text)] font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[var(--text-muted)] text-xs mt-8">
          ConferenceHQ · Networking made simple
        </p>
      </div>
    </div>
  )
}
