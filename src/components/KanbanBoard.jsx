import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { STATUSES } from '../lib/constants'
import ContactCard from './ContactCard'

export default function KanbanBoard() {
  const contacts = useStore((s) => s.contacts)
  const updateStatus = useStore((s) => s.updateStatus)

  const columns = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, []]))
    for (const c of contacts) (map[c.status] || map.Identified).push(c)
    // Oldest-added at the top of each column, newest at the bottom, so the
    // ones that have been sitting the longest are the easiest to spot.
    for (const list of Object.values(map)) {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    return map
  }, [contacts])

  const onDragEnd = (result) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return
    updateStatus(draggableId, destination.droppableId)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {STATUSES.map((status) => (
          <div key={status} className="flex-shrink-0 w-72">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-medium text-[#1D1D1F]">{status}</h3>
              <span className="text-xs text-[#A9A9AD]">{columns[status].length}</span>
            </div>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 min-h-[120px] rounded-xl p-2 transition ${
                    snapshot.isDraggingOver ? 'bg-accent-50/60' : ''
                  }`}
                >
                  {columns[status].map((c, i) => (
                    <ContactCard key={c.id} contact={c} index={i} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
