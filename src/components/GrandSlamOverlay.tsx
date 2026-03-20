import { useGame } from '@/context/GameContext'
import { ConfettiEffect } from './ConfettiEffect'

export function GrandSlamOverlay() {
  const { grandSlamActive, clearGrandSlam } = useGame()

  if (!grandSlamActive) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <ConfettiEffect count={100} duration={4000} />

      <button className="absolute inset-0" onClick={clearGrandSlam} />

      <div className="relative flex flex-col items-center px-8 text-center animate-bounce-once">
        <div className="text-8xl mb-4">👑</div>
        <h1 className="text-[var(--text)] font-black text-4xl tracking-tight mb-2">GRAND SLAM</h1>
        <p className="text-yellow-400 font-semibold text-lg mb-1">Every Must-Meet is down.</p>
        <p className="text-[var(--text-secondary)] text-sm mb-10">You came. You networked. You conquered.</p>

        <button
          onClick={clearGrandSlam}
          className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300 transition-colors"
        >
          Back to the Floor
        </button>
      </div>
    </div>
  )
}
