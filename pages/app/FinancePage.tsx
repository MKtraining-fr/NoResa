
import React, { useState, useEffect } from 'react';
import { CreditCard, Download, TrendingUp, AlertTriangle, CheckCircle, Wallet, X, Plus, List, Trash2 } from 'lucide-react';

interface FinancePageProps {
  view?: string;
}

const FinancePage: React.FC<FinancePageProps> = ({ view = 'paiements' }) => {
  const [activeView, setActiveView] = useState(view);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    setActiveView(view);
  }, [view]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Trésorerie</h1>
          <p className="text-sm text-gray-500">Suivi détaillé des flux financiers.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsPlanModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            <span>Nouveau plan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><TrendingUp size={24} /></div>
           </div>
           <p className="text-sm font-medium text-gray-500">Taux de recouvrement</p>
           <p className="text-3xl font-black text-gray-900">98.2%</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><AlertTriangle size={24} /></div>
           </div>
           <p className="text-sm font-medium text-gray-500">Paiements en attente</p>
           <p className="text-3xl font-black text-gray-900">12</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="bg-green-50 p-3 rounded-2xl text-green-600"><CheckCircle size={24} /></div>
           </div>
           <p className="text-sm font-medium text-gray-500">Revenu mensuel (MRR)</p>
           <p className="text-3xl font-black text-gray-900">18,540 €</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 border-b border-gray-100 flex items-center">
          <button onClick={() => setActiveView('paiements')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'paiements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Paiements</button>
          <button onClick={() => setActiveView('abonnements')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'abonnements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Abonnements</button>
        </div>

        <div className="p-6">
          {activeView === 'paiements' ? (
            <div className="space-y-4">
               <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 p-2 rounded-lg text-gray-400"><CreditCard size={18} /></div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Transaction #TX-00{i}</p>
                          <p className="text-xs text-gray-500">Client: Jean Dupont</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">49.90 €</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase">Validé</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 { id: 1, name: 'Liberté', price: '29.90', desc: 'Sans engagement.' },
                 { id: 2, name: 'Premium', price: '49.90', desc: 'Engagement 12 mois.' },
               ].map((plan, i) => (
                 <div key={i} onClick={() => { setSelectedPlan(plan); setIsPlanModalOpen(true); }} className="p-6 rounded-3xl border border-indigo-50 bg-indigo-50/20 space-y-4 cursor-pointer hover:shadow-xl transition-all">
                    <h3 className="text-lg font-black text-indigo-900">{plan.name}</h3>
                    <p className="text-2xl font-black text-gray-900">{plan.price} €</p>
                    <p className="text-sm text-gray-600">{plan.desc}</p>
                    <button className="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Détails de l'offre</button>
                 </div>
               ))}
               <button onClick={() => { setSelectedPlan(null); setIsPlanModalOpen(true); }} className="p-6 rounded-3xl border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center text-indigo-400 hover:border-indigo-600 hover:text-indigo-600 transition-all">
                  <Plus size={32} />
                  <span className="text-sm font-bold">Ajouter un plan</span>
               </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALE PLAN D'ABONNEMENT */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
               <h2 className="text-xl font-black">{selectedPlan ? 'Modifier le plan' : 'Nouveau plan d\'abonnement'}</h2>
               <button onClick={() => setIsPlanModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom de l'offre</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={selectedPlan?.name} placeholder="Ex: Premium 12 mois" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix mensuel (€)</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={selectedPlan?.price} placeholder="49.90" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                      <option>Mensuel</option>
                      <option>Annuel</option>
                      <option>Carnet de séances</option>
                    </select>
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <textarea rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={selectedPlan?.desc}></textarea>
               </div>
               <div className="flex space-x-3">
                  {selectedPlan && (
                    <button className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
                  )}
                  <button onClick={() => setIsPlanModalOpen(false)} className="flex-grow py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Enregistrer l'offre</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
