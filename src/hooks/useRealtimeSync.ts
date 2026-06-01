import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Debounce delay in ms — long enough that the user's own write doesn't trigger
// an immediate re-fetch (optimistic state already reflects it), but short enough
// to pick up a teammate's action within ~1 second.
const DEBOUNCE_MS = 1200

export function useRealtimeSync(
  conferenceId: string | undefined,
  onChange: () => void
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!conferenceId) return

    const handleEvent = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { onChangeRef.current() }, DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`conference_interactions_${conferenceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conference_interactions' }, handleEvent)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conference_interactions' }, handleEvent)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conference_interactions' }, handleEvent)
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [conferenceId])
}
