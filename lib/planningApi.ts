import { supabase } from './supabaseClient';

/**
 * Couche données "planning adhérent" (self-service).
 * Branchée sur les fonctions SECURITY DEFINER de code-membre/02-schema-planning.sql.
 * Réservation + liste d'attente gérées côté SQL (atomique, anti-doublon).
 */

export type BookingStatus = 'booked' | 'waitlist' | null;

export interface Session {
  id: string;
  classTypeId: string;
  typeName: string;
  color: string;
  coachName: string | null;
  startsAt: string;        // ISO
  endsAt: string;          // ISO
  capacity: number;
  bookedCount: number;
  spotsLeft: number;
  myStatus: BookingStatus; // ma réservation sur ce créneau
}

function rowToSession(r: any): Session {
  return {
    id: r.id,
    classTypeId: r.class_type_id,
    typeName: r.type_name ?? '',
    color: r.color ?? '#E11D2A',
    coachName: r.coach_name ?? null,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    capacity: Number(r.capacity ?? 0),
    bookedCount: Number(r.booked_count ?? 0),
    spotsLeft: Number(r.spots_left ?? 0),
    myStatus: (r.my_status ?? null) as BookingStatus,
  };
}

/** Créneaux entre deux dates (incluses pour from, exclues pour to). */
export async function listSessions(from: Date, to: Date): Promise<Session[]> {
  const { data, error } = await supabase.rpc('list_sessions', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) { console.error('planningApi.listSessions', error); return []; }
  return (data ?? []).map(rowToSession);
}

/** Réserve un créneau. Renvoie 'booked' ou 'waitlist' (si complet). */
export async function bookSession(sessionId: string): Promise<BookingStatus> {
  const { data, error } = await supabase.rpc('book_session', { p_session_id: sessionId });
  if (error) { console.error('planningApi.bookSession', error); throw error; }
  return (data ?? null) as BookingStatus;
}

/** Annule ma réservation (et promeut le 1er en liste d'attente). */
export async function cancelBooking(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_booking', { p_session_id: sessionId });
  if (error) { console.error('planningApi.cancelBooking', error); throw error; }
}

export interface MyBooking {
  sessionId: string;
  typeName: string;
  color: string;
  coachName: string | null;
  startsAt: string;
  endsAt: string;
  myStatus: BookingStatus;
}

/** Mes réservations à venir (confirmées + liste d'attente). */
export async function myBookings(): Promise<MyBooking[]> {
  const { data, error } = await supabase.rpc('my_bookings');
  if (error) { console.error('planningApi.myBookings', error); return []; }
  return (data ?? []).map((r: any) => ({
    sessionId: r.session_id,
    typeName: r.type_name ?? '',
    color: r.color ?? '#E11D2A',
    coachName: r.coach_name ?? null,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    myStatus: (r.my_status ?? null) as BookingStatus,
  }));
}

// --- Helpers d'affichage ----------------------------------------------------

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Liste des types présents dans un lot de créneaux (pour les filtres). */
export function typesFrom(sessions: Session[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.typeName)));
}

// ===========================================================================
// Back-office (staff) — RPC admin scopées à la salle (my_gyms).
// ===========================================================================

export interface ClassType { id: string; name: string; color: string; durationMin: number; capacity: number; active: boolean }
export interface AdminSession {
  id: string; classTypeId: string; typeName: string; color: string; coachName: string | null;
  startsAt: string; endsAt: string; capacity: number; bookedCount: number; waitlistCount: number;
}
export interface RosterEntry {
  bookingId: string; memberId: string; firstName: string; lastName: string;
  memberNumber: string | null; status: 'booked' | 'waitlist'; createdAt: string;
}
export interface Recurrence {
  id: string; classTypeId: string; typeName: string; weekday: number;
  startTime: string; durationMin: number; capacity: number | null; coachName: string | null; active: boolean;
}

export async function listClassTypes(): Promise<ClassType[]> {
  const { data, error } = await supabase.rpc('admin_list_class_types');
  if (error) { console.error('listClassTypes', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name ?? '', color: r.color ?? '#E11D2A',
    durationMin: Number(r.duration_min ?? 60), capacity: Number(r.capacity ?? 0), active: !!r.active,
  }));
}

export async function upsertClassType(p: { id?: string; name: string; color: string; durationMin: number; capacity: number; active?: boolean }): Promise<string> {
  const { data, error } = await supabase.rpc('admin_upsert_class_type', {
    p_id: p.id ?? null, p_name: p.name, p_color: p.color,
    p_duration_min: p.durationMin, p_capacity: p.capacity, p_active: p.active ?? true,
  });
  if (error) { console.error('upsertClassType', error); throw error; }
  return data as string;
}

export async function deleteClassType(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_class_type', { p_id: id });
  if (error) { console.error('deleteClassType', error); throw error; }
}

export async function adminListSessions(from: Date, to: Date): Promise<AdminSession[]> {
  const { data, error } = await supabase.rpc('admin_list_sessions', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) { console.error('adminListSessions', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, classTypeId: r.class_type_id, typeName: r.type_name ?? '', color: r.color ?? '#E11D2A',
    coachName: r.coach_name ?? null, startsAt: r.starts_at, endsAt: r.ends_at,
    capacity: Number(r.capacity ?? 0), bookedCount: Number(r.booked_count ?? 0), waitlistCount: Number(r.waitlist_count ?? 0),
  }));
}

export async function sessionRoster(sessionId: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc('admin_session_roster', { p_session_id: sessionId });
  if (error) { console.error('sessionRoster', error); return []; }
  return (data ?? []).map((r: any) => ({
    bookingId: r.booking_id, memberId: r.member_id, firstName: r.first_name ?? '', lastName: r.last_name ?? '',
    memberNumber: r.member_number ?? null, status: r.status, createdAt: r.created_at,
  }));
}

export async function adminBookMember(sessionId: string, memberId: string): Promise<BookingStatus> {
  const { data, error } = await supabase.rpc('admin_book_member', { p_session_id: sessionId, p_member_id: memberId });
  if (error) { console.error('adminBookMember', error); throw error; }
  return (data ?? null) as BookingStatus;
}

export async function adminCancelMember(sessionId: string, memberId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_cancel_member', { p_session_id: sessionId, p_member_id: memberId });
  if (error) { console.error('adminCancelMember', error); throw error; }
}

export async function createSession(p: { classTypeId: string; startsAt: string; durationMin: number; capacity: number; coachName?: string | null }): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_create_session', {
    p_class_type_id: p.classTypeId, p_starts_at: p.startsAt, p_duration_min: p.durationMin,
    p_capacity: p.capacity, p_coach_name: p.coachName ?? null,
  });
  if (error) { console.error('createSession', error); throw error; }
  return (data ?? null) as string | null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_session', { p_session_id: sessionId });
  if (error) { console.error('deleteSession', error); throw error; }
}

export async function listRecurrences(): Promise<Recurrence[]> {
  const { data, error } = await supabase.rpc('admin_list_recurrences');
  if (error) { console.error('listRecurrences', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, classTypeId: r.class_type_id, typeName: r.type_name ?? '', weekday: Number(r.weekday),
    startTime: (r.start_time ?? '').slice(0, 5), durationMin: Number(r.duration_min ?? 60),
    capacity: r.capacity == null ? null : Number(r.capacity), coachName: r.coach_name ?? null, active: !!r.active,
  }));
}

export async function upsertRecurrence(p: { id?: string; classTypeId: string; weekday: number; startTime: string; durationMin: number; capacity?: number | null; coachName?: string | null; active?: boolean }): Promise<string> {
  const { data, error } = await supabase.rpc('admin_upsert_recurrence', {
    p_id: p.id ?? null, p_class_type_id: p.classTypeId, p_weekday: p.weekday, p_start_time: p.startTime,
    p_duration_min: p.durationMin, p_capacity: p.capacity ?? null, p_coach_name: p.coachName ?? null, p_active: p.active ?? true,
  });
  if (error) { console.error('upsertRecurrence', error); throw error; }
  return data as string;
}

export async function deleteRecurrence(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_recurrence', { p_id: id });
  if (error) { console.error('deleteRecurrence', error); throw error; }
}

export async function generateSessions(weeks = 8): Promise<number> {
  const { data, error } = await supabase.rpc('admin_generate_sessions', { p_weeks: weeks });
  if (error) { console.error('generateSessions', error); return 0; }
  return Number(data ?? 0);
}
