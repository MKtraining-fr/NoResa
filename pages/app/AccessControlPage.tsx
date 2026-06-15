
import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Key, DoorOpen, ShieldCheck, Clock, 
  History, AlertCircle, Power, Settings, Smartphone,
  Zap, ChevronRight, Activity, Calendar
} from 'lucide-react';

const DOORS = [
  { id: 'd1', name: 'Entrée Principale', status: 'LOCKED', sensor: 'CLOSED', mode: 'AUTO' },
  { id: 'd2', name: 'Zone CrossFit', status: 'UNLOCKED', sensor: 'OPEN', mode: 'MANUAL' },
  { id: 'd3', name: 'Accès Staff / Bureau', status: 'LOCKED', sensor: 'CLOSED', mode: 'AUTO' },
];

const RECENT_ACCESS = [
  { id: 1, user: 'Thomas Pesquet', time: '14:52:05', method: 'QR Code', status: 'SUCCESS' },
  { id: 2, user: 'Marie Curie', time: '14:48:12', method: 'Application', status: 'SUCCESS' },
  { id: 3, user: 'Inconnu', time: '14:35:00', method: 'RFID Invalide', status: 'DENIED' },
];

const AccessControlPage: React.FC = () => {
  const [doors, setDoors] = useState(DOORS);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const toggleDoor = (id: string) => {
    setDoors(prev => prev.map(door => {
      if (door.id === id) {
        return { 
          ...door, 
          status: door.status === 'LOCKED' ? 'UNLOCKED' : 'LOCKED' 
        };
      }
      return door;
    }));
  };

  const toggleEmergency = () => {
    setEmergencyMode(!emergencyMode);
    if (!emergencyMode) {
      // Unlock all doors in emergency
      setDoors(prev => prev.map(d => ({ ...d, status: 'UNLOCKED' })));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <DoorOpen size={18} />
            </span>
            <span>Contrôle d'Accès & Serrures</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gérez le verrouillage magnétique et les accès en temps réel.</p>
        </div>
        
        <button 
          onClick={toggleEmergency}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 ${
            emergencyMode 
              ? 'bg-green-600 text-white shadow-green-100' 
              : 'bg-red-600 text-white shadow-red-100 animate-pulse'
          }`}
        >
          <Power size={18} />
          <span>{emergencyMode ? "RÉINITIALISER LE SYSTÈME" : "DÉVERROUILLAGE D'URGENCE"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Statut des Portes */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doors.map((door) => (
              <div key={door.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-gray-900">{door.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${door.sensor === 'CLOSED' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Capteur : {door.sensor === 'CLOSED' ? 'Porte Fermée' : 'Porte Ouverte'}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-2xl ${door.status === 'LOCKED' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {door.status === 'LOCKED' ? <Lock size={24} /> : <Unlock size={24} />}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode actuel</p>
                    <p className="text-xs font-bold text-indigo-600">{door.mode === 'AUTO' ? 'Verrouillage Automatique' : 'Contrôle Manuel'}</p>
                  </div>
                  <button className="p-2 hover:bg-white rounded-lg transition-all text-gray-400">
                    <Settings size={16} />
                  </button>
                </div>

                <button 
                  onClick={() => toggleDoor(door.id)}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 active:scale-95 ${
                    door.status === 'LOCKED' 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-100' 
                      : 'bg-red-500 text-white shadow-lg shadow-red-100'
                  }`}
                >
                  {door.status === 'LOCKED' ? <Unlock size={16} /> : <Lock size={16} />}
                  <span>{door.status === 'LOCKED' ? 'DÉVERROUILLER' : 'VERROUILLER'}</span>
                </button>
              </div>
            ))}

            {/* Ajouter une porte */}
            <button className="border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-gray-300 hover:border-indigo-100 hover:text-indigo-400 transition-all group min-h-[250px]">
               <div className="bg-gray-50 p-6 rounded-full group-hover:bg-indigo-50 transition-colors mb-4">
                 <Zap size={32} />
               </div>
               <span className="text-xs font-black uppercase tracking-widest">Connecter une nouvelle serrure</span>
            </button>
          </div>

          {/* Programmation Automatique */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                <Clock size={20} className="text-indigo-600" />
                <span>Planification Automatique</span>
              </h3>
              <button className="text-xs font-bold text-indigo-600 hover:underline">Modifier les règles</button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                 <div className="flex items-center space-x-4">
                   <div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm"><Calendar size={20} /></div>
                   <div>
                     <p className="text-sm font-black text-indigo-900">Ouverture Libre (Accueil)</p>
                     <p className="text-xs text-indigo-400 font-bold uppercase">Lun - Ven • 09:00 - 18:00</p>
                   </div>
                 </div>
                 <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-green-600 uppercase">Actif</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 </div>
              </div>
              
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="flex items-center space-x-4">
                   <div className="bg-white p-2.5 rounded-xl text-gray-400 shadow-sm"><Key size={20} /></div>
                   <div>
                     <p className="text-sm font-black text-gray-900">Accès Restreint (CrossFit)</p>
                     <p className="text-xs text-gray-400 font-bold uppercase">Uniquement sur réservation de cours</p>
                   </div>
                 </div>
                 <span className="text-[10px] font-black text-gray-400 uppercase">Automatique</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Historique */}
        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             
             <div className="flex items-center justify-between relative z-10">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2">
                 <History size={16} className="text-indigo-400" />
                 <span>Journal d'accès</span>
               </h3>
               <button className="p-2 hover:bg-white/10 rounded-xl transition-all"><Activity size={16} /></button>
             </div>

             <div className="space-y-6 relative z-10">
               {RECENT_ACCESS.map(access => (
                 <div key={access.id} className="flex items-center justify-between group cursor-pointer">
                   <div className="flex items-center space-x-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${access.status === 'SUCCESS' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                        {access.method === 'QR Code' ? <Smartphone size={18} /> : access.method === 'Application' ? <Zap size={18} /> : <AlertCircle size={18} />}
                     </div>
                     <div>
                       <p className="text-sm font-black truncate w-32 group-hover:text-indigo-400 transition-colors">{access.user}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{access.time} • {access.method}</p>
                     </div>
                   </div>
                   <div className={`text-[10px] font-black px-2 py-0.5 rounded-md ${access.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                     {access.status === 'SUCCESS' ? 'AUTORISÉ' : 'REFUSÉ'}
                   </div>
                 </div>
               ))}
             </div>

             <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center space-x-2">
                <span>Voir le rapport complet</span>
                <ChevronRight size={12} />
             </button>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2">
              <ShieldCheck size={18} />
              <span>Santé du Système</span>
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="opacity-70">Contrôleur Central</span>
                 <span className="text-green-300">OPÉRATIONNEL</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="opacity-70">Synchronisation Cloud</span>
                 <span className="text-green-300">À JOUR</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="opacity-70">Alimentation Secours</span>
                 <span className="text-indigo-300">100% (Sur secteur)</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControlPage;
