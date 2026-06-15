
import React, { useState, useEffect } from 'react';
import { 
  Cctv, Maximize2, Play, Pause, Circle, Settings, 
  Search, Shield, LayoutGrid, List, AlertTriangle, 
  Clock, X, ChevronRight, Eye, RefreshCcw
} from 'lucide-react';

const CAMERAS = [
  { id: 'cam1', name: 'Entrée Principale', zone: 'Accueil', status: 'Online', ip: '192.168.1.10' },
  { id: 'cam2', name: 'Plateau Musculation', zone: 'Espace Force', status: 'Online', ip: '192.168.1.11' },
  { id: 'cam3', name: 'Zone Cardio', zone: 'Étage 1', status: 'Online', ip: '192.168.1.12' },
  { id: 'cam4', name: 'Studio CrossFit', zone: 'Annexe', status: 'Online', ip: '192.168.1.13' },
  { id: 'cam5', name: 'Vestiaires Hommes', zone: 'Services', status: 'Online', ip: '192.168.1.14' },
  { id: 'cam6', name: 'Parking Extérieur', zone: 'Extérieur', status: 'Online', ip: '192.168.1.15' },
];

const RECENT_ALERTS = [
  { id: 1, type: 'Mouvement', cam: 'Entrée Principale', time: 'Il y a 2 min', priority: 'Low' },
  { id: 2, type: 'Accès Non Autorisé', cam: 'Studio CrossFit', time: 'Il y a 15 min', priority: 'High' },
  { id: 3, type: 'Mouvement', cam: 'Parking Extérieur', time: 'Il y a 45 min', priority: 'Medium' },
];

const SurveillancePage: React.FC = () => {
  const [selectedCam, setSelectedCam] = useState<any>(null);
  const [isGridMode, setIsGridMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <Cctv size={18} />
            </span>
            <span>Centre de Vidéosurveillance</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Surveillance en temps réel des zones sensibles du club.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm hidden md:flex items-center space-x-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-black text-gray-700 font-mono tracking-widest">{currentTime}</span>
          </div>
          <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full">
        
        {/* Grille des Caméras */}
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 w-full max-w-xs group focus-within:ring-2 focus-within:ring-indigo-500/10">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="Rechercher une caméra..." className="bg-transparent border-none outline-none text-xs ml-2 w-full font-bold" />
            </div>
            <div className="flex items-center bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setIsGridMode(true)}
                className={`p-2 rounded-lg transition-all ${isGridMode ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setIsGridMode(false)}
                className={`p-2 rounded-lg transition-all ${!isGridMode ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <div className={`grid gap-6 ${isGridMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {CAMERAS.map((cam) => (
              <div 
                key={cam.id} 
                className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800 group relative aspect-video cursor-pointer hover:ring-4 hover:ring-indigo-500/20 transition-all"
                onClick={() => setSelectedCam(cam)}
              >
                {/* Simulation Flux Vidéo */}
                <img 
                  src={`https://picsum.photos/seed/${cam.id}/640/360`} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  alt={cam.name}
                />
                
                {/* Overlays */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center animate-pulse">
                    <Circle size={8} className="fill-current mr-1" /> LIVE
                  </div>
                  <span className="bg-black/50 backdrop-blur-md text-white px-2 py-0.5 rounded text-[9px] font-bold">CH {cam.id.slice(-1)}</span>
                </div>

                <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white transition-all"><Maximize2 size={14} /></button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="text-white">
                    <p className="text-xs font-black uppercase tracking-widest">{cam.name}</p>
                    <p className="text-[10px] text-white/50 font-bold">{cam.zone} • {cam.ip}</p>
                  </div>
                  <div className="bg-green-500/20 text-green-400 p-1.5 rounded-lg backdrop-blur-sm border border-green-500/20">
                     <Eye size={14} />
                  </div>
                </div>

                {/* Scanlines Effect Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Alertes & Status */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center space-x-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <span>Alertes Récentes</span>
            </h3>
            <div className="space-y-3">
               {RECENT_ALERTS.map(alert => (
                 <div key={alert.id} className={`p-4 rounded-2xl border transition-all ${alert.priority === 'High' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${alert.priority === 'High' ? 'text-red-600' : 'text-gray-400'}`}>{alert.type}</p>
                      <span className="text-[9px] font-bold text-gray-400">{alert.time}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-700">{alert.cam}</p>
                    {alert.priority === 'High' && (
                       <button className="mt-2 text-[10px] font-black text-red-600 flex items-center hover:underline">
                         VOIR LE CLIP <ChevronRight size={12} className="ml-1" />
                       </button>
                    )}
                 </div>
               ))}
            </div>
            <button className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Consulter l'historique</button>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl text-white space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <h3 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2 relative z-10">
               <Shield size={16} className="text-indigo-400" />
               <span>Statut Système</span>
             </h3>
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-400">Stockage NVR</span>
                   <span className="text-xs font-black">74%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-indigo-500 h-full w-[74%] rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Connexion</p>
                      <p className="text-[10px] font-black text-green-400 uppercase mt-1">SÉCURISÉE</p>
                   </div>
                   <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Backup</p>
                      <p className="text-[10px] font-black text-indigo-400 uppercase mt-1">CLOUD ACTIF</p>
                   </div>
                </div>
             </div>
             <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2">
               <RefreshCcw size={12} />
               <span>Redémarrer le NVR</span>
             </button>
          </div>
        </div>
      </div>

      {/* MODALE PLEIN ECRAN CAMÉRA */}
      {selectedCam && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col border border-slate-800">
              
              <div className="p-8 bg-black/40 text-white flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="bg-red-600 p-2 rounded-xl animate-pulse"><Circle size={16} className="fill-current" /></div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{selectedCam.name}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedCam.zone} • {selectedCam.ip} • 4K ULTRA HD</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCam(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
              </div>

              <div className="flex-grow bg-black relative flex items-center justify-center min-h-[500px]">
                 <img 
                    src={`https://picsum.photos/seed/${selectedCam.id}/1280/720`} 
                    className="max-w-full max-h-full object-contain opacity-90"
                    alt={selectedCam.name}
                 />
                 
                 {/* Simulation Interface Caméra */}
                 <div className="absolute inset-0 flex flex-col justify-between p-10 pointer-events-none">
                    <div className="flex justify-between items-start">
                       <div className="text-white font-mono text-xs font-bold tracking-widest p-4 bg-black/20 rounded-lg">
                          00:14:52:08<br/>
                          F2.8 1/60 ISO400
                       </div>
                       <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-3 pointer-events-auto">
                          <button className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl text-white shadow-lg"><Maximize2 size={18} /></button>
                          <button className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all"><Play size={18} /></button>
                          <button className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all"><RefreshCcw size={18} /></button>
                       </div>
                    </div>
                    <div className="flex justify-center">
                       <div className="bg-white/5 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/5 flex items-center space-x-12 pointer-events-auto">
                          <button className="text-white/50 hover:text-white transition-all"><Clock size={20}/></button>
                          <div className="flex items-center space-x-6">
                            <button className="text-white/50 hover:text-white transition-all"><Pause size={20}/></button>
                            <div className="w-32 h-1 bg-white/20 rounded-full relative overflow-hidden">
                               <div className="absolute inset-0 bg-indigo-500 w-full animate-pulse"></div>
                            </div>
                            <span className="text-[10px] font-black text-white/50 font-mono">LIVE FEED</span>
                          </div>
                          <button className="text-white/50 hover:text-white transition-all"><Settings size={20}/></button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SurveillancePage;
