import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';

export interface MemberGroup {
  id: string;
  name: string;
  parent_id: string | null;
  // Règle de facturation « payeur tiers » (association/entreprise qui règle pour ses membres)
  billedToThirdParty?: boolean;
  payerName?: string | null;
  billingEmail?: string | null;
  billingAddress?: string | null;
  unitPrice?: number | null;
  formulaLabel?: string | null;
  prorata?: boolean;
}

/** Règle de facturation effective d'un membre (sous-groupe surcharge le groupe). */
export interface BillingRule {
  billed: boolean;
  payerName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  unitPrice: number | null;
  formulaLabel: string | null;
}

export interface GroupNode {
  id: string;
  name: string;
  subgroups: { id: string; name: string }[];
}

/** Liste plate des groupes + sous-groupes de la salle (avec leur règle de facturation). */
export async function getGroupsFlat(): Promise<MemberGroup[]> {
  const { data, error } = await supabase
    .from('member_groups')
    .select('id, name, parent_id, billed_to_third_party, payer_name, billing_email, billing_address, unit_price, formula_label, prorata')
    .order('name', { ascending: true });
  if (error) { console.error('getGroupsFlat', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, parent_id: r.parent_id,
    billedToThirdParty: r.billed_to_third_party ?? false,
    payerName: r.payer_name ?? null,
    billingEmail: r.billing_email ?? null,
    billingAddress: r.billing_address ?? null,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
    formulaLabel: r.formula_label ?? null,
    prorata: r.prorata ?? true,
  }));
}

/** Enregistre la règle de facturation d'un groupe/sous-groupe. */
export async function updateGroupBillingRule(id: string, rule: {
  billedToThirdParty: boolean; payerName?: string | null; billingEmail?: string | null;
  billingAddress?: string | null; unitPrice?: number | null; formulaLabel?: string | null; prorata?: boolean;
}): Promise<void> {
  const { error } = await supabase.from('member_groups').update({
    billed_to_third_party: rule.billedToThirdParty,
    payer_name: rule.payerName?.trim() || null,
    billing_email: rule.billingEmail?.trim() || null,
    billing_address: rule.billingAddress?.trim() || null,
    unit_price: rule.unitPrice ?? null,
    formula_label: rule.formulaLabel?.trim() || null,
    prorata: rule.prorata ?? true,
  }).eq('id', id);
  if (error) { console.error('updateGroupBillingRule', error); throw error; }
}

/**
 * Règle de facturation effective pour un couple (groupe, sous-groupe) à partir de la
 * liste plate : le sous-groupe surcharge le groupe (valeurs non nulles).
 */
export function effectiveBillingRule(flat: MemberGroup[], groupName?: string | null, subgroupName?: string | null): BillingRule | null {
  if (!groupName) return null;
  const group = flat.find((g) => !g.parent_id && g.name === groupName);
  if (!group || !group.billedToThirdParty) return null;
  const sub = subgroupName ? flat.find((s) => s.parent_id === group.id && s.name === subgroupName) : undefined;
  const pick = <K extends keyof MemberGroup>(k: K) => (sub && sub[k] != null && sub[k] !== '' ? sub[k] : group[k]) as any;
  return {
    billed: true,
    payerName: (pick('payerName') as string) || group.name,
    billingEmail: pick('billingEmail') ?? null,
    billingAddress: pick('billingAddress') ?? null,
    unitPrice: pick('unitPrice') ?? null,
    formulaLabel: pick('formulaLabel') ?? null,
  };
}

/** Arbre groupes -> sous-groupes (pour la gestion et les menus déroulants). */
export async function getGroupTree(): Promise<GroupNode[]> {
  const flat = await getGroupsFlat();
  const parents = flat.filter((g) => !g.parent_id);
  return parents.map((p) => ({
    id: p.id,
    name: p.name,
    subgroups: flat.filter((s) => s.parent_id === p.id).map((s) => ({ id: s.id, name: s.name })),
  }));
}

/** Crée un groupe (parent_id null) ou un sous-groupe (parentId renseigné). */
export async function createGroup(name: string, parentId?: string | null): Promise<MemberGroup | null> {
  const clean = name.trim();
  if (!clean) return null;
  const gymId = await getGymId();
  if (!gymId) throw new Error('gym_id introuvable');
  const { data, error } = await supabase
    .from('member_groups')
    .insert({ gym_id: gymId, name: clean, parent_id: parentId ?? null })
    .select('id, name, parent_id')
    .single();
  if (error) { console.error('createGroup', error); throw error; }
  return data as MemberGroup;
}

/** Renomme un groupe ou sous-groupe. Répercute le nouveau nom sur les fiches concernées. */
export async function renameGroup(id: string, name: string, parentId: string | null, oldName: string): Promise<void> {
  const clean = name.trim();
  if (!clean || clean === oldName) return;
  const { error } = await supabase.from('member_groups').update({ name: clean }).eq('id', id);
  if (error) { console.error('renameGroup', error); throw error; }
  // Met à jour les pratiquants qui portaient l'ancien nom
  const col = parentId ? 'subgroup_name' : 'group_name';
  await supabase.from('members').update({ [col]: clean }).eq(col, oldName);
}

/** Ids des pratiquants d'un groupe (et éventuellement d'un sous-groupe précis). */
export async function getMemberIdsInGroup(groupName: string, subgroupName?: string): Promise<string[]> {
  if (!groupName) return [];
  let q = supabase.from('members').select('id').eq('group_name', groupName).is('archived_at', null);
  if (subgroupName) q = q.eq('subgroup_name', subgroupName);
  const { data, error } = await q;
  if (error) { console.error('getMemberIdsInGroup', error); return []; }
  return (data ?? []).map((r: any) => r.id);
}
export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('member_groups').delete().eq('id', id);
  if (error) { console.error('deleteGroup', error); throw error; }
}
