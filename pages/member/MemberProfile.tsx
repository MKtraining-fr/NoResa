
import React from 'react';
import { User, Mail, Phone, MapPin, Camera, LogOut, ChevronRight, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MemberProfile: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <img src="https://picsum.photos/seed/thomas/200/200" className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl" />
          <button className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg border-4 border-white">
            <Camera size={18} />
          </button>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mt-6">Thomas Pesquet</h2>
        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Membre depuis Janvier 2023</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Informations personnelles</h4>
        <div className="bg-white rounded-[2rem] border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
          <ProfileItem icon={<Mail size={18} />} label="Email" value="thomas.p@esa.int" />
          <ProfileItem icon={<Phone size={18} />} label="Téléphone" value="+33 6 12 34 56 78" />
          <ProfileItem icon={<MapPin size={18} />} label="Adresse" value="ISS, Espace lointain" />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Compte</h4>
        <div className="bg-white rounded-[2rem] border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
          <ActionItem icon={<Share2 size={18} className="text-indigo-600" />} label="Parrainer un ami" />
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-red-50 p-2 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-bold text-red-500">Déconnexion</span>
            </div>
            <ChevronRight size={18} className="text-red-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center space-x-4 p-5">
    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 shrink-0">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const ActionItem = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
    <div className="flex items-center space-x-4">
      <div className="bg-indigo-50 p-2 rounded-xl shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-sm font-bold text-gray-900">{label}</span>
    </div>
    <ChevronRight size={18} className="text-gray-300" />
  </button>
);

export default MemberProfile;
