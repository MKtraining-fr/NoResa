import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, CreditCard, LogIn, ArrowRight, MapPin } from 'lucide-react';
import { setKiosk } from '../../lib/kiosk';

const RED = '#C81E1E';

/**
 * Page d'accueil de la BORNE tactile (La SaLLe). Plein écran, gros boutons,
 * aucune sortie vers la vitrine NoResa. « Payer une séance » renvoie vers la
 * connexion (l'adhérent paie depuis son espace) ; « M'inscrire » vers l'auto-inscription.
 * `?kiosk=1` arme le mode borne sur l'appareil ; `?kiosk=0` le désarme (staff).
 */
const BornePage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const k = params.get('kiosk');
    if (k === '1') setKiosk(true);
    else if (k === '0') { setKiosk(false); navigate('/', { replace: true }); }
  }, [params, navigate]);

  return (
    <div
      className="min-h-screen w-full flex flex-col text-white font-sans"
      style={{ background: `radial-gradient(120% 70% at 82% -10%, #d8352f 0%, rgba(216,53,47,0) 45%), linear-gradient(160deg, ${RED} 0%, ${RED} 45%, #8E1414 100%)` }}
    >
      {/* En-tête salle */}
      <header className="px-8 pt-10 sm:pt-14 text-center">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] opacity-85">A.R.A.P.S · Salle de sport</p>
        <h1 className="mt-2 text-6xl sm:text-7xl font-extrabold tracking-tight">La SaLLe</h1>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold opacity-80">
          <MapPin size={15} /> Villeneuve-la-Comptal · 11400
        </p>
      </header>

      {/* Choix principal */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 pb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center text-balance">Bienvenue 👋 Que veux-tu faire ?</h2>

        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link
            to="/inscription"
            className="group bg-white text-gray-900 rounded-3xl p-8 shadow-2xl active:scale-[0.98] transition-transform flex flex-col gap-4 min-h-[220px]"
          >
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: RED }}>
              <UserPlus size={30} />
            </span>
            <span>
              <span className="block text-2xl font-extrabold">M'inscrire</span>
              <span className="block text-sm font-semibold text-gray-500 mt-1">Nouveau ici ? Crée ton compte en 2 minutes.</span>
            </span>
            <span className="mt-auto inline-flex items-center gap-2 font-bold" style={{ color: RED }}>
              Commencer <ArrowRight size={18} className="group-active:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            to="/connexion"
            className="group bg-white text-gray-900 rounded-3xl p-8 shadow-2xl active:scale-[0.98] transition-transform flex flex-col gap-4 min-h-[220px]"
          >
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: RED }}>
              <CreditCard size={30} />
            </span>
            <span>
              <span className="block text-2xl font-extrabold">Payer une séance</span>
              <span className="block text-sm font-semibold text-gray-500 mt-1">Connecte-toi à ton espace pour prendre ta séance, ton carnet ou ton mois.</span>
            </span>
            <span className="mt-auto inline-flex items-center gap-2 font-bold" style={{ color: RED }}>
              Me connecter <ArrowRight size={18} className="group-active:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        <Link to="/connexion" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white/90 underline underline-offset-4">
          <LogIn size={16} /> Déjà membre ? Se connecter
        </Link>
      </main>

      <footer className="px-8 pb-8 text-center text-[12px] font-semibold opacity-75">
        Scanne, inscris-toi, entraîne-toi. · lasalle.11400@gmail.com · 06 22 91 49 56
      </footer>
    </div>
  );
};

export default BornePage;
