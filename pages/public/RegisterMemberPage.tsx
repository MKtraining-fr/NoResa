import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Mail } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

/**
 * Auto-inscription publique — création d'un PROFIL uniquement.
 * Pas de formule ni de mandat : une fois le mot de passe créé (e-mail) et
 * connecté, l'adhérent achète sa première séance. Les abonnements avec
 * engagement se souscrivent en salle.
 */

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-register`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
// Turnstile ne fonctionne pas en WebView native : on ne l'affiche que sur le web.
const USE_TURNSTILE = !!TURNSTILE_SITE_KEY && !Capacitor.isNativePlatform();

const RegisterMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', postalCode: '', city: '',
    consentCga: false, consentMedical: false,
  });
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [token, setToken] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!USE_TURNSTILE) return;
    const render = () => {
      const ts = (window as any).turnstile;
      if (ts && widgetRef.current && !widgetRef.current.hasChildNodes()) {
        ts.render(widgetRef.current, { sitekey: TURNSTILE_SITE_KEY, callback: setToken, 'expired-callback': () => setToken('') });
      }
    };
    if ((window as any).turnstile) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true; s.defer = true; s.onload = render;
    document.head.appendChild(s);
  }, []);

  const submit = async () => {
    setErr('');
    if (!f.firstName.trim() || !f.lastName.trim()) { setErr('Prénom et nom obligatoires.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErr('E-mail invalide.'); return; }
    if (!f.consentCga || !f.consentMedical) { setErr('Merci de cocher les deux déclarations.'); return; }
    if (USE_TURNSTILE && !token) { setErr('Merci de valider le test anti-robot.'); return; }
    setBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON, 'Authorization': `Bearer ${ANON}` },
        body: JSON.stringify({ ...f, turnstileToken: token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "L'inscription a échoué.");
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || "Inscription indisponible pour le moment.");
      setBusy(false);
    }
  };

  const input = (k: string, ph: string, type = 'text') => (
    <input type={type} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph}
      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
  );

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto"><CheckCircle2 size={36} /></div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-4">Compte créé 🎉</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Un e-mail vient de t'être envoyé pour <b>créer ton mot de passe</b>. Une fois connecté,
            tu pourras prendre ta première séance directement depuis l'app.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] font-bold text-gray-400">
            <Mail size={15} /> Pense à vérifier tes spams
          </div>
          <button onClick={() => navigate('/connexion')} className="mt-6 w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-xl">Aller à la connexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-4 py-8">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/connexion')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 mb-4"><ArrowLeft size={16} /> Connexion</button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-xl mb-4"><ShieldCheck className="text-white w-7 h-7" /></div>
          <h1 className="text-2xl font-extrabold text-gray-900">Créer mon compte</h1>
          <p className="text-gray-500 mt-1 text-sm">Quelques infos pour créer ton profil. Tu prendras ta première séance une fois connecté.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 space-y-5">
          {err && <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16} className="shrink-0" /><span>{err}</span></div>}

          {/* Identité */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Mes informations</p>
            <div className="grid grid-cols-2 gap-2">
              {input('firstName', 'Prénom')}
              {input('lastName', 'Nom')}
            </div>
            {input('email', 'E-mail', 'email')}
            {input('phone', 'Téléphone', 'tel')}
            {input('address', 'Adresse')}
            <div className="grid grid-cols-2 gap-2">
              {input('postalCode', 'Code postal')}
              {input('city', 'Ville')}
            </div>
          </div>

          {/* Déclarations */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Déclarations</p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={f.consentCga} onChange={(e) => set('consentCga', e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600" />
              <span className="text-xs text-gray-600 font-medium">J'ai pris connaissance des Conditions générales et du Règlement intérieur.</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={f.consentMedical} onChange={(e) => set('consentMedical', e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600" />
              <span className="text-xs text-gray-600 font-medium">J'ai fait contrôler par un médecin mon aptitude à pratiquer une activité sportive.</span>
            </label>
          </div>

          {USE_TURNSTILE && <div ref={widgetRef} className="flex justify-center" />}
          <button onClick={submit} disabled={busy} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            <span>{busy ? 'Création…' : 'Créer mon compte'}</span>
          </button>
          <p className="text-center text-[10.5px] text-gray-400 font-semibold">Tu recevras un e-mail pour créer ton mot de passe.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterMemberPage;
