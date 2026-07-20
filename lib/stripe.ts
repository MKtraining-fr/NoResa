import { supabase } from './supabaseClient';

/**
 * Paiement instantané (carte / Apple Pay / Google Pay) via Stripe Checkout depuis l'espace membre.
 * Même contrat que l'ancien Instant Bank Pay : renvoie l'URL de la page de paiement hébergée.
 * Le webhook Stripe déclenche `apply_recharge` (code d'accès + activation) à la confirmation.
 */
export interface StaffPaymentResult { authorisation_url: string; order_id: string; billing_request_id: string; amount_cents: number; label: string; }

/**
 * Encaissement au comptoir (staff) par carte via Stripe Checkout : produit d'accès,
 * article boutique ou montant libre. Renvoie l'URL à présenter (QR / lien).
 */
export async function startStaffStripePayment(input: {
  amount?: number; product?: string; label: string; memberId?: string; email?: string; redirectUrl?: string;
  /** Inscrire l'encaissement dans les paiements (fiche + stats). Def: true. */
  recordPayment?: boolean;
}): Promise<StaffPaymentResult> {
  const { data, error } = await supabase.functions.invoke('stripe-staff-payment', {
    body: {
      amount: input.amount, product: input.product, label: input.label, member_id: input.memberId,
      email: input.email, redirectUrl: input.redirectUrl, record_payment: input.recordPayment,
    },
  });
  if (error) {
    let msg = error.message || 'Paiement indisponible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as StaffPaymentResult;
}

export async function startStripePayment(
  product: 'seance' | 'carnet' | 'mois' | 'annee',
  redirectUrl: string,
): Promise<{ authorisation_url: string; billing_request_id: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-instant-payment', {
    body: { product, redirectUrl },
  });
  if (error) {
    let msg = error.message || 'Paiement indisponible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { authorisation_url: string; billing_request_id: string };
}
