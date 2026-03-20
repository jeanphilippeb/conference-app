import { useEffect, useState } from 'react'

interface PointsFloaterProps {
  points: number
  onDone: () => void
}

export function PointsFloater({ points, onDone }: PointsFloaterProps) {
  const [phase, setPhase] = useState<'enter' | 'float' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('float'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 600)
    const t3 = setTimeout(onDone, 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      style={{
        transform: phase === 'enter' ? 'translateY(0)' :
                   phase === 'float' ? 'translateY(-40px)' : 'translateY(-60px)',
        opacity: phase === 'enter' ? 0 : phase === 'float' ? 1 : 0,
        transition: phase === 'enter'
          ? 'opacity 0.1s ease-out'
          : phase === 'float'
          ? 'transform 0.55s ease-out'
          : 'opacity 0.3s ease-in, transform 0.3s ease-in',
      }}
    >
      <span
        className="text-3xl font-black tracking-tight"
        style={{ color: '#FBBF24', textShadow: '0 0 20px rgba(251,191,36,0.5)' }}
      >
        +{points}
      </span>
    </div>
  )
}
