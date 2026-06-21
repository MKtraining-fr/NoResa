import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, ArrowLeft, ArrowRight, Check, Eraser, FileText,
  CreditCard, Loader2, BadgeCheck, PartyPopper, Camera,
} from 'lucide-react';
import {
  FORMULAS, BADGE, SERVICES, PAYMENT_METHODS,
  submitInscription, getContractUrl, Formula, InscriptionResult,
} from '../../lib/contractsApi';
import { generateCardNumber } from '../../lib/membersApi';
import { getGroupTree, GroupNode } from '../../lib/groupsApi';

const STEPS = ['Identité', 'Formule', 'Récapitulatif', 'Signature'];
const RED = '#C81E1E';

const InscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

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
  const [profession, setProfession] = useState('');
  const [company, setCompany] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [genningCard, setGenningCard] = useState(false);
  // Groupe / sous-groupe (étiquette interne, invisible pour l'adhérent)
  const [groupName, setGroupName] = useState('');
  const [subgroupName, setSubgroupName] = useState('');
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  useEffect(() => { getGroupTree().then(setGroupTree).catch(() => {}); }, []);
  const subOptions = groupTree.find((g) => g.name === groupName)?.subgroups ?? [];

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
  const [formulaPaymentMethod, setFormulaPaymentMethod] = useState('');
  const [badgePaymentMethod, setBadgePaymentMethod] = useState('CB');
  const [services, setServices] = useState<Record<string, boolean>>({});

  // Déclarations
  const [consentCga, setConsentCga] = useState(false);
  const [consentMedical, setConsentMedical] = useState(false);

  // Process
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InscriptionResult | null>(null);

  const formula = useMemo<Formula | null>(() => FORMULAS.find((f) => f.key === formulaKey) || null, [formulaKey]);
  const chosenServices = SERVICES.filter((s) => services[s.key]);
  // Le badge n'est requis que pour un abonnement (formule "Engagement"). Pas d'abonnement = pas de badge.
  const needsBadge = formula?.group === 'Engagement';
  const total = (formula ? formula.price : 0) + (needsBadge ? BADGE.price : 0) + chosenServices.reduce((a, s) => a + s.price, 0);
  const eur = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')} €`;

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

  // --- Signature (canvas tactile) -------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [sigEmpty, setSigEmpty] = useState(true);

  useEffect(() => {
    if (step !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15226e';
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
    if (step === 0) return firstName.trim() && lastName.trim();
    if (step === 1) return !!formula && !!formulaPaymentMethod && (!needsBadge || !!badgePaymentMethod);
    if (step === 2) return consentCga && consentMedical;
    return true;
  };
  const next = () => { setError(''); if (canNext()) setStep((s) => Math.min(s + 1, 3)); };
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const toggleService = (key: string) => setServices((s) => ({ ...s, [key]: !s[key] }));

  // --- Validation finale ------------------------------------------------------
  const submit = async () => {
    if (!formula) { setError('Choisissez une formule.'); setStep(1); return; }
    if (sigEmpty) { setError("La signature est obligatoire."); return; }
    if (formulaPaymentMethod === 'Prélèvement' && !email.trim()) { setError("Un email est requis pour un règlement par prélèvement."); setStep(0); return; }
    setError('');
    setSubmitting(true);
    try {
      const signatureDataUrl = canvasRef.current!.toDataURL('image/png');
      const res = await submitInscription({
        civility, firstName: firstName.trim(), lastName: lastName.trim(),
        birthDate: birthDate || undefined, nationality: nationality || undefined,
        address: address || undefined, postalCode: postalCode || undefined, city: city || undefined,
        phone: phone || undefined, email: email.trim() || undefined,
        profession: profession || undefined, company: company || undefined,
        photo,
        cardNumber: needsBadge ? (cardNumber.trim() || undefined) : undefined,
        groupName: groupName || undefined,
        subgroupName: subgroupName || undefined,
        subscriptionStart: subStart || undefined,
        subscriptionEnd: subEnd || undefined,
        formula, formulaPaymentMethod, badgePaymentMethod,
        services: chosenServices.map((s) => ({ label: s.label, price: s.price })),
        consentCga, consentMedical,
        signatureDataUrl, signerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        totalDue: total,
      });
      setResult(res);
    } catch (e) {
      setError((e as Error)?.message || "L'inscription a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0); setCivility('Monsieur'); setFirstName(''); setLastName(''); setBirthDate('');
    setNationality('Française'); setAddress(''); setPostalCode(''); setCity(''); setPhone(''); setEmail('');
    setProfession(''); setCompany(''); setFormulaKey(''); setFormulaPaymentMethod(''); setBadgePaymentMethod('CB');
    setServices({}); setConsentCga(false); setConsentMedical(false); setError(''); setResult(null); setSigEmpty(true);
    setPhoto(null); setPhotoPreview(''); setSubStart(today); setSubEnd(''); setCardNumber('');
    setGroupName(''); setSubgroupName('');
  };

  const openContract = async () => {
    const path = (result?.generate as any)?.pdf_path;
    const url = await getContractUrl(path);
    if (url) window.open(url, '_blank');
  };

  // --- Styles utilitaires -----------------------------------------------------
  const field = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-base';
  const label = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5';

  // ===== Écran de succès =====
  if (result) {
    const g: any = result.generate || {};
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="text-green-600" size={40} />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">Inscription enregistrée !</h1>
        <p className="text-gray-500 mt-2">Contrat n° <b>{result.contractNumber}</b> généré et signé.</p>
        <p className="text-sm mt-1 text-gray-500">
          {g.emailed ? '✉️ Contrat envoyé par email à l\u2019adhérent.' : (g.email_reason || 'Email non envoyé.')}
        </p>

        <div className="mt-8 flex flex-col gap-3 items-center">
          <button onClick={openContract} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800">
            <FileText size={18} /> Voir le contrat signé (PDF)
          </button>

          {result.authorisationUrl && (
            <div className="w-full mt-2 p-5 rounded-2xl border-2 border-dashed" style={{ borderColor: RED }}>
              <p className="font-bold text-gray-900 mb-1">Dernière étape : le prélèvement SEPA</p>
              <p className="text-sm text-gray-500 mb-4">L'adhérent saisit son IBAN et valide son mandat sur la page sécurisée GoCardless.</p>
              <button onClick={() => { window.location.href = result.authorisationUrl!; }} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold w-full" style={{ backgroundColor: RED }}>
                <CreditCard size={18} /> Mettre en place le prélèvement
              </button>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={reset} className="px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50">Nouvelle inscription</button>
            <button onClick={() => navigate('/app/crm/membres')} className="px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50">Voir les membres</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Wizard =====
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: RED }}>
          <UserPlus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nouvelle inscription</h1>
          <p className="text-sm text-gray-500">Contrat d'adhésion A.R.A.P.S</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${i < step ? 'text-white' : i === step ? 'text-white' : 'bg-gray-100 text-gray-400'}`} style={{ backgroundColor: i <= step ? RED : undefined }}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-[11px] mt-1 font-semibold ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? '' : 'bg-gray-100'}`} style={{ backgroundColor: i < step ? RED : undefined }} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        {/* ÉTAPE 0 — Identité */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <Camera className="text-gray-300" size={32} />}
              </div>
              <div>
                <span className={label}>Photo de l'adhérent</span>
                <input ref={photoInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
                <button onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50">
                  <Camera size={18} /> {photoPreview ? 'Changer la photo' : 'Prendre / choisir une photo'}
                </button>
                {photoPreview && <button onClick={() => { setPhoto(null); setPhotoPreview(''); }} className="ml-2 text-sm text-gray-400 hover:text-red-600">Retirer</button>}
              </div>
            </div>
            <div>
              <span className={label}>Civilité</span>
              <div className="flex gap-3">
                {['Madame', 'Monsieur'].map((c) => (
                  <button key={c} onClick={() => setCivility(c)} className={`px-5 py-3 rounded-xl border font-semibold ${civility === c ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`} style={{ backgroundColor: civility === c ? RED : undefined }}>{c}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><span className={label}>Prénom *</span><input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div><span className={label}>Nom *</span><input className={field} value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            </div>
            <div><span className={label}>Adresse</span><input className={field} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><span className={label}>Code postal</span><input className={field} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></div>
              <div><span className={label}>Ville</span><input className={field} value={city} onChange={(e) => setCity(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><span className={label}>Date de naissance</span><input type="date" className={field} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
              <div><span className={label}>Nationalité</span><input className={field} value={nationality} onChange={(e) => setNationality(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><span className={label}>Téléphone</span><input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><span className={label}>Email {formulaPaymentMethod === 'Prélèvement' ? '*' : ''}</span><input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><span className={label}>Profession</span><input className={field} value={profession} onChange={(e) => setProfession(e.target.value)} /></div>
              <div><span className={label}>Entreprise</span><input className={field} value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className={label}>Groupe</span>
                <select className={field} value={groupName} onChange={(e) => { setGroupName(e.target.value); setSubgroupName(''); }}>
                  <option value="">— Aucun —</option>
                  {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <span className={label}>Sous-groupe</span>
                <select className={field} value={subgroupName} onChange={(e) => setSubgroupName(e.target.value)} disabled={!groupName || subOptions.length === 0}>
                  <option value="">{!groupName ? '— Choisir un groupe —' : subOptions.length === 0 ? '— Aucun sous-groupe —' : '— Aucun —'}</option>
                  {subOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 1 — Formule */}
        {step === 1 && (
          <div className="space-y-6">
            {(['Engagement', 'Sans engagement'] as const).map((grp) => (
              <div key={grp}>
                <span className={label}>{grp}</span>
                <div className="grid sm:grid-cols-2 gap-3">
                  {FORMULAS.filter((f) => f.group === grp).map((f) => (
                    <button key={f.key} onClick={() => setFormulaKey(f.key)} className={`text-left p-4 rounded-2xl border-2 transition ${formulaKey === f.key ? 'border-transparent ring-2' : 'border-gray-200 hover:border-gray-300'}`} style={{ backgroundColor: formulaKey === f.key ? '#fdeaea' : undefined, borderColor: formulaKey === f.key ? RED : undefined }}>
                      <div className="font-bold text-gray-900 text-sm leading-snug">{f.label}</div>
                      <div className="mt-1 font-semibold" style={{ color: RED }}>{eur(f.price)}{f.recurring ? '/mois' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <span className={label}>Période d'abonnement</span>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-gray-400">Début</span>
                  <input type="date" className={field} value={subStart} onChange={(e) => setSubStart(e.target.value)} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400">Fin {formula && !formula.recurring ? '' : '(facultatif)'}</span>
                  <input type="date" className={field} value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
                </div>
              </div>
              {formula?.recurring && <p className="text-[11px] text-gray-400 mt-1">Formule avec engagement reconduit tacitement : la date de fin est facultative.</p>}
            </div>

            <div>
              <span className={label}>Règlement de la formule</span>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m} onClick={() => setFormulaPaymentMethod(m)} className={`px-4 py-2.5 rounded-xl border font-semibold text-sm ${formulaPaymentMethod === m ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`} style={{ backgroundColor: formulaPaymentMethod === m ? RED : undefined }}>{m}</button>
                ))}
              </div>
            </div>

            {needsBadge && (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 font-bold text-gray-900"><BadgeCheck size={18} style={{ color: RED }} /> Badge (obligatoire) — {eur(BADGE.price)}</div>
                <div>
                  <span className={label}>Numéro de badge</span>
                  <div className="flex gap-2">
                    <input className={field} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="ex. 3616701" />
                    <button type="button" onClick={handleGenerateCard} disabled={genningCard} className="shrink-0 px-4 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      {genningCard ? '…' : 'Générer'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Saisis le numéro imprimé sur le badge.</p>
                </div>
                <div>
                  <span className={label}>Règlement du badge</span>
                  <div className="flex flex-wrap gap-2">
                    {['Espèces', 'CB', 'Prélèvement'].map((m) => (
                      <button key={m} onClick={() => setBadgePaymentMethod(m)} className={`px-4 py-2.5 rounded-xl border font-semibold text-sm ${badgePaymentMethod === m ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`} style={{ backgroundColor: badgePaymentMethod === m ? RED : undefined }}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <span className={label}>Services complémentaires (optionnel)</span>
              <div className="grid sm:grid-cols-2 gap-3">
                {SERVICES.map((s) => (
                  <button key={s.key} onClick={() => toggleService(s.key)} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${services[s.key] ? 'border-transparent' : 'border-gray-200'}`} style={{ backgroundColor: services[s.key] ? '#fdeaea' : undefined, borderColor: services[s.key] ? RED : undefined }}>
                    <span className="font-semibold text-gray-800">{s.label}</span>
                    <span className="font-bold" style={{ color: RED }}>{eur(s.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Récap */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Récapitulatif</h2>
            <div className="rounded-2xl border border-gray-100 divide-y">
              <Row k="Adhérent" v={`${civility} ${firstName} ${lastName}`} />
              {(address || city) && <Row k="Adresse" v={[address, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')} />}
              {email && <Row k="Email" v={email} />}
              {phone && <Row k="Téléphone" v={phone} />}
              <Row k="Formule" v={`${formula?.label || '—'} (${eur(formula?.price || 0)}${formula?.recurring ? '/mois' : ''})`} />
              <Row k="Règlement formule" v={formulaPaymentMethod} />
              {needsBadge && <Row k="Badge obligatoire" v={`${eur(BADGE.price)} — réglé par ${badgePaymentMethod}`} />}
              {chosenServices.map((s) => <Row key={s.key} k={s.label} v={eur(s.price)} />)}
              <div className="flex justify-between px-4 py-3 font-semibold text-base" style={{ color: RED }}>
                <span>TOTAL À L'INSCRIPTION</span><span>{eur(total)}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-red-600" checked={consentCga} onChange={(e) => setConsentCga(e.target.checked)} />
              <span className="text-sm text-gray-700">Je déclare avoir pris connaissance des <b>Conditions générales d'adhésion</b> et du Règlement intérieur.</span>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-red-600" checked={consentMedical} onChange={(e) => setConsentMedical(e.target.checked)} />
              <span className="text-sm text-gray-700">Je déclare avoir fait contrôler par un médecin mon <b>aptitude à pratiquer une activité sportive</b>.</span>
            </label>
          </div>
        )}

        {/* ÉTAPE 3 — Signature */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Signature de l'adhérent</h2>
            <p className="text-sm text-gray-500">Signez ci-dessous avec le doigt, précédé de la mention « lu et approuvé ».</p>
            <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: '220px', touchAction: 'none' }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
              />
              {sigEmpty && <span className="absolute inset-0 flex items-center justify-center text-gray-300 font-semibold pointer-events-none">Signez ici</span>}
            </div>
            <button onClick={clearSig} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"><Eraser size={16} /> Effacer</button>
          </div>
        )}

        {error && <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={back} disabled={step === 0 || submitting} className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold ${step === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
            <ArrowLeft size={18} /> Retour
          </button>
          {step < 3 ? (
            <button onClick={next} disabled={!canNext()} className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold ${canNext() ? '' : 'opacity-40 cursor-not-allowed'}`} style={{ backgroundColor: RED }}>
              Continuer <ArrowRight size={18} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting || sigEmpty} className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold ${submitting || sigEmpty ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ backgroundColor: RED }}>
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Création…</> : <><Check size={18} /> Valider l'inscription</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex justify-between px-4 py-3 text-sm">
    <span className="text-gray-500">{k}</span>
    <span className="font-semibold text-gray-900 text-right">{v}</span>
  </div>
);

export default InscriptionPage;
