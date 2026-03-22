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
  scoreLoading: boolean
  currentLevel: MetalLevel
  streakCount: number
  streakActive: boolean
  // actions
  triggerMet: (priority: Priority) => Promise<{ pts: number }>
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
  const [scoreLoading, setScoreLoading] = useState(true)
  // Track how many meetings the current user has recorded today (loaded from DB + updated in-session)
  const [todayMeetings, setTodayMeetings] = useState(0)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null)
  const [grandSlamActive, setGrandSlamActive] = useState(false)

  // Ref keeps score always-current so callbacks don't capture stale closures
  const lifetimeScoreRef = useRef(0)

  // Streak tracking (in-memory, intentional: resets on page reload)
  const interactionTimestamps = useRef<number[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load lifetime score + today's meeting count from DB on mount
  // and re-load whenever the user signs in or out
  useEffect(() => {
    const loadScore = async (userId: string) => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from('conference_profiles')
          .select('lifetime_score')
          .eq('id', userId)
          .single(),
        supabase
          .from('conference_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'met')
          .gte('met_at', todayStart.toISOString()),
      ])

      if (profile?.lifetime_score) {
        lifetimeScoreRef.current = profile.lifetime_score
        setLifetimeScore(profile.lifetime_score)
      } else {
        lifetimeScoreRef.current = 0
        setLifetimeScore(0)
      }
      setTodayMeetings(count || 0)
      setScoreLoading(false)
    }

    const resetScore = () => {
      lifetimeScoreRef.current = 0
      setLifetimeScore(0)
      setTodayMeetings(0)
      setScoreLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setScoreLoading(true)
          loadScore(session.user.id)
        } else {
          resetScore()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Keep ref in sync
  useEffect(() => {
    lifetimeScoreRef.current = lifetimeScore
  }, [lifetimeScore])

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
    interactionTimestamps.current = interactionTimestamps.current.filter(t => t > oneHourAgo)
    interactionTimestamps.current.push(now)

    const count = interactionTimestamps.current.length

    if (streakTimerRef.current) clearTimeout(streakTimerRef.current)
    streakTimerRef.current = setTimeout(() => {
      interactionTimestamps.current = []
      setStreakCount(0)
    }, 60 * 60 * 1000)

    if (count >= 3) {
      const newStreak = count - 2
      setStreakCount(newStreak)
      return 1 + (newStreak * 0.5) // ×1.5, ×2.0, ×2.5…
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

  // Use ref to avoid stale closure — always reads the latest score
  const incrementLifetimeScore = useCallback(async (pts: number): Promise<{ oldScore: number; newScore: number }> => {
    const oldScore = lifetimeScoreRef.current
    const newScore = oldScore + pts
    lifetimeScoreRef.current = newScore
    setLifetimeScore(newScore)

    const { data } = await supabase.auth.getUser()
    if (data.user) {
      await supabase
        .from('conference_profiles')
        .update({ lifetime_score: newScore })
        .eq('id', data.user.id)
    }
    return { oldScore, newScore }
  }, []) // no dependency on lifetimeScore — uses ref instead

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

  // triggerMet no longer takes timestamps — firstOfDay is tracked globally in context
  const triggerMet = useCallback(async (priority: Priority) => {
    const multiplier = updateStreakAndGetMultiplier()

    // True first-of-day: checks global meeting count for today, not per-target
    const firstOfDay = todayMeetings === 0

    const bonuses: ScoreBonuses = {
      firstOfDay,
      firstHour: false,
      streakMultiplier: multiplier,
    }

    const pts = calculateScore('met', priority, bonuses)
    const { oldScore, newScore } = await incrementLifetimeScore(pts)
    checkLevelUp(oldScore, newScore)

    // Update today's count
    setTodayMeetings(prev => prev + 1)

    if (multiplier > 1) {
      const streak = Math.round((multiplier - 1) / 0.5)
      showToast(
        getRandomToast('streak', { mult: multiplier.toFixed(1), streak }),
        'streak'
      )
    } else {
      const category: ToastCategory =
        priority === 'must_meet' ? 'met_must' :
        priority === 'should_meet' ? 'met_should' : 'met_nice'
      showToast(getRandomToast(category, { pts }), category)
    }

    return { pts }
  }, [updateStreakAndGetMultiplier, todayMeetings, incrementLifetimeScore, checkLevelUp, showToast])

  const triggerNote = useCallback((_priority: Priority, pts: number) => {
    if (pts > 0) {
      showToast(getRandomToast('note_added', { pts }), 'note_added')
    }
  }, [showToast])

  const triggerFollowup = useCallback((_priority: Priority, pts: number) => {
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
      scoreLoading,
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
