import React, { useEffect, useState, useCallback } from 'react';
import { DoorOpen, AlertTriangle, RefreshCw, Check, X, ShieldCheck, Clock } from 'lucide-react';
import {
  getTodayEntries, getAccessAlerts, reviewAlert,
  AccessEntry, AccessAlert,
} from '../../lib/accessApi';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtGap = (sec: number | null) => {
  if (sec == null) return '';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, '0')}s` : `${s}s`;
};
const memberName = (m: { first_name: string | null; last_name: string | null } | null, fallback = 'Inconnu') =>
  m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || fallback : fallback;

const AccessControlPage: React.FC = () => {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [alerts, setAlerts] = useState<AccessAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [e, a] = await Promise.all([getTodayEntries(), getAccessAlerts('open')]);
    setEntries(e); setAlerts(a); setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // rafraîchissement auto toutes les 30 s
    return () => clearInterval(t);
  }, [load]);

  const handleReview = async (id: string, status: 'reviewed' | 'dismissed') => {
    setAlerts((prev) => prev.filter((a) => a.id !== id)); // retrait optimiste
    try { await reviewAlert(id, status); } catch { load(); }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Contrôle d'accès</h1>
          <p className="text-sm text-gray-500 mt-1">Entrées du jour et alertes de passage.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center"><DoorOpen className="text-indigo-600" size={26} /></div>
          <div>
            <p className="text-3xl font-black text-gray-900">{entries.length}</p>
            <p className="text-sm font-semibold text-gray-400">entrées aujourd'hui</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${alerts.length ? 'bg-amber-50' : 'bg-green-50'}`}>
            {alerts.length ? <AlertTriangle className="text-amber-500" size={26} /> : <ShieldCheck className="text-green-600" size={26} />}
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{alerts.length}</p>
            <p className="text-sm font-semibold text-gray-400">alerte{alerts.length > 1 ? 's' : ''} à vérifier</p>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            <h2 className="font-black text-gray-900">Double passage à vérifier</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {alerts.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-gray-900">
                    {memberName(a.member)}
                    {a.member?.member_number && <span className="text-gray-400 font-semibold"> · n° {a.member.member_number}</span>}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Clock size={14} /> Entrées à <b>{fmtTime(a.first_event)}</b> puis <b>{fmtTime(a.second_event)}</b>
                    <span className="text-amber-600 font-semibold">({fmtGap(a.gap_seconds)} d'écart)</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(a.id, 'reviewed')} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100">
                    <Check size={15} /> Vérifié
                  </button>
                  <button onClick={() => handleReview(a.id, 'dismissed')} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200">
                    <X size={15} /> Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entrées du jour */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <DoorOpen className="text-indigo-600" size={18} />
          <h2 className="font-black text-gray-900">Entrées du jour</h2>
        </div>
        {loading && entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-semibold">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-semibold">Aucune entrée enregistrée aujourd'hui.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((e) => {
              const refused = e.status === 'denied';
              return (
                <div key={e.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-900 tabular-nums w-12">{fmtTime(e.access_datetime)}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{memberName(e.member, e.card_number ? `Carte ${e.card_number}` : 'Inconnu')}</p>
                      {e.member?.member_number && <p className="text-xs text-gray-400">n° {e.member.member_number}</p>}
                    </div>
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${refused ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {refused ? 'Refusé' : 'Entré'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessControlPage;
