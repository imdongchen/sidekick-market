import { supabase } from '@/supabase/client'

export function getUserAvatarLink(avatar: string) {
  if (!avatar) return undefined
  return supabase.storage.from('avatars').getPublicUrl(avatar).data.publicUrl
}
