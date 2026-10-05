import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Check } from 'lucide-react';
import { BORNE_PRODUCTS, BorneProduct, startBornePurchase } from '../../../lib/bornePayApi';
import { selfSubscribe } from '../../../lib/gocardless';
import ContractSignatureSheet from '../../../components/ContractSignatureSheet';

const RED = '#C81E1E';

// Abonnements avec engagement (prélèvement SEPA) proposés en self-service sur la borne.
const ENGAGEMENT = [
  { label: 'Abo classique', price: 29.9, sub: 'Prélèvement mensuel le 10' },
  { label: 'Abo famille / étudiant', price: 25.9, sub: 'Prélèvement mensuel le 10' },
  { label: 'Abo suivi et formation', price: 59.9, sub: 'Prélèvement mensuel le 10' },
];

/**
 * Self-service sur la borne (sans compte, sans téléphone).
 * - Séance / carnet / mois : paiement carte Stripe → code d'accès par e-mail.
 * - Abonnement avec engagement : SIGNATURE DU CONTRAT (mêmes obligations qu'au comptoir)
 *   puis mise en place du mandat SEPA (page RIB GoCardless).
 */
const BornePayPage: React.FC = () => {
  const navigate = useNavigate();
  const [product, setProduct] = useState<BorneProduct | null>(null);
  const [eng, setEng] = useState<{ label: string; price: number } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showContract, setShowContract] = useState(false);

  const chosen = BORNE_PRODUCTS.find((p) => p.key === product) || null;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const identityOk = !!firstName.trim() && !!lastName.trim() && emailOk;
  const canPay = (!!product || !!eng) && identityOk && !busy;
  const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

  const pickProduct = (key: BorneProduct) => { setProduct(key); setEng(null); };
  const pickEng = (f: { label: string; price: number }) => { setEng(f); setProduct(null); };

  const pay = async () => {
    if (!canPay) return;
    // Abonnement avec engagement : on passe d'abord par la signature du contrat.
    if (eng) { setError(''); setShowContract(true); return; }
    if (!product) return;
    setError('');
    setBusy(true);
    try {
      const url = await startBornePurchase({
        product,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      // Redirection vers la page de paiement sécurisée Stripe (carte à l'écran).
      window.location.href = url;
    } catch (e) {
      setError((e as Error)?.message || 'Le paiement n’a pas pu démarrer. Réessaie.');
      setBusy(false);
    }
  };

  // Contrat signé → crée le contrat + PDF (e-mail) puis ouvre la page RIB GoCardless.
  const onContractSigned = async (r: { consentCga: boolean; consentMedical: boolean; consentImage: boolean; signature: string }) => {
    if (!eng) return;
    setBusy(true); setError('');
    try {
      const res = await selfSubscribe({
        label: eng.label, price: eng.price,
        consentCga: r.consentCga, consentMedical: r.consentMedical, consentImage: r.consentImage,
        signature: r.signature,
        redirectUrl: `${window.location.origin}/#/borne`,
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined,
      });
      setShowContract(false);
      window.location.href = res.authorisation_url; // page RIB GoCardless
    } catch (e) {
      setError((e as Error)?.message || 'La souscription n’a pas pu démarrer. Réessaie.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 ui-crisp overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold" style={{ color: RED }}>La SaLLe</span>
          <button onClick={() => navigate('/borne', { replace: true })} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} /> Accueil
          </button>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-6">Payer sur place</h1>
        <p className="text-gray-500 font-medium mt-1">Choisis une formule, renseigne ton e-mail et paie par carte. Ton code d’accès t’est envoyé par e-mail.</p>

        {/* 1a. Sans engagement (carte Stripe) */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-7 mb-2">Sans engagement · paiement carte</p>
        <div className="grid grid-cols-1 gap-3">
          {BORNE_PRODUCTS.map((p) => (
            <button key={p.key} onClick={() => pickProduct(p.key)}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-white px-5 py-4 text-left transition-all ${product === p.key ? 'shadow-lg' : 'border-gray-200'}`}
              style={{ borderColor: product === p.key ? RED : undefined }}>
              <span>
                <span className="block text-lg font-extrabold text-gray-900">{p.label}</span>
                <span className="block text-[13px] font-semibold text-gray-500">{p.sub}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xl font-extrabold" style={{ color: RED }}>{p.price}</span>
                {product === p.key && <Check size={22} style={{ color: RED }} />}
              </span>
            </button>
          ))}
        </div>

        {/* 1b. Avec engagement (prélèvement SEPA + contrat signé) */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-6 mb-2">Avec engagement · prélèvement automatique</p>
        <div className="grid grid-cols-1 gap-3">
          {ENGAGEMENT.map((f) => (
            <button key={f.label} onClick={() => pickEng(f)}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-white px-5 py-4 text-left transition-all ${eng?.label === f.label ? 'shadow-lg' : 'border-gray-200'}`}
              style={{ borderColor: eng?.label === f.label ? RED : undefined }}>
              <span>
                <span className="block text-lg font-extrabold text-gray-900">{f.label}</span>
                <span className="block text-[13px] font-semibold text-gray-500">{f.sub}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xl font-extrabold" style={{ color: RED }}>{eur(f.price)}/mois</span>
                {eng?.label === f.label && <Check size={22} style={{ color: RED }} />}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <span className="text-[13px]">🎫</span>
          <p className="text-[11px] font-semibold text-amber-800 leading-snug">Badge d'accès <b>obligatoire (15 €)</b> à retirer à l'accueil lors de ta première visite.</p>
        </div>

        {/* 2. Identité */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-7 mb-2">Tes informations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom"
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-red-100" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom"
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-red-100" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="Adresse e-mail"
            className="sm:col-span-2 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-red-100" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="Téléphone (facultatif)"
            className="sm:col-span-2 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-red-100" />
        </div>
        <p className="text-xs text-gray-400 mt-2">Déjà venu ? Utilise le même e-mail : on retrouve ton compte automatiquement.</p>

        {error && <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}

        <button onClick={pay} disabled={!canPay}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl shadow-xl disabled:opacity-50"
          style={{ backgroundColor: RED }}>
          {busy ? <><Loader2 size={20} className="animate-spin" /> Un instant…</>
                : eng ? <><Check size={20} /> Lire et signer mon contrat <ArrowRight size={18} /></>
                : <><CreditCard size={20} /> Payer {chosen ? chosen.price : ''} par carte <ArrowRight size={18} /></>}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-3">
          {eng ? 'Signature du contrat puis prélèvement SEPA (page sécurisée de ta banque). Tu recevras un e-mail pour créer ton mot de passe et retrouver ton code d’accès dans l’app.'
               : 'Paiement sécurisé par Stripe. La carte n’est jamais conservée par la salle.'}
        </p>
      </div>

      <ContractSignatureSheet
        open={showContract}
        busy={busy}
        signerName={`${firstName.trim()} ${lastName.trim()}`.trim()}
        summary={eng ? `${eng.label} · ${eur(eng.price)}/mois` : undefined}
        submitLabel="Signer et mettre en place le prélèvement"
        onClose={() => { if (!busy) setShowContract(false); }}
        onSubmit={onContractSigned}
      />
    </div>
  );
};

export default BornePayPage;
