import { supabase } from './supabaseClient';
import { getGymId, createMember, patchMember, uploadMemberPhoto, isCardNumberTaken, generateKeypadCode } from './membersApi';
import { startMandateSetup } from './gocardless';
import { enqueueAccessCommand } from './accessApi';

// --- Catalogue des formules (grille du contrat A.R.A.P.S) -------------------

export type PayKind = 'prelevement' | 'comptant' | 'espece' | 'ponctuel';

export interface Formula {
  key: string;
  label: string;          // libellé tel qu'il apparaîtra sur le contrat
  price: number;
  recurring: boolean;     // true => abonnement mensuel par prélèvement (mandat GoCardless)
  engagement: boolean;    // engagement 12 mois
  periodicity: string;    // 'Mensuel' | 'Annuel' | 'Ponctuel'
  group: 'Engagement' | 'Sans engagement';
}

/** Formules proposées à l'inscription. `recurring` indique celles qui déclenchent un mandat GoCardless. */
export const FORMULAS: Formula[] = [
  { key: 'classique_prelev', label: 'Formule classique — prélèvement automatique (le 10 du mois)', price: 29.90, recurring: true, engagement: true, periodicity: 'Mensuel', group: 'Engagement' },
  { key: 'classique_comptant', label: 'Formule classique — paiement comptant', price: 345.00, recurring: false, engagement: true, periodicity: 'Annuel', group: 'Engagement' },
  { key: 'suivi_formation', label: 'Formule Suivi + Formation — prélèvement automatique', price: 59.90, recurring: true, engagement: true, periodicity: 'Mensuel', group: 'Engagement' },
  { key: 'famille_etudiant_mensuel', label: 'Formule Famille/Étudiant — prélèvement mensuel', price: 25.90, recurring: true, engagement: true, periodicity: 'Mensuel', group: 'Engagement' },
  { key: 'famille_etudiant_comptant', label: 'Formule Famille/Étudiant — paiement comptant', price: 300.00, recurring: false, engagement: true, periodicity: 'Annuel', group: 'Engagement' },
  { key: 'seance', label: 'Séance', price: 5.00, recurring: false, engagement: false, periodicity: 'Ponctuel', group: 'Sans engagement' },
  { key: 'pack10', label: 'Pack de 10 séances', price: 45.00, recurring: false, engagement: false, periodicity: 'Ponctuel', group: 'Sans engagement' },
  { key: 'mois', label: '1 mois', price: 40.00, recurring: false, engagement: false, periodicity: 'Ponctuel', group: 'Sans engagement' },
];

/** Badge obligatoire (avec son propre mode de paiement). */
export const BADGE = { label: 'Badge (obligatoire)', price: 15.00 };

/** Services complémentaires optionnels. */
export const SERVICES = [
  { key: 'inbody', label: 'Abonnement Inbody', price: 20.00 },
  { key: 'pesee', label: 'Pesée à l\u2019unité', price: 10.00 },
];

/** Modes de paiement proposés (badge, comptant, etc.). */
export const PAYMENT_METHODS = ['Espèces', 'CB', 'Prélèvement', 'Chèque'];

// --- Types ------------------------------------------------------------------

export interface ContractOption { label: string; price: number; payment?: string }

export interface ContractInput {
  memberId: string;
  civility?: string;
  birthDate?: string;       // 'YYYY-MM-DD'
  nationality?: string;
  profession?: string;
  company?: string;
  formulaLabel: string;
  formulaPrice: number;
  paymentMethod: string;    // mode de règlement de la formule
  engagement: boolean;
  badgePaymentMethod?: string;
  options: ContractOption[]; // inclut le badge et les services choisis
  totalDue: number;
  consentCga: boolean;
  consentMedical: boolean;
  signerName: string;
}

// --- Numéro de contrat ------------------------------------------------------

async function nextContractNumber(gymId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .gte('created_at', `${year}-01-01`);
  const seq = String((count ?? 0) + 1).padStart(4, '0');
  return `CT-${year}-${seq}`;
}

// --- Création + génération ---------------------------------------------------

/** Crée la ligne de contrat (statut non signé tant que le PDF n'est pas généré). Renvoie son id. */
export async function createContract(p: ContractInput): Promise<{ id: string; contractNumber: string }> {
  const gymId = await getGymId();
  if (!gymId) throw new Error("Impossible de déterminer la salle (gym_id).");
  const contractNumber = await nextContractNumber(gymId);

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      gym_id: gymId,
      member_id: p.memberId,
      contract_number: contractNumber,
      civility: p.civility || null,
      birth_date: p.birthDate || null,
      nationality: p.nationality || null,
      profession: p.profession || null,
      company: p.company || null,
      formula_label: p.formulaLabel,
      formula_price: p.formulaPrice,
      payment_method: p.paymentMethod,
      engagement: p.engagement,
      badge_payment_method: p.badgePaymentMethod || null,
      options: p.options ?? [],
      total_due: p.totalDue,
      consent_cga: p.consentCga,
      consent_medical: p.consentMedical,
      signer_name: p.signerName,
      signed_at: new Date().toISOString(),
    })
    .select('id, contract_number')
    .single();
  if (error) { console.error('contractsApi.createContract', error); throw error; }
  return { id: data.id, contractNumber: data.contract_number };
}

/** Appelle l'Edge Function generate-contract : crée le PDF signé, le stocke, et l'envoie par email (si possible). */
export async function generateContract(contractId: string, signatureDataUrl: string, email = true): Promise<any> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract`;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ contract_id: contractId, signature: signatureDataUrl, email }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || 'La génération du contrat a échoué.');
  return j;
}

/** URL signée temporaire pour consulter / télécharger un contrat PDF stocké. */
export async function getContractUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 3600);
  if (error) { console.error('contractsApi.getContractUrl', error); return null; }
  return data?.signedUrl ?? null;
}

/** Contrats d'un membre (pour les afficher dans sa fiche). */
export async function getMemberContracts(memberId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, contract_number, created_at, signed_at, formula_label, total_due, pdf_path, email_status')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) { console.error('contractsApi.getMemberContracts', error); return []; }
  return data ?? [];
}

// --- Orchestration complète de l'inscription --------------------------------

export interface InscriptionData {
  // Identité
  civility?: string;
  firstName: string;
  lastName: string;
  birthDate?: string;       // 'YYYY-MM-DD'
  nationality?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  profession?: string;
  company?: string;
  photo?: File | null;
  cardNumber?: string;        // numéro de badge (saisi manuellement pour l'instant)
  // Groupe / sous-groupe (étiquette interne, invisible pour l'adhérent)
  groupName?: string;
  subgroupName?: string;
  // Période (utile pour les contrats à courte durée)
  subscriptionStart?: string;   // 'YYYY-MM-DD'
  subscriptionEnd?: string;     // 'YYYY-MM-DD'
  // Formule
  formula: Formula;
  formulaPaymentMethod: string;   // règlement de la formule (Prélèvement / Espèces / CB / Chèque / Comptant)
  badgePaymentMethod: string;     // règlement du badge
  services: { label: string; price: number }[];
  // Déclarations + signature
  consentCga: boolean;
  consentMedical: boolean;
  signatureDataUrl: string;
  signerName: string;
  totalDue: number;
}

export interface InscriptionResult {
  memberId: string;
  contractId: string;
  contractNumber: string;
  authorisationUrl?: string;  // présent si formule en prélèvement (mandat GoCardless à finaliser)
  keypadCode?: string;        // code clavier 6 chiffres généré pour ce membre
  generate: any;
}

/**
 * Inscription complète :
 *  - formule en prélèvement -> création membre + mandat GoCardless (renvoie une URL à finaliser par l'adhérent)
 *  - sinon (comptant / espèces / séance / carnet) -> création membre simple
 *  Puis : création du contrat + génération du PDF signé + email.
 */
export async function submitInscription(d: InscriptionData): Promise<InscriptionResult> {
  const gymId = await getGymId();
  if (!gymId) throw new Error('Impossible de déterminer la salle (gym_id).');

  // Numéro de badge déjà utilisé par un membre actif ?
  if (d.cardNumber && (await isCardNumberTaken(d.cardNumber))) {
    throw new Error(`Le numéro de badge ${d.cardNumber} est déjà attribué à un membre actif.`);
  }

  // Code clavier 6 chiffres : généré automatiquement pour chaque membre (en plus du badge éventuel)
  let keypadCode = '';
  try { keypadCode = await generateKeypadCode(); } catch (e) { console.error('generateKeypadCode', e); }

  let memberId: string;
  let authorisationUrl: string | undefined;

  // Le mandat SEPA (GoCardless) se met en place UNIQUEMENT si le règlement choisi est le prélèvement.
  const usesMandate = d.formulaPaymentMethod === 'Prélèvement';

  if (usesMandate) {
    if (!d.email) throw new Error('Un email est requis pour un règlement par prélèvement automatique.');
    const r = await startMandateSetup({
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      gymId,
      subscriptionLabel: d.formula.label,
      price: d.formula.price,
    });
    memberId = r.member_id;
    authorisationUrl = r.authorisation_url;
    // Complète la fiche créée par le flux GoCardless (adresse, périodicité, mode de règlement)
    await patchMember(memberId, {
      address: d.address || null,
      city: d.city || null,
      postal_code: d.postalCode || null,
      periodicity: d.formula.periodicity || null,
      payment_method_label: d.formulaPaymentMethod || 'Prélèvement',
      subscription_start: d.subscriptionStart || null,
      subscription_end: d.subscriptionEnd || null,
      rfid_badge: d.cardNumber || null,
      qr_code: d.cardNumber || null,
      keypad_code: keypadCode || null,
      group_name: d.groupName || null,
      subgroup_name: d.subgroupName || null,
    });
  } else {
    const m = await createMember({
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      address: d.address,
      city: d.city,
      postalCode: d.postalCode,
      subscriptionLabel: d.formula.label,
      price: d.formula.price,
      periodicity: d.formula.periodicity,
      paymentMethodLabel: d.formulaPaymentMethod,
      subscriptionStart: d.subscriptionStart,
      subscriptionEnd: d.subscriptionEnd,
      cardNumber: d.cardNumber,
      keypadCode: keypadCode || undefined,
      groupName: d.groupName,
      subgroupName: d.subgroupName,
    });
    memberId = m.id;
  }

  // Photo (optionnelle) — ne bloque pas l'inscription si l'upload échoue
  if (d.photo) {
    try { await uploadMemberPhoto(memberId, d.photo); } catch (e) { console.error('upload photo', e); }
  }

  // Accès : on pousse vers le contrôleur (via le pont) le badge ET/OU le code clavier.
  // Ne bloque jamais l'inscription en cas d'échec.
  if (d.cardNumber || keypadCode) {
    try {
      const { data: mrow } = await supabase.from('members')
        .select('member_number').eq('id', memberId).maybeSingle();
      const pin = mrow?.member_number ? String(mrow.member_number) : '';
      if (pin) {
        await enqueueAccessCommand({
          memberId, pin, cardNumber: d.cardNumber || null, keypadCode: keypadCode || null,
          name: `${d.firstName} ${d.lastName}`, action: 'grant',
        });
      }
    } catch (e) { console.error('enqueue grant', e); }
  }

  const options: ContractOption[] = [
    { label: BADGE.label, price: BADGE.price, payment: d.badgePaymentMethod },
    ...d.services.map((s) => ({ label: s.label, price: s.price })),
  ];

  const { id: contractId, contractNumber } = await createContract({
    memberId,
    civility: d.civility,
    birthDate: d.birthDate,
    nationality: d.nationality,
    profession: d.profession,
    company: d.company,
    formulaLabel: d.formula.label,
    formulaPrice: d.formula.price,
    paymentMethod: d.formulaPaymentMethod,
    engagement: d.formula.engagement,
    badgePaymentMethod: d.badgePaymentMethod,
    options,
    totalDue: d.totalDue,
    consentCga: d.consentCga,
    consentMedical: d.consentMedical,
    signerName: d.signerName,
  });

  const generate = await generateContract(contractId, d.signatureDataUrl, true);
  return { memberId, contractId, contractNumber, authorisationUrl, keypadCode, generate };
}
