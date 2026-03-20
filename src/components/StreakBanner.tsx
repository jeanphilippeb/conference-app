import { useGame } from '@/context/GameContext'

export function StreakBanner() {
  const { streakActive, streakCount, getStreakMultiplier } = useGame()

  if (!streakActive) return null

  const multiplier = getStreakMultiplier()

  return (
    <div className="mx-4 mb-2 px-4 py-2.5 bg-yellow-400/10 border border-yellow-400/25 rounded-xl flex items-center gap-2">
      <span className="text-base">🔥</span>
      <div className="flex-1 min-w-0">
        <span className="text-yellow-300 text-sm font-semibold">
          Streak active! ×{multiplier.toFixed(1)} on next
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(streakCount + 2, 5) }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-4 rounded-full bg-yellow-400/60"
            style={{ opacity: i <= streakCount ? 1 : 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}
