import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentLevel, MetalLevel } from '@/lib/metalLevels'

export interface LeaderboardEntry {
  userId: string
  name: string
  avatarUrl?: string
  lifetimeScore: number
  conferenceScore: number
  metCount: number
  mustMeetCount: number
  level: MetalLevel
}

// Module-level cache keyed by conferenceId (undefined → 'global')
const leaderboardCache = new Map<string, LeaderboardEntry[]>()

export function useLeaderboard(conferenceId: string | undefined) {
  const cacheKey = conferenceId ?? 'global'
  const cached = leaderboardCache.get(cacheKey)
  const [entries, setEntries] = useState<LeaderboardEntry[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchLeaderboard = useCallback(async () => {
    if (!leaderboardCache.has(cacheKey)) setLoading(true)

    try {
      if (!conferenceId) {
        // Global: show lifetime scores from all profiles
        const { data, error } = await supabase
          .from('conference_profiles')
          .select('id, name, avatar_url, lifetime_score')
          .order('lifetime_score', { ascending: false })

        if (error) throw error

        const sorted: LeaderboardEntry[] = (data || []).map(p => ({
          userId: p.id,
          name: p.name || 'Unknown',
          avatarUrl: p.avatar_url,
          lifetimeScore: p.lifetime_score || 0,
          conferenceScore: p.lifetime_score || 0,
          metCount: 0,
          mustMeetCount: 0,
          level: getCurrentLevel(p.lifetime_score || 0),
        }))

        leaderboardCache.set(cacheKey, sorted)
        setEntries(sorted)
        return
      }

      // Conference-specific: fetch interactions + all profiles in parallel to
      // avoid two sequential round-trips.
      const [
        { data: interactions, error: intError },
        { data: allProfiles, error: profError },
      ] = await Promise.all([
        supabase
          .from('conference_interactions')
          .select(`
            id,
            user_id,
            status,
            score,
            conference_targets!inner(conference_id, priority)
          `)
          .eq('conference_targets.conference_id', conferenceId)
          .eq('status', 'met'),
        supabase
          .from('conference_profiles')
          .select('id, name, avatar_url, lifetime_score'),
      ])

      if (intError) throw intError
      if (profError) throw profError

      const rows = interactions || []
      const profileMap: Record<string, { name: string; avatar_url?: string; lifetime_score: number }> = {}
      for (const p of allProfiles || []) profileMap[p.id] = p

      const byUser: Record<string, {
        name: string
        avatarUrl?: string
        lifetimeScore: number
        conferenceScore: number
        metCount: number
        mustMeetCount: number
      }> = {}

      for (const row of rows) {
        const profile = profileMap[row.user_id]
        const target = row.conference_targets as any
        const uid = row.user_id

        if (!byUser[uid]) {
          byUser[uid] = {
            name: profile?.name || 'Unknown',
            avatarUrl: profile?.avatar_url,
            lifetimeScore: profile?.lifetime_score || 0,
            conferenceScore: 0,
            metCount: 0,
            mustMeetCount: 0,
          }
        }

        byUser[uid].conferenceScore += row.score || 0
        byUser[uid].metCount += 1
        if (target.priority === 'must_meet') {
          byUser[uid].mustMeetCount += 1
        }
      }

      const sorted: LeaderboardEntry[] = Object.entries(byUser)
        .map(([userId, u]) => ({
          userId,
          ...u,
          level: getCurrentLevel(u.lifetimeScore),
        }))
        .sort((a, b) => b.conferenceScore - a.conferenceScore)

      leaderboardCache.set(cacheKey, sorted)
      setEntries(sorted)
    } catch (err) {
      console.error('Leaderboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [conferenceId, cacheKey])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Realtime subscription — debounced so the user's own write doesn't trigger
  // an immediate re-fetch while optimistic state already reflects it.
  useEffect(() => {
    if (!conferenceId) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const handleEvent = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fetchLeaderboard(), 1200)
    }

    const channel = supabase
      .channel(`leaderboard-${conferenceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conference_interactions' }, handleEvent)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conference_interactions' }, handleEvent)
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [conferenceId, fetchLeaderboard])

  return { entries, loading, refetch: fetchLeaderboard }
}
