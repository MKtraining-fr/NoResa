import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DoorOpen, AlertTriangle, RefreshCw, Check, X, ShieldCheck, Clock, Users, Search, Calendar, Layers, CornerDownRight, Ban, StickyNote, Link2, Loader2 } from 'lucide-react';
import {
  getEntriesBetween, getPresentCount, getAccessAlerts, reviewAlert, resolvePhotoUrls, getBlockedMembers, assignCardToMember,
  AccessEntry, AccessAlert, BlockedMember,
} from '../../lib/accessApi';
import { searchMembers } from '../../lib/membersApi';
import type { Member } from '../../types';
import { getGroupTree, getMemberIdsInGroup, GroupNode } from '../../lib/groupsApi';
import MemberProfileModal from './MemberProfileModal';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtGap = (sec: number | null) => {
  if (sec == null) return '';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, '0')}s` : `${s}s`;
};
const nameOf = (m: { first_name: string | null; last_name: string | null } | null, fb = 'Inconnu') =>
  m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || fb : fb;
const initials = (m: { first_name: string | null; last_name: string | null } | null) =>
  m ? `${(m.first_name || '?')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase() : '?';

const todayStr = () => { const d = new Date(); return d.toISOString().split('T')[0]; };

const AccessControlPage: React.FC = () => {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [present, setPresent] = useState(0);
  const [alerts, setAlerts] = useState<AccessAlert[]>([]);
  const [blocked, setBlocked] = useState<BlockedMember[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);
  const [assignCard, setAssignCard] = useState<string | null>(null); // n° de badge inconnu à rattacher

  // Période/statut/groupe = BROUILLON (lié aux champs), appliqué au clic sur « Valider ».
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'denied'>('all');
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  const [groupName, setGroupName] = useState('');
  const [subgroupName, setSubgroupName] = useState('');
  const [textSearch, setTextSearch] = useState(''); // recherche texte : instantanée (côté client)
  useEffect(() => { getGroupTree().then(setGroupTree).catch(() => {}); }, []);
  const subOptions = groupTree.find((g) => g.name === groupName)?.subgroups ?? [];

  const dayRange = (a: string, b: string) => {
    const lo = a <= b ? a : b, hi = a <= b ? b : a; // tolère des dates inversées
    return { from: new Date(`${lo}T00:00:00`).toISOString(), to: new Date(`${hi}T23:59:59`).toISOString() };
  };

  // Filtres RÉELLEMENT appliqués (utilisés par la requête). Défaut : aujourd'hui.
  const [applied, setApplied] = useState(() => ({
    ...dayRange(todayStr(), todayStr()),
    status: 'all' as 'all' | 'authorized' | 'denied', groupName: '', subgroupName: '',
  }));

  const applyFilters = () => setApplied({
    ...dayRange(dateFrom || todayStr(), dateTo || dateFrom || todayStr()),
    status: statusFilter, groupName, subgroupName,
  });

  const load = useCallback(async () => {
    let memberIds: string[] | undefined;
    if (applied.groupName) memberIds = await getMemberIdsInGroup(applied.groupName, applied.subgroupName || undefined);
    const [e, p, a, b] = await Promise.all([
      getEntriesBetween(applied.from, applied.to, { memberIds, status: applied.status === 'all' ? undefined : applied.status, limit: 5000 }),
      getPresentCount(90),
      getAccessAlerts('open'),
      getBlockedMembers(),
    ]);
    setEntries(e); setPresent(p); setAlerts(a); setBlocked(b); setLoading(false);
    const map = await resolvePhotoUrls([...e.map((x) => x.member?.photo_path), ...b.map((x) => x.photoPath)]);
    setPhotos(map);
  }, [applied]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30_000); // rafraîchissement auto 30 s (filtres appliqués)
    return () => clearInterval(t);
  }, [load]);

  const handleReview = async (id: string, status: 'reviewed' | 'dismissed') => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await reviewAlert(id, status); } catch { load(); }
  };

  // Recherche texte (nom / n° client / badge) — filtre côté client sur les passages chargés
  const shownEntries = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = `${e.member?.first_name || ''} ${e.member?.last_name || ''}`.toLowerCase();
      return name.includes(q)
        || (e.member?.member_number || '').toLowerCase().includes(q)
        || (e.card_number || '').toLowerCase().includes(q);
    });
  }, [entries, textSearch]);

  // Le brouillon diffère-t-il des filtres appliqués ? (pour activer « Valider »)
  const draftRange = dayRange(dateFrom || todayStr(), dateTo || dateFrom || todayStr());
  const dirty = draftRange.from !== applied.from || draftRange.to !== applied.to
    || statusFilter !== applied.status || groupName !== applied.groupName || subgroupName !== applied.subgroupName;

  const isToday = applied.from === dayRange(todayStr(), todayStr()).from && applied.to === dayRange(todayStr(), todayStr()).to
    && applied.status === 'all' && !applied.groupName;
  const resetToday = () => {
    setDateFrom(todayStr()); setDateTo(todayStr()); setStatusFilter('all'); setGroupName(''); setSubgroupName(''); setTextSearch('');
    setApplied({ ...dayRange(todayStr(), todayStr()), status: 'all', groupName: '', subgroupName: '' });
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contrôle d'accès</h1>
          <p className="text-sm text-gray-500">Affluence en direct et historique des passages.</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><Users size={15} /></span>
            <p className="text-xs font-medium text-gray-500">Affluence en temps réel</p>
            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> en direct</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{present}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">présent·e·s (90 dernières min)</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-gray-100 text-gray-500 p-1.5 rounded-lg"><DoorOpen size={15} /></span>
            <p className="text-xs font-medium text-gray-500">Passages affichés</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{shownEntries.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{isToday ? "aujourd'hui" : 'sur la période'}</p>
        </div>

        <button onClick={() => setAlertsOpen(true)} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <span className={`p-1.5 rounded-lg ${alerts.length ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
              {alerts.length ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
            </span>
            <p className="text-xs font-medium text-gray-500">Doublons à vérifier</p>
            <span className="ml-auto text-[11px] font-medium text-indigo-600">Ouvrir</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{alerts.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">double passage détecté</p>
        </button>

        <button onClick={() => setBlockedOpen(true)} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <span className={`p-1.5 rounded-lg ${blocked.length ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {blocked.length ? <Ban size={15} /> : <ShieldCheck size={15} />}
            </span>
            <p className="text-xs font-medium text-gray-500">Accès bloqués</p>
            {blocked.length > 0 && <span className="ml-auto text-[11px] font-medium text-red-600">Voir</span>}
          </div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{blocked.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">badge/code retiré</p>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 px-1"><Search size={14} /> Filtrer</span>

        {/* Période : du … au … */}
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">du</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <span className="text-xs text-gray-400">au</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <span className="w-px h-5 bg-gray-200 mx-0.5 hidden sm:block" />

        {/* Statut du passage */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="all">Tous les passages</option>
          <option value="authorized">Autorisés</option>
          <option value="denied">Refusés / erreurs</option>
        </select>

        {/* Groupe / sous-groupe */}
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-gray-400" />
          <select value={groupName} onChange={(e) => { setGroupName(e.target.value); setSubgroupName(''); }} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">Tous les groupes</option>
            {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
          {groupName && subOptions.length > 0 && (
            <>
              <CornerDownRight size={13} className="text-gray-300" />
              <select value={subgroupName} onChange={(e) => setSubgroupName(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Tous les sous-groupes</option>
                {subOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Recherche texte : nom / n° client / badge */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder="Nom, n° client ou badge…" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={applyFilters} disabled={!dirty}
            className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-colors ${dirty ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-default'}`}>
            {dirty ? 'Valider les filtres' : 'Filtres à jour'}
          </button>
          {!isToday && (
            <button onClick={resetToday} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1">Réinitialiser</button>
          )}
        </div>
      </div>

      {/* Mosaïque des passages */}
      {loading && entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">Chargement…</div>
      ) : shownEntries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
          {textSearch.trim() ? 'Aucun passage ne correspond à la recherche.' : 'Aucun passage sur cette période.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {shownEntries.map((e) => {
            const refused = e.status === 'denied';
            const url = e.member?.photo_path ? photos[e.member.photo_path] : undefined;
            return (
              <div
                key={e.id}
                onClick={e.member_id ? () => setProfileMemberId(e.member_id) : (e.card_number ? () => setAssignCard(e.card_number) : undefined)}
                title={e.member_id ? 'Voir la fiche' : (e.card_number ? 'Badge inconnu — cliquer pour le rattacher à un client' : undefined)}
                className={`relative rounded-2xl overflow-hidden aspect-[3/4] shadow-sm transition-all ${(e.member_id || e.card_number) ? 'cursor-pointer hover:shadow-lg' : ''} ${refused ? 'ring-2 ring-red-500' : 'ring-1 ring-gray-200'}`}
              >
                {!e.member_id && e.card_number && (
                  <span className="absolute top-2 left-2 z-10 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shadow flex items-center gap-1"><Link2 size={11} /> Rattacher</span>
                )}
                {url ? (
                  <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 flex items-center justify-center text-4xl font-black ${refused ? 'bg-red-100 text-red-400' : 'bg-indigo-100 text-indigo-400'}`}>
                    {initials(e.member)}
                  </div>
                )}
                {/* Dégradé pour la lisibilité du texte */}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                {refused && <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shadow">Refusé</span>}
                {e.member?.notes && <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 w-6 h-6 rounded-lg flex items-center justify-center shadow" title={e.member.notes}><StickyNote size={13} /></span>}
                {/* Nom + date/heure en surimpression */}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-white font-black text-[15px] leading-tight truncate drop-shadow-lg" title={nameOf(e.member, e.card_number ? `Carte ${e.card_number}` : 'Inconnu')}>
                    {nameOf(e.member, e.card_number ? `Carte ${e.card_number}` : 'Inconnu')}
                  </p>
                  <p className="text-[12px] font-extrabold tabular-nums drop-shadow-lg mt-0.5" style={{ color: '#FDE047' }}>
                    {fmtDate(e.access_datetime)} · {fmtTime(e.access_datetime)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fenêtre doublons */}
      {alertsOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAlertsOpen(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500" /> Doublons à vérifier</h2>
              <button onClick={() => setAlertsOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">Aucun doublon en attente. Tout est propre.</p>
              ) : alerts.map((a) => (
                <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {nameOf(a.member)}
                      {a.member?.member_number && <span className="text-gray-400 font-normal"> · n° {a.member.member_number}</span>}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Clock size={14} /> {fmtTime(a.first_event)} puis {fmtTime(a.second_event)}
                      <span className="text-amber-600 font-medium">({fmtGap(a.gap_seconds)} d'écart)</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(a.id, 'reviewed')} className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100">
                      <Check size={15} /> Vérifié
                    </button>
                    <button onClick={() => handleReview(a.id, 'dismissed')} className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                      <X size={15} /> Ignorer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fenêtre accès bloqués */}
      {blockedOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setBlockedOpen(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Ban size={17} className="text-red-500" /> Accès bloqués ({blocked.length})</h2>
              <button onClick={() => setBlockedOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {blocked.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">Aucun accès bloqué actuellement. Tout est ouvert.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {blocked.map((b) => {
                    const url = b.photoPath ? photos[b.photoPath] : undefined;
                    const ini = `${(b.firstName || '?')[0] || ''}${(b.lastName || '')[0] || ''}`.toUpperCase();
                    const display = `${b.firstName} ${b.lastName}`.trim() || (b.cardNumber ? `Carte ${b.cardNumber}` : 'Adhérent');
                    return (
                      <button key={b.id} onClick={() => { setBlockedOpen(false); setProfileMemberId(b.id); }} title={b.reason || 'Sans motif précisé — cliquer pour la fiche'}
                        className="bg-white border-2 border-red-300 rounded-xl p-3 flex flex-col items-center text-center hover:border-red-400 hover:shadow-sm transition-colors">
                        <div className="relative ring-2 ring-red-200 rounded-full">
                          {url
                            ? <img src={url} alt="" className="w-12 h-12 rounded-full object-cover" />
                            : <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-sm font-semibold">{ini}</div>}
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"><Ban size={10} /></span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-900 truncate w-full" title={display}>{display}</p>
                        <p className="text-[11px] text-red-600 font-medium truncate w-full">{b.reason || 'Sans motif'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fiche profil (par-dessus le contrôle d'accès) */}
      {profileMemberId && (
        <MemberProfileModal memberId={profileMemberId} onClose={() => setProfileMemberId(null)} />
      )}

      {/* Rattacher un badge inconnu à un client */}
      {assignCard && (
        <AssignCardModal card={assignCard} onClose={() => setAssignCard(null)} onDone={() => { setAssignCard(null); setLoading(true); load(); }} />
      )}
    </div>
  );
};

// Rattache un n° de badge inconnu (vu dans les passages) à une fiche membre.
const AssignCardModal: React.FC<{ card: string; onClose: () => void; onDone: () => void }> = ({ card, onClose, onDone }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    if (q.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await searchMembers(q, 8); if (alive) setResults(r); }
      finally { if (alive) setSearching(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const assign = async (m: Member) => {
    setBusy(true); setErr('');
    try { await assignCardToMember(card, m.id); onDone(); }
    catch (e: any) { setErr(e?.message || 'Échec du rattachement.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(ev) => ev.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Link2 size={17} className="text-indigo-600" /> Rattacher un badge</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">Badge <span className="font-mono font-bold text-gray-700">{card}</span> · choisis le client à qui il appartient</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom ou n° client…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          {err && <p className="text-[12px] text-red-600 font-semibold mt-2">{err}</p>}
        </div>
        <div className="overflow-y-auto px-4 pb-4 space-y-1.5">
          {searching ? (
            <div className="py-6 flex justify-center text-gray-300"><Loader2 size={20} className="animate-spin" /></div>
          ) : q.trim().length < 2 ? (
            <p className="text-[12px] text-gray-400 text-center py-6">Tape au moins 2 caractères pour chercher.</p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-gray-400 text-center py-6">Aucun client trouvé.</p>
          ) : results.map((m) => (
            <button key={m.id} onClick={() => assign(m)} disabled={busy}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-colors disabled:opacity-50">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {`${(m.firstName || '?')[0] || ''}${(m.lastName || '')[0] || ''}`.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                <p className="text-[11px] text-gray-400 font-medium">
                  {m.memberNumber ? `N° ${m.memberNumber}` : 'Sans n°'}{(m as any).cardNumber ? ` · badge actuel ${(m as any).cardNumber}` : ''}
                </p>
              </div>
              <Link2 size={15} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccessControlPage;
