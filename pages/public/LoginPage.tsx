
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { Mail, Lock, Dumbbell, ArrowRight, AlertCircle, PlayCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation des identifiants demandés pour l'admin
    if (role === UserRole.ADMIN) {
      if (email === 'contact@mktraining.fr' && password === 'test123') {
        onLogin(UserRole.ADMIN);
        navigate('/app');
      } else {
        setError("Identifiants admin invalides. Utilisez contact@mktraining.fr / test123");
      }
    } else {
      // Pour le mode membre, on accepte n'importe quelle connexion non vide pour la démo
      if (email && password) {
        onLogin(UserRole.MEMBER);
        navigate('/membre');
      } else {
        setError("Veuillez remplir tous les champs.");
      }
    }
  };

  const handleDirectAdminLogin = () => {
    onLogin(UserRole.ADMIN);
    navigate('/app');
  };

  const handleDirectMemberLogin = () => {
    onLogin(UserRole.MEMBER);
    navigate('/membre');
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => { setRole(UserRole.ADMIN); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${role === UserRole.ADMIN ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                MANAGER
              </button>
              <button
                type="button"
                onClick={() => { setRole(UserRole.MEMBER); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${role === UserRole.MEMBER ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                MEMBRE
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === UserRole.ADMIN ? "contact@mktraining.fr" : "Email membre"}
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
                  placeholder="test123"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                <span className="text-gray-500 group-hover:text-indigo-600 transition-colors">Se souvenir</span>
              </label>
              <a href="#" className="text-indigo-600 hover:underline">Mot de passe oublié ?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>Se connecter</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* BOUTON ACCÈS DIRECT TEST */}
          <div className="mt-8 space-y-3 pt-6 border-t border-gray-100">
            {role === UserRole.ADMIN ? (
              <button 
                onClick={handleDirectAdminLogin}
                className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 rounded-2xl border border-indigo-100 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm">
                    <PlayCircle size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Accès Test Admin</p>
                    <p className="text-xs text-indigo-700 font-bold">Connexion instantanée</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button 
                onClick={handleDirectMemberLogin}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white p-2 rounded-xl text-slate-600 shadow-sm">
                    <PlayCircle size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accès Test Membre</p>
                    <p className="text-xs text-slate-700 font-bold">Espace Thomas Pesquet</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Pas encore inscrit ? <a href="#" className="text-indigo-600 font-bold hover:underline">Contactez votre salle</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
