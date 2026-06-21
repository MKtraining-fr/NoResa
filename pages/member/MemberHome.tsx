import React, { useEffect, useState } from 'react';
import { QrCode, FileText, MapPin, Gift, Megaphone, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';            // npm i qrcode.react
import {
  getMyMember, getHourlyOccupancy, affluenceLevel,
  type MyMember, type HourOccupancy,
} from '../../lib/memberSelfApi';

/**
 * Écran d'accueil de l'espace adhérent (remplace le MemberDashboard mocké).
 * Branché sur memberSelfApi : fiche réelle + QR réel + affluence en direct.
 * Charte "La Salle" : rouge (#E11D2A ≈ red-600).
 */
const MemberHome: React.FC = () => {
  const [member, setMember] = useState<MyMember | null>(null);
  const [occ, setOcc] = useState<HourOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [m, o] = await Promise.all([getMyMember(), getHourlyOccupancy()]);
      setMember(m); setOcc(o); setLoading(false);
    })();
  }, []);

  if (loading) return <HomeSkeleton />;
  if (!member) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="font-bold text-gray-900">Aucune fiche liée à ce compte.</p>
        <p className="text-sm mt-1">Contacte l'accueil pour activer ton espace.</p>
      </div>
    );
  }

  const active = (member.status ?? '').toLowerCase() === 'active';
  const aff = affluenceLevel(occ);
  const maxEntries = Math.max(1, ...occ.map((o) => o.entries));
  const nowH = new Date().getHours();
  const toneClass =
    aff.tone === 'low' ? 'text-green-700 bg-green-50'
    : aff.tone === 'mid' ? 'text-orange-600 bg-orange-50'
    : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Salutation */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Salut, {member.firstName} 👋</h2>
        <p className="text-sm text-gray-500">Prêt pour ta séance ?</p>
      </div>

      {/* Pass d'accès */}
      <button
        onClick={() => setQrOpen(true)}
        className="w-full text-left bg-gradient-to-br from-brand to-brand-dark rounded-[2rem] p-5 text-white relative overflow-hidden shadow-2xl shadow-gray-200 active:scale-[0.99] transition-transform"
      >
        <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-lg">
            <QRCodeSVG value={member.qrCode || member.memberNumber} size={72} level="M" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Mon accès</p>
            <p className="text-lg font-extrabold leading-tight mt-0.5">{member.firstName} {member.lastName}</p>
            <p className="text-xs opacity-90 font-semibold">
              {member.subscriptionLabel ?? 'Abonnement'} · {active ? 'Actif' : 'Inactif'}
            </p>
            <span className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-lg mt-2 backdrop-blur">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-wide">N° {member.memberNumber}</span>
            </span>
          </div>
        </div>
        <p className="relative mt-3 text-[11px] font-bold opacity-85 flex items-center gap-1.5">
          <Maximize2 size={13} /> Appuie pour afficher en plein écran
        </p>
      </button>

      {/* Affluence en direct */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
            <span className="font-extrabold text-sm text-gray-900">Affluence en direct</span>
          </div>
          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg ${toneClass}`}>
            {aff.label} · {aff.pct}%
          </span>
        </div>
        <div className="flex items-end gap-1 h-14">
          {occ.slice(6, 23).map((o) => (
            <div
              key={o.hour}
              className={`flex-1 rounded-md ${o.hour === nowH ? 'bg-brand' : 'bg-gray-200'}`}
              style={{ height: `${Math.max(6, (o.entries / maxEntries) * 100)}%` }}
              title={`${o.hour}h · ${o.entries} entrées`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-semibold">
          <span>7h</span><span>13h</span><span>18h</span><span>22h</span>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction to="/membre/dossier" icon={FileText} tint="indigo" title="Mon dossier" sub="Contrat & factures" />
        <QuickAction to="/membre/infos" icon={MapPin} tint="green" title="Infos salle" sub="Accès & contact" />
        <QuickAction to="/membre/parrainage" icon={Gift} tint="purple" title="Parrainage" sub="1 mois offert" />
        <QuickAction to="/membre/notifications" icon={Megaphone} tint="orange" title="Annonces" sub="Nouveautés" />
      </div>

      {/* Overlay QR plein écran */}
      {qrOpen && (
        <QrOverlay member={member} active={active} onClose={() => setQrOpen(false)} />
      )}
    </div>
  );
};

// --- Sous-composants --------------------------------------------------------

const TINTS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

const QuickAction: React.FC<{
  to: string; icon: React.ElementType; tint: string; title: string; sub: string;
}> = ({ to, icon: Icon, tint, title, sub }) => (
  <Link to={to} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TINTS[tint]}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="font-extrabold text-sm text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-400 font-semibold">{sub}</p>
    </div>
  </Link>
);

const QrOverlay: React.FC<{ member: MyMember; active: boolean; onClose: () => void }> = ({ member, active, onClose }) => {
  // NB : pour garder l'écran allumé en version native (Capacitor), réinstalle
  // @capacitor-community/keep-awake puis vois CAPACITOR-SETUP.md §5a.
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] p-7 w-full max-w-xs text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Scanne pour entrer</p>
        <p className="text-xl font-extrabold text-gray-900 mt-1">{member.firstName} {member.lastName}</p>
        <div className="my-5 mx-auto w-fit p-4 border border-gray-100 rounded-3xl shadow-inner">
          <QRCodeSVG value={member.qrCode || member.memberNumber} size={200} level="M" />
        </div>
        <span className="inline-flex items-center gap-2 bg-green-50 px-3.5 py-2 rounded-xl">
          <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          <span className="text-xs font-extrabold text-green-700">
            {member.subscriptionLabel ?? 'Abonnement'} · {active ? 'Actif' : 'Inactif'}
          </span>
        </span>
        <p className="text-[11px] text-gray-400 font-semibold mt-3">Présente ce QR au lecteur · monte la luminosité 💡</p>
        <button onClick={onClose} className="mt-5 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2">
          <X size={16} /> Fermer
        </button>
      </div>
    </div>
  );
};

const HomeSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-40 bg-gray-200 rounded-lg" />
    <div className="h-36 bg-gray-200 rounded-[2rem]" />
    <div className="h-32 bg-gray-200 rounded-3xl" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-28 bg-gray-200 rounded-3xl" />
      <div className="h-28 bg-gray-200 rounded-3xl" />
    </div>
  </div>
);

export default MemberHome;
