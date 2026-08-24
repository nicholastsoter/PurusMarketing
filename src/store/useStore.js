import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  contacts: [],
  loading: true,
  error: null,
  selectedId: null,
  isCreating: false,

  // Find Leads state lives here (not in the page component's local state) so
  // it survives navigating to another tab and back — React Router unmounts
  // the page, which would otherwise silently discard search results the
  // user already spent Apify credits on.
  leadsPlatform: 'Instagram',
  leadsTerm: '',
  leadsMinFollowers: '',
  leadsMaxFollowers: '',
  leadsUsOnly: false,
  leadsResults: null,
  leadsSelected: new Set(),
  leadsAllDuplicates: false,
  leadsLoading: false,
  leadsAdding: false,
  leadsStatusMessage: '',
  leadsError: '',
  leadsRejectingId: null,

  fetchContacts: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (error) { set({ error: error.message, loading: false }); return }
    set({ contacts: data || [], loading: false })
  },

  addContact: async (fields) => {
    const { data, error } = await supabase.from('contacts').insert(fields).select().single()
    if (error) throw error
    set((s) => ({ contacts: [data, ...s.contacts] }))
    return data
  },

  // Used by Find Leads to insert several imported profiles at once.
  bulkAddContacts: async (rows) => {
    const { data, error } = await supabase.from('contacts').insert(rows).select()
    if (error) throw error
    set((s) => ({ contacts: [...data, ...s.contacts] }))
    return data
  },

  updateContact: async (id, fields) => {
    const { data, error } = await supabase.from('contacts').update(fields).eq('id', id).select().single()
    if (error) throw error
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? data : c)) }))
    return data
  },

  // Optimistic so a drag-and-drop move feels instant; rolled back on failure.
  updateStatus: async (id, status) => {
    const prev = get().contacts
    set({ contacts: prev.map((c) => (c.id === id ? { ...c, status } : c)) })
    const { error } = await supabase.from('contacts').update({ status }).eq('id', id)
    if (error) { set({ contacts: prev }); throw error }
  },

  deleteContact: async (id) => {
    const prev = get().contacts
    set({ contacts: prev.filter((c) => c.id !== id) })
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) { set({ contacts: prev }); throw error }
  },

  // Find Leads dedup: existing contacts (by handle_or_url) and previously
  // rejected leads (by handle) for a platform, so a fresh search can exclude
  // both instead of resurfacing the same profiles every time.
  fetchKnownHandles: async (platform) => {
    const [{ data: contactRows, error: contactErr }, { data: rejectedRows, error: rejectedErr }] = await Promise.all([
      supabase.from('contacts').select('handle_or_url').eq('platform', platform),
      supabase.from('rejected_leads').select('handle').eq('platform', platform),
    ])
    if (contactErr) throw contactErr
    if (rejectedErr) throw rejectedErr
    return {
      existingUrls: new Set((contactRows || []).map((c) => c.handle_or_url).filter(Boolean)),
      rejectedHandles: new Set((rejectedRows || []).map((r) => r.handle).filter(Boolean)),
    }
  },

  rejectLead: async ({ platform, handle, handleOrUrl, reason }) => {
    const { error } = await supabase
      .from('rejected_leads')
      .upsert({ platform, handle, handle_or_url: handleOrUrl, reason: reason || null }, { onConflict: 'platform,handle' })
    if (error) throw error
  },

  fetchContactChannels: async (contactId) => {
    const { data, error } = await supabase
      .from('contact_channels')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Reconciles the modal's current channel rows against what's actually in
  // the database: deletes ones removed, inserts new ones (no id yet),
  // updates the rest. Blank rows are dropped rather than saved.
  saveContactChannels: async (contactId, current, original) => {
    const currentIds = new Set(current.filter((c) => c.id).map((c) => c.id))
    const toDelete = original.filter((c) => !currentIds.has(c.id)).map((c) => c.id)
    const toInsert = current.filter((c) => !c.id && c.value.trim())
    const toUpdate = current.filter((c) => c.id && c.value.trim())

    if (toDelete.length) {
      const { error } = await supabase.from('contact_channels').delete().in('id', toDelete)
      if (error) throw error
    }
    if (toInsert.length) {
      const { error } = await supabase
        .from('contact_channels')
        .insert(toInsert.map((c) => ({ contact_id: contactId, type: c.type, value: c.value.trim() })))
      if (error) throw error
    }
    for (const c of toUpdate) {
      const { error } = await supabase
        .from('contact_channels')
        .update({ type: c.type, value: c.value.trim() })
        .eq('id', c.id)
      if (error) throw error
    }
  },

  openContact: (id) => set({ selectedId: id, isCreating: false }),
  openNew: () => set({ isCreating: true, selectedId: null }),
  closeModal: () => set({ selectedId: null, isCreating: false }),
}))
