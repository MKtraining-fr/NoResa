import React, { useState, useRef, useEffect, useMemo } from 'react';
import { eur } from '../../lib/format';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Eraser, FileText,
  CreditCard, Loader2, Camera, Upload, Building2,
  Send, CheckCircle2,
} from 'lucide-react';
import WebcamCapture from '../../components/WebcamCapture';
import {
  FORMULAS, BADGE, SERVICES, PAYMENT_METHODS,
  submitInscription, beginInscriptionMandate, getContractUrl, Formula, InscriptionResult,
} from '../../lib/contractsApi';
import { generateCardNumber, listStaff, patchMember, findMemberByEmail, type MemberByEmail } from '../../lib/membersApi';
import type { Member } from '../../types';
import { getGroupTree, getGroupsFlat, effectiveBillingRule, GroupNode, MemberGroup } from '../../lib/groupsApi';
import { markProspectConverted } from '../../lib/prospectsApi';
import { requestBorneSignature } from '../../lib/borneBridge';
import { Alert, Button, Checkbox, Field, FieldLabel, Input, OptionGrid, PageHeader, Segmented, Select, Stepper } from '../../components/ui';

const STEPS = ['Identité', 'Formule', 'Récapitulatif', 'Signature'];

// Noms courts de l'écran, dans l'ordre d'affichage. Les libellés complets de FORMULAS partent dans le contrat.
const FORMULA_NAMES: Record<string, string> = {
  classique_prelev: 'Classique · prélèvement',
  famille_etudiant_mensuel: 'Famille / Étudiant · prélèvement',
  suivi_formation: 'Suivi + Formation',
  classique_comptant: 'Classique · comptant',
  famille_etudiant_comptant: 'Famille / Étudiant · comptant',
  seance: 'Séance',
  pack10: 'Pack 10 séances',
  mois: '1 mois',
};
const formulaRank = (key: string) => { const i = Object.keys(FORMULA_NAMES).indexOf(key); return i < 0 ? 99 : i; };
const formulaDetail = (f: Formula) => {
  const period = f.periodicity === 'Mensuel' ? ' / mois' : f.periodicity === 'Annuel' ? ' / an' : '';
  return `${eur(f.price)}${period}${f.key === 'classique_prelev' ? ' · le 10' : ''}`;
};
const formulaOptions = (group: string) => FORMULAS
  .filter((f) => f.group === group)
  .sort((a, b) => formulaRank(a.key) - formulaRank(b.key))
  .map((f) => ({ value: f.key, name: FORMULA_NAMES[f.key] ?? f.label, detail: formulaDetail(f) }));

const InscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  // Conversion d'un prospect : id à marquer "converti" après création du membre.
  const convertingProspectId = useRef<string | null>(null);

  // Identité
  const [civility, setCivility] = useState('Monsieur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('Française');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Reprise d'une fiche existante (ex. auto-inscription du membre) détectée par e-mail.
  const [existingMemberId, setExistingMemberId] = useState<string | null>(null);
  const [emailMatch, setEmailMatch] = useState<MemberByEmail | null>(null);
  const [profession, setProfession] = useState('');
  const [company, setCompany] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [genningCard, setGenningCard] = useState(false);
  // Groupe / sous-groupe (étiquette interne, invisible pour l'adhérent)
  const [groupName, setGroupName] = useState('');
  const [subgroupName, setSubgroupName] = useState('');
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  const [groupsFlat, setGroupsFlat] = useState<MemberGroup[]>([]);
  // Commercial (staff) ayant réalisé la vente
  const [commercialId, setCommercialId] = useState('');
  const [staffList, setStaffList] = useState<Member[]>([]);
  useEffect(() => { getGroupTree().then(setGroupTree).catch(() => {}); getGroupsFlat().then(setGroupsFlat).catch(() => {}); }, []);
  useEffect(() => { listStaff().then(setStaffList).catch(() => {}); }, []);
  const subOptions = groupTree.find((g) => g.name === groupName)?.subgroups ?? [];
  // Règle de facturation « payeur tiers » du groupe/sous-groupe choisi (association qui paie).
  const billingRule = useMemo(() => effectiveBillingRule(groupsFlat, groupName || null, subgroupName || null), [groupsFlat, groupName, subgroupName]);

  // Pré-remplissage depuis une conversion de prospect (déposé en sessionStorage).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('noresa_prospect_prefill');
      if (!raw) return;
      sessionStorage.removeItem('noresa_prospect_prefill');
      const p = JSON.parse(raw);
      convertingProspectId.current = p.prospectId ?? null;
      if (p.firstName) setFirstName(p.firstName);
      if (p.lastName) setLastName(p.lastName);
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.address) setAddress(p.address);
      if (p.postalCode) setPostalCode(p.postalCode);
      if (p.city) setCity(p.city);
      if (p.phone) setPhone(p.phone);
      if (p.email) setEmail(p.email);
    } catch { /* ignore */ }
  }, []);

  // Détection d'une fiche existante par e-mail (ex. membre auto-inscrit sur la borne) :
  // anti-doublon → on propose de reprendre sa fiche plutôt que d'en créer une nouvelle.
  useEffect(() => {
    const e = email.trim();
    if (!e || existingMemberId) { setEmailMatch(null); return; }
    let active = true;
    const t = setTimeout(() => {
      findMemberByEmail(e).then((m) => { if (active) setEmailMatch(m || null); });
    }, 500);
    return () => { active = false; clearTimeout(t); };
  }, [email, existingMemberId]);

  const loadExistingMember = (m: MemberByEmail) => {
    setExistingMemberId(m.id);
    if (m.firstName) setFirstName(m.firstName);
    if (m.lastName) setLastName(m.lastName);
    if (m.phone) setPhone(m.phone);
    if (m.address) setAddress(m.address);
    if (m.postalCode) setPostalCode(m.postalCode);
    if (m.city) setCity(m.city);
    setEmailMatch(null);
  };

  const handleGenerateCard = async () => {
    setGenningCard(true);
    try { setCardNumber(await generateCardNumber()); }
    catch (e) { setError((e as Error)?.message || 'Génération impossible.'); }
    finally { setGenningCard(false); }
  };

  // Photo
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [webcamOpen, setWebcamOpen] = useState(false);
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); }
  };

  // Période d'abonnement
  const today = new Date().toISOString().split('T')[0];
  const [subStart, setSubStart] = useState(today);
  const [subEnd, setSubEnd] = useState('');

  // Formule
  const [formulaKey, setFormulaKey] = useState('');
  // Montant libre (tarif personnalisé, conditionné par la date de fin)
  const [freeAmount, setFreeAmount] = useState('');
  const [freeLabel, setFreeLabel] = useState('');
  const [formulaPaymentMethod, setFormulaPaymentMethod] = useState('');
  const [badgePaymentMethod, setBadgePaymentMethod] = useState('CB');
  // Badge désormais OPTIONNEL (plus obligatoire) : ajouté seulement si coché.
  const [wantBadge, setWantBadge] = useState(false);
  const [services, setServices] = useState<Record<string, boolean>>({});
  // Mandat SEPA amorcé dès l'étape Formule (fiche + mandat créés, RIB ouvert dans un onglet).
  const [mandateMemberId, setMandateMemberId] = useState<string | null>(null);
  const [mandateUrl, setMandateUrl] = useState('');
  const [mandateBusy, setMandateBusy] = useState(false);
  const [mandateMsg, setMandateMsg] = useState('');
  // Contexte au moment de l'amorce : si la formule ou le mode de règlement change ensuite,
  // le mandat n'est plus cohérent -> on l'annule (voir l'effet plus bas).
  const mandateCtx = useRef<{ key: string; payment: string } | null>(null);

  // Déclarations
  const [consentCga, setConsentCga] = useState(false);
  const [consentMedical, setConsentMedical] = useState(false);

  // Process
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InscriptionResult | null>(null);

  const formula = useMemo<Formula | null>(() => {
    // Groupe « payeur tiers » : formule imposée par la règle (non modifiable).
    if (billingRule) {
      return { key: 'assoc', label: billingRule.formulaLabel || `Accès ${groupName}`, price: billingRule.unitPrice ?? 0, recurring: false, engagement: false, periodicity: 'Mensuel (association)', group: 'Association' };
    }
    if (formulaKey === 'libre') {
      return { key: 'libre', label: freeLabel.trim() || 'Accès — montant libre', price: Number(freeAmount) || 0, recurring: false, engagement: false, periodicity: 'Ponctuel', group: 'Sans engagement' };
    }
    return FORMULAS.find((f) => f.key === formulaKey) || null;
  }, [billingRule, groupName, formulaKey, freeAmount, freeLabel]);
  const chosenServices = SERVICES.filter((s) => services[s.key]);
  // Le badge est proposé pour un abonnement (formule "Engagement") mais reste OPTIONNEL.
  const badgeEligible = formula?.group === 'Engagement';
  const includeBadge = badgeEligible && wantBadge;
  const total = (formula ? formula.price : 0) + (includeBadge ? BADGE.price : 0) + chosenServices.reduce((a, s) => a + s.price, 0);

  // Mode de règlement + période par défaut selon la formule
  useEffect(() => {
    if (!formula) return;
    setFormulaPaymentMethod(formula.recurring ? 'Prélèvement' : 'Espèces');
    if (formula.key === 'mois') {
      const d = new Date(subStart || today); d.setMonth(d.getMonth() + 1);
      setSubEnd(d.toISOString().split('T')[0]);
    } else if (formula.recurring) {
      setSubEnd('');
    }
  }, [formulaKey]); // eslint-disable-line

  // Groupe « payeur tiers » : mode de règlement imposé = facturé à l'association (pas de mandat).
  useEffect(() => {
    if (billingRule) setFormulaPaymentMethod("Facturé à l'association");
  }, [billingRule]); // eslint-disable-line

  // --- Signature (canvas tactile) -------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [sigEmpty, setSigEmpty] = useState(true);
  // Signature déportée sur la borne (temps réel)
  const [remoteSig, setRemoteSig] = useState<string | null>(null);
  const [borneStatus, setBorneStatus] = useState<string | null>(null);
  const [borneWaiting, setBorneWaiting] = useState(false);
  const [borneAcq, setBorneAcq] = useState<string | null>(null);
  const [borneCode, setBorneCode] = useState<string | null>(null);
  const borneCancel = useRef<null | (() => void)>(null);

  // Peint une signature (data URL) reçue de la borne dans le canvas, pour aperçu.
  const drawRemoteSignature = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
    img.src = dataUrl;
  };

  const signOnBorne = () => {
    const signerName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!signerName) { setBorneStatus("Renseignez le nom du client (étape Identité) avant d'envoyer à la borne."); return; }
    setBorneStatus('Envoi à la borne… le client peut patienter devant l’écran.');
    setBorneWaiting(true);
    const { cancel } = requestBorneSignature(signerName, {
      onReady: () => setBorneStatus('Borne prête ✓ — le client signe à l’écran.'),
      onResult: (r) => {
        setRemoteSig(r.signature);
        setBorneAcq(r.acquisition ?? null);
        setBorneCode(r.referralCode ?? null);
        setSigEmpty(false);
        setBorneWaiting(false);
        // Le client a coché les 2 cases obligatoires sur la borne : on l'enregistre côté contrat.
        setConsentCga(true);
        setConsentMedical(true);
        setBorneStatus('Signature reçue ✓');
        drawRemoteSignature(r.signature);
      },
      onError: (m) => { setBorneStatus(m); setBorneWaiting(false); },
    });
    borneCancel.current = cancel;
  };

  const cancelBorne = () => { borneCancel.current?.(); borneCancel.current = null; setBorneWaiting(false); setBorneStatus('Demande annulée.'); };

  useEffect(() => {
    if (step !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Dimensionne le pavé quand sa taille réelle est connue, et le redimensionne si
    // elle change (évite un canvas de largeur 0 figée au montage → tracé non inscrit).
    const setup = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const w = Math.round(rect.width * ratio);
      const h = Math.round(rect.height * ratio);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#15226e';
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [step]);

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pointer(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pointer(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (sigEmpty) setSigEmpty(false);
  };
  const onUp = () => { drawing.current = false; };
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setSigEmpty(true);
  };

  // --- Navigation entre étapes ----------------------------------------------
  const canNext = () => {
    if (step === 0) return !!firstName.trim() && !!lastName.trim() && !!photo;
    if (step === 1) return !!formula && !!formulaPaymentMethod && (!includeBadge || !!badgePaymentMethod) && (!!billingRule || formulaKey !== 'libre' || (Number(freeAmount) > 0 && !!subEnd));
    // Les consentements ne bloquent plus le passage à l'étape signature : c'est le
    // client qui les valide (sur la borne, ou sur le PC en secours). Ils sont exigés
    // à la validation finale (submit).
    return true;
  };
  const next = () => { setError(''); if (canNext()) setStep((s) => Math.min(s + 1, 3)); };
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const toggleService = (key: string) => setServices((s) => ({ ...s, [key]: !s[key] }));

  // Annule le mandat amorcé (archive la fiche orpheline créée par GoCardless).
  const cancelEarlyMandate = async (silent = false) => {
    const id = mandateMemberId;
    setMandateMemberId(null); setMandateUrl(''); mandateCtx.current = null;
    if (!silent) setMandateMsg('');
    if (id) { try { await patchMember(id, { archived_at: new Date().toISOString() }); } catch { /* noop */ } }
  };

  // Amorce le mandat dès l'étape Formule : crée la fiche + le mandat, ouvre le RIB dans un onglet.
  const startMandateEarly = async () => {
    if (!formula) { setMandateMsg('Choisissez d’abord une formule.'); return; }
    if (!email.trim()) { setMandateMsg("Renseignez l'email à l'étape Identité pour le mandat."); return; }
    setMandateBusy(true); setMandateMsg('');
    try {
      const r = await beginInscriptionMandate({
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone || undefined,
        address: address || undefined, postalCode: postalCode || undefined, city: city || undefined,
        formula, formulaPaymentMethod, badgePaymentMethod,
        subscriptionStart: subStart || undefined, subscriptionEnd: subEnd || undefined,
        groupName: groupName || undefined, subgroupName: subgroupName || undefined,
        commercialId: commercialId || undefined,
        existingMemberId: existingMemberId || undefined,
        services: [], consentCga: false, consentMedical: false, signatureDataUrl: '', signerName: '', totalDue: 0,
      });
      setMandateMemberId(r.memberId); setMandateUrl(r.authorisationUrl);
      mandateCtx.current = { key: formulaKey, payment: formulaPaymentMethod };
      window.open(r.authorisationUrl, '_blank', 'noopener');
    } catch (e: any) { setMandateMsg(e?.message || 'Impossible de démarrer le mandat.'); }
    finally { setMandateBusy(false); }
  };

  // Formule ou mode de règlement modifié après l'amorce -> le mandat n'est plus cohérent : annulation.
  useEffect(() => {
    if (mandateMemberId && mandateCtx.current &&
        (mandateCtx.current.key !== formulaKey || mandateCtx.current.payment !== formulaPaymentMethod)) {
      cancelEarlyMandate(true);
      setMandateMsg('Formule ou règlement modifié : le mandat lancé a été annulé. Relancez-le si besoin.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulaKey, formulaPaymentMethod, mandateMemberId]);

  // --- Validation finale ------------------------------------------------------
  const submit = async () => {
    if (!formula) { setError('Choisissez une formule.'); setStep(1); return; }
    if (!photo) { setError("La photo de l'adhérent est obligatoire (identification / sécurité)."); setStep(0); return; }
    if (!consentCga || !consentMedical) { setError("Les déclarations (conditions générales + aptitude médicale) doivent être validées — par le client sur la borne, ou cochées ici en secours."); setStep(2); return; }
    if (sigEmpty) { setError("La signature est obligatoire."); return; }
    if (formulaPaymentMethod === 'Prélèvement' && !email.trim()) { setError("Un email est requis pour un règlement par prélèvement."); setStep(0); return; }
    setError('');
    setSubmitting(true);
    try {
      const signatureDataUrl = remoteSig || canvasRef.current!.toDataURL('image/png');
      const res = await submitInscription({
        civility, firstName: firstName.trim(), lastName: lastName.trim(),
        birthDate: birthDate || undefined, nationality: nationality || undefined,
        address: address || undefined, postalCode: postalCode || undefined, city: city || undefined,
        phone: phone || undefined, email: email.trim() || undefined,
        profession: profession || undefined, company: company || undefined,
        photo,
        cardNumber: includeBadge ? (cardNumber.trim() || undefined) : undefined,
        groupName: groupName || undefined,
        subgroupName: subgroupName || undefined,
        commercialId: commercialId || undefined,
        existingMandateMemberId: mandateMemberId || undefined,
        existingMemberId: existingMemberId || undefined,
        subscriptionStart: subStart || undefined,
        subscriptionEnd: subEnd || undefined,
        formula, formulaPaymentMethod, badgePaymentMethod, includeBadge,
        paidBy: billingRule?.payerName || undefined,
        services: chosenServices.map((s) => ({ label: s.label, price: s.price })),
        consentCga, consentMedical,
        signatureDataUrl, signerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        totalDue: total,
        acquisitionSource: borneAcq || undefined,
        referralCode: borneCode || undefined,
      });
      setResult(res);
      // Si on convertit un prospect : on le marque converti vers le nouveau membre.
      if (convertingProspectId.current && res.memberId) {
        try { await markProspectConverted(convertingProspectId.current, res.memberId); }
        catch (e) { console.error('markProspectConverted', e); }
        convertingProspectId.current = null;
      }
    } catch (e) {
      setError((e as Error)?.message || "L'inscription a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0); setCivility('Monsieur'); setFirstName(''); setLastName(''); setBirthDate('');
    setNationality('Française'); setAddress(''); setPostalCode(''); setCity(''); setPhone(''); setEmail('');
    setExistingMemberId(null); setEmailMatch(null);
    setProfession(''); setCompany(''); setFormulaKey(''); setFreeAmount(''); setFreeLabel(''); setFormulaPaymentMethod(''); setBadgePaymentMethod('CB');
    setServices({}); setConsentCga(false); setConsentMedical(false); setError(''); setResult(null); setSigEmpty(true);
    setPhoto(null); setPhotoPreview(''); setSubStart(today); setSubEnd(''); setCardNumber('');
    setGroupName(''); setSubgroupName(''); setCommercialId('');
    setMandateMemberId(null); setMandateUrl(''); setMandateMsg(''); mandateCtx.current = null;
  };

  const openContract = async () => {
    const path = (result?.generate as any)?.pdf_path;
    const url = await getContractUrl(path);
    if (url) window.open(url, '_blank');
  };

  // ===== Écran de succès =====
  if (result) {
    const g: any = result.generate || {};
    return (
      <div className="max-w-[760px] mx-auto space-y-4">
        <PageHeader
          title="Inscription enregistrée"
          subtitle={<>Contrat n° <span className="font-semibold text-ink tabular-nums">{result.contractNumber}</span> généré et signé. {g.emailed ? 'Contrat envoyé par e-mail à l’adhérent.' : (g.email_reason || 'E-mail non envoyé.')}</>}
        />

        {result.keypadCode && (
          <div className="p-5 bg-ink text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-line">Code d'accès clavier à communiquer</p>
              <p className="text-4xl font-extrabold tracking-[0.25em] tabular-nums mt-0.5">{result.keypadCode}</p>
            </div>
            <button type="button" onClick={() => { try { navigator.clipboard.writeText(result.keypadCode!); } catch { /* noop */ } }}
              className="shrink-0 h-11 px-4 border border-line font-extrabold hover:bg-ink-2 transition-colors">Copier le code</button>
          </div>
        )}

        {result.authorisationUrl && (
          <div className="p-5 bg-surface border-2 border-primary">
            <p className="font-extrabold text-ink">Dernière étape : le prélèvement SEPA</p>
            <p className="text-muted mt-0.5 mb-4">L'adhérent saisit son IBAN et valide son mandat sur la page sécurisée GoCardless.</p>
            <Button size="lg" icon={CreditCard} onClick={() => { window.location.href = result.authorisationUrl!; }}>Mettre en place le prélèvement</Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink pt-3.5">
          <Button size="lg" variant={result.authorisationUrl ? 'secondary' : 'primary'} icon={FileText} onClick={openContract}>Voir le contrat signé (PDF)</Button>
          <Button size="lg" variant="secondary" onClick={() => navigate(`/app/crm?member=${result.memberId}`)}>Voir la fiche du client</Button>
          <Button size="lg" variant="ghost" onClick={reset} className="ml-auto">Nouvelle inscription</Button>
        </div>
      </div>
    );
  }

  // ===== Parcours =====
  return (
    <div className="max-w-[760px] mx-auto space-y-4">
      <PageHeader title="Nouvelle inscription" subtitle="Contrat d'adhésion A.R.A.P.S" ruled={false} />
      <Stepper steps={STEPS} current={step} />

      <div className="bg-surface border border-line px-6 py-5">
        {/* ÉTAPE 0 : identité */}
        {step === 0 && (
          <div className="space-y-4">
            {/* Reprise d'une fiche existante (anti-doublon) */}
            {existingMemberId ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-success-soft text-success-text">
                <CheckCircle2 size={18} className="shrink-0" />
                <p className="min-w-0"><span className="font-extrabold">Fiche existante reprise.</span> L'inscription complétera cette fiche, sans créer de doublon.</p>
                <button type="button" onClick={() => setExistingMemberId(null)} className="ml-auto shrink-0 font-extrabold hover:underline">Créer une nouvelle fiche</button>
              </div>
            ) : emailMatch && (
              <Alert tone="warning" title="Un compte existe déjà pour cet e-mail." action={{ label: 'Reprendre cette fiche', onClick: () => loadExistingMember(emailMatch) }}>
                <span className="font-semibold">{`${emailMatch.firstName} ${emailMatch.lastName}`.trim() || '—'}</span>
                {emailMatch.memberNumber ? ` · n° ${emailMatch.memberNumber}` : ''}
                {emailMatch.status === 'prospect' ? ' · prospect' : ''}
                {emailMatch.hasAccount ? ' · compte app' : ''}. Reprends sa fiche pour éviter un doublon : ses informations seront préremplies.
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-5">
              <div className="w-24 h-24 bg-ground border border-line overflow-hidden flex items-center justify-center shrink-0">
                {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <Camera className="text-muted" size={32} />}
              </div>
              <div className="min-w-0">
                <FieldLabel required>Photo de l'adhérent</FieldLabel>
                <p className="text-sm text-muted mb-2">Sert uniquement à l'identification (photo de profil), jamais diffusée.</p>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="lg" variant="secondary" icon={Camera} onClick={() => setWebcamOpen(true)}>Webcam</Button>
                  <Button size="lg" variant="secondary" icon={Upload} onClick={() => photoInputRef.current?.click()}>Importer</Button>
                  {photoPreview && <Button variant="ghost" onClick={() => { setPhoto(null); setPhotoPreview(''); }}>Retirer</Button>}
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>Civilité</FieldLabel>
              <Segmented size="lg" value={civility} onChange={setCivility} options={[{ value: 'Madame', label: 'Madame' }, { value: 'Monsieur', label: 'Monsieur' }]} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Prénom" required><Input fieldSize="lg" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="Nom" required><Input fieldSize="lg" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
            </div>
            <Field label="Adresse"><Input fieldSize="lg" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Code postal"><Input fieldSize="lg" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></Field>
              <Field label="Ville"><Input fieldSize="lg" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Date de naissance"><Input fieldSize="lg" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Field>
              <Field label="Nationalité"><Input fieldSize="lg" value={nationality} onChange={(e) => setNationality(e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Téléphone"><Input fieldSize="lg" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="E-mail" required={formulaPaymentMethod === 'Prélèvement'}><Input fieldSize="lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Profession"><Input fieldSize="lg" value={profession} onChange={(e) => setProfession(e.target.value)} /></Field>
              <Field label="Entreprise"><Input fieldSize="lg" value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Groupe">
                <Select fieldSize="lg" value={groupName} onChange={(e) => { setGroupName(e.target.value); setSubgroupName(''); }}>
                  <option value="">Aucun</option>
                  {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                </Select>
              </Field>
              <Field label="Sous-groupe">
                <Select fieldSize="lg" value={subgroupName} onChange={(e) => setSubgroupName(e.target.value)} disabled={!groupName || subOptions.length === 0}>
                  <option value="">{!groupName ? 'Choisir un groupe' : subOptions.length === 0 ? 'Aucun sous-groupe' : 'Aucun'}</option>
                  {subOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Commercial" hint={staffList.length === 0 ? 'Ajoutez vos commerciaux dans « Équipe & Staff ».' : undefined}>
                <Select fieldSize="lg" value={commercialId} onChange={(e) => setCommercialId(e.target.value)}>
                  <option value="">Aucun</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* ÉTAPE 1 : formule */}
        {step === 1 && (
          <div className="space-y-4">
            {billingRule ? (
              <div className="p-4 bg-primary-soft border-2 border-primary space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-primary-dark">
                  <Building2 size={18} /> Formule imposée par le groupe
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{formula?.label}</span>
                  <span className="font-extrabold text-primary-dark tabular-nums">{eur(formula?.price ?? 0)} / mois</span>
                </div>
                <p className="text-ink">
                  Réglé par <span className="font-semibold">{billingRule.payerName}</span>, facturé mensuellement à l'association (virement).
                </p>
                <p className="text-sm text-muted">
                  L'inscription est verrouillée : la formule et le mode de règlement sont définis par les règles du groupe ou du sous-groupe.
                </p>
              </div>
            ) : (
              <>
                <OptionGrid title="Avec abonnement · engagement" help="Prélèvements reconduits tacitement" options={formulaOptions('Engagement')} selected={formulaKey} onSelect={setFormulaKey} />
                <OptionGrid
                  title="Sans abonnement · à la carte" help="Date de fin obligatoire pour le montant libre" columns={4}
                  options={[...formulaOptions('Sans engagement'), { value: 'libre', name: 'Montant libre', detail: Number(freeAmount) > 0 ? eur(Number(freeAmount)) : 'Libellé + montant' }]}
                  selected={formulaKey} onSelect={setFormulaKey}
                />
                {formulaKey === 'libre' && (
                  <div className="grid sm:grid-cols-[1fr_160px] gap-3">
                    <Field label="Libellé" optional><Input fieldSize="lg" value={freeLabel} onChange={(e) => setFreeLabel(e.target.value)} placeholder="Accès, montant libre" /></Field>
                    <Field label="Montant (€)" required><Input fieldSize="lg" type="number" step="0.01" min="0" value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)} placeholder="0,00" /></Field>
                  </div>
                )}
              </>
            )}

            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
              <Field label="Début"><Input fieldSize="lg" type="date" value={subStart} onChange={(e) => setSubStart(e.target.value)} /></Field>
              <Field label="Fin" required={formulaKey === 'libre'} optional={!formula || formula.recurring}><Input fieldSize="lg" type="date" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} /></Field>
              {!billingRule && (
                <div>
                  <FieldLabel>Règlement</FieldLabel>
                  <Segmented size="lg" value={formulaPaymentMethod} onChange={setFormulaPaymentMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
                </div>
              )}
            </div>
            {formulaKey === 'libre' && <p className="text-sm text-primary">L'accès sera automatiquement bloqué le jour de la date de fin.</p>}

            {/* Prélèvement SEPA : possibilité de faire signer le mandat (RIB) dès maintenant. */}
            {!billingRule && formulaPaymentMethod === 'Prélèvement' && (
              <div className="p-4 bg-ground-2 border border-line">
                <div className="flex items-center gap-2 font-extrabold text-ink"><CreditCard size={18} /> Mandat de prélèvement (RIB)</div>
                {!mandateMemberId ? (
                  <>
                    <p className="text-muted mt-1 mb-3">Vous pouvez faire signer le mandat dès maintenant : il s'ouvre dans un nouvel onglet, l'inscription reste ici. Sinon, il sera proposé à la fin.</p>
                    <Button variant="secondary" onClick={startMandateEarly} disabled={mandateBusy || !email.trim()}>
                      {mandateBusy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Faire signer le mandat
                    </Button>
                    {!email.trim() && <p className="text-sm text-muted mt-1.5">Renseignez l'e-mail à l'étape Identité pour activer le mandat.</p>}
                  </>
                ) : (
                  <div className="mt-1 space-y-2">
                    <p className="font-semibold text-success-text flex items-center gap-1.5"><Check size={16} className="shrink-0" /> Mandat lancé : le RIB se remplit dans l'autre onglet. Continuez l'inscription, il est déjà rattaché.</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="ghost" onClick={() => window.open(mandateUrl, '_blank', 'noopener')}>Rouvrir le lien RIB</Button>
                      <Button variant="ghost" onClick={() => cancelEarlyMandate(false)}>Annuler le mandat</Button>
                    </div>
                  </div>
                )}
                {mandateMsg && <p className="text-sm font-semibold text-danger-text mt-2">{mandateMsg}</p>}
              </div>
            )}

            <div>
              <FieldLabel optional>Options</FieldLabel>
              <div className="grid sm:grid-cols-3 gap-2">
                {badgeEligible && <OptionCheck label="Badge d'accès" price={BADGE.price} checked={wantBadge} onChange={setWantBadge} />}
                {SERVICES.map((s) => <OptionCheck key={s.key} label={s.label} price={s.price} checked={!!services[s.key]} onChange={() => toggleService(s.key)} />)}
              </div>
            </div>

            {includeBadge && (
              <div className="p-4 bg-ground-2 border border-line space-y-3">
                <Field label="Numéro de badge" hint="Saisis le numéro imprimé sur le badge.">
                  <div className="flex gap-2">
                    <Input fieldSize="lg" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="ex. 3616701" />
                    <Button size="lg" variant="secondary" onClick={handleGenerateCard} disabled={genningCard}>{genningCard ? 'Génération…' : 'Générer'}</Button>
                  </div>
                </Field>
                <div>
                  <FieldLabel>Règlement du badge</FieldLabel>
                  <Segmented size="lg" value={badgePaymentMethod} onChange={setBadgePaymentMethod} options={['Espèces', 'CB', 'Chèque', 'Prélèvement'].map((m) => ({ value: m, label: m }))} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2 : récapitulatif */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">Récapitulatif</h2>
            <div className="border border-line">
              <Row k="Adhérent" v={`${civility} ${firstName} ${lastName}`} />
              {(address || city) && <Row k="Adresse" v={[address, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')} />}
              {email && <Row k="E-mail" v={email} />}
              {phone && <Row k="Téléphone" v={phone} />}
              <Row k="Formule" v={`${formula?.label || '—'} (${eur(formula?.price || 0)}${formula?.recurring ? ' / mois' : ''})`} />
              <Row k="Règlement formule" v={formulaPaymentMethod} />
              {includeBadge && <Row k="Badge" v={`${eur(BADGE.price)}, réglé par ${badgePaymentMethod}`} />}
              {chosenServices.map((s) => <Row key={s.key} k={s.label} v={eur(s.price)} />)}
              <div className="flex justify-between gap-4 px-4 py-3 border-t-2 border-ink font-extrabold text-lg text-ink">
                <span>Total à l'inscription</span><span className="tabular-nums">{eur(total)}</span>
              </div>
            </div>

            <Alert tone="warning">
              Les déclarations ci-dessous sont validées par le client lui-même sur la borne lors de la signature.
              Ne les cochez ici que si le client signe directement sur ce PC (secours).
            </Alert>
            <div>
              <Checkbox checked={consentCga} onChange={(e) => setConsentCga(e.target.checked)} label={<>Je déclare avoir pris connaissance des <span className="font-semibold">Conditions générales d'adhésion</span> et du Règlement intérieur.</>} />
              <Checkbox checked={consentMedical} onChange={(e) => setConsentMedical(e.target.checked)} label={<>Je déclare avoir fait contrôler par un médecin mon <span className="font-semibold">aptitude à pratiquer une activité sportive</span>.</>} />
            </div>
            <Alert tone="info" title="Droit à l'image :">
              la photo est prise pour l'identification de l'adhérent (sécurité) et utilisée uniquement comme photo de profil. Elle n'est jamais rendue publique, ni diffusée, ni communiquée à des tiers.
            </Alert>
          </div>
        )}

        {/* ÉTAPE 3 : signature */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-ink">Signature de l'adhérent</h2>

            {/* Faire signer sur la borne (pont temps réel) */}
            <div className="p-4 bg-ground-2 border border-line">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">Faire signer sur la borne</p>
                  <p className="text-muted mt-0.5">Le client signe directement sur l'écran tactile de la salle.</p>
                </div>
                {!borneWaiting ? (
                  <Button size="lg" variant="secondary" icon={Send} onClick={signOnBorne} disabled={submitting} className="shrink-0">Envoyer à la borne</Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={cancelBorne} className="shrink-0"><Loader2 size={16} className="animate-spin" /> Annuler</Button>
                )}
              </div>
              {borneStatus && <p className="font-semibold mt-3 text-ink-2">{borneStatus}</p>}
              {remoteSig && (
                <div className="mt-3 flex items-center gap-2 font-semibold text-success-text">
                  <CheckCircle2 size={18} /> Signature reçue de la borne
                  {borneAcq && <span className="text-muted font-normal">· {borneAcq}</span>}
                </div>
              )}
            </div>

            <p className="text-muted">Ou signez ci-dessous avec le doigt.</p>
            <div className="relative border-2 border-dashed border-subtle bg-surface overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: '220px', touchAction: 'none' }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
              />
              {sigEmpty && <span className="absolute inset-0 flex items-center justify-center text-subtle font-semibold pointer-events-none">Signez ici</span>}
            </div>
            <Button variant="ghost" icon={Eraser} onClick={() => { clearSig(); setRemoteSig(null); }}>Effacer</Button>
          </div>
        )}

        {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-5 border-t-2 border-ink pt-3.5">
        <button type="button" onClick={back} disabled={step === 0 || submitting} className={`h-11 inline-flex items-center gap-2 font-extrabold ${step === 0 || submitting ? 'text-subtle cursor-not-allowed' : 'text-ink hover:text-primary transition-colors'}`}>
          <ArrowLeft size={16} /> Retour
        </button>
        {formula && <span className="ml-auto text-muted">Total : <span className="font-extrabold text-ink tabular-nums">{eur(total)}{formula.recurring && total === formula.price ? ' / mois' : ''}</span></span>}
        <div className={formula ? '' : 'ml-auto'}>
          {step < 3 ? (
            <Button size="lg" iconRight={ArrowRight} onClick={next} disabled={!canNext()}>Continuer</Button>
          ) : (
            <Button size="lg" onClick={submit} disabled={submitting || sigEmpty}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Création…</> : <><Check size={16} /> Valider l'inscription</>}
            </Button>
          )}
        </div>
      </div>

      {webcamOpen && <WebcamCapture onCapture={(f) => { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); }} onClose={() => setWebcamOpen(false)} />}
    </div>
  );
};

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex justify-between gap-4 px-4 py-2.5 border-b border-line-soft last:border-b-0">
    <span className="text-muted">{k}</span>
    <span className="font-semibold text-ink text-right">{v}</span>
  </div>
);

const OptionCheck: React.FC<{ label: string; price: number; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, price, checked, onChange }) => (
  <label className={`flex items-center gap-2 px-2.5 py-2 border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary-soft' : 'border-subtle hover:bg-ground-2'}`}>
    <input type="checkbox" className="h-4 w-4 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="flex-1 min-w-0">{label}</span>
    <span className="font-extrabold tabular-nums">{eur(price)}</span>
  </label>
);

export default InscriptionPage;
