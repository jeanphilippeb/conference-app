import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signInWithEmail, verifyOtp, user } = useAuthContext()
  const navigate = useNavigate()
  const codeInputRef = useRef<HTMLInputElement>(null)

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
      setTimeout(() => codeInputRef.current?.focus(), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || code.length < 6) return

    setVerifying(true)
    setError(null)
    try {
      await verifyOtp(email.trim(), code.trim())
      // onAuthStateChange will pick up the session and redirect
    } catch (err: any) {
      setError(err.message || 'Invalid code, please try again')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          {/* Minehub logo mark — icon only */}
          <div className="mb-4">
            <svg width="56" height="48" viewBox="440 15 100 88" xmlns="http://www.w3.org/2000/svg">
              <rect x="492.58" y="74.74" fill="#008C94" width="22.95" height="22.95"/>
              <polygon fill="var(--text)" points="485.63,18.8 485.63,55.13 462.38,74.73 444.37,74.73 444.37,97.68 467.31,97.68 467.31,82.5 488.44,64.68 531.51,64.68 531.51,18.8"/>
              <path fill="#005763" d="M473.36,53.48V32.64c0-0.75-0.61-1.35-1.35-1.35h-30.69c-0.75,0-1.35,0.61-1.35,1.35v30.69c0,0.75,0.61,1.35,1.35,1.35h18.76L473.36,53.48z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">Conf Hunting</h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">Your networking war room</p>
        </div>

        {sent ? (
          /* OTP code entry */
          <div className="bg-[var(--bg-elevated)] rounded-2xl p-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-[var(--text)] font-semibold text-lg mb-1 text-center">Check your email</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6 text-center">
              Enter the 6-digit code sent to <span className="text-[var(--text)] font-medium">{email}</span>
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
                placeholder="123456"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-4 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors text-2xl tracking-widest text-center font-mono"
                autoComplete="one-time-code"
                required
              />

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--bg-deep)] disabled:text-[var(--text-muted)] text-[var(--text)] font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {verifying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <button
              onClick={() => { setSent(false); setCode(''); setError(null) }}
              className="w-full text-center text-[var(--text-muted)] text-xs mt-4 hover:text-[var(--text-secondary)] transition-colors"
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
          Conf Hunting · Networking made simple
        </p>
      </div>
    </div>
  )
}
