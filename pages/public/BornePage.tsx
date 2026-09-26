import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, CreditCard, ArrowRight, Camera, Dumbbell, Tag, HelpCircle } from 'lucide-react';
import { setKiosk } from '../../lib/kiosk';

const RED = '#C81E1E';

/**
 * Accueil du mini-site / borne « La SaLLe » (dans SalleLayout).
 * Hero + 2 actions clés (M'inscrire / Payer une séance) + accès aux sections.
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

  const sections = [
    { to: '/decouverte', icon: Camera, label: 'Découverte', sub: 'La salle en images' },
    { to: '/activites', icon: Dumbbell, label: 'Activités', sub: 'Ce que tu peux faire' },
    { to: '/tarifs', icon: Tag, label: 'Tarifs', sub: 'Formules & séances' },
    { to: '/faq', icon: HelpCircle, label: 'FAQ', sub: 'Tes questions' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="text-white" style={{ background: `radial-gradient(120% 80% at 85% -20%, #d8352f 0%, rgba(216,53,47,0) 45%), linear-gradient(160deg, ${RED} 0%, ${RED} 45%, #8E1414 100%)` }}>
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-20">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] opacity-85">A.R.A.P.S · Villeneuve-la-Comptal</p>
          <h1 className="mt-3 text-5xl sm:text-6xl font-extrabold tracking-tight text-balance">Ta salle, ouverte de 6h à 23h.</h1>
          <p className="mt-4 text-lg font-semibold opacity-95 max-w-xl">Musculation, cardio et accompagnement, à ton rythme. Inscris-toi en 2 minutes et entraîne-toi dès aujourd'hui.</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Link to="/inscription" className="group bg-white text-gray-900 rounded-3xl p-6 shadow-2xl active:scale-[0.98] transition-transform flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: RED }}><UserPlus size={26} /></span>
              <span className="flex-1">
                <span className="block text-xl font-extrabold">M'inscrire</span>
                <span className="block text-[13px] font-semibold text-gray-500">Nouveau ? Crée ton compte</span>
              </span>
              <ArrowRight size={20} style={{ color: RED }} className="group-active:translate-x-1 transition-transform" />
            </Link>
            <Link to="/connexion-salle" className="group bg-white/10 border border-white/30 text-white rounded-3xl p-6 active:scale-[0.98] transition-transform flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><CreditCard size={26} /></span>
              <span className="flex-1">
                <span className="block text-xl font-extrabold">Payer une séance</span>
                <span className="block text-[13px] font-semibold opacity-85">Connecte-toi à ton espace</span>
              </span>
              <ArrowRight size={20} className="group-active:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Accès aux sections */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Découvrir la salle</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((s) => (
            <Link key={s.to} to={s.to} className="group border border-gray-100 rounded-3xl p-6 hover:border-red-200 hover:shadow-lg transition-all bg-white">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fdecec', color: RED }}><s.icon size={22} /></span>
              <p className="text-lg font-extrabold text-gray-900">{s.label}</p>
              <p className="text-[13px] font-semibold text-gray-500 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BornePage;
