
import React, { useState } from 'react';
import { UserPlus, Mail, Shield, MoreVertical, X, Save, Lock } from 'lucide-react';

const TeamPage: React.FC = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe & Staff</h1>
          <p className="text-sm text-gray-500">Gérez les membres de votre équipe et leurs accès.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <UserPlus size={18} />
          <span>Inviter un collaborateur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Marc Power', role: 'Manager', email: 'marc@ironparadise.com', img: 'https://picsum.photos/seed/marc/100/100' },
          { name: 'Sarah Zen', role: 'Coach Yoga', email: 'sarah@ironparadise.com', img: 'https://picsum.photos/seed/sarah/100/100' },
          { name: 'David Strong', role: 'Coach CrossFit', email: 'david@ironparadise.com', img: 'https://picsum.photos/seed/david/100/100' },
        ].map((staff, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <img src={staff.img} className="w-16 h-16 rounded-2xl shadow-inner border border-gray-100" />
              <button className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"><MoreVertical size={20} /></button>
            </div>
            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-bold text-gray-900">{staff.name}</h3>
              <p className="text-sm font-bold text-indigo-600">{staff.role}</p>
              <div className="flex items-center text-xs text-gray-400 space-x-2">
                <Mail size={12} />
                <span>{staff.email}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl">
              <Shield size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Permissions: Admin</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODALE INVITATION COLLABORATEUR */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
               <div className="flex items-center space-x-3">
                 <div className="bg-indigo-600 p-2 rounded-xl"><UserPlus size={20} /></div>
                 <h2 className="text-xl font-black">Nouveau collaborateur</h2>
               </div>
               <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom complet</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Ex: Jean Michel" />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                  <input type="email" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="jean@mail.com" />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rôle & Permissions</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    <option>Coach</option>
                    <option>Manager</option>
                    <option>Accueil / Staff</option>
                  </select>
               </div>
               <div className="p-4 bg-amber-50 rounded-2xl flex items-start space-x-3">
                  <Lock size={16} className="text-amber-600 mt-1 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">Le collaborateur recevra un email pour définir son mot de passe et activer son compte.</p>
               </div>
               <button onClick={() => setIsInviteModalOpen(false)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Envoyer l'invitation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
