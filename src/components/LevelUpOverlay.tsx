import { useEffect, useState } from 'react'
import { useGame } from '@/context/GameContext'
import { ConfettiEffect } from './ConfettiEffect'

export function LevelUpOverlay() {
  const { levelUpData, clearLevelUp } = useGame()
  const [phase, setPhase] = useState<'in' | 'show'>('in')

  useEffect(() => {
    if (levelUpData) {
      setPhase('in')
      const t = setTimeout(() => setPhase('show'), 50)
      return () => clearTimeout(t)
    }
  }, [levelUpData])

  if (!levelUpData) return null

  const { oldLevel, newLevel } = levelUpData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <ConfettiEffect count={80} duration={3000} />

      <button
        className="absolute inset-0"
        onClick={clearLevelUp}
        aria-label="Dismiss"
      />

      <div
        className="relative flex flex-col items-center px-8 text-center"
        style={{
          opacity: phase === 'show' ? 1 : 0,
          transform: phase === 'show' ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <p className="text-[var(--text-secondary)] text-sm mb-2 uppercase tracking-widest">Evolution</p>

        {/* Old → New */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center opacity-40">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] grayscale">
              <img src={oldLevel.icon} alt={oldLevel.creatureName} className="w-full h-full object-cover" />
            </div>
            <span className="text-[var(--text-muted)] text-xs mt-1">{oldLevel.creatureName}</span>
          </div>
          <span className="text-yellow-400 text-2xl">→</span>
          <div className="flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-3xl overflow-hidden"
              style={{
                boxShadow: '0 0 40px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.2)',
              }}
            >
              <img src={newLevel.icon} alt={newLevel.creatureName} className="w-full h-full object-cover" />
            </div>
            <span className="text-[var(--text)] font-black text-lg mt-2">{newLevel.creatureName}</span>
          </div>
        </div>

        <h2 className="text-[var(--text)] font-black text-3xl tracking-tight mb-1">
          {newLevel.creatureName}
        </h2>
        <p className="text-yellow-400 font-semibold mb-2">{newLevel.title}</p>
        <p className="text-[var(--text-secondary)] text-sm italic mb-8">"{newLevel.tagline}"</p>

        <button
          onClick={clearLevelUp}
          className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300 transition-colors"
        >
          Let's Go!
        </button>
      </div>
    </div>
  )
}
