import { supabase } from './supabase';
export async function listTopics() {
  return supabase.from('topics').select('id,slug,name').order('name');
}
export async function listProviders(topicSlug?: string) {
  // Simplest version; refine with join when schema is loaded
  return supabase.from('providers').select('id,name,calendly_url').order('name');
}
export async function listVideos(params: { topic?: string; providerId?: string; onlyPublic?: boolean } = {}) {
  const q = supabase.from('videos').select('id,title,provider_type,embed_id,storage_path,provider_id,is_public').order('created_at',{ascending:false});
  return q;
}
export async function getVideo(id: string) {
  return supabase.from('videos').select('*').eq('id', id).single();
}
