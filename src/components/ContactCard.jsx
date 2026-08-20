import { Draggable } from '@hello-pangea/dnd'
import { useStore } from '../store/useStore'
import NicheTag from './NicheTag'
import { STATUSES } from '../lib/constants'

export default function ContactCard({ contact, index }) {
  const openContact = useStore((s) => s.openContact)
  const updateStatus = useStore((s) => s.updateStatus)

  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openContact(contact.id)}
          className={`bg-white rounded-xl border border-warm-200/70 p-4 space-y-2 cursor-pointer transition ${
            snapshot.isDragging ? 'shadow-softHover ring-1 ring-accent-400/30' : 'shadow-soft hover:shadow-softHover'
          }`}
        >
          <p className="text-sm font-medium text-[#1D1D1F] leading-snug">{contact.name}</p>
          <p className="text-xs text-[#A9A9AD]">{contact.platform}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <NicheTag niche={contact.niche} />
            <select
              value={contact.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateStatus(contact.id, e.target.value)}
              className="text-xs rounded-lg border border-warm-200 bg-warm-50 px-1.5 py-1 text-[#6E6E73] focus:outline-none focus:ring-1 focus:ring-accent-400/40"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </Draggable>
  )
}
