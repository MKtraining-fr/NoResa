import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Clock, Navigation, Loader2 } from 'lucide-react';
import { getMyGym, type MyGym } from '../../lib/memberSelfApi';

/** Infos salle : adresse, contact, horaires d'ouverture. */
const DAYS = [
  { i: 1, l: 'Lundi' }, { i: 2, l: 'Mardi' }, { i: 3, l: 'Mercredi' },
  { i: 4, l: 'Jeudi' }, { i: 5, l: 'Vendredi' }, { i: 6, l: 'Samedi' }, { i: 0, l: 'Dimanche' },
];

const MemberInfos: React.FC = () => {
  const [gym, setGym] = useState<MyGym | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMyGym().then((g) => { setGym(g); setLoading(false); }); }, []);

  if (loading) return <div className="py-20 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>;
  if (!gym) return <div className="text-center py-20 text-gray-500 font-semibold">Salle introuvable.</div>;

  const fullAddress = [gym.address, [gym.postalCode, gym.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const todayIdx = new Date().getDay();
  const hours = gym.openingHours ?? [];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        {gym.logoUrl
          ? <img src={gym.logoUrl} alt="" className="w-12 h-12 rounded-2xl object-contain border border-gray-100" />
          : <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white font-extrabold">{(gym.displayName || gym.name || 'S')[0]}</div>}
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">{gym.displayName || gym.name}</h2>
          <p className="text-xs text-gray-500 font-semibold">Infos & contact</p>
        </div>
      </div>

      {/* Adresse */}
      {fullAddress && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
          target="_blank" rel="noreferrer"
          className="block bg-white border border-gray-100 rounded-3xl p-4 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0"><MapPin size={18} /></div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Adresse</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{fullAddress}</p>
              <span className="inline-flex items-center gap-1 text-brand text-xs font-bold mt-1"><Navigation size={12} /> Itinéraire</span>
            </div>
          </div>
        </a>
      )}

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <a href={gym.phone ? `tel:${gym.phone}` : undefined} className={`bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col gap-2 ${gym.phone ? 'active:scale-[0.98]' : 'opacity-60'} transition-transform`}>
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Phone size={16} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400">Téléphone</p>
            <p className="text-xs font-bold text-gray-900 truncate">{gym.phone || 'Non renseigné'}</p>
          </div>
        </a>
        <a href={gym.email ? `mailto:${gym.email}` : undefined} className={`bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col gap-2 ${gym.email ? 'active:scale-[0.98]' : 'opacity-60'} transition-transform`}>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Mail size={16} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400">E-mail</p>
            <p className="text-xs font-bold text-gray-900 truncate">{gym.email || 'Non renseigné'}</p>
          </div>
        </a>
      </div>

      {/* Horaires */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-brand" />
          <span className="font-extrabold text-sm text-gray-900">Horaires d'ouverture</span>
        </div>
        {hours.length === 0 ? (
          <p className="text-xs text-gray-400 font-semibold">Horaires non renseignés.</p>
        ) : (
          <div className="space-y-1.5">
            {DAYS.map(({ i, l }) => {
              const d = hours.find((h: any) => h.day === i);
              const isToday = i === todayIdx;
              return (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl ${isToday ? 'bg-brand-soft' : ''}`}>
                  <span className={`text-xs font-bold ${isToday ? 'text-brand' : 'text-gray-700'}`}>{l}{isToday ? " · aujourd'hui" : ''}</span>
                  <span className={`text-xs font-bold ${d && !d.closed ? 'text-gray-900' : 'text-gray-400'}`}>
                    {!d || d.closed ? 'Fermé' : `${d.open} – ${d.close}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberInfos;
