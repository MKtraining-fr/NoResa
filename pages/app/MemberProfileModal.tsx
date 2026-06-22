import React, { useEffect, useState } from 'react';
import { X, Phone, Mail, MapPin, CreditCard, Layers, Hash, KeyRound, Calendar, ExternalLink, Ticket, Loader2, ShieldAlert } from 'lucide-react';
import { getMemberById, getPhotoUrl } from '../../lib/membersApi';
import { getPackStatus, PackStatus } from '../../lib/accessApi';

const eur = (n?: number | null) => (n == null ? '—' : `${Number(n).toFixed(2).replace('.', ',')} €`);
const nameOf = (m: any) => `${m?.firstName || ''} ${m?.lastName || ''}`.trim() || 'Adhérent';
const initials = (m: any) => `${(m?.firstName || '?')[0] || ''}${(m?.lastName || '')[0] || ''}`.toUpperCase();

const Line: React.FC<{ icon: React.ReactNode; label: string; value?: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2.5 py-1.5">
    <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
    </div>
  </div>
);

const MemberProfileModal: React.FC<{ memberId: string; onClose: () => void }> = ({ memberId, onClose }) => {
  const [member, setMember] = useState<any | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pack, setPack] = useState<PackStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await getMemberById(memberId);
      if (!alive) return;
      setMember(m); setLoading(false);
      if (m?.photoPath) getPhotoUrl(m.photoPath).then((u) => alive && setPhoto(u)).catch(() => {});
      getPackStatus(memberId).then((p) => alive && setPack(p)).catch(() => {});
    })();
    return () => { alive = false; };
  }, [memberId]);

  const period = member && (member.subscriptionStart || member.subscriptionEnd)
    ? `${member.subscriptionStart || '—'} → ${member.subscriptionEnd || '—'}`
    : undefined;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[88vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          {photo
            ? <img src={photo} alt="" className="w-12 h-12 rounded-full object-cover" />
            : <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-base font-semibold">{member ? initials(member) : '…'}</div>}
          <div className="min-w-0 flex-grow">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-gray-900 truncate">{member ? nameOf(member) : 'Chargement…'}</p>
              {member?.accessBlocked && <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg"><ShieldAlert size={11} /> Bloqué</span>}
            </div>
            {member?.memberNumber && <p className="text-xs text-gray-400">N° {member.memberNumber}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : !member ? (
            <p className="py-8 text-center text-sm text-gray-400">Fiche introuvable.</p>
          ) : (
            <div className="space-y-4">
              {/* Accès bloqué + motif */}
              {member.accessBlocked && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                  <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Accès bloqué</p>
                    <p className="text-sm font-semibold text-red-900 break-words">{member.accessBlockReason || 'Sans motif précisé'}</p>
                  </div>
                </div>
              )}

              {/* Abonnement */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Abonnement</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{member.subscription || '—'}</p>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{eur(member.price)}</p>
                </div>
                {member.paymentMethod && <p className="text-[11px] text-gray-400 mt-0.5">{member.paymentMethod}</p>}
                {period && <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Calendar size={11} /> {period}</p>}
                {pack?.is_pack && (
                  <p className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
                    <Ticket size={12} /> {pack.remaining} / {pack.total} séances restantes
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Line icon={<Layers size={15} />} label="Groupe" value={member.groupName ? `${member.groupName}${member.subgroupName ? ` · ${member.subgroupName}` : ''}` : '—'} />
                <Line icon={<Hash size={15} />} label="Badge" value={member.cardNumber || '—'} />
                <Line icon={<KeyRound size={15} />} label="Code clavier" value={member.keypadCode || '—'} />
                <Line icon={<CreditCard size={15} />} label="Prélèvement" value={member.gocardlessStatus ? 'GoCardless' : '—'} />
                <Line icon={<Mail size={15} />} label="Email" value={member.email} />
                <Line icon={<Phone size={15} />} label="Téléphone" value={member.phone} />
                <Line icon={<MapPin size={15} />} label="Adresse" value={member.address} />
              </div>
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl">Fermer</button>
          <button
            onClick={() => { window.location.hash = `#/app/crm?member=${memberId}`; }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"
          >
            <ExternalLink size={15} /> Fiche complète
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;
