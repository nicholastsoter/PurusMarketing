import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { PLATFORMS, STATUSES, NICHE_SUGGESTIONS, CHANNEL_TYPES } from '../lib/constants'
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
  agreed_to_post: false,
  last_followed_up: '',
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
  const fetchContactChannels = useStore((s) => s.fetchContactChannels)
  const saveContactChannels = useStore((s) => s.saveContactChannels)

  const contact = contacts.find((c) => c.id === selectedId)
  const open = isCreating || !!contact
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [channels, setChannels] = useState([])
  const [originalChannels, setOriginalChannels] = useState([])

  useEffect(() => {
    if (contact) setForm({ ...emptyForm, ...contact, follower_count: contact.follower_count ?? '', last_followed_up: contact.last_followed_up ?? '' })
    else if (isCreating) setForm(emptyForm)
    setError('')
    // Defensive reset: this component never unmounts between contacts (it
    // always renders, just returns null when closed), so a stale `busy` from
    // a prior contact (e.g. remove()'s success path not clearing it) would
    // otherwise leak into whichever contact opens next and get stuck showing
    // "Saving…" before any save was even triggered.
    setBusy(false)

    if (contact) {
      let current = true
      fetchContactChannels(contact.id)
        .then((rows) => {
          if (!current) return
          setChannels(rows)
          setOriginalChannels(rows)
        })
        .catch((err) => { if (current) setError(err.message || 'Failed to load contact channels.') })
      return () => { current = false }
    }
    setChannels([])
    setOriginalChannels([])
  }, [selectedId, isCreating]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addChannelRow = () => setChannels((prev) => [...prev, { type: CHANNEL_TYPES[0], value: '' }])
  const updateChannelRow = (index, patch) => setChannels((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  const removeChannelRow = (index) => setChannels((prev) => prev.filter((_, i) => i !== index))

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setBusy(true)
    setError('')
    const payload = {
      ...form,
      follower_count: form.follower_count === '' ? null : Number(form.follower_count),
      last_followed_up: form.last_followed_up || null,
    }
    try {
      const saved = contact ? await updateContact(contact.id, payload) : await addContact(payload)
      await saveContactChannels(saved.id, channels, originalChannels)
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
    } finally {
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

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#6E6E73]">Additional Contact Channels</span>
            {channels.length > 0 && (
              <div className="space-y-2">
                {channels.map((ch, i) => (
                  <div key={ch.id || `new-${i}`} className="flex gap-2">
                    <select
                      className={`${inputCls} w-32 shrink-0`}
                      value={ch.type}
                      onChange={(e) => updateChannelRow(i, { type: e.target.value })}
                    >
                      {CHANNEL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      className={`${inputCls} flex-1`}
                      value={ch.value}
                      onChange={(e) => updateChannelRow(i, { value: e.target.value })}
                      placeholder="@handle, email, or number"
                    />
                    <button
                      type="button"
                      onClick={() => removeChannelRow(i)}
                      className="px-2 text-[#A9A9AD] hover:text-rose-500 transition"
                      aria-label="Remove channel"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addChannelRow} className="text-xs text-accent-500 hover:text-accent-600 transition">
              + Add channel
            </button>
          </div>

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

          <div className="grid grid-cols-2 gap-4 items-end">
            <label className="flex items-center gap-2 pb-2.5 text-sm text-[#1D1D1F]">
              <input
                type="checkbox"
                checked={form.agreed_to_post}
                onChange={(e) => setForm((f) => ({ ...f, agreed_to_post: e.target.checked }))}
              />
              Agreed to post
            </label>
            <Field label="Last Followed Up">
              <input type="date" className={inputCls} value={form.last_followed_up} onChange={set('last_followed_up')} />
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
