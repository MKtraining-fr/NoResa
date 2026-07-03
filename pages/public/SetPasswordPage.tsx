import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

/**
 * Page « Créer mon mot de passe » — cible du lien de l'e-mail d'activation.
 * Le lien de récupération établit une session temporaire (detectSessionInUrl),
 * puis l'adhérent choisit son mot de passe (updateUser) → accès à l'app.
 */
const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);   // session de récup active ?
  const [linkError, setLinkError] = useState<string | null>(null); // lien expiré/invalide
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const e = sessionStorage.getItem('pwd_link_error');
      if (e) { setLinkError(e); sessionStorage.removeItem('pwd_link_error'); }
    } catch { /* noop */ }
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pwd.length < 8) { setErr('8 caractères minimum.'); return; }
    if (pwd !== pwd2) { setErr('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/membre', { replace: true }), 1600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-2xl shadow-xl mb-5"><ShieldCheck className="text-white w-8 h-8" /></div>
          <h1 className="text-2xl font-extrabold text-gray-900">Créer mon mot de passe</h1>
          <p className="text-gray-500 mt-2 text-sm">Choisissez un mot de passe pour accéder à votre espace adhérent.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
          {ready === null ? (
            <div className="py-10 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>
          ) : done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto"><Check size={34} strokeWidth={2.4} /></div>
              <p className="font-extrabold text-lg text-gray-900 mt-4">Mot de passe enregistré 🎉</p>
              <p className="text-sm text-gray-500 mt-1">Redirection vers votre espace…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto"><AlertCircle size={28} /></div>
              <p className="font-bold text-gray-900 mt-4">Lien invalide ou expiré</p>
              <p className="text-sm text-gray-500 mt-1">Ce lien est à usage unique et expire vite. Demandez un nouveau lien à votre salle, ou réinitialisez depuis la connexion.</p>
              {linkError && <p className="text-[11px] text-gray-400 mt-2 font-mono break-words">({linkError})</p>}
              <button onClick={() => navigate('/connexion')} className="mt-5 w-full bg-gray-900 text-white py-3 rounded-2xl font-bold text-sm">Aller à la connexion</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {err && (
                <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium">
                  <AlertCircle size={16} className="shrink-0" /><span>{err}</span>
                </div>
              )}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Nouveau mot de passe"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-soft text-sm font-medium" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Confirmer le mot de passe"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-soft text-sm font-medium" />
              </div>
              <button type="submit" disabled={busy} className="w-full bg-brand text-white font-bold py-3.5 rounded-2xl shadow-xl hover:opacity-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                <span>{busy ? 'Enregistrement…' : 'Valider mon mot de passe'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
