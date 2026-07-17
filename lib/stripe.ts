import { supabase } from './supabaseClient';

/**
 * Paiement instantané (carte / Apple Pay / Google Pay) via Stripe Checkout depuis l'espace membre.
 * Même contrat que l'ancien Instant Bank Pay : renvoie l'URL de la page de paiement hébergée.
 * Le webhook Stripe déclenche `apply_recharge` (code d'accès + activation) à la confirmation.
 */
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
