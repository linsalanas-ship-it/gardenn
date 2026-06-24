import { createClient } from '@/lib/supabase/server'
import GardenView from '@/components/GardenView'
import type { Reference } from '@/lib/types'

export const metadata = { title: 'Gardenn — Verball' }

export default async function GardenPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('references')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return <GardenView references={(data ?? []) as Reference[]} />
}
