import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }
  const signOut = () => supabase.auth.signOut()

  const value = {
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    signIn,
    signUp,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
