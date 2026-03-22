import { getNextLevel, getProgressToNext, MetalLevel } from '@/lib/metalLevels'
import { AchievementGrid } from './AchievementGrid'
import type { Target } from '@/lib/types'

// Standalone bottom-sheet wrapper (legacy usage — now unused, kept for safety)
interface MetalLevelDetailProps {
  onClose: () => void
}
export function MetalLevelDetail({ onClose }: MetalLevelDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full rounded-t-3xl"
        style={{ background: 'var(--bg-card)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-9 h-1 rounded-full bg-slate-600" />
        </div>
      </div>
    </div>
  )
}

interface MetalLevelDetailContentProps {
  targets: Target[]
  lifetimeScore: number
  currentLevel: MetalLevel
}

// Embeddable content for use inside GameSheet — receives pre-fetched data as props
export function MetalLevelDetailContent({ targets, lifetimeScore, currentLevel }: MetalLevelDetailContentProps) {
  const nextLevel = getNextLevel(lifetimeScore)
  const progress = getProgressToNext(lifetimeScore)
  const toNext = nextLevel ? nextLevel.cumulativePoints - lifetimeScore : 0

  return (
    <div className="pb-10">
      {/* Creature hero */}
      <div className="flex flex-col items-center px-6 pb-6">
        <div
          className="w-28 h-28 rounded-full overflow-hidden mb-4"
          style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.06), 0 0 40px rgba(251,191,36,0.15)' }}
        >
          <img
            src={currentLevel.icon}
            alt={currentLevel.creatureName}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-[var(--text)] font-black text-2xl tracking-tight">{currentLevel.creatureName}</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">{currentLevel.title}</p>
        <p className="text-[var(--text-muted)] text-sm italic mt-0.5">"{currentLevel.tagline}"</p>
        <p className="mt-2 font-bold text-base" style={{ color: '#FBBF24' }}>
          ⚡ {lifetimeScore} lifetime pts
        </p>
      </div>

      {/* XP bar */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[var(--bg-deep)]">
              <img src={currentLevel.icon} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-[var(--text-secondary)] text-xs">{currentLevel.creatureName}</span>
          </div>
          {nextLevel && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)] text-xs">{nextLevel.creatureName}</span>
              <div className="w-5 h-5 rounded-full overflow-hidden bg-[var(--bg-deep)] opacity-50 grayscale">
                <img src={nextLevel.icon} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress.pct}%`, background: 'linear-gradient(90deg, #FBBF24, #F59E0B)' }}
          />
        </div>
        <p className="text-center text-[var(--text-secondary)] text-xs mt-2">
          {nextLevel
            ? `${lifetimeScore} / ${nextLevel.cumulativePoints} pts · ${toNext} to go`
            : 'MAX LEVEL reached 🔱'
          }
        </p>
      </div>

      {/* Next evolution preview */}
      {nextLevel && (
        <div
          className="mx-5 mb-6 rounded-2xl p-4 flex items-center gap-4"
          style={{ border: '1px dashed var(--border)', background: 'var(--bg-deep)' }}
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 opacity-40 grayscale">
            <img src={nextLevel.icon} alt={nextLevel.creatureName} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text)] font-bold text-sm">{nextLevel.title}</p>
            <p className="text-[var(--text-muted)] text-xs italic mt-0.5">"{nextLevel.tagline}"</p>
          </div>
        </div>
      )}

      {/* Scoring breakdown */}
      <div className="px-5 mb-6">
        <p className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-widest mb-3">
          How Points Work
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)' }}>
          {/* Base scores */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2">Base (per meeting)</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  Must Meet
                </span>
                <span className="text-sm font-bold text-yellow-400">30 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  Should Meet
                </span>
                <span className="text-sm font-bold text-yellow-400">20 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
                  Nice to Have
                </span>
                <span className="text-sm font-bold text-yellow-400">10 pts</span>
              </div>
            </div>
          </div>

          <div className="h-px mx-4" style={{ background: 'var(--border)' }} />

          {/* Bonuses */}
          <div className="px-4 pt-2 pb-3">
            <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2">Bonuses</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">☀️ First meeting of the day</span>
                <span className="text-sm font-bold text-yellow-400">+10 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">🔥 Streak (3+ in 1 hour)</span>
                <span className="text-sm font-bold text-yellow-400">×1.5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">🔥🔥 Streak (4+ in 1 hour)</span>
                <span className="text-sm font-bold text-yellow-400">×2.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">📝 Detailed notes added</span>
                <span className="text-sm font-bold text-yellow-400">+5–15 pts</span>
              </div>
            </div>
          </div>

          <div className="h-px mx-4" style={{ background: 'var(--border)' }} />

          {/* Example */}
          <div className="px-4 pt-2 pb-3">
            <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider mb-2">Example</p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Must Meet · first of day · 3rd meeting in an hour → (30 + 10) × 1.5 = <span className="text-yellow-400 font-bold">60 pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="px-5">
        <p className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-widest mb-4">
          Achievements — tap to learn more
        </p>
        <AchievementGrid targets={targets} lifetimeScore={lifetimeScore} />
      </div>
    </div>
  )
}
