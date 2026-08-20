import { useStore } from '../store/useStore'
import KanbanBoard from '../components/KanbanBoard'

export default function BoardPage() {
  const openNew = useStore((s) => s.openNew)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Board</h2>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition"
        >
          + Add Contact
        </button>
      </div>
      <KanbanBoard />
    </div>
  )
}
