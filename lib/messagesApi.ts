import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';

export interface MessageThread {
  member_id: string;
  first_name: string | null;
  last_name: string | null;
  member_number: string | null;
  photo_path: string | null;
  last_body: string;
  last_at: string;
  last_sender: 'client' | 'staff';
  unread: number;
}

export interface ChatMessage {
  id: string;
  member_id: string;
  sender: 'client' | 'staff';
  body: string;
  read_by_staff: boolean;
  read_by_client: boolean;
  created_at: string;
}

export interface DayHours {
  day: number;      // 0 = dimanche … 6 = samedi (comme Date.getDay())
  closed: boolean;
  open: string;     // "HH:MM"
  close: string;    // "HH:MM"
}

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const dayLabel = (d: number) => DAY_LABELS[d] ?? '';

/** Horaires par défaut si la salle n'en a pas encore défini. */
export function defaultOpeningHours(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    closed: day === 0,             // dimanche fermé par défaut
    open: '09:00',
    close: '20:00',
  }));
}

/** La salle est-elle ouverte à l'instant T ? */
export function isOpenNow(hours: DayHours[], at: Date = new Date()): boolean {
  const day = at.getDay();
  const hhmm = at.toTimeString().slice(0, 5);
  const d = hours.find((h) => h.day === day);
  if (!d || d.closed) return false;
  return hhmm >= d.open && hhmm <= d.close;
}

// ----- Threads / messages (staff) -----

export async function getThreads(): Promise<MessageThread[]> {
  const { data, error } = await supabase.rpc('staff_message_threads');
  if (error) { console.error('getThreads', error); return []; }
  return (data ?? []) as MessageThread[];
}

export async function getThreadMessages(memberId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, member_id, sender, body, read_by_staff, read_by_client, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getThreadMessages', error); return []; }
  return (data ?? []) as ChatMessage[];
}

export async function sendStaffMessage(memberId: string, body: string): Promise<ChatMessage | null> {
  const clean = body.trim();
  if (!clean) return null;
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { data, error } = await supabase
    .from('messages')
    .insert({ gym_id: gymId, member_id: memberId, sender: 'staff', body: clean, read_by_staff: true })
    .select('id, member_id, sender, body, read_by_staff, read_by_client, created_at')
    .single();
  if (error) { console.error('sendStaffMessage', error); throw error; }
  return data as ChatMessage;
}

/** Marque comme lus les messages du client dans ce fil. */
export async function markThreadReadByStaff(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_by_staff: true })
    .eq('member_id', memberId)
    .eq('sender', 'client')
    .eq('read_by_staff', false);
  if (error) console.error('markThreadReadByStaff', error);
}

// ----- Horaires d'ouverture -----

export async function getOpeningHours(): Promise<DayHours[]> {
  const gymId = await getGymId();
  if (!gymId) return defaultOpeningHours();
  const { data, error } = await supabase.from('gyms').select('opening_hours').eq('id', gymId).single();
  if (error) { console.error('getOpeningHours', error); return defaultOpeningHours(); }
  const h = (data?.opening_hours as DayHours[] | null);
  return Array.isArray(h) && h.length === 7 ? h : defaultOpeningHours();
}

export async function saveOpeningHours(hours: DayHours[]): Promise<void> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { error } = await supabase.from('gyms').update({ opening_hours: hours }).eq('id', gymId);
  if (error) { console.error('saveOpeningHours', error); throw error; }
}

// ----- FAQ éditable -----

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  cta: boolean;       // affiche « Écrire à l'équipe » sous la réponse
}

export async function getMemberFaq(): Promise<FaqItem[]> {
  const gymId = await getGymId();
  if (!gymId) return [];
  const { data, error } = await supabase.from('gyms').select('member_faq').eq('id', gymId).single();
  if (error) { console.error('getMemberFaq', error); return []; }
  const f = data?.member_faq as FaqItem[] | null;
  return Array.isArray(f) ? f : [];
}

export async function saveMemberFaq(items: FaqItem[]): Promise<void> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { error } = await supabase.from('gyms').update({ member_faq: items }).eq('id', gymId);
  if (error) { console.error('saveMemberFaq', error); throw error; }
}
