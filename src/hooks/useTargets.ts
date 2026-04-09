import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, Interaction } from '@/lib/types'

// Module-level cache: persists across route changes so navigating back shows
// data immediately instead of showing a loading skeleton.
const targetsCache = new Map<string, Target[]>()

export function clearTargetsCache(conferenceId: string) {
  targetsCache.delete(conferenceId)
}

export function useTargets(conferenceId: string | undefined) {
  const cached = conferenceId ? targetsCache.get(conferenceId) : undefined
  const [targets, setTargets] = useState<Target[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const fetchTargets = useCallback(async () => {
    if (!conferenceId) {
      setTargets([])
      setLoading(false)
      return
    }
    // Only show skeleton on first load — if cache exists, refetch silently
    if (!targetsCache.has(conferenceId)) setLoading(true)
    setError(null)
    try {
      const { data: targetsData, error: targetsError } = await supabase
        .from('conference_targets')
        .select('*')
        .eq('conference_id', conferenceId)
        .order('created_at', { ascending: true })

      if (targetsError) throw targetsError

      if (!targetsData || targetsData.length === 0) {
        setTargets([])
        return
      }

      const targetIds = targetsData.map((t) => t.id)

      // Fetch all interactions for these targets, joined with profiles
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('conference_interactions')
        .select(`
          *,
          profile:conference_profiles(id, name, email, avatar_url, role)
        `)
        .in('target_id', targetIds)
        .order('created_at', { ascending: false })

      if (interactionsError) throw interactionsError

      const interactionsByTarget: Record<string, Interaction[]> = {}
      for (const interaction of interactionsData || []) {
        if (!interactionsByTarget[interaction.target_id]) {
          interactionsByTarget[interaction.target_id] = []
        }
        interactionsByTarget[interaction.target_id].push(interaction as Interaction)
      }

      const enriched: Target[] = targetsData.map((target) => {
        const interactions = interactionsByTarget[target.id] || []
        const latestInteraction = interactions[0] || undefined
        return {
          ...target,
          interactions,
          latest_interaction: latestInteraction,
        } as Target
      })

      // Merge with the current cache to preserve any optimistic updates that
      // happened while this fetch was in-flight (e.g. toggleContacted race condition).
      const currentCache = targetsCache.get(conferenceId)
      const merged = currentCache
        ? enriched.map(t => {
            const cur = currentCache.find(c => c.id === t.id)
            return cur ? { ...t, contacted: cur.contacted ?? t.contacted } : t
          })
        : enriched

      targetsCache.set(conferenceId, merged)
      setTargets(merged)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch targets')
    } finally {
      setLoading(false)
    }
  }, [conferenceId])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  const createInteraction = async (
    targetId: string,
    notes: string,
    status: Interaction['status'] = 'met',
    score = 0
  ) => {
    // getSession reads from localStorage — no network call, instant
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Not authenticated')

    // Optimistic: add temp interaction to UI immediately
    const tempId = `temp_${Date.now()}`
    const metAt = new Date().toISOString()
    const optimistic: Interaction = {
      id: tempId,
      target_id: targetId,
      user_id: userId,
      status,
      notes,
      met_at: metAt,
      created_at: metAt,
      score,
    }
    const addOptimistic = (list: Target[]) =>
      list.map(t =>
        t.id === targetId
          ? { ...t, interactions: [optimistic, ...(t.interactions || [])], latest_interaction: optimistic }
          : t
      )
    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, addOptimistic(cached))
    }
    setTargets(prev => addOptimistic(prev))

    // Persist to DB — replace temp with real on success, revert on error
    const { data, error } = await supabase
      .from('conference_interactions')
      .insert({ target_id: targetId, user_id: userId, status, notes, met_at: metAt, score })
      .select()
      .single()

    if (error) {
      const revert = (list: Target[]) =>
        list.map(t => {
          if (t.id !== targetId) return t
          const remaining = (t.interactions || []).filter(i => i.id !== tempId)
          return { ...t, interactions: remaining, latest_interaction: remaining[0] }
        })
      if (conferenceId) {
        const cached = targetsCache.get(conferenceId)
        if (cached) targetsCache.set(conferenceId, revert(cached))
      }
      setTargets(prev => revert(prev))
      throw error
    }

    const real = data as Interaction
    const replaceTemp = (list: Target[]) =>
      list.map(t => {
        if (t.id !== targetId) return t
        const interactions = (t.interactions || []).map(i => i.id === tempId ? real : i)
        const latest = t.latest_interaction?.id === tempId ? real : t.latest_interaction
        return { ...t, interactions, latest_interaction: latest }
      })
    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, replaceTemp(cached))
    }
    setTargets(prev => replaceTemp(prev))
    return real
  }

  const deleteInteraction = async (interactionId: string) => {
    // Optimistic: remove from UI immediately
    const removeFromCache = (list: Target[]) =>
      list.map(t => {
        const remaining = (t.interactions || []).filter(i => i.id !== interactionId)
        return {
          ...t,
          interactions: remaining,
          latest_interaction: t.latest_interaction?.id === interactionId ? remaining[0] : t.latest_interaction,
        }
      })
    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, removeFromCache(cached))
    }
    setTargets(prev => removeFromCache(prev))

    const { error } = await supabase
      .from('conference_interactions')
      .delete()
      .eq('id', interactionId)

    if (error) throw error
  }

  // Delete multiple interactions in parallel then update cache
  const deleteInteractions = async (interactionIds: string[]) => {
    // Optimistic: remove from UI immediately
    const idSet = new Set(interactionIds)
    const removeFromCache = (list: Target[]) =>
      list.map(t => {
        const remaining = (t.interactions || []).filter(i => !idSet.has(i.id))
        return {
          ...t,
          interactions: remaining,
          latest_interaction: t.latest_interaction && idSet.has(t.latest_interaction.id) ? remaining[0] : t.latest_interaction,
        }
      })
    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, removeFromCache(cached))
    }
    setTargets(prev => removeFromCache(prev))

    await Promise.all(
      interactionIds.map(id =>
        supabase.from('conference_interactions').delete().eq('id', id).then(({ error }) => {
          if (error) throw error
        })
      )
    )
  }

  const toggleContacted = async (targetId: string, contacted: boolean) => {
    // Optimistic update first so UI responds instantly
    const apply = (list: Target[]) => list.map(t => t.id === targetId ? { ...t, contacted } : t)
    const revert = (list: Target[]) => list.map(t => t.id === targetId ? { ...t, contacted: !contacted } : t)

    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, apply(cached))
    }
    setTargets(prev => apply(prev))

    const { error } = await supabase
      .from('conference_targets')
      .update({ contacted })
      .eq('id', targetId)

    if (error) {
      // Revert on failure
      if (conferenceId) {
        const cached = targetsCache.get(conferenceId)
        if (cached) targetsCache.set(conferenceId, revert(cached))
      }
      setTargets(prev => revert(prev))
      throw error
    }
  }

  const updateInteractionNotes = async (interactionId: string, notes: string) => {
    const { error } = await supabase
      .from('conference_interactions')
      .update({ notes })
      .eq('id', interactionId)

    if (error) throw error

    // Update in-place in the cache and state — no full refetch needed
    const updateInCache = (list: Target[]) =>
      list.map(t => ({
        ...t,
        interactions: (t.interactions || []).map(i =>
          i.id === interactionId ? { ...i, notes } : i
        ),
        latest_interaction:
          t.latest_interaction?.id === interactionId
            ? { ...t.latest_interaction, notes }
            : t.latest_interaction,
      }))

    if (conferenceId) {
      const cached = targetsCache.get(conferenceId)
      if (cached) targetsCache.set(conferenceId, updateInCache(cached))
    }
    setTargets(prev => updateInCache(prev))
  }

  return {
    targets,
    loading,
    error,
    refetch: fetchTargets,
    createInteraction,
    updateInteractionNotes,
    deleteInteraction,
    deleteInteractions,
    toggleContacted,
  }
}
