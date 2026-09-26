import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth, homePathForRole } from '../../../lib/AuthContext';

const RED = '#C81E1E';

/**
 * Connexion « La SaLLe » — dédiée au mini-site / borne (rendue dans SalleLayout).
 * Même logique que la connexion NoResa, mais aux couleurs de la salle et sans
 * aucune sortie vers la vitrine SaaS. Après connexion : espace membre (ou back-office).
 */
const SalleLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleReset = async () => {
    setError(null); setNotice(null);
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      setError('Entre ton e-mail ci-dessus, puis clique à nouveau sur « Mot de passe oublié ».');
      return;
    }
    setResetBusy(true);
    const { error: e } = await resetPassword(mail);
    setResetBusy(false);
    if (e) { setError("Impossible d'envoyer le lien pour le moment. Réessaie."); return; }
    setNotice("Si un compte existe pour cet e-mail, un lien de réinitialisation vient d'être envoyé. Pense à vérifier tes spams.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError, role } = await signIn(email, password);
    setLoading(false);
    if (signInError) { setError('Email ou mot de passe incorrect.'); return; }
    navigate(role ? homePathForRole(role) : '/membre');
  };

  return (
    <div className="max-w-md w-full mx-auto px-5 py-14">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl mb-5" style={{ backgroundColor: RED }}>
          <span className="text-white text-2xl font-extrabold">LS</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Ton espace La SaLLe</h1>
        <p className="text-gray-500 mt-2 font-medium">Connecte-toi pour ton code d'accès, tes séances et tes paiements.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" /><span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center gap-2 text-sm font-medium">
            <Mail size={18} className="shrink-0" /><span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.fr"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-red-100 text-sm font-medium" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-red-100 text-sm font-medium" />
            <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? 'Masquer' : 'Voir'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end text-xs font-bold">
            <button type="button" onClick={handleReset} disabled={resetBusy} className="hover:underline disabled:opacity-50" style={{ color: RED }}>
              {resetBusy ? 'Envoi…' : 'Mot de passe oublié ?'}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: RED }}>
            <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">Pas encore de compte ?</p>
          <Link to="/inscription" className="mt-2 inline-flex items-center gap-2 font-bold" style={{ color: RED }}>
            <UserPlus size={16} /> M'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SalleLoginPage;
