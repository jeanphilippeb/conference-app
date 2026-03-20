import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Conference } from '@/lib/types'

export function useConferences() {
  const [conferences, setConferences] = useState<Conference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 3 queries total (instead of 3 per conference)
      const [{ data: confs, error: confError }, { data: allTargets }, { data: metInteractions }] =
        await Promise.all([
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
        ])

      if (confError) throw confError
      if (!confs || confs.length === 0) { setConferences([]); return }

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

  const createConference = async (data: {
    name: string
    location: string
    start_date: string
    end_date: string
    status?: Conference['status']
  }) => {
    const { data: user } = await supabase.auth.getUser()
    const { data: created, error } = await supabase
      .from('conference_conferences')
      .insert({
        ...data,
        status: data.status || 'upcoming',
        created_by: user?.user?.id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchConferences()
    return created as Conference
  }

  return { conferences, loading, error, refetch: fetchConferences, createConference }
}
