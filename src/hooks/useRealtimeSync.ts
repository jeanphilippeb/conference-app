import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeSync(
  conferenceId: string | undefined,
  onChange: () => void
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!conferenceId) return

    const channel = supabase
      .channel(`conference_interactions_${conferenceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conference_interactions',
        },
        () => {
          onChangeRef.current()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conference_interactions',
        },
        () => {
          onChangeRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conferenceId])
}
