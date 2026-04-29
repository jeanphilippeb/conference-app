import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data } = await supabase
        .from('conference_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data as Profile)
      } else {
        // Auto-create profile on first login
        const name = email.split('@')[0].replace(/[._]/g, ' ')
        const { data: newProfile } = await supabase
          .from('conference_profiles')
          .upsert({ id: userId, email, name, role: 'rep' })
          .select()
          .single()
        if (newProfile) setProfile(newProfile as Profile)
      }
    } catch {
      // Non-fatal — app works without profile
    }
  }

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session (INITIAL_SESSION event)
    // so we only need this one listener — no need for getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '')
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    // Safety timeout — if Supabase never responds, unblock after 3s
    const timeout = setTimeout(() => setLoading(false), 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
  }

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — sign out regardless
    }
    // Hard reload clears all module-level caches (targets, conferences, leaderboard)
    // and guarantees a clean state for the next user
    window.location.href = '/auth'
  }

  return { user, profile, loading, signInWithEmail, verifyOtp, signOut }
}
