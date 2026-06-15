
import React from 'react';
import { Check, Shield, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const PricingPage: React.FC = () => {
  const plans = [
    {
      name: "Starter",
      price: "49",
      description: "Parfait pour les studios de yoga ou coaching privé.",
      features: ["Jusqu'à 100 membres", "Planning de cours", "Espace membre PWA", "Support par email"],
      color: "indigo",
      icon: <Zap className="text-indigo-600" />
    },
    {
      name: "Pro",
      price: "99",
      description: "Le choix préféré des salles de fitness indépendantes.",
      features: ["Membres illimités", "Gestion CRM complète", "Paiements automatisés", "Statistiques avancées", "Support prioritaire"],
      popular: true,
      color: "indigo",
      icon: <Star className="text-indigo-600" />
    },
    {
      name: "Ultimate",
      price: "199",
      description: "Pour les réseaux de salles et grands complexes.",
      features: ["Multi-sites", "API Accès (Tourniquets)", "Boutique en ligne", "Coach dédié", "Marque blanche"],
      color: "slate",
      icon: <Shield className="text-slate-900" />
    }
  ];

  return (
    <div className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900">Des tarifs <span className="text-indigo-600">transparents.</span></h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">Choisissez le plan qui correspond à la taille de votre ambition.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div key={idx} className={`relative bg-white p-10 rounded-[3rem] border ${plan.popular ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100'} shadow-sm flex flex-col`}>
            {plan.popular && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                Plus Populaire
              </span>
            )}
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              {plan.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            <div className="flex items-baseline space-x-1 mb-4">
              <span className="text-4xl font-black text-gray-900">{plan.price}€</span>
              <span className="text-gray-500 font-medium">/mois</span>
            </div>
            <p className="text-gray-500 text-sm mb-8">{plan.description}</p>
            
            <ul className="space-y-4 mb-10 flex-grow">
              {plan.features.map((feature, fidx) => (
                <li key={fidx} className="flex items-center space-x-3 text-sm font-medium text-gray-600">
                  <div className="bg-green-100 text-green-600 p-0.5 rounded-full">
                    <Check size={14} />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/inscription-salle"
              className={`w-full py-4 rounded-2xl font-bold text-center transition-all ${
                plan.popular 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' 
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}
            >
              Choisir ce plan
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
