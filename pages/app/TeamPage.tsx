import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, X, Loader2, RefreshCw, Trash2, ShieldCheck, IdCard, Mail, Phone } from 'lucide-react';
import { listStaff, createMember, patchMember } from '../../lib/membersApi';
import type { Member } from '../../types';

const initials = (f?: string, l?: string) => (`${(f || '')[0] || ''}${(l || '')[0] || ''}`).toUpperCase() || '·';

const TeamPage: React.FC = () => {
  const [staff, setStaff] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', cardNumber: '' });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setStaff(await listStaff());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm({ firstName: '', lastName: '', email: '', phone: '', cardNumber: '' }); setErr(''); setOpen(false); };

  const add = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setErr('Prénom et nom obligatoires.'); return; }
    setBusy(true); setErr('');
    try {
      await createMember({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
        cardNumber: form.cardNumber.trim() || undefined,
        staff: true,
      });
      reset(); await load();
    } catch (e: any) { setErr(e?.message || 'Création impossible.'); }
    finally { setBusy(false); }
  };

  const remove = async (m: Member) => {
    if (!window.confirm(`Retirer ${m.firstName} ${m.lastName} de l'équipe ?`)) return;
    setBusy(true);
    try { await patchMember(m.id, { archived_at: new Date().toISOString() }); await load(); }
    catch (e: any) { alert(e?.message || 'Suppression impossible.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe & Staff</h1>
          <p className="text-sm text-gray-500">Vos collaborateurs. Ils badgent pour entrer mais n'apparaissent pas dans le contrôle d'accès ni les listes membres. Ils sont proposés comme commercial à l'inscription.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser
          </button>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700">
            <UserPlus size={18} /> Ajouter un collaborateur
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Nouveau collaborateur</h2>
            <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Prénom" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Nom" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email (facultatif)" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Téléphone (facultatif)" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <input value={form.cardNumber} onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))} placeholder="N° de badge (facultatif)" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 sm:col-span-2" />
          </div>
          {err && <p className="text-[12px] font-semibold text-red-600">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={add} disabled={busy} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Ajouter
            </button>
            <button onClick={reset} className="text-sm font-semibold text-gray-400 px-3">Annuler</button>
          </div>
          <p className="text-[11px] text-gray-400">Un n° de collaborateur et un code d'accès sont générés automatiquement (comme un membre), mais ce profil reste masqué des vues membres.</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center text-gray-300"><Loader2 size={22} className="animate-spin" /></div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-3xl">
          Aucun collaborateur. Ajoutez votre équipe pour pouvoir l'attribuer comme commercial à l'inscription.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((m) => (
            <div key={m.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">{initials(m.firstName, m.lastName)}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 truncate">{m.firstName} {m.lastName}</h3>
                  <p className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1"><ShieldCheck size={12} /> Collaborateur</p>
                </div>
                <button onClick={() => remove(m)} disabled={busy} className="p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50" title="Retirer"><Trash2 size={16} /></button>
              </div>
              <div className="space-y-1 text-[12px] text-gray-500">
                {m.memberNumber && <p className="flex items-center gap-1.5"><IdCard size={13} className="text-gray-400" /> N° {m.memberNumber}{m.cardNumber ? ` · badge ${m.cardNumber}` : ''}</p>}
                {m.email && <p className="flex items-center gap-1.5 truncate"><Mail size={13} className="text-gray-400" /> {m.email}</p>}
                {m.phone && <p className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {m.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPage;
