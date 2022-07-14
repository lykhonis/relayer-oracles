import { SupabaseClient } from '@supabase/supabase-js'
import { definitions } from 'types/supabase'

export const queryLastCheckedBlock = async (client: SupabaseClient, contract: string) => {
  const { data, error } = await client
    .from<definitions['index_checkpoint']>('index_checkpoint')
    .select('block')
    .eq('contract', contract.toLowerCase())
    .maybeSingle()
  if (error) { throw error }
  return data?.block ?? 0
}

export const updateLastCheckedBlock = async (client: SupabaseClient, contract: string, blockNumber: number) => {
  const { error } = await client
    .from<definitions['index_checkpoint']>('index_checkpoint')
    .upsert(
      { contract: contract.toLowerCase(), block: blockNumber },
      { onConflict: 'contract' },
    )
  if (error) { throw error }
}
