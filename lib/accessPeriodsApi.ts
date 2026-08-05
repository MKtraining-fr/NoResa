import { supabase } from './supabaseClient';
import { recordSale } from './boutiqueApi';
import { startStaffStripePayment } from './stripe';
import { generateKeypadCode, updateKeypadCode } from './membersApi';

/**
 * Accès à durée déterminée (passes datées : entrée semaine, etc.).
 * L'ouverture/fermeture est pilotée côté base : create_access_period ouvre tout de
 * suite si le début est aujourd'hui, sinon le cron process_access_periods s'en charge.
 * La coupure repose sur NoResa, pas sur l'EndTime du contrôleur.
 */
export interface AccessPeriod {
  id: string;
  member_id: string;
  label: string;
  amount_cents: number | null;
  starts_on: string;              // 'YYYY-MM-DD'
  ends_on: string;                // 'YYYY-MM-DD' (dernier jour inclus)
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  source: 'sale' | 'manual';
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
}

export async function listAccessPeriods(memberId: string): Promise<AccessPeriod[]> {
  const { data, error } = await supabase
    .from('access_periods')
    .select('id, member_id, label, amount_cents, starts_on, ends_on, status, source, created_at, opened_at, closed_at')
    .eq('member_id', memberId)
    .order('starts_on', { ascending: false });
  if (error) { console.error('listAccessPeriods', error); return []; }
  return (data ?? []) as AccessPeriod[];
}

/** Garantit un code clavier avant d'ouvrir un accès (sinon la personne n'aurait aucun code). */
async function ensureKeypad(memberId: string): Promise<void> {
  const { data } = await supabase.from('members')
    .select('member_number, keypad_code').eq('id', memberId).maybeSingle();
  if (!data?.member_number) {
    throw new Error("Ce client n'a pas de numéro d'adhérent — impossible d'ouvrir l'accès.");
  }
  if (!data.keypad_code) {
    const code = await generateKeypadCode();
    await updateKeypadCode(memberId, code);
  }
}

async function createPeriod(p: {
  memberId: string; label: string; amountCents?: number | null;
  startsOn: string; endsOn: string; source: 'sale' | 'manual';
}): Promise<AccessPeriod> {
  await ensureKeypad(p.memberId);
  const { data, error } = await supabase.rpc('create_access_period', {
    p_member_id: p.memberId, p_label: p.label, p_amount_cents: p.amountCents ?? null,
    p_starts_on: p.startsOn, p_ends_on: p.endsOn, p_source: p.source,
  });
  if (error) { console.error('createAccessPeriod', error); throw error; }
  return (Array.isArray(data) ? data[0] : data) as AccessPeriod;
}

/** Accès simple daté (bouton « Activer » avec date de fin) : aucune vente. */
export async function grantAccessPeriod(p: {
  memberId: string; label?: string; startsOn: string; endsOn: string;
}): Promise<AccessPeriod> {
  return createPeriod({
    memberId: p.memberId, label: p.label?.trim() || 'Accès',
    startsOn: p.startsOn, endsOn: p.endsOn, source: 'manual',
  });
}

/** Vente à la période payée espèces / CB : enregistre le CA puis ouvre l'accès. */
export async function sellAccessPeriodCash(p: {
  memberId: string; label: string; amount: number; paymentMethod: string;
  startsOn: string; endsOn: string;
}): Promise<AccessPeriod> {
  await recordSale(p.memberId, p.paymentMethod, [
    { label: p.label, quantity: 1, unit_price: p.amount, vat_rate: 0 },
  ]);
  return createPeriod({
    memberId: p.memberId, label: p.label, amountCents: Math.round(p.amount * 100),
    startsOn: p.startsOn, endsOn: p.endsOn, source: 'sale',
  });
}

/**
 * Vente à la période payée par carte (Stripe) : crée la passe et renvoie l'URL de
 * paiement. Le webhook Stripe enregistre l'encaissement au CA à la confirmation.
 */
export async function sellAccessPeriodStripe(p: {
  memberId: string; label: string; amount: number; startsOn: string; endsOn: string; redirectUrl?: string;
}): Promise<{ period: AccessPeriod; authorisation_url: string }> {
  const period = await createPeriod({
    memberId: p.memberId, label: p.label, amountCents: Math.round(p.amount * 100),
    startsOn: p.startsOn, endsOn: p.endsOn, source: 'sale',
  });
  const pay = await startStaffStripePayment({
    amount: p.amount, label: p.label, memberId: p.memberId, redirectUrl: p.redirectUrl, recordPayment: true,
  });
  return { period, authorisation_url: pay.authorisation_url };
}

/** Annule une passe (à venir ou en cours). Coupe l'accès si rien d'autre ne le couvre. */
export async function cancelAccessPeriod(id: string): Promise<AccessPeriod> {
  const { data, error } = await supabase.rpc('cancel_access_period', { p_id: id });
  if (error) { console.error('cancelAccessPeriod', error); throw error; }
  return (Array.isArray(data) ? data[0] : data) as AccessPeriod;
}
