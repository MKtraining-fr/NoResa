import { supabase } from './supabaseClient';

/**
 * Démarre la mise en place d'un mandat de prélèvement GoCardless pour une
 * nouvelle inscription. Appelle l'Edge Function `gocardless-create-mandate`
 * (côté serveur, seule à détenir la clé API), puis renvoie l'URL de la page
 * GoCardless où le client signera son mandat SEPA.
 *
 * Utilisation typique dans le formulaire d'inscription :
 *   const { authorisation_url } = await startMandateSetup({...});
 *   window.location.href = authorisation_url;
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gocardless-create-mandate`;

export interface MandateSetupInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gymId: string;
  subscriptionLabel?: string;
  price?: number;
  /** Page de retour après signature (def: page "merci"). */
  redirectUrl?: string;
  /** Page de sortie si le client abandonne (def: accueil). */
  exitUrl?: string;
}

export interface MandateSetupResult {
  authorisation_url: string;
  member_id: string;
  billing_request_id: string;
}

export async function startMandateSetup(input: MandateSetupInput): Promise<MandateSetupResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUrl = input.redirectUrl || `${origin}/#/merci-inscription`;
  const exitUrl = input.exitUrl || `${origin}/#/`;

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      gymId: input.gymId,
      subscriptionLabel: input.subscriptionLabel,
      price: input.price,
      redirectUrl,
      exitUrl,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Impossible de démarrer la mise en place du mandat.');
  }
  return data as MandateSetupResult;
}

export interface GocardlessStats {
  mandates_active: number;
  collected_30d: number;
  currency: string;
  revenue_series: { month: string; revenue: number }[];
  recent: { amount: number; status: string; date: string; currency: string }[];
}

/** Statistiques live depuis GoCardless (encaissé, mandats actifs, courbe, derniers paiements). */
export async function getGocardlessStats(): Promise<GocardlessStats> {
  const { data, error } = await supabase.functions.invoke('gocardless-stats');
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as GocardlessStats;
}

export interface GocardlessPayment {
  id: string;
  amount: number | null;       // en euros
  currency: string | null;
  status: string | null;       // confirmed, paid_out, submitted, failed, cancelled...
  charge_date: string | null;  // date de prélèvement
  description: string | null;
  created_at: string | null;
}

/** Récupère les prélèvements GoCardless d'un membre (temps réel via Edge Function sécurisée). */
export async function getMemberGocardlessPayments(memberId: string): Promise<GocardlessPayment[]> {
  const { data, error } = await supabase.functions.invoke('gocardless-payments', { body: { member_id: memberId } });
  if (error) { console.error('getMemberGocardlessPayments', error); return []; }
  return (data?.payments ?? []) as GocardlessPayment[];
}
