import { supabase } from './supabaseClient';

export interface MemberDue {
  memberId: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
  email: string | null;
  groupName: string | null;
  subgroupName: string | null;
  accessBlocked: boolean;
  gocardlessStatus: string | null;
  cardNumber: string | null;
  keypadCode: string | null;
  unpaidCount: number;
  totalAmount: number;
  oldestDate: string | null;
  lastDate: string | null;
  months: Record<string, { amount: number; count: number }>;
}

const mapDue = (r: any): MemberDue => ({
  memberId: r.member_id,
  firstName: r.first_name ?? '',
  lastName: r.last_name ?? '',
  memberNumber: r.member_number ?? null,
  email: r.email ?? null,
  groupName: r.group_name ?? null,
  subgroupName: r.subgroup_name ?? null,
  accessBlocked: r.access_blocked ?? false,
  gocardlessStatus: r.gocardless_status ?? null,
  cardNumber: r.rfid_badge ?? null,
  keypadCode: r.keypad_code ?? null,
  unpaidCount: Number(r.unpaid_count) || 0,
  totalAmount: Number(r.total_amount) || 0,
  oldestDate: r.oldest_date ?? null,
  lastDate: r.last_date ?? null,
  months: (r.months && typeof r.months === 'object') ? r.months : {},
});

/** Adhérents en impayé (prélèvements SEPA en échec), plus anciens d'abord. */
export async function listMemberDues(): Promise<MemberDue[]> {
  const { data, error } = await supabase.rpc('list_member_dues');
  if (error) { console.error('listMemberDues', error); return []; }
  return (data ?? []).map(mapDue);
}

/** Nombre d'adhérents en impayé (tableau de bord). */
export async function countMemberDues(): Promise<number> {
  const { data, error } = await supabase.rpc('count_member_dues');
  if (error) { console.error('countMemberDues', error); return 0; }
  return Number(data) || 0;
}

/**
 * Écarte les impayés d'un adhérent de la liste (statut neutre 'cancelled').
 * Aucun encaissement n'est enregistré : le montant n'entre pas dans le CA.
 */
export async function dismissMemberDues(memberId: string): Promise<number> {
  const { data, error } = await supabase.rpc('mark_member_dues_settled', { p_member: memberId });
  if (error) { console.error('dismissMemberDues', error); throw error; }
  return Number(data) || 0;
}

/**
 * Import des prélèvements SEPA en échec depuis GoCardless (rattrape ce que le webhook
 * n'a pas capté). Par défaut : tout l'historique (sinceMonths = 0) pour une visibilité
 * complète par client. Idempotent (dédup par external_reference).
 */
export async function syncFailedPayments(sinceMonths = 0): Promise<{ ok: boolean; seen?: number; imported?: number; updated?: number; skipped_no_member?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke('gocardless-sync-failed', { body: { since_months: sinceMonths } });
  if (error) { console.error('syncFailedPayments', error); return { ok: false, error: error.message }; }
  return data as any;
}

/** Envoie un e-mail de relance à l'adhérent (déclenché manuellement par le staff). */
export async function sendPaymentReminder(memberId: string): Promise<{ ok: boolean; emailed?: boolean; email_reason?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('payment-reminder', { body: { member_id: memberId } });
  if (error) { console.error('sendPaymentReminder', error); return { ok: false, error: error.message }; }
  return data as any;
}
