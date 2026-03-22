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

      // Conference-specific: aggregate interactions (fetch profiles separately
      // to avoid relying on an indirect FK join that Supabase may not resolve)
      const { data: interactions, error: intError } = await supabase
        .from('conference_interactions')
        .select(`
          id,
          user_id,
          status,
          score,
          conference_targets!inner(conference_id, priority)
        `)
        .eq('conference_targets.conference_id', conferenceId)
        .eq('status', 'met')

      if (intError) throw intError

      const rows = interactions || []
      const userIds = [...new Set(rows.map(r => r.user_id))]

      let profileMap: Record<string, { name: string; avatar_url?: string; lifetime_score: number }> = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('conference_profiles')
          .select('id, name, avatar_url, lifetime_score')
          .in('id', userIds)
        if (profError) throw profError
        for (const p of profiles || []) {
          profileMap[p.id] = p
        }
      }

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

  // Realtime subscription
  useEffect(() => {
    if (!conferenceId) return

    const channel = supabase
      .channel(`leaderboard-${conferenceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conference_interactions' },
        () => { fetchLeaderboard() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conference_interactions' },
        () => { fetchLeaderboard() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conferenceId, fetchLeaderboard])

  return { entries, loading, refetch: fetchLeaderboard }
}
