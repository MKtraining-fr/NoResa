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

/**
 * Recharge ponctuelle (Instant Bank Pay) depuis l'espace membre.
 * Appelle l'Edge Function `gocardless-instant-payment` (authentifiée par le JWT
 * du membre) et renvoie l'URL de la page banque hébergée à ouvrir.
 */
export async function startInstantPayment(
  product: 'seance' | 'carnet' | 'mois' | 'annee',
  redirectUrl: string,
): Promise<{ authorisation_url: string; billing_request_id: string }> {
  const { data, error } = await supabase.functions.invoke('gocardless-instant-payment', {
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

/**
 * Encaissement au comptoir par Instant Bank Pay (staff). Crée un paiement IBP
 * (produit d'accès, produit boutique ou montant libre) et renvoie l'URL (QR/lien).
 */
export interface StaffPaymentResult { authorisation_url: string; order_id: string; billing_request_id: string; amount_cents: number; label: string; }
export async function startStaffPayment(input: {
  amount?: number; product?: string; label: string; memberId?: string; email?: string; redirectUrl?: string;
  /** Inscrire l'encaissement dans les paiements (fiche + stats). Def: true. Mettre false si la vente est déjà enregistrée ailleurs (ex. caisse). */
  recordPayment?: boolean;
}): Promise<StaffPaymentResult> {
  const { data, error } = await supabase.functions.invoke('gocardless-staff-payment', {
    body: { amount: input.amount, product: input.product, label: input.label, member_id: input.memberId, email: input.email, redirectUrl: input.redirectUrl, record_payment: input.recordPayment },
  });
  if (error) {
    let msg = error.message || 'Paiement indisponible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as StaffPaymentResult;
}

/** Statut d'une commande POS (pending | done | failed) — pour le polling au comptoir. */
export async function posOrderStatus(orderId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_pos_order_status', { p_id: orderId });
  if (error) { console.error('posOrderStatus', error); return null; }
  return (data as string) ?? null;
}

/**
 * Souscription d'une formule à prélèvement SEPA depuis l'espace adhérent (prospect
 * qui active son accès « avec engagement »). Renvoie l'URL GoCardless (saisie du RIB).
 * Le webhook active le compte (n° client + code + accès) une fois le mandat validé.
 */
export async function startMemberMandate(
  label: string, price: number, redirectUrl: string,
): Promise<{ authorisation_url: string; billing_request_id: string }> {
  const { data, error } = await supabase.functions.invoke('gocardless-member-mandate', {
    body: { label, price, redirectUrl },
  });
  if (error) {
    let msg = error.message || 'Mise en place du prélèvement indisponible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { authorisation_url: string; billing_request_id: string };
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

export interface ChangeFormulaResult {
  updated: boolean;
  gocardless: boolean;
  skipped: boolean;
  cancelled: { id: string; amount: number }[];
  created: { id: string; amount: number }[];
  error?: string;
}

/**
 * Met en place un mandat SEPA pour un membre EXISTANT (passage à une formule prélevée
 * alors qu'il n'a pas encore de mandat). Renvoie l'URL GoCardless (saisie du RIB).
 * Le webhook crée l'abonnement une fois le mandat signé.
 */
export async function setupMandateForMember(
  memberId: string, label: string, price: number, redirectUrl: string, exitUrl?: string,
): Promise<{ authorisation_url: string; billing_request_id: string }> {
  const { data, error } = await supabase.functions.invoke('gocardless-setup-existing-mandate', {
    body: { member_id: memberId, label, price, redirectUrl, exitUrl },
  });
  if (error) {
    let msg = error.message || 'Impossible de démarrer la mise en place du mandat.';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { authorisation_url: string; billing_request_id: string };
}

export interface CancelSubscriptionResult {
  updated: boolean;
  mandate_kept: boolean;
  cancelled: { id: string; amount: number }[];
  error?: string;
}

/**
 * Rétrograde un membre vers un produit sans engagement : annule le(s) abonnement(s)
 * GoCardless mais CONSERVE le mandat (réutilisable). Met à jour la fiche (produit/prix/paiement).
 */
export async function cancelSubscriptionKeepMandate(
  memberId: string, label: string, price: number, paymentMethod?: string, periodicity?: string,
): Promise<CancelSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke('gocardless-cancel-subscription', {
    body: { member_id: memberId, label, price, paymentMethod, periodicity },
  });
  if (error) {
    let msg = error.message || "Échec de la résiliation de l'abonnement";
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    return { updated: false, mandate_kept: false, cancelled: [], error: msg };
  }
  return data as CancelSubscriptionResult;
}

/** Change la formule d'un membre et synchronise GoCardless (annule l'ancien abo, crée le nouveau). */
export async function changeFormula(memberId: string, label: string, price: number): Promise<ChangeFormulaResult> {
  const { data, error } = await supabase.functions.invoke('gocardless-change-formula', {
    body: { member_id: memberId, label, price },
  });
  if (error) {
    // tente de récupérer le message d'erreur renvoyé par la fonction
    let msg = error.message || 'Échec du changement de formule';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    return { updated: false, gocardless: false, skipped: false, cancelled: [], created: [], error: msg };
  }
  return data as ChangeFormulaResult;
}
