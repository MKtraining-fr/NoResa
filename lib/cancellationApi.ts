import { supabase } from './supabaseClient';

/**
 * Résiliation d'abonnement.
 * L'adhérent dépose une demande depuis l'app ; le staff la valide dans NoResa.
 * Règles (contrôlées en base) : engagement -> 12 mois révolus ; sans engagement ->
 * un mandat de prélèvement doit exister. Préavis d'1 mois, mandat SEPA conservé.
 */

// ---- Côté adhérent ----

export interface CancellationStatus {
  eligible: boolean;
  reason: string | null;        // pourquoi c'est indisponible, le cas échéant
  effectiveDate: string | null; // fin d'accès si la demande est déposée aujourd'hui
  pending: boolean;             // une demande est déjà en cours
  engagement: boolean;
  engagementEnd: string | null; // fin des 12 mois d'engagement
}

export async function getMyCancellationStatus(): Promise<CancellationStatus | null> {
  const { data, error } = await supabase.rpc('my_cancellation_status');
  if (error) { console.error('getMyCancellationStatus', error); return null; }
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return null;
  return {
    eligible: r.eligible === true,
    reason: r.reason ?? null,
    effectiveDate: r.effective_date ?? null,
    pending: r.pending === true,
    engagement: r.engagement === true,
    engagementEnd: r.engagement_end ?? null,
  };
}

export async function requestCancellation(reason: string, message?: string): Promise<{ ok: boolean; effectiveDate?: string; emailed?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('cancellation-request', { body: { reason, message } });
  if (error) {
    let msg = error.message || 'Demande impossible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    return { ok: false, error: msg };
  }
  if ((data as any)?.error) return { ok: false, error: (data as any).error };
  return { ok: true, effectiveDate: (data as any)?.request?.effective_date, emailed: (data as any)?.emailed };
}

// ---- Côté staff ----

export interface CancellationRequest {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
  email: string | null;
  subscriptionLabel: string | null;
  price: number | null;
  requestedAt: string;
  effectiveDate: string;
  reason: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  staffNote: string | null;
  reviewedAt: string | null;
  hasMandate: boolean;
  engagement: boolean;
  startDate: string | null;
  /** Date de début d'engagement inconnue (adhérent importé) : à vérifier avant de valider. */
  startUnknown: boolean;
}

const mapReq = (r: any): CancellationRequest => ({
  id: r.id,
  memberId: r.member_id,
  firstName: r.first_name ?? '',
  lastName: r.last_name ?? '',
  memberNumber: r.member_number ?? null,
  email: r.email ?? null,
  subscriptionLabel: r.subscription_label ?? null,
  price: r.price != null ? Number(r.price) : null,
  requestedAt: r.requested_at,
  effectiveDate: r.effective_date,
  reason: r.reason ?? null,
  message: r.message ?? null,
  status: r.status,
  staffNote: r.staff_note ?? null,
  reviewedAt: r.reviewed_at ?? null,
  hasMandate: r.has_mandate === true,
  engagement: r.engagement === true,
  startDate: r.start_date ?? null,
  startUnknown: r.start_unknown === true,
});

export async function listCancellationRequests(status: string | null = 'pending'): Promise<CancellationRequest[]> {
  const { data, error } = await supabase.rpc('list_cancellation_requests', { p_status: status });
  if (error) { console.error('listCancellationRequests', error); return []; }
  return (data ?? []).map(mapReq);
}

export async function countPendingCancellations(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_cancellations');
  if (error) { console.error('countPendingCancellations', error); return 0; }
  return Number(data) || 0;
}

/** Valide (ou refuse) une demande. Si validée : fin d'accès programmée + abonnement GoCardless annulé. */
export async function reviewCancellation(id: string, approve: boolean, note?: string): Promise<{ ok: boolean; cancelled?: any[]; gc_error?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('cancellation-review', { body: { id, approve, note } });
  if (error) {
    let msg = error.message || 'Action impossible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    return { ok: false, error: msg };
  }
  if ((data as any)?.error) return { ok: false, error: (data as any).error };
  return { ok: true, cancelled: (data as any)?.cancelled, gc_error: (data as any)?.gc_error ?? null };
}
