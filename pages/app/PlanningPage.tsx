import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, X, Save, Trash2, Loader2,
  UserPlus, Search, Pencil,
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
import {
  Alert, Avatar, Button, Checkbox, EmptyState, Field, FieldLabel, IconButton, Input, Modal, PageHeader,
  Segmented, Select, Skeleton, Table, Tag, Td, Th, Tr,
} from '../../components/ui';

const DOW = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const DOW_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const WEEKDAY_OPTS = [1, 2, 3, 4, 5, 6, 0]; // Lun..Dim (JS getDay)
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = x.getDay(); x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day)); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const fmtDay = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()}`;
const dayNum = (d: Date) => (d.getDate() === 1 ? '1er' : String(d.getDate()));
const weekLabel = (from: Date, to: Date) => {
  const end = to.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (from.getMonth() === to.getMonth()) return `Semaine du ${dayNum(from)} au ${dayNum(to)} ${end}`;
  return `Semaine du ${dayNum(from)} ${from.toLocaleDateString('fr-FR', { month: 'long' })} au ${dayNum(to)} ${end}`;
};

const PlanningPage: React.FC<{ view?: string }> = ({ view = 'calendrier' }) => (
  <div className="space-y-4">
    {view === 'cours' ? <CoursesTab /> : <PlanningTab />}
  </div>
);

// =========================== Planning (semaine) ============================

const SessionChip: React.FC<{ s: AdminSession; selected: boolean; onClick: () => void }> = ({ s, selected, onClick }) => {
  const full = s.bookedCount >= s.capacity;
  const box = selected ? 'bg-surface border-2 border-primary px-1.5 py-1' : full ? 'bg-ink text-white hover:bg-ink-2 px-2 py-1.5' : 'bg-line-soft text-ink hover:bg-line px-2 py-1.5';
  const sub = selected ? 'text-primary-dark' : full ? 'text-line' : 'text-muted';
  return (
    <button type="button" onClick={onClick} className={`w-full text-left transition-colors ${box}`}>
      <span className="flex items-center gap-1.5 min-w-0">
        <span aria-hidden className="w-2 h-2 shrink-0" style={{ background: s.color }} />
        <span className="font-semibold truncate">{s.typeName}</span>
      </span>
      <span className={`block text-xs tabular-nums ${sub}`}>
        {hhmm(s.startsAt)} · {full ? 'complet ' : ''}{s.bookedCount}/{s.capacity}{s.waitlistCount > 0 ? ` · +${s.waitlistCount} en attente` : ''}
      </span>
      {s.coachName && <span className={`block text-xs truncate ${sub}`}>{s.coachName}</span>}
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
    ? weekLabel(range.gridStart, addDays(range.gridStart, 6))
    : anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  // Une ligne par heure où il y a au moins un créneau dans la semaine.
  const hours = useMemo(() => Array.from(new Set<number>(sessions.map((s) => new Date(s.startsAt).getHours()))).sort((a, b) => a - b), [sessions]);

  return (
    <>
      <PageHeader
        title="Planning & cours"
        subtitle={<span className="first-letter:uppercase inline-block">{label}</span>}
        className="flex-wrap"
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex border border-subtle bg-surface">
              <IconButton label="Période précédente" onClick={() => move(-1)}><ChevronLeft size={16} /></IconButton>
              <button type="button" onClick={() => setAnchor(new Date())} className="h-9 px-3 font-semibold text-ink border-x border-subtle hover:bg-ground transition-colors">Aujourd'hui</button>
              <IconButton label="Période suivante" onClick={() => move(1)}><ChevronRight size={16} /></IconButton>
            </div>
            <Segmented tone="neutral" value={mode} onChange={setMode} options={[{ value: 'week', label: 'Semaine' }, { value: 'month', label: 'Mois' }]} />
            <Button icon={Plus} onClick={() => setNewOpen(true)} disabled={types.length === 0}>Nouveau créneau</Button>
          </div>
        )}
      />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : mode === 'week' ? (
        <div className="bg-surface border border-line overflow-x-auto">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] min-w-[860px]">
            <div className="border-b-2 border-ink" />
            {cells.map((d) => {
              const today = sameDay(d, new Date());
              return <div key={d.toISOString()} className={`px-2.5 py-2 border-l border-line-soft border-b-2 ${today ? 'border-b-primary font-extrabold text-primary bg-ground-2' : 'border-b-ink font-semibold text-ink'}`}>{fmtDay(d)}</div>;
            })}
            {hours.map((h, i) => (
              <React.Fragment key={h}>
                <div className={`p-2 text-xs text-muted tabular-nums ${i < hours.length - 1 ? 'border-b border-line-soft' : ''}`}>{String(h).padStart(2, '0')}:00</div>
                {cells.map((d) => {
                  const items = sessionsOf(d).filter((s) => new Date(s.startsAt).getHours() === h);
                  return (
                    <div key={d.toISOString()} className={`p-1.5 space-y-1.5 border-l border-line-soft min-h-[72px] ${i < hours.length - 1 ? 'border-b' : ''} ${sameDay(d, new Date()) ? 'bg-ground-2' : ''}`}>
                      {items.map((s) => <SessionChip key={s.id} s={s} selected={rosterFor?.id === s.id} onClick={() => setRosterFor(s)} />)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {hours.length === 0 && <EmptyState title="Aucun créneau cette semaine." />}
        </div>
      ) : (
        <div className="bg-surface border border-line overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[720px]">
            {['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'].map((d, i) => <div key={d} className={`px-2.5 py-2 font-semibold text-ink border-b-2 border-ink ${i > 0 ? 'border-l border-l-line-soft' : ''}`}>{d}</div>)}
            {cells.map((d, i) => {
              const items = sessionsOf(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const today = sameDay(d, new Date());
              return (
                <div key={d.toISOString()} className={`min-h-[96px] p-1.5 border-b border-line-soft ${i % 7 > 0 ? 'border-l' : ''} ${today ? 'bg-ground-2' : !inMonth ? 'bg-ground' : ''}`}>
                  <p className={`text-xs mb-1 tabular-nums ${today ? 'font-extrabold text-primary' : inMonth ? 'font-semibold text-ink' : 'text-subtle'}`}>{d.getDate()}</p>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((s) => {
                      const full = s.bookedCount >= s.capacity;
                      return (
                        <button key={s.id} type="button" onClick={() => setRosterFor(s)} title={`${s.typeName} ${hhmm(s.startsAt)} · ${s.bookedCount}/${s.capacity}`} className={`w-full flex items-center gap-1 px-1 py-0.5 text-left text-xs transition-colors ${full ? 'bg-ink text-white hover:bg-ink-2' : 'bg-line-soft text-ink hover:bg-line'}`}>
                          <span className="truncate">{hhmm(s.startsAt)} {s.typeName}</span>
                          <span className={`ml-auto tabular-nums ${full ? 'text-line' : 'text-muted'}`}>{s.bookedCount}/{s.capacity}</span>
                        </button>
                      );
                    })}
                    {items.length > 3 && <p className="text-xs text-muted px-1">+{items.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5 text-sm text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-line-soft" />Places libres</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-ink" />Complet</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-primary" />Sélectionné</span>
      </div>

      {rosterFor && <RosterModal session={rosterFor} onClose={() => setRosterFor(null)} onChanged={reload} />}
      {newOpen && <NewSessionModal types={types} onClose={() => setNewOpen(false)} onSaved={reload} />}
    </>
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
    <Modal
      onClose={onClose}
      title={<span className="flex items-center gap-2"><span aria-hidden className="w-2 h-2 shrink-0" style={{ background: session.color }} />{session.typeName}</span>}
      footer={(
        <>
          <Button variant="danger" icon={Trash2} onClick={del} className="mr-auto">Supprimer le créneau</Button>
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-muted tabular-nums">{DOW_FULL[dt.getDay()]} {dt.getDate()}/{dt.getMonth() + 1} · {hhmm(session.startsAt)}–{hhmm(session.endsAt)}</p>
          <Tag tone={booked.length >= session.capacity ? 'danger' : 'success'} className="ml-auto tabular-nums">{booked.length}/{session.capacity}</Tag>
        </div>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div>
              <p className="text-sm font-extrabold text-ink border-b-2 border-ink pb-1.5">Inscrits ({booked.length})</p>
              {booked.length === 0 ? <p className="text-muted py-2">Personne pour l'instant.</p> : booked.map((r) => <RosterRow key={r.bookingId} r={r} busy={busy === r.memberId} onRemove={() => remove(r.memberId)} />)}
            </div>
            {waitlist.length > 0 && (
              <div>
                <p className="text-sm font-extrabold text-warning-text border-b-2 border-ink pb-1.5">Liste d'attente ({waitlist.length})</p>
                {waitlist.map((r, i) => <RosterRow key={r.bookingId} r={r} rank={i + 1} busy={busy === r.memberId} onRemove={() => remove(r.memberId)} />)}
              </div>
            )}
            {adding
              ? <MemberPicker exclude={roster.map((r) => r.memberId)} onPick={async (m) => { setBusy(m.id); try { await adminBookMember(session.id, m.id); setAdding(false); await load(); onChanged(); } catch (e: any) { alert(e?.message || 'Erreur'); } finally { setBusy(null); } }} onCancel={() => setAdding(false)} />
              : <Button variant="secondary" icon={UserPlus} onClick={() => setAdding(true)}>Inscrire un client</Button>}
          </>
        )}
      </div>
    </Modal>
  );
};

const RosterRow: React.FC<{ r: RosterEntry; rank?: number; busy: boolean; onRemove: () => void }> = ({ r, rank, busy, onRemove }) => (
  <div className="flex items-center gap-3 py-2 border-b border-line-soft">
    {rank
      ? <span className="h-8 w-8 rounded-full bg-warning-soft text-warning-text text-xs font-semibold inline-flex items-center justify-center shrink-0">{rank}</span>
      : <Avatar name={`${r.firstName} ${r.lastName}`} />}
    <div className="min-w-0 flex-grow">
      <p className="font-semibold text-ink truncate">{r.firstName} {r.lastName}</p>
      {r.memberNumber && <p className="text-xs text-muted">n° {r.memberNumber}</p>}
    </div>
    <IconButton label={`Retirer ${r.firstName} ${r.lastName}`} onClick={onRemove} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}</IconButton>
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
    <div className="border border-line p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client…" className="pl-9" />
        </div>
        <IconButton label="Annuler" onClick={onCancel}><X size={16} /></IconButton>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {list.length === 0 ? <p className="text-sm text-muted py-2 text-center">Aucun client.</p> : list.map((m) => (
          <button key={m.id} type="button" onClick={() => onPick(m)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-ground-2 text-left transition-colors">
            <span className="font-semibold text-ink">{m.firstName} {m.lastName}</span>
            {m.memberNumber && <span className="text-xs text-muted">n° {m.memberNumber}</span>}
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
    <Modal
      title="Nouveau créneau"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer le créneau</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Cours">
          <Select value={classTypeId} onChange={(e) => { setClassTypeId(e.target.value); const t = types.find((x) => x.id === e.target.value); if (t) setCapacity(t.capacity); }}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Date et heure"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        <Field label="Capacité"><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>
        <Field label="Coach" optional><Input type="text" value={coach} onChange={(e) => setCoach(e.target.value)} /></Field>
      </div>
    </Modal>
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

  return (
    <>
      <PageHeader
        title="Cours"
        subtitle="Types de cours et créneaux récurrents, synchronisés avec l'app adhérent"
        actions={<Button icon={Plus} onClick={() => setCourseModal('new')}>Nouveau cours</Button>}
      />
      {loading ? <Skeleton className="h-96 w-full" /> : (
        <div className="space-y-6">
          {/* Cours */}
          <section className="space-y-2">
            <h2 className="text-lg font-extrabold text-ink">Types de cours</h2>
            <Table>
              <thead><tr><Th>Cours</Th><Th className="text-right">Capacité</Th><Th className="text-right">Durée</Th><Th>Statut</Th><Th /></tr></thead>
              <tbody>
                {types.map((t) => (
                  <Tr key={t.id}>
                    <Td><span className="flex items-center gap-2 font-semibold"><span aria-hidden className="w-2 h-2 shrink-0" style={{ background: t.color }} />{t.name}</span></Td>
                    <Td className="text-right tabular-nums">{t.capacity} pl.</Td>
                    <Td className="text-right tabular-nums">{t.durationMin} min</Td>
                    <Td>{t.active ? <Tag tone="success">Actif</Tag> : <Tag>Inactif</Tag>}</Td>
                    <Td className="w-24">
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Modifier ${t.name}`} onClick={() => setCourseModal(t)}><Pencil size={16} /></IconButton>
                        <IconButton label={`Supprimer ${t.name}`} onClick={() => delCourse(t.id)}><Trash2 size={16} /></IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {types.length === 0 && <tr><td colSpan={5}><EmptyState title="Aucun cours.">Crée le premier.</EmptyState></td></tr>}
              </tbody>
            </Table>
          </section>

          {/* Récurrences */}
          <section className="space-y-2">
            <div className="flex items-end gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-ink">Créneaux récurrents</h2>
                <p className="text-sm text-muted">Générés automatiquement environ 8 semaines à l'avance.</p>
              </div>
              <Button variant="secondary" icon={Plus} className="ml-auto" onClick={() => setRecModal('new')} disabled={types.length === 0}>Ajouter</Button>
            </div>
            <Table>
              <thead><tr><Th>Jour</Th><Th>Heure</Th><Th>Cours</Th><Th className="text-right">Durée</Th><Th className="text-right">Capacité</Th><Th>Coach</Th><Th>Statut</Th><Th /></tr></thead>
              <tbody>
                {recs.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-semibold">{DOW_FULL[r.weekday]}</Td>
                    <Td className="tabular-nums">{r.startTime}</Td>
                    <Td>{r.typeName}</Td>
                    <Td className="text-right tabular-nums">{r.durationMin} min</Td>
                    <Td className="text-right tabular-nums">{r.capacity ? `${r.capacity} pl.` : null}</Td>
                    <Td>{r.coachName}</Td>
                    <Td>{r.active ? <Tag tone="success">Active</Tag> : <Tag>Inactive</Tag>}</Td>
                    <Td className="w-24">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Modifier la récurrence" onClick={() => setRecModal(r)}><Pencil size={16} /></IconButton>
                        <IconButton label="Supprimer la récurrence" onClick={() => delRec(r.id)}><Trash2 size={16} /></IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {recs.length === 0 && <tr><td colSpan={8}><EmptyState title="Aucune récurrence." /></td></tr>}
              </tbody>
            </Table>
          </section>
        </div>
      )}

      {courseModal && <CourseModal course={courseModal === 'new' ? null : courseModal} onClose={() => setCourseModal(null)} onSaved={reload} />}
      {recModal && <RecurrenceModal rec={recModal === 'new' ? null : recModal} types={types} onClose={() => setRecModal(null)} onSaved={reload} />}
    </>
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
    <Modal
      title={course ? 'Modifier le cours' : 'Nouveau cours'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Hyrox" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacité"><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>
          <Field label="Durée (min)"><Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
        </div>
        <div>
          <FieldLabel>Couleur</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`w-7 h-7 ${color === c ? 'outline outline-2 outline-offset-2 outline-ink' : ''}`} style={{ background: c }} />)}
          </div>
        </div>
        <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} label="Actif (visible côté adhérent)" />
      </div>
    </Modal>
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
    <Modal
      title={rec ? 'Modifier la récurrence' : 'Nouvelle récurrence'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer et générer</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Cours">
          <Select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jour">
            <Select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{WEEKDAY_OPTS.map((w) => <option key={w} value={w}>{DOW_FULL[w]}</option>)}</Select>
          </Field>
          <Field label="Heure"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durée (min)"><Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
          <Field label="Capacité"><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`défaut ${ct?.capacity ?? ''}`} /></Field>
        </div>
        <Field label="Coach" optional><Input value={coach} onChange={(e) => setCoach(e.target.value)} /></Field>
        <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} label="Active" />
      </div>
    </Modal>
  );
};

export default PlanningPage;
