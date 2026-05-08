import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Conference } from '@/lib/types'

// Module-level cache: persists across route changes so navigating back shows
// data immediately instead of showing a loading skeleton.
let conferencesCache: Conference[] | null = null

export function useConferences() {
  const [conferences, setConferences] = useState<Conference[]>(conferencesCache ?? [])
  const [loading, setLoading] = useState(conferencesCache === null)
  const [error, setError] = useState<string | null>(null)

  const fetchConferences = useCallback(async (retryCount = 0) => {
    // Only show skeleton on first load — if cache exists, refetch silently
    if (conferencesCache === null) setLoading(true)
    setError(null)
    try {
      // Race against a 10s timeout — Supabase can hang indefinitely when the
      // client is waiting for a token refresh that never completes.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — tap Refresh to retry')), 10000)
      )

      const [{ data: confs, error: confError }, { data: allTargets }, { data: metInteractions }] =
        await Promise.race([
          Promise.all([
            supabase
              .from('conference_conferences')
              .select('*')
              .order('start_date', { ascending: false }),
            supabase
              .from('conference_targets')
              .select('id, conference_id'),
            supabase
              .from('conference_interactions')
              .select('target_id')
              .eq('status', 'met'),
          ]),
          timeoutPromise,
        ])

      if (confError) throw confError
      if (!confs || confs.length === 0) {
        // On first load, retry once after a short delay to handle the race condition
        // between Supabase INITIAL_SESSION firing and the auth token being fully ready.
        if (retryCount === 0) {
          setTimeout(() => fetchConferences(1), 1500)
          return
        }
        conferencesCache = []
        setConferences([])
        return
      }

      const metTargetIds = new Set((metInteractions || []).map(i => i.target_id))

      // Group targets by conference_id
      const targetsByConf: Record<string, string[]> = {}
      for (const t of allTargets || []) {
        if (!targetsByConf[t.conference_id]) targetsByConf[t.conference_id] = []
        targetsByConf[t.conference_id].push(t.id)
      }

      const enriched = confs.map(conf => {
        const ids = targetsByConf[conf.id] || []
        const metCount = ids.filter(id => metTargetIds.has(id)).length
        return { ...conf, target_count: ids.length, met_count: metCount } as Conference
      })

      conferencesCache = enriched
      setConferences(enriched)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConferences()
  }, [fetchConferences])

  const invalidateCache = () => { conferencesCache = null }

  const createConference = async (data: {
    name: string
    location: string
    start_date: string
    end_date: string
    status?: Conference['status']
  }) => {
    const { data: userData } = await supabase.auth.getUser()
    const { data: created, error } = await supabase
      .from('conference_conferences')
      .insert({
        ...data,
        status: data.status || 'upcoming',
        created_by: userData?.user?.id,
      })
      .select()
      .single()

    if (error) throw error

    // Optimistic update: add to list immediately without triggering loading skeleton
    const newConf = { ...created, target_count: 0, met_count: 0 } as Conference
    const updated = [newConf, ...(conferencesCache || [])]
    conferencesCache = updated
    setConferences(updated)

    // Background refresh for accurate counts (won't show skeleton since cache is set)
    fetchConferences()

    return newConf
  }

  return { conferences, loading, error, refetch: fetchConferences, createConference, invalidateCache }
}
