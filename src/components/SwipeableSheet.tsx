import { useRef, useState, useEffect, ReactNode } from 'react'

interface SwipeableSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxHeight?: string
}

export function SwipeableSheet({ open, onClose, children, maxHeight = '88vh' }: SwipeableSheetProps) {
  const [dragY, setDragY] = useState(0)
  const [visible, setVisible] = useState(false)
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)

  // Animate in/out
  useEffect(() => {
    if (open) {
      // Small delay so CSS transition plays on mount
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
    setDragY(0)
  }, [open])

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) {
      setDragY(delta)
    }
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
    if (dragY > 100) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  if (!open && !visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          opacity: visible && dragY < 200 ? Math.max(0, 1 - dragY / 300) : 0,
          transition: dragY === 0 ? 'opacity 0.3s ease' : 'none',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full rounded-t-3xl flex flex-col"
        style={{
          background: 'var(--bg-card)',
          maxHeight,
          transform: `translateY(${visible ? dragY : '100%'}px)`,
          transition: dragY === 0 ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
      >
        {/* Drag handle — touch target */}
        <div
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
