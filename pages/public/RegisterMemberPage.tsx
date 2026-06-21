import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Check, Loader2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

/**
 * Auto-inscription publique d'un prospect (formule avec engagement, prélèvement).
 * Appelle l'Edge Function `prospect-register` puis redirige vers la signature
 * du mandat SEPA. L'adhérent reçoit ensuite l'e-mail d'activation (mot de passe).
 */

const FORMULAS = [
  { key: 'classique', label: 'Formule classique', sub: 'Accès illimité · engagement 12 mois', price: '29,90 €/mois' },
  { key: 'famille', label: 'Famille / Étudiant', sub: 'Tarif réduit · engagement 12 mois', price: '25,90 €/mois' },
  { key: 'suivi', label: 'Suivi + Formation', sub: 'Accompagnement coaching · engagement 12 mois', price: '59,90 €/mois' },
];

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-register`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const RegisterMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const [f, setF] = useState({
    civility: 'M.', firstName: '', lastName: '', birthDate: '', nationality: '',
    email: '', phone: '', address: '', postalCode: '', city: '', profession: '',
    formulaKey: 'classique', consentCga: false, consentMedical: false,
  });
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!f.firstName.trim() || !f.lastName.trim()) { setErr('Prénom et nom obligatoires.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErr('E-mail invalide.'); return; }
    if (!f.consentCga || !f.consentMedical) { setErr('Merci de cocher les deux déclarations.'); return; }
    setBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON, 'Authorization': `Bearer ${ANON}` },
        body: JSON.stringify({ ...f, redirectUrl: `${window.location.origin}${window.location.pathname}#/membre` }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "L'inscription a échoué.");
      // Redirection vers la signature du mandat SEPA
      window.location.href = j.authorisation_url;
    } catch (e: any) {
      setErr(e?.message || "Inscription indisponible pour le moment.");
      setBusy(false);
    }
  };

  const input = (k: string, ph: string, type = 'text') => (
    <input type={type} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph}
      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-4 py-8">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/connexion')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 mb-4"><ArrowLeft size={16} /> Connexion</button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-xl mb-4"><ShieldCheck className="text-white w-7 h-7" /></div>
          <h1 className="text-2xl font-extrabold text-gray-900">Je m'inscris</h1>
          <p className="text-gray-500 mt-1 text-sm">Quelques infos, puis vous signez votre mandat et recevez votre accès.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 space-y-5">
          {err && <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16} className="shrink-0" /><span>{err}</span></div>}

          {/* Formule */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Ma formule</p>
            <div className="space-y-2">
              {FORMULAS.map((o) => {
                const a = f.formulaKey === o.key;
                return (
                  <button key={o.key} type="button" onClick={() => set('formulaKey', o.key)} className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 border-2 text-left ${a ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-100'}`}>
                    <div className="flex-1"><p className="font-extrabold text-sm text-gray-900">{o.label}</p><p className="text-[11px] text-gray-400 font-semibold">{o.sub}</p></div>
                    <span className="font-black text-indigo-600 text-sm whitespace-nowrap">{o.price}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${a ? 'border-indigo-600' : 'border-gray-300'}`}>{a && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identité */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Mes informations</p>
            <div className="flex gap-2">
              <select value={f.civility} onChange={(e) => set('civility', e.target.value)} className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-3 text-sm font-medium outline-none">
                <option>M.</option><option>Mme</option>
              </select>
              <div className="flex-1">{input('firstName', 'Prénom')}</div>
            </div>
            {input('lastName', 'Nom')}
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none" />
              {input('nationality', 'Nationalité')}
            </div>
            {input('email', 'E-mail', 'email')}
            {input('phone', 'Téléphone', 'tel')}
            {input('address', 'Adresse')}
            <div className="grid grid-cols-2 gap-2">
              {input('postalCode', 'Code postal')}
              {input('city', 'Ville')}
            </div>
            {input('profession', 'Profession (facultatif)')}
          </div>

          {/* Déclarations */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Déclarations</p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={f.consentCga} onChange={(e) => set('consentCga', e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600" />
              <span className="text-xs text-gray-600 font-medium">J'ai pris connaissance des Conditions générales d'adhésion et du Règlement intérieur.</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={f.consentMedical} onChange={(e) => set('consentMedical', e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600" />
              <span className="text-xs text-gray-600 font-medium">J'ai fait contrôler par un médecin mon aptitude à pratiquer une activité sportive.</span>
            </label>
          </div>

          <button onClick={submit} disabled={busy} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            <span>{busy ? 'Création…' : 'M\'inscrire & signer mon mandat'}</span>
          </button>
          <p className="text-center text-[10.5px] text-gray-400 font-semibold">Paiement par prélèvement SEPA · vous signez votre mandat à l'étape suivante.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterMemberPage;
