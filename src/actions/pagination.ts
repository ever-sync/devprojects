'use server'

import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 12

export async function fetchMoreProjects(offset: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .order('updated_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  return data ?? []
}

export async function fetchMoreClients(offset: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('*')
    .order('name')
    .range(offset, offset + PAGE_SIZE - 1)
  return data ?? []
}

export async function searchProjects(query: string, status: string, type: string) {
  const supabase = await createClient()
  let q = supabase
    .from('projects')
    .select('*, clients(name)')
    .order('updated_at', { ascending: false })

  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  if (status && status !== 'all') q = q.eq('status', status)
  if (type && type !== 'all') q = q.eq('type', type)

  const { data } = await q
  return data ?? []
}

export async function searchClients(query: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
  return data ?? []
}
