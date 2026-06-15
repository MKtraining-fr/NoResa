
import React from 'react';
import { Layers, Database, BarChart2, Globe, Lock, Cpu, Check } from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const modules = [
    {
      title: "Gestion CRM & Membres",
      icon: <Database className="text-indigo-600" />,
      features: ["Fiches membres complètes", "Suivi des prospects", "Relances automatiques", "Historique des visites", "Notes de coaching"]
    },
    {
      title: "Planning & Réservations",
      icon: <Globe className="text-indigo-600" />,
      features: ["Gestion cours collectifs", "Calendrier interactif", "Limitation de capacité", "Listes d'attente", "Synchronisation Google Calendar"]
    },
    {
      title: "Finance & Facturation",
      icon: <Lock className="text-indigo-600" />,
      features: ["Paiements CB sécurisés", "Prélèvements automatiques", "Édition de factures", "Suivi des impayés", "Comptabilité exportable"]
    },
    {
      title: "Statistiques & KPIs",
      icon: <BarChart2 className="text-indigo-600" />,
      features: ["Tableaux de bord temps réel", "Taux de rétention", "Revenu par membre", "Fréquentation horaire", "Rapports personnalisés"]
    }
  ];

  return (
    <div className="pt-16 pb-24 space-y-24">
      <section className="max-w-7xl mx-auto px-4 text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900">Un outil puissant, <br /><span className="text-indigo-600">sans la complexité.</span></h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">NoResa a été conçu par des gérants de salles, pour des gérants de salles. Chaque détail compte.</p>
      </section>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16">
        {modules.map((module, idx) => (
          <div key={idx} className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-start hover:shadow-xl transition-all group">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
              {React.cloneElement(module.icon as React.ReactElement, { size: 32 })}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">{module.title}</h3>
            <ul className="space-y-4 flex-grow">
              {module.features.map((f, i) => (
                <li key={i} className="flex items-center space-x-3 text-gray-600 font-medium">
                  <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={14} /></div>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturesPage;
