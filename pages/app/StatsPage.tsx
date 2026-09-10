import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Users, UserPlus, UserMinus,
  ShoppingBag, Ticket, Loader2, Activity, Award,
} from 'lucide-react';
import {
  getStatsSummary, getStatsTimeseries, getStatsAttendance, getStatsSubscriptions,
  summaryRevenue, StatsSummary, StatsPoint, Attendance, SubsDist,
} from '../../lib/statsApi';

const eur = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')} €`;
const INDIGO = '#4f46e5';
const RED = '#e11d2a';
const GREEN = '#16a34a';
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type PeriodKey = '30j' | 'mois' | '90j' | 'annee';
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '30j', label: '30 jours' },
  { key: 'mois', label: 'Mois en cours' },
  { key: '90j', label: '90 jours' },
  { key: 'annee', label: 'Année' },
];

function rangeFor(key: PeriodKey): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (key === '30j') from.setDate(from.getDate() - 30);
  else if (key === '90j') from.setDate(from.getDate() - 90);
  else if (key === 'mois') { from.setDate(1); from.setHours(0, 0, 0, 0); }
  else if (key === 'annee') { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }
  return { from, to };
}

const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; delta?: number | null; tint?: string;
}> = ({ icon, label, value, delta, tint = 'text-indigo-600 bg-indigo-50' }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className={`p-2 rounded-xl ${tint}`}>{icon}</span>
      {delta != null && (
        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(delta).toFixed(0)} %
        </span>
      )}
    </div>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</p>
  </div>
);

const StatsPage: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKey>('30j');
  const [loading, setLoading] = useState(true);
  const [cur, setCur] = useState<StatsSummary | null>(null);
  const [prev, setPrev] = useState<StatsSummary | null>(null);
  const [series, setSeries] = useState<StatsPoint[]>([]);
  const [att, setAtt] = useState<Attendance | null>(null);
  const [subs, setSubs] = useState<SubsDist | null>(null);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    const { from, to } = rangeFor(period);
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);
    const fISO = from.toISOString(), tISO = to.toISOString(), pISO = prevFrom.toISOString();
    Promise.all([
      getStatsSummary(fISO, tISO),
      getStatsSummary(pISO, fISO),
      getStatsTimeseries(fISO, tISO),
      getStatsAttendance(fISO, tISO),
      getStatsSubscriptions(),
    ]).then(([c, p, ts, a, s]) => {
      if (stop) return;
      setCur(c); setPrev(p); setSeries(ts); setAtt(a); setSubs(s); setLoading(false);
    });
    return () => { stop = true; };
  }, [period]);

  const delta = (c: number, p: number): number | null => {
    if (p === 0) return c > 0 ? 100 : null;
    return ((c - p) / p) * 100;
  };

  const revCur = cur ? summaryRevenue(cur) : 0;
  const revPrev = prev ? summaryRevenue(prev) : 0;
  const basket = cur && cur.sales_count > 0 ? cur.boutique_revenue / cur.sales_count : 0;

  const seriesFmt = useMemo(() => series.map((p) => ({
    ...p, jour: new Date(p.bucket).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
  })), [series]);

  const accessRows = useMemo(() => {
    const a = cur?.access || {};
    const defs: { key: string; label: string }[] = [
      { key: 'seance', label: 'Séances à l’unité' },
      { key: 'carnet', label: 'Carnets de 10' },
      { key: 'mois', label: 'Mois' },
      { key: 'annee', label: 'Année' },
    ];
    return defs.map((d) => ({ label: d.label, n: a[d.key]?.n || 0, ca: a[d.key]?.ca || 0 }));
  }, [cur]);

  const hourData = useMemo(() => {
    const map = new Map((att?.by_hour || []).map((h) => [h.hour, h.entries]));
    return Array.from({ length: 18 }, (_, i) => i + 6).map((h) => ({ h: `${h}h`, entries: map.get(h) || 0 }));
  }, [att]);
  const dowData = useMemo(() => {
    const map = new Map((att?.by_dow || []).map((d) => [d.dow, d.entries]));
    return DOW.map((lbl, i) => ({ jour: lbl, entries: map.get(i + 1) || 0 }));
  }, [att]);

  const maxFormula = Math.max(1, ...(subs?.by_formula || []).map((f) => f.n));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><BarChart3 size={18} /></span>
            Statistiques
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inscriptions, résiliations, ventes, séances et fréquentation.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${period === p.key ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !cur ? (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-300"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon={<TrendingUp size={16} />} label="CA encaissé" value={eur(revCur)} delta={delta(revCur, revPrev)} tint="text-indigo-600 bg-indigo-50" />
            <KpiCard icon={<UserPlus size={16} />} label="Inscriptions" value={String(cur.signups)} delta={delta(cur.signups, prev?.signups || 0)} tint="text-green-600 bg-green-50" />
            <KpiCard icon={<UserMinus size={16} />} label="Résiliations" value={String(cur.cancellations)} delta={delta(cur.cancellations, prev?.cancellations || 0)} tint="text-red-600 bg-red-50" />
            <KpiCard icon={<Users size={16} />} label="Membres actifs" value={String(cur.active_members)} tint="text-gray-600 bg-gray-100" />
            <KpiCard icon={<ShoppingBag size={16} />} label="Panier moyen" value={eur(basket)} tint="text-amber-600 bg-amber-50" />
          </div>
          <p className="text-[11px] text-gray-400 -mt-3">Le « CA encaissé » couvre la boutique et les recharges d'accès (séances/carnets/mois). Les prélèvements récurrents (abonnements) sont suivis dans Finance / GoCardless.</p>

          {/* Inscriptions vs résiliations */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><Users size={13} /> Inscriptions vs résiliations</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={seriesFmt} margin={{ left: -18, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.3} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="signups" name="Inscriptions" stroke={GREEN} fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="cancellations" name="Résiliations" stroke={RED} fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenu par jour */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><TrendingUp size={13} /> Revenu encaissé par jour</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={seriesFmt} margin={{ left: -12, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={INDIGO} stopOpacity={0.3} /><stop offset="100%" stopColor={INDIGO} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} tickFormatter={(v) => `${v}€`} />
                <Tooltip formatter={(v: any) => eur(Number(v))} />
                <Area type="monotone" dataKey="revenue" name="Revenu" stroke={INDIGO} fill="url(#gRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Produits d'accès ponctuels + boutique */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><Ticket size={13} /> Produits d'accès ponctuels</h3>
              <div className="space-y-2">
                {accessRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <span className="text-sm font-semibold text-gray-700">{r.label}</span>
                    <span className="text-sm font-bold text-gray-900">{r.n} <span className="text-gray-400 font-medium">·</span> {eur(r.ca)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><ShoppingBag size={13} /> Boutique</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-indigo-50/60">
                  <p className="text-2xl font-semibold text-indigo-700">{eur(cur.boutique_revenue)}</p>
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mt-1">CA boutique</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-2xl font-semibold text-gray-900">{cur.sales_count}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Ventes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fréquentation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><Activity size={13} /> Fréquentation par heure <span className="normal-case text-gray-300 font-medium">· {att?.total ?? 0} passages</span></h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourData} margin={{ left: -20, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="entries" name="Passages" fill={INDIGO} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2"><Activity size={13} /> Fréquentation par jour</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dowData} margin={{ left: -20, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="entries" name="Passages" radius={[4, 4, 0, 0]}>
                    {dowData.map((_, i) => <Cell key={i} fill={i >= 5 ? RED : INDIGO} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Abonnements */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2"><Award size={13} /> Abonnements des membres actifs</h3>
              <span className="text-[11px] font-bold text-indigo-600">{subs?.mandates_active ?? 0} mandats SEPA actifs</span>
            </div>
            <div className="space-y-2">
              {(subs?.by_formula || []).map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-56 truncate shrink-0">{f.label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(f.n / maxFormula) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-8 text-right">{f.n}</span>
                </div>
              ))}
              {(subs?.by_formula || []).length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsPage;
