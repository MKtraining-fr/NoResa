import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';

/**
 * Identité « app adhérent » (white-label) côté back-office.
 * Lecture + écriture directes sur la table gyms (policy gyms_write = ALL,
 * même pattern éprouvé que saveOpeningHours / saveMemberFaq).
 * Colonnes réelles : display_name, primary_color, logo_url.
 */

export interface GymBranding {
  name: string;          // nom légal/CRM (non modifié ici)
  displayName: string;   // nom affiché dans l'app adhérent
  color: string;         // couleur de marque (#RRGGBB)
  logoUrl: string | null;
}

export async function getGymBranding(): Promise<GymBranding | null> {
  const gymId = await getGymId();
  if (!gymId) return null;
  const { data, error } = await supabase
    .from('gyms')
    .select('name, display_name, primary_color, logo_url')
    .eq('id', gymId)
    .single();
  if (error) { console.error('gymApi.getGymBranding', error); return null; }
  return {
    name: data?.name ?? '',
    displayName: data?.display_name ?? data?.name ?? '',
    color: data?.primary_color ?? '#4F46E5',
    logoUrl: data?.logo_url ?? null,
  };
}

export async function saveGymBranding(p: {
  displayName: string;
  color: string;
  logoUrl?: string | null;   // undefined = ne pas toucher
}): Promise<void> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const patch: Record<string, any> = {
    display_name: p.displayName.trim() || null,
    primary_color: p.color,
  };
  if (p.logoUrl !== undefined) patch.logo_url = p.logoUrl;
  const { error } = await supabase.from('gyms').update(patch).eq('id', gymId);
  if (error) { console.error('gymApi.saveGymBranding', error); throw error; }
}

/**
 * Informations de la salle (onglet « Salle » des Réglages).
 * Ces champs étaient auparavant stockés en localStorage et n'atteignaient jamais la base :
 * les modifications semblaient enregistrées mais restaient invisibles côté adhérent.
 */
export interface GymInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  description: string;
  pricing: string;
  bannerImage: string;
  features: string[];
}

export async function getGymInfo(): Promise<GymInfo | null> {
  const gymId = await getGymId();
  if (!gymId) return null;
  const { data, error } = await supabase
    .from('gyms')
    .select('name, address, city, postal_code, phone, email, description, pricing, banner_image, features')
    .eq('id', gymId)
    .single();
  if (error) { console.error('gymApi.getGymInfo', error); return null; }
  return {
    name: data?.name ?? '',
    address: data?.address ?? '',
    city: data?.city ?? '',
    postalCode: data?.postal_code ?? '',
    phone: data?.phone ?? '',
    email: data?.email ?? '',
    description: data?.description ?? '',
    pricing: data?.pricing ?? '',
    bannerImage: data?.banner_image ?? '',
    features: Array.isArray(data?.features) ? (data!.features as string[]) : [],
  };
}

export async function saveGymInfo(p: GymInfo): Promise<void> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { error } = await supabase.from('gyms').update({
    name: p.name.trim() || null,
    address: p.address.trim() || null,
    city: p.city.trim() || null,
    postal_code: p.postalCode.trim() || null,
    phone: p.phone.trim() || null,
    email: p.email.trim() || null,
    description: p.description.trim() || null,
    pricing: p.pricing.trim() || null,
    banner_image: p.bannerImage.trim() || null,
    features: p.features,
  }).eq('id', gymId);
  if (error) { console.error('gymApi.saveGymInfo', error); throw error; }
}

/** Téléverse un logo dans le bucket public gym-logos et renvoie son URL publique. */
export async function uploadGymLogo(file: File): Promise<string> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${gymId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('gym-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) { console.error('gymApi.uploadGymLogo', error); throw error; }
  const { data } = supabase.storage.from('gym-logos').getPublicUrl(path);
  return data.publicUrl;
}
