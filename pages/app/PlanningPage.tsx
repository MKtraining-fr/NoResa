import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Clock, Users, X, Save, Trash2, Loader2,
  Calendar, UserPlus, Search, Repeat, Pencil,
} from 'lucide-react';
import {
  adminListSessions, sessionRoster, adminBookMember, adminCancelMember,
  listClassTypes, upsertClassType, deleteClassType,
  listRecurrences, upsertRecurrence, deleteRecurrence,
  createSession, deleteSession, generateSessions, hhmm,
  type AdminSession, type RosterEntry, type ClassType, type Recurrence,
} from '../../lib/planningApi';
import { getMembers } from '../../lib/membersApi';
import { Member } from '../../types';

const DOW = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const DOW_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const WEEKDAY_OPTS = [1, 2, 3, 4, 5, 6, 0]; // Lun..Dim (JS getDay)
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = x.getDay(); x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day)); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const fmtDay = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()}`;

const PlanningPage: React.FC<{ view?: string }> = ({ view = 'calendrier' }) => {
  const [tab, setTab] = useState<'planning' | 'cours'>(view === 'cours' ? 'cours' : 'planning');
  useEffect(() => { setTab(view === 'cours' ? 'cours' : 'planning'); }, [view]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning & cours</h1>
          <p className="text-sm text-gray-500">Créneaux, réservations et liste d'attente — synchronisés avec l'app adhérent.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
          {(['planning', 'cours'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'planning' ? 'Planning' : 'Cours'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'planning' ? <PlanningTab /> : <CoursesTab />}
    </div>
  );
};

// =========================== Planning (semaine) ============================

const SessionChip: React.FC<{ s: AdminSession; onClick: () => void }> = ({ s, onClick }) => {
  const full = s.bookedCount >= s.capacity;
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl p-2.5 border border-gray-100 bg-white hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
        <span className="font-bold text-sm text-gray-900 truncate">{s.typeName}</span>
        <span className="ml-auto text-[11px] font-bold text-gray-400">{hhmm(s.startsAt)}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${full ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{s.bookedCount}/{s.capacity}</span>
        {s.waitlistCount > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600">+{s.waitlistCount}</span>}
        {s.coachName && <span className="text-[11px] text-gray-400 truncate max-w-full">{s.coachName}</span>}
      </div>
    </button>
  );
};

const PlanningTab: React.FC = () => {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [types, setTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterFor, setRosterFor] = useState<AdminSession | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const range = useMemo(() => {
    if (mode === 'week') {
      const ws = startOfWeek(anchor);
      return { from: ws, to: addDays(ws, 7), gridStart: ws, count: 7 };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gs = startOfWeek(first);
    return { from: gs, to: addDays(gs, 42), gridStart: gs, count: 42 };
  }, [mode, anchor]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, t] = await Promise.all([adminListSessions(range.from, range.to), listClassTypes()]);
    setSessions(s); setTypes(t); setLoading(false);
  }, [range.from, range.to]);
  useEffect(() => { reload(); }, [reload]);

  const move = (dir: number) => {
    if (mode === 'week') setAnchor(addDays(anchor, dir * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  };
  const cells = useMemo(() => Array.from({ length: range.count }, (_, i) => addDays(range.gridStart, i)), [range.gridStart, range.count]);
  const sessionsOf = (d: Date) => sessions.filter((s) => sameDay(new Date(s.startsAt), d));
  const label = mode === 'week'
    ? `${range.gridStart.getDate()} ${range.gridStart.toLocaleDateString('fr-FR', { month: 'short' })} – ${addDays(range.gridStart, 6).getDate()} ${addDays(range.gridStart, 6).toLocaleDateString('fr-FR', { month: 'short' })}`
    : anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={18} className="text-gray-500" /></button>
          <h2 className="text-base font-bold text-gray-900 min-w-[11rem] text-center capitalize">{label}</h2>
          <button onClick={() => move(1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={18} className="text-gray-500" /></button>
          <button onClick={() => setAnchor(new Date())} className="ml-1 text-xs font-bold text-gray-500 hover:text-indigo-600 px-2 py-1">Aujourd'hui</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['week', 'month'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>{m === 'week' ? 'Semaine' : 'Mois'}</button>
            ))}
          </div>
          <button onClick={() => setNewOpen(true)} disabled={types.length === 0} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} /> <span className="hidden sm:inline">Nouveau créneau</span></button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Chargement…</div>
      ) : mode === 'week' ? (
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div className="grid grid-cols-7 gap-2 min-w-[780px]">
            {cells.map((d) => {
              const items = sessionsOf(d);
              const today = sameDay(d, new Date());
              return (
                <div key={d.toISOString()} className={`rounded-2xl border p-2 min-h-[280px] ${today ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-100'}`}>
                  <p className={`text-xs font-extrabold uppercase tracking-wide mb-2 px-0.5 text-center ${today ? 'text-indigo-600' : 'text-gray-500'}`}>{fmtDay(d)}</p>
                  {items.length === 0 ? <p className="text-[11px] text-gray-300 text-center py-2">—</p> : (
                    <div className="space-y-2">{items.map((s) => <SessionChip key={s.id} s={s} onClick={() => setRosterFor(s)} />)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((d) => <div key={d} className="text-center text-[10px] font-extrabold uppercase tracking-wide text-gray-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const items = sessionsOf(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const today = sameDay(d, new Date());
              return (
                <div key={d.toISOString()} className={`min-h-[84px] rounded-xl border p-1.5 ${today ? 'border-indigo-300 bg-indigo-50/30' : inMonth ? 'border-gray-100' : 'border-gray-50 bg-gray-50/40'}`}>
                  <p className={`text-[11px] font-bold mb-1 px-0.5 ${inMonth ? 'text-gray-700' : 'text-gray-300'}`}>{d.getDate()}</p>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((s) => {
                      const full = s.bookedCount >= s.capacity;
                      return (
                        <button key={s.id} onClick={() => setRosterFor(s)} title={`${s.typeName} ${hhmm(s.startsAt)} · ${s.bookedCount}/${s.capacity}`} className="w-full flex items-center gap-1 rounded-md px-1 py-0.5 text-left hover:opacity-80" style={{ background: `${s.color}1a` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-[10px] font-bold text-gray-700 truncate">{hhmm(s.startsAt)} {s.typeName}</span>
                          <span className={`ml-auto text-[9px] font-bold ${full ? 'text-red-600' : 'text-gray-400'}`}>{s.bookedCount}/{s.capacity}</span>
                        </button>
                      );
                    })}
                    {items.length > 3 && <p className="text-[9px] font-bold text-gray-400 px-1">+{items.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rosterFor && <RosterModal session={rosterFor} onClose={() => setRosterFor(null)} onChanged={reload} />}
      {newOpen && <NewSessionModal types={types} onClose={() => setNewOpen(false)} onSaved={reload} />}
    </div>
  );
};

// =========================== Roster (inscrits) =============================

const RosterModal: React.FC<{ session: AdminSession; onClose: () => void; onChanged: () => void }> = ({ session, onClose, onChanged }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dt = new Date(session.startsAt);

  const load = useCallback(async () => { setLoading(true); setRoster(await sessionRoster(session.id)); setLoading(false); }, [session.id]);
  useEffect(() => { load(); }, [load]);

  const booked = roster.filter((r) => r.status === 'booked');
  const waitlist = roster.filter((r) => r.status === 'waitlist');

  const remove = async (memberId: string) => {
    setBusy(memberId);
    try { await adminCancelMember(session.id, memberId); await load(); onChanged(); }
    catch (e: any) { alert(e?.message || 'Erreur'); } finally { setBusy(null); }
  };
  const del = async () => {
    if (!confirm('Supprimer ce créneau et toutes ses réservations ?')) return;
    try { await deleteSession(session.id); onChanged(); onClose(); }
    catch (e: any) { alert(e?.message || 'Erreur'); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[88vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: session.color }} />
          <div className="min-w-0 flex-grow">
            <p className="font-bold text-gray-900 truncate">{session.typeName}</p>
            <p className="text-xs text-gray-500 capitalize">{DOW_FULL[dt.getDay()]} {dt.getDate()}/{dt.getMonth() + 1} · {hhmm(session.startsAt)}–{hhmm(session.endsAt)}</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${booked.length >= session.capacity ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{booked.length}/{session.capacity}</span>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-8 flex justify-center text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Inscrits ({booked.length})</p>
                {booked.length === 0 ? <p className="text-sm text-gray-300">Personne pour l'instant.</p> : (
                  <div className="space-y-1.5">{booked.map((r) => <RosterRow key={r.bookingId} r={r} busy={busy === r.memberId} onRemove={() => remove(r.memberId)} />)}</div>
                )}
              </div>
              {waitlist.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-orange-500 mb-2">Liste d'attente ({waitlist.length})</p>
                  <div className="space-y-1.5">{waitlist.map((r, i) => <RosterRow key={r.bookingId} r={r} rank={i + 1} busy={busy === r.memberId} onRemove={() => remove(r.memberId)} />)}</div>
                </div>
              )}
              {adding
                ? <MemberPicker exclude={roster.map((r) => r.memberId)} onPick={async (m) => { setBusy(m.id); try { await adminBookMember(session.id, m.id); setAdding(false); await load(); onChanged(); } catch (e: any) { alert(e?.message || 'Erreur'); } finally { setBusy(null); } }} onCancel={() => setAdding(false)} />
                : <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl py-3 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600"><UserPlus size={16} /> Inscrire un client</button>}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
          <button onClick={del} className="flex items-center gap-1.5 text-sm font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl"><Trash2 size={15} /> Supprimer le créneau</button>
          <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl">Fermer</button>
        </div>
      </div>
    </div>
  );
};

const RosterRow: React.FC<{ r: RosterEntry; rank?: number; busy: boolean; onRemove: () => void }> = ({ r, rank, busy, onRemove }) => (
  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
      {rank ?? `${(r.firstName[0] || '')}${(r.lastName[0] || '')}`.toUpperCase()}
    </div>
    <div className="min-w-0 flex-grow">
      <p className="text-sm font-bold text-gray-900 truncate">{r.firstName} {r.lastName}</p>
      {r.memberNumber && <p className="text-[11px] text-gray-400">n° {r.memberNumber}</p>}
    </div>
    <button onClick={onRemove} disabled={busy} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}</button>
  </div>
);

const MemberPicker: React.FC<{ exclude: string[]; onPick: (m: Member) => void; onCancel: () => void }> = ({ exclude, onPick, onCancel }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { getMembers().then(setMembers).catch(() => {}); }, []);
  const ex = new Set(exclude);
  const list = members
    .filter((m) => !ex.has(m.id))
    .filter((m) => `${m.firstName} ${m.lastName} ${m.memberNumber ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 30);
  return (
    <div className="border-2 border-indigo-200 rounded-2xl p-3 bg-indigo-50/30">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-grow">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client…" className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1">
        {list.length === 0 ? <p className="text-xs text-gray-400 py-2 text-center">Aucun client.</p> : list.map((m) => (
          <button key={m.id} onClick={() => onPick(m)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-left">
            <span className="text-sm font-semibold text-gray-900">{m.firstName} {m.lastName}</span>
            {m.memberNumber && <span className="text-[11px] text-gray-400">n° {m.memberNumber}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

const NewSessionModal: React.FC<{ types: ClassType[]; onClose: () => void; onSaved: () => void }> = ({ types, onClose, onSaved }) => {
  const [classTypeId, setClassTypeId] = useState(types[0]?.id ?? '');
  const ct = types.find((t) => t.id === classTypeId);
  const [when, setWhen] = useState('');
  const [capacity, setCapacity] = useState(ct?.capacity ?? 12);
  const [coach, setCoach] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    if (!classTypeId || !when) { setErr('Choisis un cours et une date/heure.'); return; }
    setBusy(true);
    try {
      const id = await createSession({ classTypeId, startsAt: new Date(when).toISOString(), durationMin: ct?.durationMin ?? 60, capacity, coachName: coach || null });
      if (!id) { setErr('Un créneau existe déjà à cet horaire.'); setBusy(false); return; }
      onSaved(); onClose();
    } catch (e: any) { setErr(e?.message || 'Erreur'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg text-gray-900">Nouveau créneau</h3><button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button></div>
        {err && <p className="text-sm text-red-600 font-medium mb-3">{err}</p>}
        <div className="space-y-3">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cours</label>
            <select value={classTypeId} onChange={(e) => { setClassTypeId(e.target.value); const t = types.find((x) => x.id === e.target.value); if (t) setCapacity(t.capacity); }} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none">
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date & heure</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Capacité</label>
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Coach (facultatif)</label>
            <input type="text" value={coach} onChange={(e) => setCoach(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
        </div>
        <button onClick={save} disabled={busy} className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer le créneau</button>
      </div>
    </div>
  );
};

// =========================== Cours + récurrences ===========================

const CoursesTab: React.FC = () => {
  const [types, setTypes] = useState<ClassType[]>([]);
  const [recs, setRecs] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseModal, setCourseModal] = useState<ClassType | null | 'new'>(null);
  const [recModal, setRecModal] = useState<Recurrence | null | 'new'>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [t, r] = await Promise.all([listClassTypes(), listRecurrences()]);
    setTypes(t); setRecs(r); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const delCourse = async (id: string) => {
    if (!confirm('Supprimer ce cours, ses créneaux et toutes les réservations associées ?')) return;
    try { await deleteClassType(id); reload(); } catch (e: any) { alert(e?.message || 'Erreur'); }
  };
  const delRec = async (id: string) => {
    if (!confirm('Supprimer cette récurrence ? (les créneaux déjà créés restent)')) return;
    try { await deleteRecurrence(id); reload(); } catch (e: any) { alert(e?.message || 'Erreur'); }
  };

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Chargement…</div>;

  return (
    <div className="space-y-6">
      {/* Cours */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Types de cours</h2>
          <button onClick={() => setCourseModal('new')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700"><Plus size={16} /> Nouveau cours</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((t) => (
            <div key={t.id} className="rounded-2xl border border-gray-100 p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${t.color}1a`, color: t.color }}><Calendar size={18} /></span>
                  <div><p className="font-extrabold text-gray-900">{t.name}</p>{!t.active && <span className="text-[10px] font-bold text-gray-400 uppercase">inactif</span>}</div></div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setCourseModal(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => delCourse(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button></div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs font-bold text-gray-400">
                <span className="flex items-center gap-1"><Users size={13} /> {t.capacity} pl.</span>
                <span className="flex items-center gap-1"><Clock size={13} /> {t.durationMin} min</span>
              </div>
            </div>
          ))}
          {types.length === 0 && <p className="text-sm text-gray-400 col-span-full py-4">Aucun cours. Crée le premier.</p>}
        </div>
      </div>

      {/* Récurrences */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1"><h2 className="font-bold text-gray-900 flex items-center gap-2"><Repeat size={17} className="text-indigo-500" /> Créneaux récurrents</h2>
          <button onClick={() => setRecModal('new')} disabled={types.length === 0} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} /> Ajouter</button></div>
        <p className="text-xs text-gray-400 mb-4">Les créneaux sont générés automatiquement ~8 semaines à l'avance.</p>
        <div className="space-y-2">
          {recs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3">
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center shrink-0"><span className="text-[10px] font-extrabold">{DOW[r.weekday]}</span></span>
              <div className="min-w-0 flex-grow">
                <p className="font-bold text-sm text-gray-900 truncate">{r.typeName} <span className="text-gray-400 font-medium">· {DOW_FULL[r.weekday]} {r.startTime}</span></p>
                <p className="text-[11px] text-gray-400">{r.durationMin} min{r.capacity ? ` · ${r.capacity} pl.` : ''}{r.coachName ? ` · ${r.coachName}` : ''}{r.active ? '' : ' · inactif'}</p>
              </div>
              <button onClick={() => setRecModal(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={14} /></button>
              <button onClick={() => delRec(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>
          ))}
          {recs.length === 0 && <p className="text-sm text-gray-400 py-2">Aucune récurrence.</p>}
        </div>
      </div>

      {courseModal && <CourseModal course={courseModal === 'new' ? null : courseModal} onClose={() => setCourseModal(null)} onSaved={reload} />}
      {recModal && <RecurrenceModal rec={recModal === 'new' ? null : recModal} types={types} onClose={() => setRecModal(null)} onSaved={reload} />}
    </div>
  );
};

const COLORS = ['#E11D2A', '#4F46E5', '#0EA5E9', '#16A34A', '#F59E0B', '#9333EA', '#DB2777', '#0F172A'];

const CourseModal: React.FC<{ course: ClassType | null; onClose: () => void; onSaved: () => void }> = ({ course, onClose, onSaved }) => {
  const [name, setName] = useState(course?.name ?? '');
  const [color, setColor] = useState(course?.color ?? COLORS[0]);
  const [capacity, setCapacity] = useState(course?.capacity ?? 12);
  const [duration, setDuration] = useState(course?.durationMin ?? 60);
  const [active, setActive] = useState(course?.active ?? true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async () => {
    if (!name.trim()) { setErr('Nom requis.'); return; }
    setBusy(true); setErr('');
    try { await upsertClassType({ id: course?.id, name: name.trim(), color, durationMin: duration, capacity, active }); onSaved(); onClose(); }
    catch (e: any) { setErr(e?.message || 'Erreur'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg text-gray-900">{course ? 'Modifier le cours' : 'Nouveau cours'}</h3><button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button></div>
        {err && <p className="text-sm text-red-600 font-medium mb-3">{err}</p>}
        <div className="space-y-3">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" placeholder="Ex. Hyrox" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Capacité</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Durée (min)</label>
              <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          </div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Couleur</label>
            <div className="flex flex-wrap gap-2 mt-1.5">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`} style={{ background: c }} />)}</div></div>
          <label className="flex items-center gap-2 cursor-pointer pt-1"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" /><span className="text-sm font-semibold text-gray-700">Actif (visible côté adhérent)</span></label>
        </div>
        <button onClick={save} disabled={busy} className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button>
      </div>
    </div>
  );
};

const RecurrenceModal: React.FC<{ rec: Recurrence | null; types: ClassType[]; onClose: () => void; onSaved: () => void }> = ({ rec, types, onClose, onSaved }) => {
  const [classTypeId, setClassTypeId] = useState(rec?.classTypeId ?? types[0]?.id ?? '');
  const ct = types.find((t) => t.id === classTypeId);
  const [weekday, setWeekday] = useState(rec?.weekday ?? 2);
  const [time, setTime] = useState(rec?.startTime ?? '18:30');
  const [duration, setDuration] = useState(rec?.durationMin ?? ct?.durationMin ?? 60);
  const [capacity, setCapacity] = useState<number | ''>(rec?.capacity ?? '');
  const [coach, setCoach] = useState(rec?.coachName ?? '');
  const [active, setActive] = useState(rec?.active ?? true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async () => {
    if (!classTypeId) { setErr('Choisis un cours.'); return; }
    setBusy(true); setErr('');
    try {
      await upsertRecurrence({ id: rec?.id, classTypeId, weekday, startTime: time, durationMin: duration, capacity: capacity === '' ? null : Number(capacity), coachName: coach || null, active });
      onSaved(); onClose();
    } catch (e: any) { setErr(e?.message || 'Erreur'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg text-gray-900">{rec ? 'Modifier la récurrence' : 'Nouvelle récurrence'}</h3><button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button></div>
        {err && <p className="text-sm text-red-600 font-medium mb-3">{err}</p>}
        <div className="space-y-3">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cours</label>
            <select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none">{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Jour</label>
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none">{WEEKDAY_OPTS.map((w) => <option key={w} value={w}>{DOW_FULL[w]}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Durée (min)</label>
              <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Capacité</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`défaut ${ct?.capacity ?? ''}`} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          </div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Coach (facultatif)</label>
            <input value={coach} onChange={(e) => setCoach(e.target.value)} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" /></div>
          <label className="flex items-center gap-2 cursor-pointer pt-1"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" /><span className="text-sm font-semibold text-gray-700">Active</span></label>
        </div>
        <button onClick={save} disabled={busy} className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer & générer</button>
      </div>
    </div>
  );
};

export default PlanningPage;
