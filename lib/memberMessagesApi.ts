

import { supabase } from './supabaseClient';

export interface MyMember {
  id: string;
  gym_id: string;
  first_name: string | null;
  last_name: string | null;
  member_number: string | null;
}

export interface ClientMessage {
  id: string;
  sender: 'client' | 'staff';
  body: string;
  created_at: string;
}

export interface DayHours {
  day: number;     // 0 = dimanche … 6 = samedi
  closed: boolean;
  open: string;    // "HH:MM"
  close: string;   // "HH:MM"
}

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const dayLabel = (d: number) => DAY_LABELS[d] ?? '';

export function defaultOpeningHours(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, closed: day === 0, open: '09:00', close: '20:00' }));
}

export function isOpenNow(hours: DayHours[], at: Date = new Date()): boolean {
  const day = at.getDay();
  const hhmm = at.toTimeString().slice(0, 5);
  const d = hours.find((h) => h.day === day);
  if (!d || d.closed) return false;
  return hhmm >= d.open && hhmm <= d.close;
}

/** Prochaine ouverture (texte court) à partir de maintenant. */
export function nextOpening(hours: DayHours[], at: Date = new Date()): string | null {
  for (let i = 0; i < 7; i++) {
    const day = (at.getDay() + i) % 7;
    const d = hours.find((h) => h.day === day);
    if (!d || d.closed) continue;
    if (i === 0 && at.toTimeString().slice(0, 5) < d.open) return `aujourd'hui à ${d.open}`;
    if (i > 0) return `${dayLabel(day).toLowerCase()} à ${d.open}`;
  }
  return null;
}

/** Fiche du client connecté (résolue par email Supabase Auth). */
export async function getMyMember(): Promise<MyMember | null> {
  const { data, error } = await supabase.rpc('get_my_member');
  if (error) { console.error('getMyMember', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MyMember) ?? null;
}

export async function getMyMessages(memberId: string): Promise<ClientMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getMyMessages', error); return []; }
  return (data ?? []) as ClientMessage[];
}

export async function sendClientMessage(memberId: string, gymId: string, body: string): Promise<ClientMessage | null> {
  const clean = body.trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ gym_id: gymId, member_id: memberId, sender: 'client', body: clean, read_by_client: true })
    .select('id, sender, body, created_at')
    .single();
  if (error) { console.error('sendClientMessage', error); throw error; }
  return data as ClientMessage;
}

export async function markStaffMessagesRead(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_by_client: true })
    .eq('member_id', memberId)
    .eq('sender', 'staff')
    .eq('read_by_client', false);
  if (error) console.error('markStaffMessagesRead', error);
}

export async function getOpeningHours(): Promise<DayHours[]> {
  const { data, error } = await supabase.rpc('my_gym_opening_hours');
  if (error) { console.error('getOpeningHours', error); return defaultOpeningHours(); }
  return Array.isArray(data) && data.length === 7 ? (data as DayHours[]) : defaultOpeningHours();
}
