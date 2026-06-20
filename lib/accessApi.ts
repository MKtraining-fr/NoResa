import { supabase } from './supabaseClient';
import { getGymId, patchMember, generateKeypadCode, updateKeypadCode } from './membersApi';

export type AccessAction = 'grant' | 'block' | 'unblock' | 'revoke';

/**
 * Dépose une commande d'accès dans la file ; le pont (PC salle) l'appliquera au contrôleur C3.
 *   grant   : crée l'utilisateur + ses 2 accès
 *   block   : retire les accès (badge refusé) sans supprimer
 *   unblock : remet les accès
 *   revoke  : supprime l'utilisateur du contrôleur
 */
export async function enqueueAccessCommand(p: {
  memberId?: string; pin: string; cardNumber?: string | null; keypadCode?: string | null;
  name?: string | null; action: AccessAction; endTime?: string | null;
}): Promise<void> {
  const pin = (p.pin ?? '').toString().trim();
  if (!pin) return; // pas de numéro d'adhérent -> rien à pousser
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { error } = await supabase.from('access_commands').insert({
    gym_id: gymId, member_id: p.memberId ?? null, pin,
    card_number: p.cardNumber ?? null, keypad_code: p.keypadCode ?? null,
    name: p.name ?? null, action: p.action, end_time: p.endTime ?? null,
  });
  if (error) { console.error('enqueueAccessCommand', error); throw error; }
}


// Valeur encodée dans le QR d'un membre = son numéro d'adhérent (= card number côté ZKAccess)
export function memberQrValue(memberNumber?: string | null): string {
  return (memberNumber ?? '').toString().trim();
}

export interface AccessEntry {
  id: string;
  access_datetime: string;
  status: string;
  card_number: string | null;
  qr_code: string | null;
  device_sn: string | null;
  member: { first_name: string | null; last_name: string | null; member_number: string | null } | null;
}

/** Entrées du jour (passages enregistrés depuis minuit), plus récentes d'abord. */
export async function getTodayEntries(): Promise<AccessEntry[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('access_logs')
    .select('id, access_datetime, status, card_number, qr_code, device_sn, member:members(first_name, last_name, member_number)')
    .gte('access_datetime', start.toISOString())
    .order('access_datetime', { ascending: false })
    .limit(500);
  if (error) { console.error('getTodayEntries', error); return []; }
  return (data ?? []) as any;
}

export interface AccessAlert {
  id: string;
  alert_type: string;
  first_event: string;
  second_event: string;
  gap_seconds: number | null;
  status: string;
  created_at: string;
  member: { first_name: string | null; last_name: string | null; member_number: string | null } | null;
}

/** Alertes (par défaut celles à vérifier). */
export async function getAccessAlerts(status: string = 'open'): Promise<AccessAlert[]> {
  let q = supabase
    .from('access_alerts')
    .select('id, alert_type, first_event, second_event, gap_seconds, status, created_at, member:members(first_name, last_name, member_number)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) { console.error('getAccessAlerts', error); return []; }
  return (data ?? []) as any;
}

/** Marque une alerte comme traitée ('reviewed') ou ignorée ('dismissed'). */
export async function reviewAlert(id: string, status: 'reviewed' | 'dismissed', note?: string): Promise<void> {
  const { error } = await supabase.from('access_alerts').update({ status, note: note ?? null }).eq('id', id);
  if (error) { console.error('reviewAlert', error); throw error; }
}

export interface MemberVisit {
  id: string;
  access_datetime: string;
  status: string;            // authorized | denied
  access_type: string;       // entry | exit
  identification_method: string | null;
  card_number: string | null;
}

/**
 * Passages d'un membre (les plus récents d'abord).
 * Pagination : passe `before` = access_datetime du dernier élément déjà affiché.
 */
export async function getMemberVisits(
  memberId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<MemberVisit[]> {
  const limit = opts.limit ?? 15;
  let q = supabase
    .from('access_logs')
    .select('id, access_datetime, status, access_type, identification_method, card_number')
    .eq('member_id', memberId)
    .order('access_datetime', { ascending: false })
    .limit(limit);
  if (opts.before) q = q.lt('access_datetime', opts.before);
  const { data, error } = await q;
  if (error) { console.error('getMemberVisits', error); return []; }
  return (data ?? []) as MemberVisit[];
}

/** Nombre de passages autorisés d'un membre depuis une date (par défaut : début du mois courant). */
export async function getMemberVisitCount(memberId: string, sinceIso?: string): Promise<number> {
  const since = sinceIso ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from('access_logs')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('status', 'authorized')
    .gte('access_datetime', since);
  if (error) { console.error('getMemberVisitCount', error); return 0; }
  return count ?? 0;
}

export interface PackStatus {
  is_pack: boolean;
  total: number;
  used: number;
  remaining: number;
  epoch: string | null;
}

/** Statut d'une carte 10 séances : séances utilisées / restantes (même logique que l'auto-blocage). */
export async function getPackStatus(memberId: string): Promise<PackStatus | null> {
  const { data, error } = await supabase.rpc('pack_sessions_status', { p_member: memberId });
  if (error) { console.error('getPackStatus', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as PackStatus | null;
}

// ---- Activation d'accès suite à une vente ponctuelle (1 mois / 10 séances / 1 séance) ----

export type PurchaseKind = 'month' | 'pack10' | 'session1';

/** Déduit le type d'accès d'un produit acheté (sinon null = produit hors accès). */
export function purchaseKindForProduct(name: string, price: number): PurchaseKind | null {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('seance')) return n.includes('10') ? 'pack10' : 'session1';
  if (price === 45) return 'pack10';
  if (price === 5) return 'session1';
  if (price === 40 || n.includes('mois')) return 'month';
  return null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export interface PurchasedAccessMember {
  id: string;
  memberNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cardNumber?: string | null;
  keypadCode?: string | null;
}

/**
 * Active l'accès d'un membre suite à l'achat d'un produit ponctuel :
 *  - 1 mois     : accès jusqu'à +1 mois (le contrôleur expire via EndTime).
 *  - 10 séances : carnet de 10 (blocage auto à 10).
 *  - 1 séance   : 1 entrée (blocage auto après 1).
 * Génère le code clavier s'il n'en a pas, sinon réutilise l'existant. Ouvre l'accès (grant),
 * ce qui réinitialise aussi le compteur de carnet.
 * Retourne le type activé (ou null si le produit n'ouvre pas d'accès).
 */
export async function activatePurchasedAccess(
  member: PurchasedAccessMember,
  product: { name: string; price: number | string },
  paymentMethod?: string,
): Promise<PurchaseKind | null> {
  const kind = purchaseKindForProduct(product.name, Number(product.price));
  if (!kind || !member?.id) return null;

  // Relit les infos d'accès réelles en base (badge + code), pour ne jamais les écraser
  const { data: db } = await supabase.from('members')
    .select('member_number, first_name, last_name, rfid_badge, keypad_code')
    .eq('id', member.id).maybeSingle();
  const memberNumber = db?.member_number ?? member.memberNumber ?? '';
  const cardNumber = db?.rfid_badge ?? member.cardNumber ?? null;
  const firstName = db?.first_name ?? member.firstName ?? '';
  const lastName = db?.last_name ?? member.lastName ?? '';

  // 1. Assure un code clavier : réutilise l'ancien, sinon en génère un
  let code = (db?.keypad_code || member.keypadCode || '').trim();
  if (!code) {
    code = await generateKeypadCode();
    await updateKeypadCode(member.id, code);
  }

  // 2. Met à jour la fiche selon le type acheté
  const today = new Date();
  const patch: Record<string, unknown> = {
    subscription_label: product.name,
    price: Number(product.price),
    subscription_start: today.toISOString().split('T')[0],
  };
  if (paymentMethod) patch.payment_method_label = paymentMethod;

  let endTime: string | undefined;
  if (kind === 'month') {
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    patch.subscription_end = end.toISOString().split('T')[0];
    endTime = ymd(end); // date de fin appliquée au contrôleur (format AAAAMMJJ)
  } else {
    patch.subscription_end = null;
  }
  await patchMember(member.id, patch);

  // 3. Ouvre l'accès (grant) — réinitialise le compteur de carnet, préserve le badge
  await enqueueAccessCommand({
    memberId: member.id,
    pin: memberNumber ? String(memberNumber) : '',
    cardNumber: cardNumber ?? undefined,
    keypadCode: code || undefined,
    name: `${firstName} ${lastName}`.trim() || null,
    action: 'grant',
    endTime: endTime ?? null,
  });

  return kind;
}
