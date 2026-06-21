import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import {
  listSessions, myBookings, bookSession, cancelBooking,
  hhmm, typesFrom, type Session, type MyBooking,
} from '../../lib/planningApi';

/**
 * Planning adhérent (remplace le MemberReservations mocké).
 * Vue Jour / Semaine, filtres par type, jauges de places, réservation +
 * liste d'attente. Branché sur planningApi (RPC sécurisées).
 * Charte "La Salle" : rouge.
 */

const DOW = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const MemberReservations: React.FC = () => {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(startOfDay(new Date())); // jour sélectionné
  const [filter, setFilter] = useState('Tous');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mine, setMine] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // id du créneau en cours
  const [toast, setToast] = useState('');

  // fenêtre de chargement : la semaine de l'ancre (lun→dim) couvre jour ET semaine
  const weekStart = useMemo(() => {
    const day = anchor.getDay(); // 0=dim
    const diff = (day === 0 ? -6 : 1) - day; // ramener au lundi
    return addDays(anchor, diff);
  }, [anchor]);

  const reload = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        listSessions(weekStart, addDays(weekStart, 7)),
        myBookings(),
      ]);
      setSessions(s); setMine(b);
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { setLoading(true); reload(); }, [reload]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const onToggle = async (s: Session) => {
    setBusy(s.id);
    try {
      if (s.myStatus) { await cancelBooking(s.id); flash('Réservation annulée'); }
      else {
        const r = await bookSession(s.id);
        flash(r === 'waitlist' ? "Ajouté à la liste d'attente ⏳" : 'Place réservée ✓');
      }
      await reload();
    } catch (e: any) {
      flash(e?.message ?? 'Erreur, réessaie');
    } finally { setBusy(null); }
  };

  const types = useMemo(() => ['Tous', ...typesFrom(sessions)], [sessions]);
  const match = (s: Session) => filter === 'Tous' || s.typeName === filter;

  // 7 jours de la semaine pour le sélecteur
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const daySessions = sessions.filter(
    (s) => startOfDay(new Date(s.startsAt)).getTime() === anchor.getTime() && match(s)
  );

  const weekGroups = days
    .map((d) => ({ day: d, items: sessions.filter((s) => startOfDay(new Date(s.startsAt)).getTime() === d.getTime() && match(s)) }))
    .filter((g) => g.items.length);

  if (loading) return <PlanningSkeleton />;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toggle jour / semaine */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        {(['day', 'week'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            {v === 'day' ? 'Jour' : 'Semaine'}
          </button>
        ))}
      </div>

      {/* Sélecteur de jour (vue jour) */}
      {view === 'day' && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
          {days.map((d) => {
            const sel = d.getTime() === anchor.getTime();
            return (
              <button key={d.toISOString()} onClick={() => setAnchor(d)}
                className={`shrink-0 w-12 py-2.5 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${sel ? 'bg-brand text-white' : 'bg-white border border-gray-100 text-gray-900'}`}>
                <span className={`text-[9px] font-extrabold ${sel ? 'text-white/70' : 'text-gray-400'}`}>{DOW[d.getDay()]}</span>
                <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all ${filter === t ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Mes réservations à venir */}
      {mine.length > 0 && (
        <div className="bg-brand-soft border border-gray-100 rounded-3xl p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand mb-2.5">Mes réservations à venir</p>
          <div className="space-y-2">
            {mine.map((b) => (
              <div key={b.sessionId} className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5">
                <DateChip iso={b.startsAt} />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-gray-900 truncate">{b.typeName}</p>
                  <p className="text-[11px] text-gray-500 font-semibold">{hhmm(b.startsAt)} · {b.coachName ?? '—'}</p>
                </div>
                {b.myStatus === 'waitlist'
                  ? <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">En attente</span>
                  : <span className="text-[10px] font-extrabold text-green-700 bg-green-50 px-2 py-1 rounded-lg">Réservé</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste vue JOUR */}
      {view === 'day' && (
        daySessions.length
          ? <div className="space-y-3">{daySessions.map((s) => <SessionCard key={s.id} s={s} busy={busy === s.id} onToggle={onToggle} />)}</div>
          : <Empty />
      )}

      {/* Agenda vue SEMAINE */}
      {view === 'week' && (
        weekGroups.length
          ? <div className="space-y-5">
              {weekGroups.map((g) => (
                <div key={g.day.toISOString()}>
                  <p className="text-[12px] font-extrabold uppercase tracking-wide text-gray-500 mb-2">
                    {DOW[g.day.getDay()]} {g.day.getDate()}
                  </p>
                  <div className="space-y-2">
                    {g.items.map((s) => <SessionRow key={s.id} s={s} busy={busy === s.id} onToggle={onToggle} />)}
                  </div>
                </div>
              ))}
            </div>
          : <Empty />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
};

// --- Sous-composants --------------------------------------------------------

const DateChip: React.FC<{ iso: string }> = ({ iso }) => {
  const d = new Date(iso);
  return (
    <div className="w-10 h-10 rounded-xl bg-brand-soft flex flex-col items-center justify-center shrink-0">
      <span className="text-[8px] font-extrabold text-brand">{DOW[d.getDay()]}</span>
      <span className="text-base font-extrabold text-brand leading-none">{d.getDate()}</span>
    </div>
  );
};

const BookBtn: React.FC<{ s: Session; busy: boolean; onToggle: (s: Session) => void; mini?: boolean }> = ({ s, busy, onToggle, mini }) => {
  const full = s.spotsLeft <= 0;
  let cls = 'bg-brand text-white border-brand', label = 'Réserver';
  if (s.myStatus === 'booked') { cls = 'bg-green-50 text-green-700 border-green-200'; label = mini ? '✓' : 'Réservé ✓'; }
  else if (s.myStatus === 'waitlist') { cls = 'bg-orange-50 text-orange-600 border-orange-200'; label = mini ? '⏳' : 'En attente'; }
  else if (full) { cls = 'bg-white text-brand border-gray-300'; label = mini ? 'Attente' : "Liste d'attente"; }
  const size = mini ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
  return (
    <button disabled={busy} onClick={() => onToggle(s)}
      className={`shrink-0 ${size} rounded-xl font-extrabold border transition-all active:scale-95 disabled:opacity-60 ${cls}`}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : label}
    </button>
  );
};

const SessionCard: React.FC<{ s: Session; busy: boolean; onToggle: (s: Session) => void }> = ({ s, busy, onToggle }) => {
  const full = s.spotsLeft <= 0;
  const pct = Math.min(100, Math.round((s.bookedCount / Math.max(1, s.capacity)) * 100));
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">{s.typeName}</span>
          </div>
          <p className="font-extrabold text-base text-gray-900">{s.typeName}</p>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">{hhmm(s.startsAt)}–{hhmm(s.endsAt)} · {s.coachName ?? '—'}</p>
        </div>
        <BookBtn s={s} busy={busy} onToggle={onToggle} />
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? '#B0121C' : s.color }} />
        </div>
        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
          {full ? 'Complet' : `${s.spotsLeft} places`}
        </span>
      </div>
    </div>
  );
};

const SessionRow: React.FC<{ s: Session; busy: boolean; onToggle: (s: Session) => void }> = ({ s, busy, onToggle }) => {
  const full = s.spotsLeft <= 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
      <span className="font-extrabold text-sm text-gray-900 w-11 shrink-0">{hhmm(s.startsAt)}</span>
      <span className="w-0.5 self-stretch rounded-full" style={{ background: s.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">{s.typeName}</p>
        <p className="text-[11px] text-gray-400 font-semibold">{s.coachName ?? '—'} · {full ? 'Complet' : `${s.spotsLeft} pl.`}</p>
      </div>
      <BookBtn s={s} busy={busy} onToggle={onToggle} mini />
    </div>
  );
};

const Empty: React.FC = () => (
  <div className="text-center py-14 text-gray-400">
    <Clock size={28} className="mx-auto mb-2 opacity-40" />
    <p className="text-sm font-semibold">Aucun cours pour ce filtre.</p>
  </div>
);

const PlanningSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-11 bg-gray-200 rounded-2xl" />
    <div className="flex gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-12 h-14 bg-gray-200 rounded-2xl" />)}</div>
    <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-3xl" />)}</div>
  </div>
);

export default MemberReservations;
