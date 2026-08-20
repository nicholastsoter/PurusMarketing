import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { PLATFORMS, STATUSES, NICHE_SUGGESTIONS } from '../lib/constants'
import { isHttpUrl } from '../lib/url'

const emptyForm = {
  name: '',
  platform: 'Instagram',
  handle_or_url: '',
  follower_count: '',
  niche: '',
  status: 'Identified',
  offer_code: '',
  contact_info: '',
  notes: '',
}

const inputCls = 'w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#A9A9AD] focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-accent-400 transition'

export default function ContactModal() {
  const selectedId = useStore((s) => s.selectedId)
  const isCreating = useStore((s) => s.isCreating)
  const contacts = useStore((s) => s.contacts)
  const closeModal = useStore((s) => s.closeModal)
  const addContact = useStore((s) => s.addContact)
  const updateContact = useStore((s) => s.updateContact)
  const deleteContact = useStore((s) => s.deleteContact)

  const contact = contacts.find((c) => c.id === selectedId)
  const open = isCreating || !!contact
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (contact) setForm({ ...emptyForm, ...contact, follower_count: contact.follower_count ?? '' })
    else if (isCreating) setForm(emptyForm)
    setError('')
  }, [selectedId, isCreating]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setBusy(true)
    setError('')
    const payload = {
      ...form,
      follower_count: form.follower_count === '' ? null : Number(form.follower_count),
    }
    try {
      if (contact) await updateContact(contact.id, payload)
      else await addContact(payload)
      closeModal()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!contact) return
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteContact(contact.id)
      closeModal()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start sm:items-center justify-center bg-black/20 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={closeModal}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl shadow-softHover border border-warm-200/70 my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-100">
          <h2 className="text-base font-semibold text-[#1D1D1F]">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={closeModal} className="text-[#A9A9AD] hover:text-[#1D1D1F] transition text-sm">
            Close
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Jane Doe" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Platform">
              <select className={inputCls} value={form.platform} onChange={set('platform')}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Handle / URL"
            action={
              isHttpUrl(form.handle_or_url) && (
                <a
                  href={form.handle_or_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-500 hover:text-accent-600 hover:underline transition"
                >
                  Open ↗
                </a>
              )
            }
          >
            <input className={inputCls} value={form.handle_or_url} onChange={set('handle_or_url')} placeholder="@handle or link" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Follower Count">
              <input type="number" className={inputCls} value={form.follower_count} onChange={set('follower_count')} placeholder="0" />
            </Field>
            <Field label="Niche">
              <input className={inputCls} list="niche-suggestions" value={form.niche} onChange={set('niche')} placeholder="Parenting" />
              <datalist id="niche-suggestions">
                {NICHE_SUGGESTIONS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Offer Code">
            <input className={inputCls} value={form.offer_code} onChange={set('offer_code')} placeholder="PURUS20" />
          </Field>

          <Field label="Contact Info">
            <input className={inputCls} value={form.contact_info} onChange={set('contact_info')} placeholder="Email or DM preference" />
          </Field>

          <Field label="Notes">
            <textarea
              className={`${inputCls} resize-none`}
              rows={5}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Conversation history, terms discussed, follow-up dates…"
            />
          </Field>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-warm-100">
          {contact ? (
            <button onClick={remove} disabled={busy} className="text-xs text-rose-500 hover:text-rose-600 transition disabled:opacity-50">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, action, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#6E6E73]">{label}</span>
        {action}
      </span>
      {children}
    </label>
  )
}
