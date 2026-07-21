import { supabase } from './supabaseClient';

export interface GroupInvoiceLine {
  pavillon: string;
  count: number;
  unit_price: number;
  label: string;
  amount: number;
  /** Ligne complémentaire (frais, remise…) : exclue du nombre d'adhérents facturés. */
  is_extra?: boolean;
  /** Adhérents facturés sur cette ligne (nom, n°, passages du mois). */
  members?: { name: string | null; number: string | null; visits?: number }[];
}

export interface GroupInvoice {
  id: string;
  gym_id: string;
  group_id: string;
  period_start: string;       // 'YYYY-MM-DD' (1er du mois)
  invoice_number: string | null;
  payer_name: string | null;
  billing_email: string | null;
  billing_address: string | null;
  formula_label: string | null;
  member_count: number;
  total_amount: number;
  breakdown: GroupInvoiceLine[];
  pdf_path: string | null;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  emailed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapRow = (r: any): GroupInvoice => ({
  ...r,
  breakdown: Array.isArray(r.breakdown) ? r.breakdown : [],
  member_count: Number(r.member_count) || 0,
  total_amount: Number(r.total_amount) || 0,
});

/** Premier jour du mois au format ISO (YYYY-MM-01) à partir d'un 'YYYY-MM'. */
export const monthToPeriod = (ym: string) => `${ym}-01`;

/** Liste des factures d'un groupe (ou de toutes les associations), plus récentes d'abord. */
export async function listGroupInvoices(groupId?: string): Promise<GroupInvoice[]> {
  let q = supabase.from('group_invoices').select('*').order('period_start', { ascending: false });
  if (groupId) q = q.eq('group_id', groupId);
  const { data, error } = await q;
  if (error) { console.error('listGroupInvoices', error); return []; }
  return (data ?? []).map(mapRow);
}

/** Crée / recalcule le brouillon d'un groupe pour un mois donné (période = 1er du mois). */
export async function upsertGroupInvoiceDraft(groupId: string, period: string): Promise<GroupInvoice | null> {
  const { data, error } = await supabase.rpc('group_invoice_upsert', { p_group_id: groupId, p_period: period });
  if (error) { console.error('upsertGroupInvoiceDraft', error); throw error; }
  return data ? mapRow(data) : null;
}

/** Génère le PDF, le stocke et l'envoie par e-mail à l'association (via edge function). */
/** Génère un PDF d'aperçu (sans numéro définitif ni envoi) pour vérification. */
export async function previewGroupInvoice(invoiceId: string): Promise<{ ok: boolean; pdf_path?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('group-invoice', { body: { invoice_id: invoiceId, preview: true } });
  if (error) { console.error('previewGroupInvoice', error); return { ok: false, error: error.message }; }
  if ((data as any)?.error) return { ok: false, error: (data as any).error };
  return { ok: true, pdf_path: (data as any)?.pdf_path };
}

/** Remplace le détail d'un brouillon (total et effectif recalculés côté base). */
export async function updateGroupInvoiceBreakdown(invoiceId: string, lines: GroupInvoiceLine[]): Promise<GroupInvoice | null> {
  const { data, error } = await supabase.rpc('update_group_invoice_breakdown', { p_id: invoiceId, p_breakdown: lines });
  if (error) { console.error('updateGroupInvoiceBreakdown', error); throw error; }
  const r = Array.isArray(data) ? data[0] : data;
  return r ? mapRow(r) : null;
}

export async function sendGroupInvoice(invoiceId: string, email = true): Promise<{ ok: boolean; invoice_number?: string; emailed?: boolean; email_reason?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('group-invoice', { body: { invoice_id: invoiceId, email } });
  if (error) { console.error('sendGroupInvoice', error); return { ok: false, error: error.message }; }
  return data as any;
}

/** Change le statut d'une facture (payée / annulée / renvoyée en brouillon). */
export async function setGroupInvoiceStatus(invoiceId: string, status: GroupInvoice['status']): Promise<GroupInvoice | null> {
  const { data, error } = await supabase.rpc('set_group_invoice_status', { p_id: invoiceId, p_status: status });
  if (error) { console.error('setGroupInvoiceStatus', error); throw error; }
  return data ? mapRow(data) : null;
}

/** URL signée (1 h) du PDF stocké dans le bucket « invoices ». */
export async function getGroupInvoicePdfUrl(pdfPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('invoices').createSignedUrl(pdfPath, 3600);
  if (error) { console.error('getGroupInvoicePdfUrl', error); return null; }
  return data?.signedUrl ?? null;
}
