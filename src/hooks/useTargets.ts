import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, Interaction } from '@/lib/types'

export function useTargets(conferenceId: string | undefined) {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTargets = useCallback(async () => {
    if (!conferenceId) {
      setTargets([])
      setLoading(false)
      return
    }
    setLoading(true)
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

      setTargets(enriched)
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
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('conference_interactions')
      .insert({
        target_id: targetId,
        user_id: userId,
        status,
        notes,
        met_at: new Date().toISOString(),
        score,
      })
      .select()
      .single()

    if (error) throw error
    await fetchTargets()
    return data as Interaction
  }

  const updateInteractionNotes = async (interactionId: string, notes: string) => {
    const { error } = await supabase
      .from('conference_interactions')
      .update({ notes })
      .eq('id', interactionId)

    if (error) throw error
    await fetchTargets()
  }

  return {
    targets,
    loading,
    error,
    refetch: fetchTargets,
    createInteraction,
    updateInteractionNotes,
  }
}
