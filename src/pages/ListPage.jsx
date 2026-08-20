import { useStore } from '../store/useStore'
import ContactTable from '../components/ContactTable'

export default function ListPage() {
  const openNew = useStore((s) => s.openNew)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1D1D1F]">All Contacts</h2>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition"
        >
          + Add Contact
        </button>
      </div>
      <ContactTable />
    </div>
  )
}
