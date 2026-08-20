import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import BoardPage from './pages/BoardPage'
import ListPage from './pages/ListPage'
import FindLeadsPage from './pages/FindLeadsPage'
import ContactModal from './components/ContactModal'
import { useStore } from './store/useStore'

export default function App() {
  const fetchContacts = useStore((s) => s.fetchContacts)

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/find-leads" element={<FindLeadsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ContactModal />
    </Layout>
  )
}
