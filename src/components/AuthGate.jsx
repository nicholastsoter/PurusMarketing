import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import purusWordmark from '../assets/purus-wordmark.png'

const inputCls = 'w-full rounded-xl border border-warm-200 px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#A9A9AD] focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-accent-400 transition'

export default function AuthGate({ children }) {
  const { configured, loading, session, signIn, signUp } = useAuth()

  if (!configured) {
    return (
      <Shell>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Setup needed</h1>
          <p className="text-sm text-[#6E6E73]">
            Add your Supabase credentials to a <code>.env</code> file (see <code>.env.example</code>), run{' '}
            <code>supabase/schema.sql</code> in your project, then restart.
          </p>
        </div>
      </Shell>
    )
  }

  if (loading) return <Shell><p className="text-sm text-[#6E6E73]">Loading…</p></Shell>

  if (!session) return <Shell><LoginForm signIn={signIn} signUp={signUp} /></Shell>

  return children
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

function LoginForm({ signIn, signUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
        setMsg('Account created — check your email to confirm, then sign in.')
      }
    } catch (err) {
      setMsg(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-8 space-y-5">
      <div className="text-center space-y-2">
        <img src={purusWordmark} alt="Purus" className="h-8 w-auto mx-auto" />
        <p className="text-sm text-[#6E6E73]">{mode === 'signin' ? 'Sign in to continue' : 'Create your account'}</p>
      </div>
      <div className="space-y-3">
        <input
          className={inputCls}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        disabled={busy}
        className="w-full rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium py-2.5 transition disabled:opacity-50"
      >
        {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
      </button>
      {msg && <p className="text-xs text-center text-amber-600">{msg}</p>}
      <button
        type="button"
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg('') }}
        className="w-full text-center text-xs text-accent-500 hover:text-accent-600 transition"
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </form>
  )
}
