import React, { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { getMyMember } from '../lib/memberSelfApi';

/**
 * Garde d'accès pour les sections réservées aux membres actifs (planning, dossier,
 * abonnement…). Un prospect (accès pas encore activé) voit un écran « Accès non
 * disponible » avec un renvoi vers l'activation, au lieu du contenu.
 */
const MemberAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'loading' | 'active' | 'locked'>('loading');

  useEffect(() => {
    let alive = true;
    getMyMember()
      .then((m) => { if (alive) setState((m?.status ?? '').toLowerCase() === 'active' ? 'active' : 'locked'); })
      .catch(() => { if (alive) setState('locked'); });
    return () => { alive = false; };
  }, []);

  if (state === 'loading') {
    return <div className="py-24 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>;
  }

  if (state === 'locked') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Lock size={28} /></div>
        <p className="text-lg font-extrabold text-gray-900">Accès non disponible</p>
        <p className="text-sm text-gray-500 px-8 leading-relaxed">
          Cette section sera accessible dès que tu auras activé ton accès (séance, carnet, mois ou abonnement).
        </p>
        <a href="#/membre" className="mt-1 bg-gray-900 text-white px-5 py-3 rounded-2xl font-extrabold text-[13.5px]">
          Activer mon accès
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default MemberAccessGate;
