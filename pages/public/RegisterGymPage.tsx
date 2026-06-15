
import React from 'react';
import { Dumbbell, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const RegisterGymPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 bg-indigo-600 text-white space-y-8 flex flex-col justify-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center">
            <Dumbbell size={32} />
          </div>
          <h2 className="text-3xl font-bold leading-tight">Rejoignez les 500+ salles qui nous font confiance.</h2>
          <ul className="space-y-4">
            {["Installation en 5 minutes", "Support ultra-réactif", "Sans frais cachés"].map((item, i) => (
              <li key={i} className="flex items-center space-x-3 font-medium opacity-90">
                <CheckCircle size={20} className="text-indigo-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-12 space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900">Créez votre compte</h1>
            <p className="text-gray-500 text-sm">Commencez votre essai gratuit de 14 jours.</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Nom de votre salle" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" />
            <input type="email" placeholder="Email professionnel" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" />
            <input type="password" placeholder="Mot de passe" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" />
            
            <p className="text-[10px] text-gray-400 text-center">
              En vous inscrivant, vous acceptez nos <a href="#" className="underline">Conditions Générales</a> et notre <a href="#" className="underline">Politique de Confidentialité</a>.
            </p>

            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
              <span>Créer mon compte</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="text-center text-sm font-medium text-gray-500">
            Déjà client ? <Link to="/connexion" className="text-indigo-600 font-bold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterGymPage;
