import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import StatsBar from './StatsBar'

export default function Layout({ children }) {
  const { signOut, user } = useAuth()
  return (
    <div className="min-h-screen bg-warm-50">
      <header className="border-b border-warm-200/70 bg-warm-50/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Purus CRM</h1>
            <nav className="flex gap-1">
              <NavTab to="/">Board</NavTab>
              <NavTab to="/list">List</NavTab>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#A9A9AD] hidden sm:inline">{user?.email}</span>
            <button onClick={signOut} className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <StatsBar />
        {children}
      </main>
    </div>
  )
}

function NavTab({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          isActive ? 'bg-accent-50 text-accent-600' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-warm-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
