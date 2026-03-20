import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface GameSheetContextValue {
  isOpen: boolean
  conferenceId?: string
  conferenceName?: string
  open: (opts?: { conferenceId?: string; conferenceName?: string }) => void
  close: () => void
  setContext: (opts?: { conferenceId?: string; conferenceName?: string }) => void
}

const GameSheetContext = createContext<GameSheetContextValue | null>(null)

export function GameSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [conferenceId, setConferenceId] = useState<string | undefined>()
  const [conferenceName, setConferenceName] = useState<string | undefined>()

  const open = useCallback((opts?: { conferenceId?: string; conferenceName?: string }) => {
    if (opts?.conferenceId) setConferenceId(opts.conferenceId)
    if (opts?.conferenceName) setConferenceName(opts.conferenceName)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const setContext = useCallback((opts?: { conferenceId?: string; conferenceName?: string }) => {
    setConferenceId(opts?.conferenceId)
    setConferenceName(opts?.conferenceName)
  }, [])

  return (
    <GameSheetContext.Provider value={{ isOpen, conferenceId, conferenceName, open, close, setContext }}>
      {children}
    </GameSheetContext.Provider>
  )
}

export function useGameSheet() {
  const ctx = useContext(GameSheetContext)
  if (!ctx) throw new Error('useGameSheet must be used within GameSheetProvider')
  return ctx
}
