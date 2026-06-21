import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, MessageCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyMember, type MyMember } from '../../lib/memberSelfApi';

/** Parrainage : le membre partage son code, l'équipe applique l'offre. */
const MemberParrainage: React.FC = () => {
  const [member, setMember] = useState<MyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { getMyMember().then((m) => { setMember(m); setLoading(false); }); }, []);

  if (loading) return <div className="py-20 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>;
  if (!member) return <div className="text-center py-20 text-gray-500 font-semibold">Profil introuvable.</div>;

  const code = (member.referralCode || member.memberNumber || '').toString();
  const shareText = `Rejoins-moi à la salle ! Donne mon code parrainage « ${code} » à l'inscription, on gagne tous les deux 🎁`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const share = async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ text: shareText }); } catch {}
    } else { copy(); }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Parrainage</h2>
        <p className="text-sm text-gray-500 font-semibold">Invite un proche, gagnez tous les deux</p>
      </div>

      {/* Carte offre */}
      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-[2rem] p-6 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <Gift size={28} className="relative" />
        <p className="relative text-2xl font-extrabold mt-3 leading-tight">1 mois offert<br />pour vous deux</p>
        <p className="relative text-xs opacity-90 font-semibold mt-2">Ton filleul s'inscrit avec ton code, et vous recevez chacun un mois offert.</p>
      </div>

      {/* Code */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Mon code parrainage</p>
        <div className="flex items-center justify-between mt-2 gap-3">
          <span className="text-2xl font-extrabold tracking-widest text-gray-900">{code}</span>
          <button onClick={copy} className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <button onClick={share} className="w-full bg-brand text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
        <Share2 size={16} /> Partager mon code
      </button>
      <Link to="/membre/messagerie" className="w-full bg-white border border-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
        <MessageCircle size={16} /> Prévenir l'équipe
      </Link>
      <p className="text-[11px] text-gray-400 font-semibold text-center px-4">L'offre est appliquée par l'équipe à l'inscription de ton filleul.</p>
    </div>
  );
};

export default MemberParrainage;
