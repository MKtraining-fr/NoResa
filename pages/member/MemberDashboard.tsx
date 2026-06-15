
import React from 'react';
import { QrCode, Calendar, Clock, ChevronRight, Award, Zap, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const MemberDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header / Profile Card */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Salut, Thomas 👋</h2>
          <p className="text-sm text-gray-500">Aujourd'hui, c'est ta journée Leg Day !</p>
        </div>
        <img 
          src="https://picsum.photos/seed/thomas/100/100" 
          alt="Thomas" 
          className="w-14 h-14 rounded-2xl shadow-lg ring-4 ring-white"
        />
      </div>

      {/* Access QR Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-6">Pass d'accès rapide</p>
          <div className="bg-white p-6 rounded-3xl shadow-inner mb-6 transform hover:scale-105 transition-transform duration-500">
             {/* Mocking QR Code with lucide or simple div */}
             <div className="w-32 h-32 bg-gray-50 flex items-center justify-center border-4 border-white rounded-xl">
               <QrCode size={100} className="text-gray-900" />
             </div>
          </div>
          <h3 className="text-xl font-extrabold mb-1">Thomas Pesquet</h3>
          <p className="text-sm opacity-90 mb-4">Abonnement Gold • Actif</p>
          <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md">
             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold uppercase tracking-wider">Salle ouverte jusqu'à 22h</span>
          </div>
        </div>
      </div>

      {/* Daily Challenge / Highlight */}
      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-center space-x-4">
        <div className="bg-amber-400 p-3 rounded-2xl">
          <Award size={24} className="text-white" />
        </div>
        <div className="flex-grow">
          <p className="text-amber-800 text-sm font-bold">Challenge de la semaine</p>
          <p className="text-amber-700 text-xs">Fais 3 séances cette semaine pour gagner 10 pts !</p>
        </div>
        <div className="text-right">
          <p className="text-amber-900 font-extrabold">2/3</p>
        </div>
      </div>

      {/* Next Session */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-extrabold text-gray-900">Prochaine séance</h4>
          <Link to="/membre/reservations" className="text-indigo-600 text-xs font-bold uppercase hover:underline">Voir tout</Link>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md transition-all">
          <div className="flex items-center space-x-4">
            <div className="bg-red-50 text-red-500 w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0">
               <p className="text-[10px] font-bold">MAR</p>
               <p className="text-lg font-extrabold leading-none">12</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900">Crossfit WOD</p>
              <div className="flex items-center text-xs text-gray-500 space-x-3 mt-0.5">
                <span className="flex items-center"><Clock size={12} className="mr-1" /> 18:30</span>
                <span className="flex items-center"><Calendar size={12} className="mr-1" /> Coach David</span>
              </div>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>

      {/* Quick Actions / Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
          <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">14</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Séances ce mois</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
          <div className="bg-green-50 text-green-600 w-10 h-10 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">78.5 kg</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Poids actuel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
