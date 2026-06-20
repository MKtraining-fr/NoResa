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
