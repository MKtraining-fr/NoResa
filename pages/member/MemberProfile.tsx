import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, LogOut, ChevronRight, Pencil, Check, X, Loader2, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyMember, updateMyProfile, type MyMember } from '../../lib/memberSelfApi';
import { supabase } from '../../lib/supabaseClient';

/** Profil adhérent : coordonnées réelles (branchées sur ma fiche) + édition. */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const memberSince = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `Membre depuis ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const initials = (m: MyMember) => `${m.firstName?.[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase() || '?';

const MemberProfile: React.FC = () => {
  const navigate = useNavigate();
  const [member, setMember] = useState<MyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setMember(await getMyMember()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    navigate('/connexion', { replace: true });
  };

  if (loading) return <ProfileSkeleton />;
  if (!member) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="font-bold text-gray-900">Aucune fiche liée à ce compte.</p>
        <p className="text-sm mt-1">Contacte l'accueil pour activer ton espace.</p>
      </div>
    );
  }

  const addressLine = [member.address, [member.postalCode, member.city].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ') || '—';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête */}
      <div className="relative flex flex-col items-center">
        <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-brand to-brand-dark text-white shadow-2xl flex items-center justify-center">
          <span className="text-4xl font-black tracking-tight">{initials(member)}</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mt-5">{member.firstName} {member.lastName}</h2>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand bg-brand-soft px-2.5 py-1 rounded-lg">
            <BadgeCheck size={13} /> N° {member.memberNumber}
          </span>
          {member.subscriptionLabel && (
            <span className="text-[11px] font-bold text-gray-400">{member.subscriptionLabel}</span>
          )}
        </div>
        {memberSince(member.joinDate ?? member.subscriptionStart) && (
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{memberSince(member.joinDate ?? member.subscriptionStart)}</p>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Mes informations</h4>
          {!editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-brand">
              <Pencil size={13} /> Modifier
            </button>
          )}
        </div>

        {editing ? (
          <EditForm member={member} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await load(); }} />
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            <ProfileItem icon={<Mail size={18} />} label="Email" value={member.email || '—'} />
            <ProfileItem icon={<Phone size={18} />} label="Téléphone" value={member.phone || '—'} />
            <ProfileItem icon={<MapPin size={18} />} label="Adresse" value={addressLine} />
          </div>
        )}
      </div>

      {/* Compte */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Compte</h4>
        <div className="bg-white rounded-[2rem] border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
          <button onClick={logout} className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="bg-red-50 p-2 rounded-xl text-red-500 shrink-0"><LogOut size={18} /></div>
              <span className="text-sm font-bold text-red-500">Déconnexion</span>
            </div>
            <ChevronRight size={18} className="text-red-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EditForm: React.FC<{ member: MyMember; onCancel: () => void; onSaved: () => void }> = ({ member, onCancel, onSaved }) => {
  const [phone, setPhone] = useState(member.phone ?? '');
  const [address, setAddress] = useState(member.address ?? '');
  const [city, setCity] = useState(member.city ?? '');
  const [postalCode, setPostalCode] = useState(member.postalCode ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try { await updateMyProfile({ phone, address, city, postalCode }); onSaved(); }
    catch (e: any) { setErr(e?.message || 'Enregistrement impossible.'); setBusy(false); }
  };

  const field = (val: string, setVal: (v: string) => void, ph: string, type = 'text') => (
    <input type={type} value={val} onChange={(e) => setVal(e.target.value)} placeholder={ph}
      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
  );

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-4 shadow-sm space-y-3">
      {err && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">{err}</div>}
      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Téléphone</label>
        <div className="mt-1">{field(phone, setPhone, '06 12 34 56 78', 'tel')}</div>
      </div>
      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adresse</label>
        <div className="mt-1">{field(address, setAddress, "N° et rue")}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CP</label>
          <div className="mt-1">{field(postalCode, setPostalCode, '11400')}</div>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ville</label>
          <div className="mt-1">{field(city, setCity, 'Ville')}</div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 font-medium ml-1">L'e-mail (identifiant de connexion) se modifie auprès de la salle.</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} disabled={busy} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-1.5"><X size={16} /> Annuler</button>
        <button onClick={save} disabled={busy} className="flex-1 bg-brand text-white py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer
        </button>
      </div>
    </div>
  );
};

const ProfileItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center space-x-4 p-5">
    <div className="bg-brand-soft p-2 rounded-xl text-brand shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const ProfileSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex flex-col items-center gap-4">
      <div className="w-28 h-28 rounded-[2.5rem] bg-gray-200" />
      <div className="h-6 w-40 bg-gray-200 rounded-lg" />
    </div>
    <div className="h-44 bg-gray-200 rounded-[2rem]" />
    <div className="h-32 bg-gray-200 rounded-[2rem]" />
  </div>
);

export default MemberProfile;
