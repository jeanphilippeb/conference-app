import { useGame } from '@/context/GameContext'
import { useGameSheet } from '@/context/GameSheetContext'

export function GameHeaderButton() {
  const { currentLevel, lifetimeScore } = useGame()
  const { open } = useGameSheet()

  return (
    <button
      onClick={() => open()}
      className="flex items-center gap-1.5 px-2 py-1 rounded-xl active:scale-95 transition-transform"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
        <img src={currentLevel.icon} alt="" className="w-full h-full object-cover" />
      </div>
      <span className="text-yellow-400 text-xs font-black">⚡{lifetimeScore}</span>
    </button>
  )
}
