import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Check, X, Loader2, RefreshCw, UserRound, AlertTriangle, CreditCard } from 'lucide-react';
import { listCancellationRequests, reviewCancellation, CancellationRequest } from '../../lib/cancellationApi';

const dmy = (iso: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR') : '—');
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const eur = (n: number | null) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')} €`);

type Tab = 'pending' | 'approved' | 'rejected';

const CancellationsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  const openFiche = (memberId: string) =>
    navigate(`/app/crm/membres?member=${memberId}&from=${encodeURIComponent('/app/finance/resiliations')}`);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listCancellationRequests(tab));
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const decide = async (r: CancellationRequest, approve: boolean) => {
    const msg = approve
      ? `Valider la résiliation de ${r.firstName} ${r.lastName} ?\n\n• Fin d'accès le ${dmy(r.effectiveDate)} (préavis)\n• L'abonnement GoCardless sera annulé (le mandat est conservé)`
      : `Refuser la demande de ${r.firstName} ${r.lastName} ?`;
    if (!window.confirm(msg)) return;
    const note = approve ? undefined : (window.prompt('Motif du refus (transmis à l\'adhérent) :') || undefined);
    setBusy(r.id);
    try {
      const res = await reviewCancellation(r.id, approve, note);
      if (!res.ok) alert(res.error || 'Action impossible.');
      else if (res.gc_error) alert(`Décision enregistrée, mais l'annulation GoCardless a échoué :\n${res.gc_error}\n\nVérifiez dans GoCardless.`);
      else if (approve) alert(`Résiliation validée.\n${(res.cancelled?.length ?? 0)} abonnement(s) GoCardless annulé(s), mandat conservé.`);
      await load();
    } catch (e: any) { alert(e?.message || 'Action impossible.'); }
    finally { setBusy(null); }
  };

  const TabBtn: React.FC<{ id: Tab; label: string }> = ({ id, label }) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === id ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résiliations</h1>
          <p className="text-sm text-gray-500">Demandes envoyées par les adhérents depuis l'app — à valider.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 self-start bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabBtn id="pending" label="À traiter" />
        <TabBtn id="approved" label="Validées" />
        <TabBtn id="rejected" label="Refusées" />
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <LogOut size={18} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">
            {tab === 'pending' ? 'Demandes en attente' : tab === 'approved' ? 'Résiliations validées' : 'Demandes refusées'}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">
            {tab === 'pending' ? 'Aucune demande en attente. 🎉' : 'Aucune demande.'}
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map((r) => (
              <div key={r.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => openFiche(r.memberId)} className="font-semibold text-gray-900 truncate hover:text-indigo-600 hover:underline">
                      {r.firstName} {r.lastName}
                    </button>
                    {r.memberNumber && <span className="text-[11px] text-gray-400">#{r.memberNumber}</span>}
                    {r.engagement && <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">Engagement</span>}
                    {r.engagement && r.startUnknown && (
                      <span title="Aucune date d'inscription en base : impossible de vérifier automatiquement les 12 mois d'engagement."
                        className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle size={10} /> Ancienneté à vérifier
                      </span>
                    )}
                    {r.hasMandate && <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><CreditCard size={10} /> Mandat SEPA</span>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-gray-500">
                    {r.subscriptionLabel ?? '—'} · {eur(r.price)} · demandée le {dt(r.requestedAt)}
                  </div>
                  <div className="mt-1 text-[12px] text-gray-700">
                    <span className="font-semibold">Fin d'accès :</span> {dmy(r.effectiveDate)}
                    {r.reason ? <> · <span className="font-semibold">Motif :</span> {r.reason}</> : null}
                  </div>
                  {r.message && <p className="mt-1 text-[12px] text-gray-500 italic">« {r.message} »</p>}
                  {r.staffNote && <p className="mt-1 text-[12px] text-gray-400">Note : {r.staffNote}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openFiche(r.memberId)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                    <UserRound size={13} /> Fiche
                  </button>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => decide(r, false)} disabled={busy === r.id}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                        <X size={13} /> Refuser
                      </button>
                      <button onClick={() => decide(r, true)} disabled={busy === r.id}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50">
                        {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Valider
                      </button>
                    </>
                  )}
                  {r.status !== 'pending' && (
                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {r.status === 'approved' ? 'Validée' : 'Refusée'} · {dmy(r.reviewedAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tab === 'pending' && rows.length > 0 && (
        <p className="text-[12px] text-gray-400 flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Valider coupe l'accès à la date de fin indiquée et annule l'abonnement GoCardless. Le mandat SEPA est conservé pour faciliter une réinscription.
        </p>
      )}
    </div>
  );
};

export default CancellationsPage;
