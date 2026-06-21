import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DoorOpen, AlertTriangle, RefreshCw, Check, X, ShieldCheck, Clock, Users, Search, Calendar, Layers, CornerDownRight } from 'lucide-react';
import {
  getEntriesBetween, getPresentCount, getAccessAlerts, reviewAlert, resolvePhotoUrls,
  AccessEntry, AccessAlert,
} from '../../lib/accessApi';
import { getGroupTree, getMemberIdsInGroup, GroupNode } from '../../lib/groupsApi';

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
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Recherche : un jour + plage horaire optionnelle
  const [date, setDate] = useState(todayStr());
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');

  // Filtre par groupe / sous-groupe
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  const [groupName, setGroupName] = useState('');
  const [subgroupName, setSubgroupName] = useState('');
  useEffect(() => { getGroupTree().then(setGroupTree).catch(() => {}); }, []);
  const subOptions = groupTree.find((g) => g.name === groupName)?.subgroups ?? [];

  const range = useMemo(() => {
    const d = date || todayStr();
    const from = new Date(`${d}T${fromTime || '00:00'}:00`);
    const to = new Date(`${d}T${toTime || '23:59'}:59`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [date, fromTime, toTime]);

  const load = useCallback(async () => {
    // Si un groupe est sélectionné, on restreint aux membres de ce groupe/sous-groupe
    let memberIds: string[] | undefined;
    if (groupName) memberIds = await getMemberIdsInGroup(groupName, subgroupName || undefined);
    const [e, p, a] = await Promise.all([
      getEntriesBetween(range.from, range.to, { memberIds }),
      getPresentCount(90),
      getAccessAlerts('open'),
    ]);
    setEntries(e); setPresent(p); setAlerts(a); setLoading(false);
    const map = await resolvePhotoUrls(e.map((x) => x.member?.photo_path));
    setPhotos(map);
  }, [range.from, range.to, groupName, subgroupName]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30_000); // rafraîchissement auto 30 s
    return () => clearInterval(t);
  }, [load]);

  const handleReview = async (id: string, status: 'reviewed' | 'dismissed') => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await reviewAlert(id, status); } catch { load(); }
  };

  const isToday = date === todayStr() && !fromTime && !toTime;
  const resetToday = () => { setDate(todayStr()); setFromTime(''); setToTime(''); };

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{entries.length}</p>
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
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 px-1"><Search size={14} /> Filtrer</span>
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">de</span>
          <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <span className="text-xs text-gray-400">à</span>
          <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <span className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
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
        {!isToday && (
          <button onClick={resetToday} className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1">Aujourd'hui</button>
        )}
      </div>

      {/* Mosaïque des passages */}
      {loading && entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">Chargement…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
          Aucun passage sur cette période.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {entries.map((e) => {
            const refused = e.status === 'denied';
            const url = e.member?.photo_path ? photos[e.member.photo_path] : undefined;
            return (
              <div
                key={e.id}
                onClick={e.member_id ? () => { window.location.hash = `#/app/crm?member=${e.member_id}`; } : undefined}
                title={e.member_id ? 'Voir la fiche' : undefined}
                className={`bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center text-center transition-colors ${e.member_id ? 'cursor-pointer hover:border-indigo-300 hover:shadow-sm' : 'hover:border-gray-300'}`}
              >
                <div className={`relative ${refused ? 'ring-2 ring-red-200 rounded-full' : ''}`}>
                  {url ? (
                    <img src={url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${refused ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      {initials(e.member)}
                    </div>
                  )}
                  {refused && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={10} /></span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900 truncate w-full" title={nameOf(e.member, e.card_number ? `Carte ${e.card_number}` : 'Inconnu')}>
                  {nameOf(e.member, e.card_number ? `Carte ${e.card_number}` : 'Inconnu')}
                </p>
                <p className="text-[11px] text-gray-400 tabular-nums">{fmtDate(e.access_datetime)} · {fmtTime(e.access_datetime)}</p>
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
    </div>
  );
};

export default AccessControlPage;
