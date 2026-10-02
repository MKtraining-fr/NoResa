import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Check } from 'lucide-react';
import { BORNE_PRODUCTS, BorneProduct, startBornePurchase } from '../../../lib/bornePayApi';

const RED = '#C81E1E';

/**
 * Paiement self-service sur la borne (sans compte, sans téléphone).
 * 1) choix du produit → 2) identité (e-mail = anti-doublon) → 3) paiement Stripe.
 * Après paiement, le code d'accès à 6 chiffres est envoyé par e-mail (webhook).
 */
const BornePayPage: React.FC = () => {
  const navigate = useNavigate();
  const [product, setProduct] = useState<BorneProduct | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosen = BORNE_PRODUCTS.find((p) => p.key === product) || null;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canPay = !!product && firstName.trim() && lastName.trim() && emailOk && !busy;

  const pay = async () => {
    if (!canPay || !product) return;
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

        {/* 1. Choix du produit */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-7 mb-2">Ta formule</p>
        <div className="grid grid-cols-1 gap-3">
          {BORNE_PRODUCTS.map((p) => (
            <button key={p.key} onClick={() => setProduct(p.key)}
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
          {busy ? <><Loader2 size={20} className="animate-spin" /> Ouverture du paiement…</>
                : <><CreditCard size={20} /> Payer {chosen ? chosen.price : ''} par carte <ArrowRight size={18} /></>}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-3">Paiement sécurisé par Stripe. La carte n’est jamais conservée par la salle.</p>
      </div>
    </div>
  );
};

export default BornePayPage;
