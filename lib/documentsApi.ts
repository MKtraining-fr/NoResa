import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';

export interface DocumentRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string | null;
  memberEmail: string | null;
  kind: string;
  year: number;
  status: 'pending' | 'done' | 'refused' | string;
  pdfPath: string | null;
  note: string | null;
  createdAt: string | null;
  doneAt: string | null;
}

export const DOC_LABELS: Record<string, string> = {
  attestation_adhesion: "Attestation d'adhésion",
  attestation_paiement: 'Attestation de paiement',
  facture_annuelle: 'Facture annuelle',
};

export async function listDocumentRequests(status?: 'pending' | 'done' | 'refused'): Promise<DocumentRequest[]> {
  const { data, error } = await supabase.rpc('list_document_requests', { p_status: status ?? null });
  if (error) { console.error('documentsApi.listDocumentRequests', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, memberId: r.member_id, memberName: r.member_name || '—',
    memberNumber: r.member_number ?? null, memberEmail: r.member_email ?? null,
    kind: r.kind, year: Number(r.year) || 0, status: r.status, pdfPath: r.pdf_path ?? null,
    note: r.note ?? null, createdAt: r.created_at ?? null, doneAt: r.done_at ?? null,
  }));
}

export async function countPendingDocuments(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_documents');
  if (error) { console.error('documentsApi.countPendingDocuments', error); return 0; }
  return Number(data) || 0;
}

/** Génère le PDF (attestation / facture annuelle) avec signature + cachet, marque la demande traitée. */
export async function generateMemberDocument(requestId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-member-document', { body: { request_id: requestId } });
  if (error) {
    let msg = error.message || 'Génération impossible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
}

export async function refuseDocument(id: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc('refuse_document', { p_id: id, p_note: note ?? null });
  if (error) { console.error('documentsApi.refuseDocument', error); throw error; }
}

/** URL signée (1 h) pour prévisualiser un document généré (bucket invoices). */
export async function documentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('invoices').createSignedUrl(path, 3600);
  if (error) { console.error('documentsApi.documentUrl', error); return null; }
  return data?.signedUrl ?? null;
}

// --- Signature + cachet de l'association (réutilisés pour chaque document) ---

export interface GymDocAssets { signaturePath: string | null; stampPath: string | null; }

export async function getGymDocAssets(): Promise<GymDocAssets> {
  const gymId = await getGymId();
  if (!gymId) return { signaturePath: null, stampPath: null };
  const { data } = await supabase.from('gyms').select('signature_path, stamp_path').eq('id', gymId).maybeSingle();
  return { signaturePath: (data as any)?.signature_path ?? null, stampPath: (data as any)?.stamp_path ?? null };
}

/** Enregistre la signature OU le cachet (image) de l'association (upload + mise à jour de la salle). */
export async function uploadGymAsset(kind: 'signature' | 'stamp', file: File): Promise<string> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('Salle introuvable.');
  const path = `${gymId}/_assets/${kind}.png`;
  const up = await supabase.storage.from('invoices').upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (up.error) throw up.error;
  const col = kind === 'signature' ? 'signature_path' : 'stamp_path';
  const { error } = await supabase.from('gyms').update({ [col]: path }).eq('id', gymId);
  if (error) throw error;
  return path;
}
