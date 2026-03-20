import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotSpeed: number
}

const COLORS = ['#FBBF24', '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 2 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 10,
  }))
}

export function ConfettiEffect({ count = 60, duration = 2500 }: { count?: number; duration?: number }) {
  const [particles] = useState(() => makeParticles(count))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [duration])

  if (!visible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confetti-fall-${p.id % 5} ${duration}ms linear forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall-0 { to { transform: translateY(110vh) translateX(30px) rotate(720deg); opacity: 0; } }
        @keyframes confetti-fall-1 { to { transform: translateY(110vh) translateX(-20px) rotate(-540deg); opacity: 0; } }
        @keyframes confetti-fall-2 { to { transform: translateY(110vh) translateX(50px) rotate(360deg); opacity: 0; } }
        @keyframes confetti-fall-3 { to { transform: translateY(110vh) translateX(-40px) rotate(-720deg); opacity: 0; } }
        @keyframes confetti-fall-4 { to { transform: translateY(110vh) translateX(15px) rotate(480deg); opacity: 0; } }
      `}</style>
    </div>
  )
}
