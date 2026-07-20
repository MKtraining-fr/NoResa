
import React from 'react';
import { CreditCard, History, Download, ShieldCheck } from 'lucide-react';
import CancellationCard from '../../components/CancellationCard';

const MemberSubscription: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-extrabold text-gray-900">Mon Abonnement</h2>
      
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden">
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Plan Actuel</p>
            <h3 className="text-3xl font-black">Gold Membership</h3>
          </div>
          <ShieldCheck size={40} className="text-indigo-300" />
        </div>
        
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold">49.90 €</span>
          <span className="opacity-70 text-sm">/mois</span>
        </div>

        <div className="pt-4 border-t border-white/20 flex justify-between items-center text-sm font-bold">
          <p>Prochain prélèvement</p>
          <p>01 Avril 2024</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
          <History size={20} className="text-indigo-600" />
          <span>Historique des paiements</span>
        </h4>
        
        <div className="space-y-2">
          {[
            { date: '01 Mars 2024', amount: '49.90 €', status: 'Payé' },
            { date: '01 Février 2024', amount: '49.90 €', status: 'Payé' },
            { date: '01 Janvier 2024', amount: '49.90 €', status: 'Payé' },
          ].map((bill, i) => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-bold text-gray-900">{bill.date}</p>
                <p className="text-xs text-gray-400 font-medium">Facture #NRS-2024-{300-i}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-black text-gray-900">{bill.amount}</span>
                <button className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600"><Download size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
        Modifier mon mode de paiement
      </button>

      {/* Résiliation (éligibilité et préavis gérés côté serveur) */}
      <CancellationCard />
    </div>
  );
};

export default MemberSubscription;
