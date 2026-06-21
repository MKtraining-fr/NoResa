import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2 } from 'lucide-react';
import { getMyMember, type MyMember } from '../../lib/memberSelfApi';

/** Mon QR d'accès, plein écran (cible du bouton central de la barre du bas). */
const MemberQr: React.FC = () => {
  const [m, setM] = useState<MyMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMyMember().then((x) => { setM(x); setLoading(false); }); }, []);

  if (loading) return <div className="py-24 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>;
  if (!m) return <div className="text-center py-24 text-gray-500 font-semibold">Profil introuvable.</div>;

  const active = (m.status ?? '').toLowerCase() === 'active';

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Mon accès</p>
      <p className="text-2xl font-extrabold text-gray-900">{m.firstName} {m.lastName}</p>
      <div className="p-5 bg-white border border-gray-100 rounded-[2rem] shadow-2xl shadow-gray-200">
        <QRCodeSVG value={m.qrCode || m.memberNumber} size={240} level="M" />
      </div>
      <span className="inline-flex items-center gap-2 bg-green-50 px-3.5 py-2 rounded-xl">
        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        <span className="text-xs font-extrabold text-green-700">{m.subscriptionLabel ?? 'Abonnement'} · {active ? 'Actif' : 'Inactif'}</span>
      </span>
      <p className="text-[11px] text-gray-400 font-semibold text-center px-8">
        Présente ce QR au lecteur du tourniquet · monte la luminosité de l'écran 💡
      </p>
    </div>
  );
};

export default MemberQr;
