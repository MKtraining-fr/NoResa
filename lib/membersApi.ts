import { supabase } from './supabaseClient';
import { Member, ContactStatus } from '../types';

/**
 * Couche de données "membres" branchée sur Supabase.
 * Expose les mêmes fonctions que l'ancien utils/storage (getMembers / saveMember /
 * deleteMember) mais en asynchrone (Promise), et fait la correspondance entre
 * les colonnes de la table `members` et le type `Member` du front.
 *
 * NOTE : cette étape branche l'onglet "Membres". Les onglets Prospects et
 * Partenaires utiliseront leurs propres tables plus tard ; en attendant, tout
 * contact créé est enregistré comme membre.
 */

// --- Helpers ---------------------------------------------------------------

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// L'app est mono-salle pour l'instant : on récupère l'id de la salle une fois.
let cachedGymId: string | null = null;
export async function getGymId(): Promise<string | null> {
  if (cachedGymId) return cachedGymId;
  const { data, error } = await supabase
    .from('gyms')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('membersApi.getGymId', error);
    return null;
  }
  cachedGymId = data?.id ?? null;
  return cachedGymId;
}

// Statut DB (varchar) -> statut CRM
function toContactStatus(dbStatus: string | null): ContactStatus {
  if (dbStatus === 'active') return 'MEMBER_ACTIVE';
  if (dbStatus === 'prospect') return 'PROSPECT_NEW'; // compte créé, pas encore payé
  return 'MEMBER_INACTIVE';
}

// Statut CRM -> statut DB
function toDbStatus(status: ContactStatus): string {
  if (status === 'MEMBER_ACTIVE') return 'active';
  if (status === 'PROSPECT_NEW' || status === 'PROSPECT_FOLLOWUP' || status === 'PROSPECT_TRIAL') return 'prospect';
  return 'cancelled';
}

// Ligne Supabase -> objet Member du front
function rowToMember(r: any): Member {
  const addressParts = [r.address, r.postal_code, r.city].filter(Boolean);

  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? undefined,
    address: addressParts.length ? addressParts.join(', ') : undefined,
    status: toContactStatus(r.status),
    subscription: r.subscription_label ?? undefined,
    joinDate: r.join_date ?? (r.created_at ? String(r.created_at).split('T')[0] : ''),
    trialSessionDone: true,
    emergencyContact:
      r.emergency_contact_name || r.emergency_contact_phone
        ? { name: r.emergency_contact_name ?? '', phone: r.emergency_contact_phone ?? '' }
        : undefined,
    notes: r.notes ?? undefined,
    // Champs réels supplémentaires pour la fiche détaillée
    memberNumber: r.member_number ?? undefined,
    price: r.price != null ? Number(r.price) : undefined,
    paymentMethod: r.payment_method_label ?? undefined,
    periodicity: r.periodicity ?? undefined,
    paidBy: r.paid_by ?? undefined,
    subscriptionStart: r.subscription_start ?? undefined,
    subscriptionEnd: r.subscription_end ?? undefined,
    city: r.city ?? undefined,
    postalCode: r.postal_code ?? undefined,
    photoPath: r.photo_path ?? undefined,
    gocardlessStatus: r.gocardless_status ?? undefined,
    gocardlessMandateId: r.gocardless_mandate_id ?? undefined,
    gocardlessCustomerId: r.gocardless_customer_id ?? undefined,
    archivedAt: r.archived_at ?? undefined,
    cardNumber: r.rfid_badge ?? undefined,
    keypadCode: r.keypad_code ?? undefined,
    groupName: r.group_name ?? undefined,
    subgroupName: r.subgroup_name ?? undefined,
    accessBlocked: r.access_blocked ?? false,
    accessBlockReason: r.access_block_reason ?? undefined,
    accessBlockedAt: r.access_blocked_at ?? undefined,
    accessBlockScheduledAt: r.access_block_scheduled_at ?? undefined,
    accessBlockScheduledReason: r.access_block_scheduled_reason ?? undefined,
  } as Member;
}

// --- API -------------------------------------------------------------------

export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select(
      'id, first_name, last_name, email, phone, address, postal_code, city, ' +
        'subscription_label, price, payment_method_label, periodicity, paid_by, ' +
        'subscription_start, subscription_end, ' +
        'member_number, status, join_date, created_at, photo_path, ' +
        'emergency_contact_name, emergency_contact_phone, notes, ' +
        'gocardless_status, gocardless_mandate_id, gocardless_customer_id, rfid_badge, keypad_code, group_name, subgroup_name, access_blocked, access_block_reason, access_blocked_at, access_block_scheduled_at, access_block_scheduled_reason'
    )
    .is('archived_at', null)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('membersApi.getMembers', error);
    return [];
  }
  return (data ?? []).map(rowToMember);
}

/** Membres archivés (corbeille). Données conservées intégralement. */
export async function getMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select(
      'id, first_name, last_name, email, phone, address, postal_code, city, ' +
        'subscription_label, price, payment_method_label, periodicity, paid_by, ' +
        'subscription_start, subscription_end, ' +
        'member_number, status, join_date, created_at, photo_path, ' +
        'emergency_contact_name, emergency_contact_phone, notes, ' +
        'gocardless_status, gocardless_mandate_id, gocardless_customer_id, rfid_badge, keypad_code, group_name, subgroup_name, access_blocked, access_block_reason, access_blocked_at, access_block_scheduled_at, access_block_scheduled_reason'
    )
    .eq('id', id)
    .single();
  if (error) { console.error('getMemberById', error); return null; }
  return data ? rowToMember(data) : null;
}

export async function getArchivedMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select(
      'id, first_name, last_name, email, phone, address, postal_code, city, ' +
        'subscription_label, price, payment_method_label, periodicity, paid_by, ' +
        'member_number, status, join_date, created_at, photo_path, ' +
        'emergency_contact_name, emergency_contact_phone, notes, archived_at, ' +
        'gocardless_status, gocardless_mandate_id, gocardless_customer_id, rfid_badge, keypad_code, group_name, subgroup_name, access_blocked, access_block_reason, access_blocked_at, access_block_scheduled_at, access_block_scheduled_reason'
    )
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
  if (error) {
    console.error('membersApi.getArchivedMembers', error);
    return [];
  }
  return (data ?? []).map(rowToMember);
}

/** Restaure une fiche archivée. */
export async function restoreMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').update({ archived_at: null }).eq('id', id);
  if (error) { console.error('membersApi.restoreMember', error); throw error; }
}

/** Suppression définitive (irréversible). À n'utiliser que depuis la corbeille. */
export async function hardDeleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) { console.error('membersApi.hardDeleteMember', error); throw error; }
}

/**
 * Change le numéro d'adhérent d'une fiche, avec contrôle d'unicité dans la salle.
 * Lève une erreur explicite si le numéro est déjà utilisé par une autre fiche.
 */
export async function updateMemberNumber(id: string, newNumber: string): Promise<void> {
  const num = newNumber.trim();
  if (!num) throw new Error('Numéro vide.');
  const gymId = await getGymId();
  if (!gymId) throw new Error("Impossible de déterminer la salle (gym_id).");

  const { data: clash, error: checkErr } = await supabase
    .from('members')
    .select('id')
    .eq('gym_id', gymId)
    .eq('member_number', num)
    .is('archived_at', null)
    .neq('id', id)
    .limit(1);
  if (checkErr) { console.error('membersApi.updateMemberNumber (check)', checkErr); throw checkErr; }
  if (clash && clash.length) {
    throw new Error(`Le numéro ${num} est déjà attribué à une autre fiche.`);
  }

  const { error } = await supabase.from('members').update({ member_number: num }).eq('id', id);
  if (error) { console.error('membersApi.updateMemberNumber (update)', error); throw error; }
}

/**
 * Rattache un mandat GoCardless existant à une fiche (depuis le fichier de
 * rapprochement). On enregistre les identifiants et on passe le statut à actif.
 */
export async function linkMandate(
  id: string,
  p: { mandateId: string; customerId?: string }
): Promise<void> {
  const mandateId = p.mandateId.trim();
  if (!mandateId) throw new Error('mandate_id manquant.');
  const fields: Record<string, any> = {
    gocardless_mandate_id: mandateId,
    gocardless_status: 'mandate_active',
  };
  if (p.customerId && p.customerId.trim()) fields.gocardless_customer_id = p.customerId.trim();
  const { error } = await supabase.from('members').update(fields).eq('id', id);
  if (error) { console.error('membersApi.linkMandate', error); throw error; }
}

export async function saveMember(member: Member): Promise<void> {
  // Mise à jour d'une fiche existante (id = uuid Supabase)
  if (member.id && isUuid(member.id)) {
    const { error } = await supabase
      .from('members')
      .update({
        first_name: member.firstName,
        last_name: member.lastName,
        email: member.email || null,
        phone: member.phone || null,
        address: member.address || null,
        city: member.city || null,
        postal_code: member.postalCode || null,
        status: toDbStatus(member.status),
        subscription_label: member.subscription || null,
        price: member.price ?? null,
        payment_method_label: member.paymentMethod || null,
        periodicity: member.periodicity || null,
        paid_by: member.paidBy || null,
        subscription_start: member.subscriptionStart || null,
        subscription_end: member.subscriptionEnd || null,
        notes: member.notes || null,
      })
      .eq('id', member.id);
    if (error) {
      console.error('membersApi.saveMember (update)', error);
      throw error;
    }
    return;
  }

  // Création d'une nouvelle fiche
  const gymId = await getGymId();
  if (!gymId) throw new Error("Impossible de déterminer la salle (gym_id).");

  // Premier numéro de membre/badge libre (1–1000)
  let memberNumber = `M${Date.now()}`; // repli
  const { data: num } = await supabase.rpc('next_member_number', { p_gym: gymId });
  if (num) memberNumber = String(num);

  const { error } = await supabase.from('members').insert({
    gym_id: gymId,
    member_number: memberNumber,
    first_name: member.firstName,
    last_name: member.lastName,
    email: member.email || null,
    phone: member.phone || null,
    address: member.address || null,
    status: toDbStatus(member.status),
    join_date: member.joinDate || null,
    notes: member.notes || null,
  });
  if (error) {
    console.error('membersApi.saveMember (insert)', error);
    throw error;
  }
}

export async function deleteMember(id: string): Promise<void> {
  // Suppression douce : on archive (données conservées), on n'efface jamais.
  const { error } = await supabase
    .from('members')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('membersApi.deleteMember', error);
    throw error;
  }
}

/** Inscription complète d'un membre par le staff. Renvoie la fiche créée (avec son id). */
export interface NewMemberInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  subscriptionLabel?: string;
  price?: number | null;
  periodicity?: string;
  paymentMethodLabel?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  cardNumber?: string;   // numéro de badge / carte (lu par le contrôleur ZKTeco), stocké dans rfid_badge + qr_code
  keypadCode?: string;   // code clavier 6 chiffres (stocké dans keypad_code, écrit dans Password côté contrôleur)
  groupName?: string;
  subgroupName?: string;
  notes?: string;
  paidBy?: string;   // payeur tiers (association / entreprise) — "réglé par"
}

export async function createMember(p: NewMemberInput): Promise<Member> {
  const gymId = await getGymId();
  if (!gymId) throw new Error("Impossible de déterminer la salle (gym_id).");

  let memberNumber = `M${Date.now()}`;
  const { data: num } = await supabase.rpc('next_member_number', { p_gym: gymId });
  if (num) memberNumber = String(num);

  const { data, error } = await supabase
    .from('members')
    .insert({
      gym_id: gymId,
      member_number: memberNumber,
      first_name: p.firstName,
      last_name: p.lastName,
      email: p.email || null,
      phone: p.phone || null,
      address: p.address || null,
      city: p.city || null,
      postal_code: p.postalCode || null,
      subscription_label: p.subscriptionLabel || null,
      price: p.price ?? null,
      periodicity: p.periodicity || null,
      payment_method_label: p.paymentMethodLabel || null,
      subscription_start: p.subscriptionStart || null,
      subscription_end: p.subscriptionEnd || null,
      rfid_badge: p.cardNumber || null,
      qr_code: p.cardNumber || null,
      keypad_code: p.keypadCode || null,
      group_name: p.groupName || null,
      subgroup_name: p.subgroupName || null,
      notes: p.notes || null,
      paid_by: p.paidBy || null,
      status: 'active',
      join_date: p.subscriptionStart || new Date().toISOString().split('T')[0],
    })
    .select('id, first_name, last_name, email, phone, address, postal_code, city, member_number, status, join_date, created_at, photo_path, subscription_label, price, payment_method_label, periodicity, subscription_start, subscription_end, group_name, subgroup_name')
    .single();
  if (error) { console.error('membersApi.createMember', error); throw error; }
  return rowToMember(data);
}

/** Met à jour des champs ciblés d'une fiche (ex. après création via GoCardless). */
export async function patchMember(id: string, fields: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('members').update(fields).eq('id', id);
  if (error) { console.error('membersApi.patchMember', error); throw error; }
}

/** Vrai si ce numéro de badge est déjà utilisé par un membre ACTIF (non archivé). */
export async function isCardNumberTaken(cardNumber: string, excludeMemberId?: string): Promise<boolean> {
  const card = (cardNumber || '').trim();
  if (!card) return false;
  let q = supabase.from('members')
    .select('id', { count: 'exact', head: true })
    .eq('rfid_badge', card)
    .is('archived_at', null);
  if (excludeMemberId) q = q.neq('id', excludeMemberId);
  const { count, error } = await q;
  if (error) { console.error('membersApi.isCardNumberTaken', error); return false; }
  return (count ?? 0) > 0;
}

/**
 * Génère un numéro de badge unique (aléatoire), avec relance automatique en cas de doublon.
 * Prévu pour la phase QR (quand NoResa attribue le numéro). Démarre haut (7 chiffres) pour
 * ne pas entrer en collision avec les badges physiques existants.
 */
export async function generateCardNumber(maxTries = 20): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    // entier à 7 chiffres entre 1 000 000 et 9 999 999 (compatible Wiegand 34 bits)
    const candidate = String(Math.floor(1_000_000 + Math.random() * 8_999_999));
    if (!(await isCardNumberTaken(candidate))) return candidate;
  }
  throw new Error("Impossible de générer un numéro de badge unique, réessayez.");
}

/** Attribue / modifie / efface le numéro de badge d'un membre (stocké dans rfid_badge + qr_code). */
export async function updateCardNumber(id: string, card: string): Promise<void> {
  const v = (card || '').trim();
  if (v && (await isCardNumberTaken(v, id))) {
    throw new Error(`Le numéro de badge ${v} est déjà attribué à un autre membre actif.`);
  }
  const { error } = await supabase.from('members')
    .update({ rfid_badge: v || null, qr_code: v || null })
    .eq('id', id);
  if (error) { console.error('membersApi.updateCardNumber', error); throw error; }
}

/** Vrai si ce code clavier est déjà utilisé par un autre membre actif. */
export async function isKeypadCodeTaken(code: string, excludeMemberId?: string): Promise<boolean> {
  const v = (code || '').trim();
  if (!v) return false;
  let q = supabase.from('members')
    .select('id', { count: 'exact', head: true })
    .eq('keypad_code', v)
    .is('archived_at', null);
  if (excludeMemberId) q = q.neq('id', excludeMemberId);
  const { count, error } = await q;
  if (error) { console.error('membersApi.isKeypadCodeTaken', error); return false; }
  return (count ?? 0) > 0;
}

/** Génère un code clavier unique à 6 chiffres (100000–999999), anti-collision. */
export async function generateKeypadCode(maxTries = 30): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!(await isKeypadCodeTaken(candidate))) return candidate;
  }
  throw new Error('Impossible de générer un code clavier unique, réessayez.');
}

/** Attribue / modifie / efface le code clavier d'un membre (stocké dans keypad_code). */
export async function updateKeypadCode(id: string, code: string): Promise<void> {
  const v = (code || '').trim();
  if (v && (await isKeypadCodeTaken(v, id))) {
    throw new Error(`Le code ${v} est déjà attribué à un autre membre actif.`);
  }
  const { error } = await supabase.from('members')
    .update({ keypad_code: v || null })
    .eq('id', id);
  if (error) { console.error('membersApi.updateKeypadCode', error); throw error; }
}

/** Création express d'un client depuis la caisse (prénom + nom suffisent). */
export async function createQuickMember(p: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<Member> {
  const gymId = await getGymId();
  if (!gymId) throw new Error("Impossible de déterminer la salle (gym_id).");

  let memberNumber = `M${Date.now()}`;
  const { data: num } = await supabase.rpc('next_member_number', { p_gym: gymId });
  if (num) memberNumber = String(num);

  const { data, error } = await supabase
    .from('members')
    .insert({
      gym_id: gymId,
      member_number: memberNumber,
      first_name: p.firstName,
      last_name: p.lastName,
      email: p.email || null,
      phone: p.phone || null,
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    })
    .select('id, first_name, last_name, email, phone, member_number, status, join_date, created_at, photo_path')
    .single();
  if (error) {
    console.error('membersApi.createQuickMember', error);
    throw error;
  }
  return rowToMember(data);
}

// --- Photos -----------------------------------------------------------------

const PHOTO_BUCKET = 'member-photos';

/** Téléverse une photo pour un membre et enregistre son chemin. Renvoie le chemin. */
export async function uploadMemberPhoto(memberId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${memberId}/${Date.now()}.${ext}`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true });
  if (up.error) {
    console.error('membersApi.uploadMemberPhoto (upload)', up.error);
    throw up.error;
  }
  const { error } = await supabase.from('members').update({ photo_path: path }).eq('id', memberId);
  if (error) {
    console.error('membersApi.uploadMemberPhoto (update)', error);
    throw error;
  }
  return path;
}

/** Génère une URL signée (temporaire) pour afficher une photo stockée en privé. */
export async function getPhotoUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error('membersApi.getPhotoUrl', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

// --- Recherche --------------------------------------------------------------

/** Recherche de membres par mot partiel : nom, prénom, email, téléphone ou n° client. */
export async function searchMembers(query: string, limit = 8): Promise<Member[]> {
  const q = query.trim().replace(/,/g, ' ');
  if (!q) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('members')
    .select(
      'id, first_name, last_name, email, phone, address, postal_code, city, ' +
        'subscription_label, price, payment_method_label, periodicity, paid_by, ' +
        'member_number, status, join_date, created_at, photo_path, ' +
        'emergency_contact_name, emergency_contact_phone, notes, rfid_badge, keypad_code, group_name, subgroup_name, access_blocked, access_block_reason, access_blocked_at, access_block_scheduled_at, access_block_scheduled_reason'
    )
    .or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},member_number.ilike.${like}`
    )
    .is('archived_at', null)
    .limit(limit);
  if (error) {
    console.error('membersApi.searchMembers', error);
    return [];
  }
  return (data ?? []).map(rowToMember);
}

export interface DashboardStats {
  active_members: number;
  total_members: number;
  mandates_active: number;
  new_members_month: number;
  mrr: number;
  revenue_month: number;
  revenue_series?: { month: string; revenue: number }[];
  recent_activity?: { type: string; label?: string; amount?: number; ts: string }[];
}

/** KPI du tableau de bord (membres, MRR, mandats, revenu du mois). */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (error) { console.error('membersApi.getDashboardStats', error); throw error; }
  return data as DashboardStats;
}

export interface ExpiringMember {
  id: string;
  first_name: string;
  last_name: string;
  member_number?: string;
  subscription_label?: string;
  payment_method?: string;
  subscription_end: string;
  days_left: number;
}

/** Abonnements (hors GoCardless actif) arrivant à expiration sous `days` jours (ou déjà dépassés). */
export async function getExpiringSubscriptions(days = 30): Promise<ExpiringMember[]> {
  const { data, error } = await supabase.rpc('expiring_subscriptions', { p_days: days });
  if (error) { console.error('membersApi.getExpiringSubscriptions', error); return []; }
  return (data ?? []) as ExpiringMember[];
}
