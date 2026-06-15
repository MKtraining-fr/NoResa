
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, Users, Activity, X, Save, Trash2, Star } from 'lucide-react';

interface PlanningPageProps {
  view?: string;
}

const PlanningPage: React.FC<PlanningPageProps> = ({ view = 'calendrier' }) => {
  const [activeView, setActiveView] = useState(view);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  useEffect(() => {
    setActiveView(view);
  }, [view]);

  const handleOpenCourse = (course?: any) => {
    setSelectedCourse(course || null);
    setIsCourseModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning & Activités</h1>
          <p className="text-sm text-gray-500">Gérez vos créneaux et affectations.</p>
        </div>
        <button 
          onClick={() => activeView === 'coachs' ? null : setIsEventModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Plus size={18} />
          <span>{activeView === 'coachs' ? 'Ajouter coach' : 'Nouvel événement'}</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 overflow-hidden">
        <div className="flex bg-gray-50 p-1 rounded-2xl mb-8 w-fit">
          {['Calendrier', 'Cours', 'Coachs'].map(v => (
            <button 
              key={v}
              onClick={() => setActiveView(v.toLowerCase())}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === v.toLowerCase() ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {activeView === 'calendrier' && (
           <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center space-x-4">
                   <h2 className="text-xl font-bold text-gray-900">Mars 2024</h2>
                   <div className="flex items-center space-x-1">
                     <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} className="text-gray-400" /></button>
                     <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} className="text-gray-400" /></button>
                   </div>
                 </div>
              </div>
              <div className="grid grid-cols-8 gap-1 border-t border-gray-100 pt-1">
                <div className="py-4"></div>
                {['LUN 11', 'MAR 12', 'MER 13', 'JEU 14', 'VEN 15', 'SAM 16', 'DIM 17'].map(day => (
                  <div key={day} className="py-4 text-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{day}</span>
                  </div>
                ))}
                {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(time => (
                  <React.Fragment key={time}>
                    <div className="py-8 text-[10px] font-black text-gray-400 text-right pr-4 tracking-widest">{time}</div>
                    {[1, 2, 3, 4, 5, 6, 7].map(col => (
                      <div key={`${time}-${col}`} className="border-t border-l border-gray-50 relative group min-h-[100px] hover:bg-gray-50/50 transition-colors">
                        {time === '10:00' && col === 2 && (
                          <div onClick={() => setIsEventModalOpen(true)} className="absolute inset-1 bg-indigo-600 rounded-2xl p-3 shadow-lg cursor-pointer animate-in zoom-in duration-500">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">WOD</p>
                            <p className="text-[9px] font-bold text-indigo-100 mt-1">10:00 - 11:30</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
           </div>
        )}

        {activeView === 'cours' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { id: 1, title: 'CrossFit', icon: <Activity className="text-red-500" />, slots: 15, duration: '60 min' },
               { id: 2, title: 'Yoga Vinyasa', icon: <Activity className="text-teal-500" />, slots: 20, duration: '75 min' },
             ].map((c, i) => (
               <div key={i} onClick={() => handleOpenCourse(c)} className="p-6 rounded-[2rem] border border-gray-100 bg-gray-50/30 hover:shadow-xl cursor-pointer transition-all group">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">{c.icon}</div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{c.title}</h3>
                  <div className="flex items-center space-x-4 text-xs font-bold text-gray-400">
                     <span className="flex items-center"><Users size={14} className="mr-1" /> {c.slots} pers.</span>
                     <span className="flex items-center"><Clock size={14} className="mr-1" /> {c.duration}</span>
                  </div>
               </div>
             ))}
             <button onClick={() => handleOpenCourse()} className="p-6 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                <Plus size={32} />
                <span className="text-sm font-bold">Nouveau type de cours</span>
             </button>
          </div>
        )}
      </div>

      {/* MODALE EVENEMENT (Session spécifique) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
               <h2 className="text-xl font-black">Planifier une séance</h2>
               <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type de cours</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    <option>CrossFit WOD</option>
                    <option>Yoga Vinyasa</option>
                    <option>BodyPump</option>
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Heure début</label>
                    <input type="time" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue="10:00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coach</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                      <option>David Strong</option>
                      <option>Sarah Zen</option>
                    </select>
                  </div>
               </div>
               <button onClick={() => setIsEventModalOpen(false)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Ajouter au planning</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE COURS (Template) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-800 text-white flex justify-between items-center">
               <h2 className="text-xl font-black">{selectedCourse ? 'Modifier le cours' : 'Nouveau type de cours'}</h2>
               <button onClick={() => setIsCourseModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom de l'activité</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={selectedCourse?.title} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacité max</label>
                    <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={selectedCourse?.slots || 15} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durée (min)</label>
                    <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" defaultValue={60} />
                  </div>
               </div>
               <div className="flex space-x-3">
                  {selectedCourse && (
                    <button className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
                  )}
                  <button onClick={() => setIsCourseModalOpen(false)} className="flex-grow py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Enregistrer</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningPage;
