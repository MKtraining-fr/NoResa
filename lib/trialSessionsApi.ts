import { supabase } from './supabaseClient';
import { getGymId } from './membersApi';
import { findOrCreateProspect, setProspectStatus } from './prospectsApi';

/**
 * Couche de données "séances d'essai".
 * Une séance d'essai est rattachée à un prospect (retrouvé/créé par tél/email).
 * Règle métier : UNE seule séance d'essai par personne (contrainte UNIQUE en base
 * + contrôle applicatif pour un message clair).
 */

export interface TrialSessionInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  postalAddress?: string;
  visitedAt?: string; // ISO ; défaut = maintenant
  rgpdConsent: boolean;
  healthDeclaration: boolean;
  rulesAcknowledged: boolean;
  liabilityWaiver: boolean;
  medicalClearance: boolean;
  cgAccepted: boolean;
  signedName: string;
  notes?: string;
}

export interface TrialSessionResult {
  ok: boolean;
  alreadyDone?: boolean;
  visitedAt?: string;
  prospectId?: string;
  trialSessionId?: string;
  error?: string;
}

export async function createTrialSession(input: TrialSessionInput): Promise<TrialSessionResult> {
  const gymId = await getGymId();
  if (!gymId) return { ok: false, error: 'Salle introuvable' };

  // 1) Prospect : retrouve (anti-doublon par tél/email) ou crée.
  let prospectId: string;
  try {
    const r = await findOrCreateProspect({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      source: 'séance_essai',
      notes: input.notes,
    });
    prospectId = r.id;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erreur lors de la création du prospect' };
  }

  // 2) Anti-abus : 1 séance d'essai max par personne.
  const { data: existing } = await supabase
    .from('trial_sessions')
    .select('id, visited_at')
    .eq('prospect_id', prospectId)
    .maybeSingle();
  if (existing) {
    return { ok: false, alreadyDone: true, visitedAt: existing.visited_at, prospectId };
  }

  // 3) Staff qui enregistre.
  const { data: authData } = await supabase.auth.getUser();
  const attendedBy = authData?.user?.id ?? null;

  // 4) Insertion de la séance.
  const { data, error } = await supabase
    .from('trial_sessions')
    .insert({
      gym_id: gymId,
      prospect_id: prospectId,
      visited_at: input.visitedAt ?? new Date().toISOString(),
      date_of_birth: input.dateOfBirth || null,
      postal_address: input.postalAddress || null,
      rgpd_consent: input.rgpdConsent,
      health_declaration: input.healthDeclaration,
      rules_acknowledged: input.rulesAcknowledged,
      liability_waiver: input.liabilityWaiver,
      medical_clearance: input.medicalClearance,
      cg_accepted: input.cgAccepted,
      signed_name: input.signedName || null,
      signed_at: new Date().toISOString(),
      attended_by_user_id: attendedBy,
      notes: input.notes || null,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = violation d'unicité (course : séance créée entre-temps).
    if ((error as any).code === '23505') {
      return { ok: false, alreadyDone: true, prospectId };
    }
    console.error('trialSessionsApi.createTrialSession', error);
    return { ok: false, error: error.message };
  }

  // 5) Statut prospect -> 'trial'.
  try {
    await setProspectStatus(prospectId, 'trial');
  } catch {
    /* non bloquant */
  }

  return { ok: true, prospectId, trialSessionId: data.id };
}

/** Récupère la séance d'essai d'un prospect (ou null). */
export async function getTrialSessionForProspect(prospectId: string) {
  const { data, error } = await supabase
    .from('trial_sessions')
    .select('*')
    .eq('prospect_id', prospectId)
    .maybeSingle();
  if (error) {
    console.error('trialSessionsApi.getTrialSessionForProspect', error);
    return null;
  }
  return data;
}
