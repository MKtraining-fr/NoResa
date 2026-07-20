
import React from 'react';
import { Bell, Calendar, CreditCard, Gift, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MemberNotifications: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-extrabold text-gray-900">Notifications</h2>
      </div>

      <div className="space-y-4">
        <NotificationCard 
          icon={<Calendar className="text-indigo-600" />}
          title="Rappel de cours"
          desc="Votre séance 'Crossfit WOD' commence dans 1 heure ! N'oubliez pas votre serviette."
          time="Il y a 10 min"
          unread={true}
        />
        <NotificationCard 
          icon={<CreditCard className="text-green-600" />}
          title="Paiement réussi"
          desc="Le prélèvement de 49.90 € pour votre abonnement de Mars a été confirmé."
          time="Hier, 10:45"
          unread={false}
        />
        <NotificationCard 
          icon={<Gift className="text-amber-600" />}
          title="Nouveau Challenge !"
          desc="Participez au challenge 'Leg Day Master' et grimpez au classement de la salle."
          time="8 Mars 2024"
          unread={false}
        />
      </div>

      <div className="text-center py-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aucune autre notification</p>
      </div>
    </div>
  );
};

const NotificationCard = ({ icon, title, desc, time, unread }: { icon: React.ReactNode, title: string, desc: string, time: string, unread: boolean }) => (
  <div className={`p-6 rounded-[2rem] border transition-all ${unread ? 'bg-indigo-50/30 border-indigo-100 shadow-indigo-100 shadow-sm' : 'bg-white border-gray-100'}`}>
    <div className="flex items-start space-x-4">
      <div className={`p-3 rounded-2xl shrink-0 ${unread ? 'bg-indigo-100 shadow-sm' : 'bg-gray-50'}`}>
        {icon}
      </div>
      <div className="flex-grow space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-gray-900">{title}</h3>
          {unread && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">{time}</p>
      </div>
    </div>
  </div>
);

export default MemberNotifications;
