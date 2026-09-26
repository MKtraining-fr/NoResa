import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, HeartPulse, Users, Award, Timer, Flame, ArrowRight } from 'lucide-react';

const RED = '#C81E1E';

/* ------------------------------------------------------------------ *
 *  CONTENU À PERSONNALISER — remplace/complète par les vraies activités
 *  de la salle (nom, description, icône).
 * ------------------------------------------------------------------ */
const ACTIVITES = [
  { icon: Dumbbell, title: 'Musculation', desc: 'Un plateau complet : machines guidées, poids libres, racks et barres pour tous les niveaux.' },
  { icon: HeartPulse, title: 'Cardio-training', desc: 'Tapis, vélos, rameurs et elliptiques pour l’endurance et la remise en forme.' },
  { icon: Users, title: 'Cours collectifs', desc: 'Des séances encadrées pour se motiver en groupe et varier les entraînements.' },
  { icon: Award, title: 'Accompagnement', desc: 'Suivi et programmes personnalisés avec la formule « Suivi + Formation ».' },
  { icon: Timer, title: 'Accès en autonomie', desc: 'Large amplitude horaire : entraîne-toi quand ça t’arrange, de 6h à 23h en semaine.' },
  { icon: Flame, title: 'Renforcement & cross', desc: 'Espace fonctionnel pour le renforcement, la mobilité et les circuits.' },
];

const ActivitesPage: React.FC = () => (
  <div className="max-w-6xl mx-auto px-5 py-12">
    <p className="text-sm font-bold uppercase tracking-widest" style={{ color: RED }}>Activités</p>
    <h1 className="text-4xl font-extrabold text-gray-900 mt-1 text-balance">Ce que tu peux faire à La SaLLe.</h1>
    <p className="text-gray-500 font-medium mt-3 max-w-2xl">Musculation, cardio, cours et accompagnement : tout est là pour progresser à ton rythme.</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
      {ACTIVITES.map((a) => (
        <div key={a.title} className="border border-gray-100 rounded-3xl p-6 bg-white hover:shadow-lg transition-shadow">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fdecec', color: RED }}><a.icon size={26} /></span>
          <p className="text-xl font-extrabold text-gray-900">{a.title}</p>
          <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-relaxed">{a.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-10 flex flex-wrap gap-3">
      <Link to="/tarifs" className="inline-flex items-center gap-2 border border-gray-200 font-bold px-6 py-3.5 rounded-2xl text-gray-700 hover:bg-gray-50">Voir les tarifs</Link>
      <Link to="/inscription" className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-2xl shadow-xl" style={{ backgroundColor: RED }}>M'inscrire <ArrowRight size={18} /></Link>
    </div>
  </div>
);

export default ActivitesPage;
