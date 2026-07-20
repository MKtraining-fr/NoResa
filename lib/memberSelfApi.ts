import { supabase } from './supabaseClient';

/**
 * Couche de données « self-service adhérent ».
 * Toutes les fonctions ne renvoient QUE les données de l'utilisateur connecté,
 * via des RPC SECURITY DEFINER scopées par auth.uid().
 */

// --- Ma fiche --------------------------------------------------------------

export interface MyMember {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  subscriptionLabel: string | null;
  status: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  joinDate: string | null;
  qrCode: string;
  keypadCode: string | null;
  photoPath: string | null;
  referralCode: string | null;
  accessBlocked: boolean;   // accès retiré du contrôleur (carnet épuisé, blocage staff…)
}

export async function getMyMember(): Promise<MyMember | null> {
  const { data, error } = await supabase.rpc('my_member');
  if (error) { console.error('memberSelfApi.getMyMember', error); return null; }
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return null;
  return {
    id: r.id,
    memberNumber: r.member_number ?? '',
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email ?? null,
    phone: r.phone ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    postalCode: r.postal_code ?? null,
    subscriptionLabel: r.subscription_label ?? null,
    status: r.status ?? null,
    subscriptionStart: r.subscription_start ?? null,
    subscriptionEnd: r.subscription_end ?? null,
    joinDate: r.join_date ?? null,
    qrCode: (r.qr_code ?? r.member_number ?? '').toString().trim(),
    keypadCode: r.keypad_code ?? null,
    photoPath: r.photo_path ?? null,
    referralCode: r.referral_code ?? null,
    accessBlocked: r.access_blocked === true,
  };
}

/** Mise à jour des coordonnées de l'adhérent (téléphone/adresse). */
export async function updateMyProfile(p: {
  phone: string; address: string; city: string; postalCode: string;
}): Promise<void> {
  const { error } = await supabase.rpc('update_my_member', {
    p_phone: p.phone, p_address: p.address, p_city: p.city, p_postal_code: p.postalCode,
  });
  if (error) { console.error('memberSelfApi.updateMyProfile', error); throw error; }
}

// --- Affluence en direct ----------------------------------------------------

export interface HourOccupancy { hour: number; entries: number }

export async function getHourlyOccupancy(): Promise<HourOccupancy[]> {
  const { data, error } = await supabase.rpc('gym_hourly_occupancy');
  if (error) { console.error('memberSelfApi.getHourlyOccupancy', error); return []; }
  const byHour = new Map<number, number>();
  (data ?? []).forEach((row: any) => byHour.set(Number(row.hour), Number(row.entries)));
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, entries: byHour.get(h) ?? 0 }));
}

export function affluenceLevel(occ: HourOccupancy[]): {
  label: string; pct: number; tone: 'low' | 'mid' | 'high';
} {
  const max = Math.max(1, ...occ.map((o) => o.entries));
  const now = new Date().getHours();
  const current = occ.find((o) => o.hour === now)?.entries ?? 0;
  const pct = Math.round((current / max) * 100);
  if (pct < 35) return { label: 'Calme', pct, tone: 'low' };
  if (pct < 70) return { label: 'Modérée', pct, tone: 'mid' };
  return { label: 'Forte', pct, tone: 'high' };
}

// --- Formules d'abonnement (engagement) proposées à l'adhérent --------------

export interface MemberFormula { id: string; name: string; price: number }

/** Formules d'abonnement (catégorie « Abonnements & Séances ») de la salle du membre. */
export async function getMemberFormulas(): Promise<MemberFormula[]> {
  const { data, error } = await supabase.rpc('member_formulas');
  if (error) { console.error('memberSelfApi.getMemberFormulas', error); return []; }
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, price: Number(r.price) }));
}

// --- Ma salle ---------------------------------------------------------------

export interface MyGym {
  id: string;
  name: string | null;
  displayName: string | null;
  color: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  openingHours: any[] | null;   // [{day,closed,open,close}]
}

export async function getMyGym(): Promise<MyGym | null> {
  const { data, error } = await supabase.rpc('my_gym');
  if (error) { console.error('memberSelfApi.getMyGym', error); return null; }
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name ?? null,
    displayName: r.display_name ?? null,
    color: r.primary_color ?? null,
    logoUrl: r.logo_url ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    postalCode: r.postal_code ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    openingHours: Array.isArray(r.opening_hours) ? r.opening_hours : null,
  };
}

// --- Mon dossier : contrats + factures -------------------------------------

export interface MyContract {
  id: string;
  contractNumber: string | null;
  formulaLabel: string | null;
  totalDue: number | null;
  signedAt: string | null;
  pdfPath: string | null;
  createdAt: string | null;
}

export async function getMyContracts(): Promise<MyContract[]> {
  const { data, error } = await supabase.rpc('my_contracts');
  if (error) { console.error('memberSelfApi.getMyContracts', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    contractNumber: r.contract_number ?? null,
    formulaLabel: r.formula_label ?? null,
    totalDue: r.total_due ?? null,
    signedAt: r.signed_at ?? null,
    pdfPath: r.pdf_path ?? null,
    createdAt: r.created_at ?? null,
  }));
}

export interface MyInvoice {
  id: string;
  invoiceNumber: string | null;
  saleDate: string | null;
  totalTtc: number | null;
  pdfPath: string | null;
}

export async function getMyInvoices(): Promise<MyInvoice[]> {
  const { data, error } = await supabase.rpc('my_invoices');
  if (error) { console.error('memberSelfApi.getMyInvoices', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    invoiceNumber: r.invoice_number ?? null,
    saleDate: r.sale_date ?? null,
    totalTtc: r.total_ttc ?? null,
    pdfPath: r.invoice_pdf_path ?? null,
  }));
}

// --- Carnet de séances (solde) ---------------------------------------------

export interface MyPackStatus { isPack: boolean; total: number; used: number; remaining: number }

export async function getMyPackStatus(): Promise<MyPackStatus> {
  const { data, error } = await supabase.rpc('my_pack_status');
  const r = Array.isArray(data) ? data[0] : data;
  if (error || !r) return { isPack: false, total: 0, used: 0, remaining: 0 };
  return { isPack: !!r.is_pack, total: r.total ?? 0, used: r.used ?? 0, remaining: r.remaining ?? 0 };
}

/** URL signée (1 h) pour ouvrir un PDF privé (contrats / invoices). */
export async function signedPdfUrl(bucket: 'contracts' | 'invoices', path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) { console.error('memberSelfApi.signedPdfUrl', error); return null; }
  return data?.signedUrl ?? null;
}
