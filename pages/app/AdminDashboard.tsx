
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  Users, CreditCard, Calendar, TrendingUp, ArrowUpRight, 
  ArrowDownRight, Activity, UserPlus, X, Save, ShieldAlert, 
  MapPin, Phone, Mail, Briefcase, HeartPulse, Target,
  Image as ImageIcon, CheckCircle2, UserCheck
} from 'lucide-react';
import { MOCK_REVENUE_DATA } from '../../constants.tsx';

const AdminDashboard: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [trialSession, setTrialSession] = useState(false);

  const stats = [
    { label: 'Membres Actifs', value: '1,284', trend: '+12%', positive: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Revenu Mensuel', value: '18,540 €', trend: '+8.4%', positive: true, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Réservations/Sem', value: '450', trend: '-2%', positive: false, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Taux de Conversion', value: '64%', trend: '+5%', positive: true, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-sm text-gray-500">Bienvenue, voici un aperçu de l'activité de votre salle aujourd'hui.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Exporter</button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            <UserPlus size={18} />
            <span>Ajouter un Membre</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stat.positive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                {stat.trend}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Évolution du Revenu</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Activité Récente</h3>
          <div className="space-y-6 flex-grow overflow-y-auto pwa-hide-scrollbar">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="bg-gray-100 w-10 h-10 rounded-xl overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/${i+10}/40/40`} alt="User" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-bold text-gray-900">Nouveau prospect</p>
                  <p className="text-xs text-gray-500">Prise de contact via site web.</p>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">5 min</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALE AJOUT COMPLET (Prospect / Membre) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Nouveau Contact</h2>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-0.5">Enregistrement & Qualification</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleAddMember} className="flex-grow overflow-y-auto p-8 space-y-10 pwa-hide-scrollbar">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* Colonne 1: Identité & Contact */}
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Users size={14} /> <span>1. Informations Personnelles</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                      <input type="text" required placeholder="Jean" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                      <input type="text" required placeholder="Dupont" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date de Naissance</label>
                      <input type="date" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Métier</label>
                      <input type="text" placeholder="Ingénieur, Chef..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                    <input type="email" required placeholder="jean.dupont@email.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Téléphone</label>
                    <input type="tel" required placeholder="06 12 34 56 78" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adresse Postale</label>
                    <textarea rows={2} placeholder="12 rue des Lilas, 75000 Paris" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"></textarea>
                  </div>
                </div>

                {/* Colonne 2: Qualification & Profiling */}
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Target size={14} /> <span>2. Qualification & Statut</span>
                  </h3>

                  <div className="space-y-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Étape du tunnel de vente</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'PROSPECT_NEW', label: 'Nouveau Prospect (Prise de contact)', color: 'bg-blue-100 text-blue-700' },
                        { id: 'PROSPECT_FOLLOWUP', label: 'Prospect Relancé', color: 'bg-amber-100 text-amber-700' },
                        { id: 'MEMBER_ACTIVE', label: 'Client / Membre Actif', color: 'bg-green-100 text-green-700' },
                      ].map(status => (
                        <label key={status.id} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-transparent hover:border-indigo-200 cursor-pointer transition-all">
                          <input type="radio" name="status" value={status.id} defaultChecked={status.id === 'PROSPECT_NEW'} className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold">{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm"><Activity size={20} /></div>
                      <div>
                        <p className="text-sm font-black text-indigo-900">Séance d'essai</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase">A-t-il déjà testé la salle ?</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setTrialSession(!trialSession)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${trialSession ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${trialSession ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes additionnelles</label>
                    <textarea rows={4} placeholder="Motivation, limitations physiques, parrainage..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"></textarea>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-8 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-4 text-gray-400 font-bold text-sm hover:text-gray-600">Annuler</button>
               <button 
                onClick={handleAddMember}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
               >
                 <Save size={18} />
                 <span>Enregistrer le contact</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
