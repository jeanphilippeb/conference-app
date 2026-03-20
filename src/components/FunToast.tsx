import { useEffect, useState } from 'react'
import { useGame } from '@/context/GameContext'

export function FunToastContainer() {
  const { toasts, dismissToast } = useGame()

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(toast => (
        <FunToast
          key={toast.id}
          message={toast.message}
          borderColor={toast.borderColor}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  )
}

function FunToast({
  message,
  borderColor,
  onDismiss,
}: {
  message: string
  borderColor: string
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const parts = message.split(/(\+\d+ pts)/g)

  return (
    <button
      onClick={onDismiss}
      className="pointer-events-auto w-full max-w-sm text-left"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
    >
      <div
        className="bg-[var(--bg)]/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg"
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <p className="text-sm font-medium text-[var(--text)] leading-snug">
          {parts.map((part, i) =>
            part.match(/^\+\d+ pts$/) ? (
              <span key={i} className="font-bold" style={{ color: '#FBBF24' }}>{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </div>
    </button>
  )
}
