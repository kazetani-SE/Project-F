import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getData } from '../services/apiClient'
import type { ClubMember } from '../types/api'

interface AuthState {
  session: Session | null
  member: ClubMember | null
  loading: boolean
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<ClubMember | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMember = useCallback(async () => {
    setLoading(true)
    try { setMember(await getData<ClubMember>('/auth/me')) }
    catch { setMember(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) setLoading(true)
      else { setMember(null); setLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) void refreshMember()
  }, [session, refreshMember])

  return <AuthContext.Provider value={{ session, member, loading, refreshMember }}>
    {children}
  </AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider missing')
  return context
}
