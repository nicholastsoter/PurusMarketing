import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  contacts: [],
  loading: true,
  error: null,
  selectedId: null,
  isCreating: false,

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

  openContact: (id) => set({ selectedId: id, isCreating: false }),
  openNew: () => set({ isCreating: true, selectedId: null }),
  closeModal: () => set({ selectedId: null, isCreating: false }),
}))
