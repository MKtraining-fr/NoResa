
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Filter, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { MOCK_SESSIONS } from '../../constants.tsx';

const MemberReservations: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const days = [
    { name: 'Lun', date: 11 },
    { name: 'Mar', date: 12 },
    { name: 'Mer', date: 13 },
    { name: 'Jeu', date: 14 },
    { name: 'Ven', date: 15 },
    { name: 'Sam', date: 16 },
  ];

  const handleBook = (id: string) => {
    setBookingSuccess(id);
    setTimeout(() => setBookingSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-gray-900">Réservations</h2>
        <button className="p-2 bg-gray-100 rounded-xl">
          <Filter size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Week Selector */}
      <div className="flex justify-between items-center py-4 bg-white rounded-3xl border border-gray-100 px-4 shadow-sm">
        <button className="p-1 hover:bg-gray-50 rounded-lg"><ChevronLeft size={20} className="text-gray-400" /></button>
        <div className="flex space-x-2 overflow-x-auto pwa-hide-scrollbar">
          {days.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              className={`flex flex-col items-center min-w-[50px] py-3 rounded-2xl transition-all ${
                selectedDay === day.date 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">{day.name}</span>
              <span className="text-lg font-black">{day.date}</span>
            </button>
          ))}
        </div>
        <button className="p-1 hover:bg-gray-50 rounded-lg"><ChevronRight size={20} className="text-gray-400" /></button>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {MOCK_SESSIONS.map((session) => (
          <div 
            key={session.id} 
            className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
          >
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              session.type === 'Cardio' ? 'bg-red-500' : 
              session.type === 'Mobilité' ? 'bg-teal-500' : 'bg-indigo-500'
            }`}></div>
            
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    session.type === 'Cardio' ? 'bg-red-50 text-red-600' : 
                    session.type === 'Mobilité' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {session.type}
                  </span>
                  <p className="text-xs text-gray-400 font-bold">{session.booked}/{session.capacity} places</p>
                </div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">{session.title}</h3>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center"><Clock size={16} className="mr-1.5 text-indigo-600" /> {session.start} - {session.end}</div>
                  <div className="flex items-center"><CalendarIcon size={16} className="mr-1.5 text-indigo-600" /> {session.coach}</div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                 {bookingSuccess === session.id ? (
                    <div className="flex flex-col items-center text-green-600 animate-in zoom-in duration-300">
                      <CheckCircle2 size={32} />
                      <span className="text-[10px] font-bold mt-1">RESERVÉ</span>
                    </div>
                 ) : (
                    <button 
                      disabled={session.booked >= session.capacity}
                      onClick={() => handleBook(session.id)}
                      className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
                        session.booked >= session.capacity 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:-translate-y-1'
                      }`}
                    >
                      {session.booked >= session.capacity ? 'Complet' : 'Réserver'}
                    </button>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Information Banner */}
      <div className="bg-indigo-50 rounded-3xl p-6 text-indigo-700 text-xs font-medium leading-relaxed">
        <strong>Important :</strong> Vous pouvez annuler votre réservation jusqu'à 2 heures avant le début du cours. Au-delà, la séance sera décomptée de votre crédit.
      </div>
    </div>
  );
};

export default MemberReservations;
