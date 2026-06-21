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
