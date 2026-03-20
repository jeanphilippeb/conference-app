import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateScore, ScoreBonuses } from '@/lib/scoring'
import { getCurrentLevel, MetalLevel } from '@/lib/metalLevels'
import { getRandomToast, ToastCategory } from '@/lib/toastMessages'
import type { Priority } from '@/lib/types'

export interface ToastData {
  id: string
  message: string
  borderColor: string
  category: ToastCategory
}

export interface LevelUpData {
  oldLevel: MetalLevel
  newLevel: MetalLevel
}

interface GameContextValue {
  lifetimeScore: number
  currentLevel: MetalLevel
  streakCount: number
  streakActive: boolean
  // actions
  triggerMet: (priority: Priority, myInteractionTimestamps: string[]) => Promise<{ pts: number }>
  triggerNote: (priority: Priority, pts: number) => void
  triggerFollowup: (priority: Priority, pts: number) => void
  showToast: (message: string, category: ToastCategory) => void
  // state
  toasts: ToastData[]
  dismissToast: (id: string) => void
  levelUpData: LevelUpData | null
  clearLevelUp: () => void
  grandSlamActive: boolean
  clearGrandSlam: () => void
  // score bonus for current interaction
  getStreakMultiplier: () => number
}

const GameContext = createContext<GameContextValue | null>(null)

const TOAST_BORDER_COLORS: Record<ToastCategory, string> = {
  met_must:       '#E53E3E',
  met_should:     '#ED8936',
  met_nice:       '#718096',
  note_added:     '#3B82F6',
  followup_added: '#8B5CF6',
  streak:         '#FBBF24',
  grand_slam:     '#FBBF24',
  level_up:       '#F59E0B',
  app_open:       '#38A169',
  achievement:    '#38A169',
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [lifetimeScore, setLifetimeScore] = useState(0)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null)
  const [grandSlamActive, setGrandSlamActive] = useState(false)

  // Streak tracking (in-memory)
  const interactionTimestamps = useRef<number[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load lifetime score from profile on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('conference_profiles')
        .select('lifetime_score')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.lifetime_score) {
            setLifetimeScore(profile.lifetime_score)
          }
        })
    })
  }, [])

  const currentLevel = getCurrentLevel(lifetimeScore)

  const showToast = useCallback((message: string, category: ToastCategory) => {
    const id = `${Date.now()}-${Math.random()}`
    const newToast: ToastData = {
      id,
      message,
      borderColor: TOAST_BORDER_COLORS[category],
      category,
    }
    setToasts(prev => [...prev.slice(-2), newToast]) // max 3 at once
    if (navigator.vibrate) navigator.vibrate(30)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const updateStreakAndGetMultiplier = useCallback((): number => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    // Clean old timestamps
    interactionTimestamps.current = interactionTimestamps.current.filter(t => t > oneHourAgo)
    interactionTimestamps.current.push(now)

    const count = interactionTimestamps.current.length

    // Reset timer
    if (streakTimerRef.current) clearTimeout(streakTimerRef.current)
    streakTimerRef.current = setTimeout(() => {
      interactionTimestamps.current = []
      setStreakCount(0)
    }, 60 * 60 * 1000)

    if (count >= 3) {
      const newStreak = count - 2 // streak level starts at 1 when 3rd interaction
      setStreakCount(newStreak)
      return 1 + (newStreak * 0.5) // 1.5, 2.0, 2.5...
    }
    return 1
  }, [])

  const getStreakMultiplier = useCallback((): number => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const recent = interactionTimestamps.current.filter(t => t > oneHourAgo)
    if (recent.length >= 3) {
      const streak = recent.length - 2
      return 1 + (streak * 0.5)
    }
    return 1
  }, [])

  const incrementLifetimeScore = useCallback(async (pts: number): Promise<{ oldScore: number; newScore: number }> => {
    const oldScore = lifetimeScore
    const newScore = oldScore + pts
    setLifetimeScore(newScore)

    const { data } = await supabase.auth.getUser()
    if (data.user) {
      await supabase
        .from('conference_profiles')
        .update({ lifetime_score: newScore })
        .eq('id', data.user.id)
    }
    return { oldScore, newScore }
  }, [lifetimeScore])

  const checkLevelUp = useCallback((oldScore: number, newScore: number) => {
    const oldLevel = getCurrentLevel(oldScore)
    const newLevel = getCurrentLevel(newScore)
    if (newLevel.level > oldLevel.level) {
      setLevelUpData({ oldLevel, newLevel })
      const msg = getRandomToast('level_up', {
        old_name: oldLevel.creatureName,
        new_name: newLevel.creatureName,
        tagline: newLevel.tagline,
      })
      showToast(msg, 'level_up')
    }
  }, [showToast])

  const triggerMet = useCallback(async (priority: Priority, myInteractionTimestamps: string[]) => {
    const multiplier = updateStreakAndGetMultiplier()
    const firstOfDay = !myInteractionTimestamps.some(ts => {
      const d = new Date(ts)
      const today = new Date()
      return d.toDateString() === today.toDateString()
    })

    const bonuses: ScoreBonuses = {
      firstOfDay,
      firstHour: false,
      streakMultiplier: multiplier,
    }

    const pts = calculateScore('met', priority, bonuses)
    const { oldScore, newScore } = await incrementLifetimeScore(pts)
    checkLevelUp(oldScore, newScore)

    // Streak toast if active
    if (multiplier > 1) {
      const streak = Math.round((multiplier - 1) / 0.5)
      showToast(
        getRandomToast('streak', { mult: multiplier.toFixed(1), streak }),
        'streak'
      )
    } else {
      // Regular met toast
      const category: ToastCategory =
        priority === 'must_meet' ? 'met_must' :
        priority === 'should_meet' ? 'met_should' : 'met_nice'
      showToast(getRandomToast(category, { pts }), category)
    }

    return { pts }
  }, [updateStreakAndGetMultiplier, incrementLifetimeScore, checkLevelUp, showToast])

  const triggerNote = useCallback((priority: Priority, pts: number) => {
    if (pts > 0) {
      showToast(getRandomToast('note_added', { pts }), 'note_added')
    }
  }, [showToast])

  const triggerFollowup = useCallback((priority: Priority, pts: number) => {
    if (pts > 0) {
      showToast(getRandomToast('followup_added', { pts }), 'followup_added')
    }
  }, [showToast])

  const clearLevelUp = useCallback(() => setLevelUpData(null), [])
  const clearGrandSlam = useCallback(() => setGrandSlamActive(false), [])

  const streakActive = streakCount > 0

  return (
    <GameContext.Provider value={{
      lifetimeScore,
      currentLevel,
      streakCount,
      streakActive,
      triggerMet,
      triggerNote,
      triggerFollowup,
      showToast,
      toasts,
      dismissToast,
      levelUpData,
      clearLevelUp,
      grandSlamActive,
      clearGrandSlam,
      getStreakMultiplier,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
