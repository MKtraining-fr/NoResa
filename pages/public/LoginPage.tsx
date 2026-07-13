import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Dumbbell, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth, homePathForRole } from '../../lib/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

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

    if (signInError) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    // Redirection selon le rôle réel du compte (back-office ou espace membre).
    // Repli sur /app si le rôle n'a pas pu être lu : ProtectedRoute redirigera un
    // membre vers /membre une fois le profil chargé (jamais de renvoi vers /connexion).
    navigate(role ? homePathForRole(role) : '/app');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 relative overflow-hidden font-sans">
      {/* Decorative Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl -ml-48 -mb-48"></div>

      <div className="max-w-md w-full relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl mb-6">
            <Dumbbell className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bon retour parmi nous</h1>
          <p className="text-gray-500 mt-2">Connectez-vous pour accéder à votre espace NoResa.</p>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center space-x-3 text-sm font-medium animate-in fade-in zoom-in duration-300">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center space-x-3 text-sm font-medium animate-in fade-in zoom-in duration-300">
              <Mail size={18} className="shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                <span className="text-gray-500 group-hover:text-indigo-600 transition-colors">Se souvenir</span>
              </label>
              <button type="button" onClick={handleReset} disabled={resetBusy} className="text-indigo-600 hover:underline disabled:opacity-50">
                {resetBusy ? 'Envoi…' : 'Mot de passe oublié ?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 group disabled:opacity-60"
            >
              <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Pas encore inscrit ? <button type="button" onClick={() => navigate('/inscription')} className="text-indigo-600 font-bold hover:underline">S'inscrire</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
