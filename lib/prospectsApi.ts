import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';
import { Member, ContactStatus } from '../types';

/**
 * Couche de données "prospects" branchée sur la table `prospects` de Supabase.
 * Un prospect est exposé au front sous la forme d'un `Member` (statut PROSPECT_*)
 * pour réutiliser l'UI existante du CRM. La conversion en membre s'appuie sur
 * la colonne `prospects.converted_to_member_id`.
 */

export interface ProspectContact extends Member {
  /** Date de la séance d'essai si elle a eu lieu (sinon undefined). */
  trialVisitedAt?: string;
  /** Lien vers le membre créé lors de la conversion (si converti). */
  convertedToMemberId?: string;
}

// prospects.status (varchar) -> ContactStatus du front
function toProspectStatus(dbStatus: string | null): ContactStatus {
  switch (dbStatus) {
    case 'trial':
      return 'PROSPECT_TRIAL';
    case 'followup':
      return 'PROSPECT_FOLLOWUP';
    default:
      return 'PROSPECT_NEW';
  }
}

function rowToProspect(r: any): ProspectContact {
  const trial = Array.isArray(r.trial_sessions) ? r.trial_sessions[0] : r.trial_sessions;
  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email ?? '',
    phone: r.phone_number ?? undefined,
    status: toProspectStatus(r.status),
    joinDate: r.first_contact_date ?? (r.created_at ? String(r.created_at).split('T')[0] : ''),
    trialSessionDone: !!trial,
    trialVisitedAt: trial?.visited_at ?? undefined,
    convertedToMemberId: r.converted_to_member_id ?? undefined,
    notes: r.notes ?? undefined,
  } as ProspectContact;
}

const normPhone = (p?: string | null) => (p ?? '').replace(/[\s.\-()]/g, '').trim();

// --- Lecture ---------------------------------------------------------------

/** Liste des prospects (non convertis) de la salle, avec leur éventuelle séance d'essai. */
export async function listProspects(): Promise<ProspectContact[]> {
  const gymId = await getGymId();
  if (!gymId) return [];
  const { data, error } = await supabase
    .from('prospects')
    .select(
      'id, first_name, last_name, email, phone_number, source, status, ' +
        'first_contact_date, notes, converted_to_member_id, created_at, ' +
        'trial_sessions ( visited_at )'
    )
    .eq('gym_id', gymId)
    .is('converted_to_member_id', null)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('prospectsApi.listProspects', error);
    return [];
  }
  return (data ?? []).map(rowToProspect);
}

// --- Écriture --------------------------------------------------------------

export interface ProspectInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}

/**
 * Retrouve un prospect existant par email ou téléphone (dans la salle), sinon le crée.
 * Sert d'anti-doublon : un même individu = un seul prospect.
 */
export async function findOrCreateProspect(input: ProspectInput): Promise<{ id: string; existed: boolean }> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('Salle introuvable');

  const email = (input.email ?? '').trim().toLowerCase();
  const phone = normPhone(input.phone);

  // Recherche par email OU téléphone
  if (email || phone) {
    const ors: string[] = [];
    if (email) ors.push(`email.eq.${email}`);
    if (phone) ors.push(`phone_number.eq.${phone}`);
    const { data: existing } = await supabase
      .from('prospects')
      .select('id')
      .eq('gym_id', gymId)
      .or(ors.join(','))
      .limit(1)
      .maybeSingle();
    if (existing?.id) return { id: existing.id, existed: true };
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      gym_id: gymId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: email || null,
      phone_number: phone || null,
      source: input.source ?? null,
      status: 'new',
      first_contact_date: new Date().toISOString().split('T')[0],
      notes: input.notes ?? null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('prospectsApi.findOrCreateProspect', error);
    throw error;
  }
  return { id: data.id, existed: false };
}

/** Met à jour le statut d'un prospect (ex. 'trial', 'followup', 'new'). */
export async function setProspectStatus(prospectId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('prospects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', prospectId);
  if (error) {
    console.error('prospectsApi.setProspectStatus', error);
    throw error;
  }
}

/** Marque un prospect comme converti vers un membre donné. */
export async function markProspectConverted(prospectId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('prospects')
    .update({
      converted_to_member_id: memberId,
      status: 'converted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId);
  if (error) {
    console.error('prospectsApi.markProspectConverted', error);
    throw error;
  }
}
