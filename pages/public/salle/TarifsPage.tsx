import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Info, UserPlus } from 'lucide-react';

const RED = '#C81E1E';
const eur = (n: number) => (Number.isInteger(n) ? `${n} €` : `${n.toFixed(2).replace('.', ',')} €`);

/** Tarifs publics La SaLLe — alignés sur les formules réelles de l'inscription. */
const SANS_ENGAGEMENT = [
  { label: 'Séance à l’unité', price: 5, unit: 'la séance', desc: 'Une entrée, quand tu veux.' },
  { label: 'Carnet de 10 séances', price: 45, unit: 'les 10', desc: '10 entrées cumulables. Idéal essai.', highlight: true },
  { label: '1 mois', price: 40, unit: 'le mois', desc: 'Accès illimité pendant 30 jours.' },
];
const MENSUEL = [
  { label: 'Famille / Étudiant', price: 25.9, desc: 'Tarif réduit, prélèvement mensuel.' },
  { label: 'Classique', price: 29.9, desc: 'La formule tout-accès.', highlight: true },
  { label: 'Suivi + Formation', price: 59.9, desc: 'Accompagnement et programmes.' },
];
const ANNUEL = [
  { label: 'Famille / Étudiant — annuel', price: 300 },
  { label: 'Classique — annuel', price: 345 },
];

const Card: React.FC<{ label: string; price: number; unit?: string; desc?: string; highlight?: boolean; period?: string }> =
({ label, price, unit, desc, highlight, period }) => (
  <div className={`rounded-3xl p-6 flex flex-col ${highlight ? 'text-white shadow-2xl' : 'bg-white border border-gray-100'}`}
       style={highlight ? { background: `linear-gradient(160deg, ${RED}, #8E1414)` } : undefined}>
    {highlight && <span className="self-start text-[10px] font-extrabold uppercase tracking-wider bg-white/20 rounded-full px-3 py-1 mb-3">Le + choisi</span>}
    <p className="text-lg font-extrabold">{label}</p>
    <p className="mt-2 flex items-end gap-1.5">
      <span className="text-4xl font-extrabold">{eur(price)}</span>
      {(unit || period) && <span className={`text-sm font-semibold ${highlight ? 'opacity-85' : 'text-gray-400'} pb-1`}>{unit || period}</span>}
    </p>
    {desc && <p className={`text-sm font-medium mt-2 ${highlight ? 'opacity-90' : 'text-gray-500'}`}>{desc}</p>}
  </div>
);

const TarifsPage: React.FC = () => (
  <div className="max-w-6xl mx-auto px-5 py-12">
    <p className="text-sm font-bold uppercase tracking-widest" style={{ color: RED }}>Tarifs</p>
    <h1 className="text-4xl font-extrabold text-gray-900 mt-1 text-balance">Des formules pour chaque rythme.</h1>
    <p className="text-gray-500 font-medium mt-3 max-w-2xl">Sans engagement pour tester, ou en abonnement pour t'entraîner toute l'année. Inscription en 2 minutes sur la borne ou l'appli.</p>

    <h2 className="text-lg font-extrabold text-gray-900 mt-10 mb-4">Sans engagement</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {SANS_ENGAGEMENT.map((f) => <Card key={f.label} {...f} />)}
    </div>

    <h2 className="text-lg font-extrabold text-gray-900 mt-10 mb-4">Abonnements mensuels <span className="text-gray-400 font-semibold text-sm">· prélèvement automatique</span></h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {MENSUEL.map((f) => <Card key={f.label} {...f} unit="/ mois" />)}
    </div>

    <h2 className="text-lg font-extrabold text-gray-900 mt-10 mb-4">Annuel <span className="text-gray-400 font-semibold text-sm">· réglé en une fois</span></h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
      {ANNUEL.map((f) => <Card key={f.label} {...f} period="/ an" />)}
    </div>

    <div className="mt-8 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 max-w-2xl">
      <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm font-medium text-amber-800">Badge d'accès <b>optionnel</b> : 15 €, à retirer à l'accueil. Ton <b>code d'accès</b> est gratuit et disponible dans ton espace membre dès l'inscription.</p>
    </div>

    <div className="mt-10">
      <Link to="/inscription" className="inline-flex items-center gap-2 text-white font-bold px-7 py-4 rounded-2xl shadow-xl" style={{ backgroundColor: RED }}>
        <UserPlus size={18} /> M'inscrire maintenant
      </Link>
    </div>
  </div>
);

export default TarifsPage;
