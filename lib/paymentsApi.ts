import { supabase } from './supabaseClient';

export interface MemberPayment {
  id: string;
  payment_type: string | null;     // ex. inscription, abonnement, boutique...
  amount: number | null;
  payment_date: string | null;
  payment_method: string | null;   // Espèces, CB, Prélèvement...
  status: string | null;           // paid, pending, failed...
  external_reference: string | null;
  invoice_url: string | null;
  notes: string | null;
}

/** Historique des paiements d'un membre (les plus récents d'abord). */
export async function getMemberPayments(memberId: string, limit = 50): Promise<MemberPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, payment_type, amount, payment_date, payment_method, status, external_reference, invoice_url, notes')
    .eq('member_id', memberId)
    .order('payment_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) { console.error('getMemberPayments', error); return []; }
  return (data ?? []) as MemberPayment[];
}

/** Modes de régularisation proposés (libellé → code stocké, conforme à la contrainte payments). */
export const REGULARIZE_METHODS: { code: 'cash' | 'credit_card' | 'bank_transfer'; label: string }[] = [
  { code: 'cash', label: 'Espèces' },
  { code: 'credit_card', label: 'CB' },
  { code: 'bank_transfer', label: 'Virement' },
];

/**
 * Régularise un ou plusieurs impayés (paiements en échec) : marque l'échec comme
 * régularisé (conservé en historique) et crée la ligne encaissée (mode + date choisis),
 * qui entre alors dans le CA. Renvoie le nombre de lignes régularisées.
 */
export async function regularizePayments(
  ids: string[], method: 'cash' | 'credit_card' | 'bank_transfer', date: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('regularize_payments', { p_ids: ids, p_method: method, p_date: date });
  if (error) { console.error('regularizePayments', error); throw error; }
  return (data as number) ?? 0;
}
