import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, Ban, CheckCircle2, Building2, Users, Loader2, RefreshCw, Download, DownloadCloud, UserRound } from 'lucide-react';
import { listMemberDues, markMemberDuesSettled, sendPaymentReminder, syncFailedPayments, MemberDue } from '../../lib/unpaidApi';
import { blockMemberAccess } from '../../lib/accessApi';
import { listGroupInvoices, setGroupInvoiceStatus, sendGroupInvoice, getGroupInvoicePdfUrl, GroupInvoice } from '../../lib/groupBillingApi';

const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;
const BLOCK_THRESHOLD = 2; // 2 impayés consécutifs -> blocage conseillé

const daysSince = (iso: string | null): number => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
};
const ageLabel = (iso: string | null) => {
  const d = daysSince(iso);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  return `il y a ${d} j`;
};
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const periodLabel = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`; };

const UnpaidPage: React.FC = () => {
  const [dues, setDues] = useState<MemberDue[]>([]);
  const [invoices, setInvoices] = useState<GroupInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const openFiche = (memberId: string) => navigate(`/app/crm/membres?member=${memberId}`);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, inv] = await Promise.all([listMemberDues(), listGroupInvoices()]);
    setDues(d);
    setInvoices(inv.filter((i) => i.status === 'sent')); // factures émises non réglées
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const syncGoCardless = async () => {
    if (!window.confirm("Importer depuis GoCardless tout l'historique des prélèvements en échec ?\nCela peut prendre jusqu'à une minute.")) return;
    setSyncing(true);
    try {
      const r = await syncFailedPayments();
      if (!r.ok) { alert(r.error || 'Import impossible.'); }
      else {
        alert(`Import terminé.\n${r.imported ?? 0} échec(s) importé(s), ${r.updated ?? 0} mis à jour.\n${r.skipped_no_member ?? 0} non rattaché(s) à une fiche (mandat inconnu).`);
        await load();
      }
    } catch (e: any) { alert(e?.message || 'Import impossible.'); }
    finally { setSyncing(false); }
  };

  const relancer = async (m: MemberDue) => {
    setBusy('relance:' + m.memberId);
    try {
      const r = await sendPaymentReminder(m.memberId);
      if (r.ok && r.emailed) alert(`Relance envoyée à ${m.firstName} ${m.lastName}.`);
      else alert(r.email_reason || r.error || 'Relance impossible.');
    } catch (e: any) { alert(e?.message || 'Relance impossible.'); }
    finally { setBusy(null); }
  };
  const bloquer = async (m: MemberDue) => {
    if (!m.memberNumber) { alert("Cet adhérent n'a pas de numéro d'adhérent, blocage impossible."); return; }
    if (!window.confirm(`Bloquer l'accès de ${m.firstName} ${m.lastName} ?\nLe pont retirera son accès du contrôleur dans quelques secondes.`)) return;
    setBusy('block:' + m.memberId);
    try {
      await blockMemberAccess(m, `Impayé — ${m.unpaidCount} prélèvement(s) en échec`);
      await load();
    } catch (e: any) { alert(e?.message || 'Blocage impossible.'); }
    finally { setBusy(null); }
  };
  const regulariser = async (m: MemberDue) => {
    if (!window.confirm(`Marquer les impayés de ${m.firstName} ${m.lastName} comme réglés ?\n(${m.unpaidCount} prélèvement(s), ${eur(m.totalAmount)})`)) return;
    setBusy('settle:' + m.memberId);
    try { await markMemberDuesSettled(m.memberId); await load(); }
    catch (e: any) { alert(e?.message || 'Mise à jour impossible.'); }
    finally { setBusy(null); }
  };

  const invPaid = async (inv: GroupInvoice) => {
    setBusy('invpaid:' + inv.id);
    try { await setGroupInvoiceStatus(inv.id, 'paid'); await load(); }
    catch { alert('Mise à jour impossible.'); } finally { setBusy(null); }
  };
  const invRelance = async (inv: GroupInvoice) => {
    setBusy('invrelance:' + inv.id);
    try { const r = await sendGroupInvoice(inv.id, true); if (!r.ok) alert(r.error || 'Envoi impossible.'); else alert(`Facture ${r.invoice_number || ''} renvoyée.`); await load(); }
    catch (e: any) { alert(e?.message || 'Envoi impossible.'); } finally { setBusy(null); }
  };
  const invPdf = async (inv: GroupInvoice) => {
    if (!inv.pdf_path) return;
    const url = await getGroupInvoicePdfUrl(inv.pdf_path);
    if (url) window.open(url, '_blank'); else alert('PDF indisponible.');
  };

  const totalMembers = dues.reduce((s, d) => s + d.totalAmount, 0);
  const totalInvoices = invoices.reduce((s, i) => s + i.total_amount, 0);

  // 5 derniers mois (du plus ancien au plus récent)
  const last5 = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { ym, label: MONTHS_FR[d.getMonth()].slice(0, 4), year: String(d.getFullYear()).slice(2) };
    });
  }, []);
  const monthTotals = last5.map(({ ym }) => {
    let amount = 0, count = 0;
    for (const d of dues) { const m = d.months[ym]; if (m) { amount += Number(m.amount) || 0; count += Number(m.count) || 0; } }
    return { ym, amount, count };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impayés</h1>
          <p className="text-sm text-gray-500">Prélèvements en échec et factures association non réglées.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={syncGoCardless} disabled={syncing} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50">
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} {syncing ? 'Import…' : 'Importer GoCardless'}
          </button>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser
          </button>
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-2xl text-red-600"><Users size={22} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Adhérents en impayé</p>
            <p className="text-2xl font-black text-gray-900">{dues.length} <span className="text-base font-semibold text-gray-400">· {eur(totalMembers)}</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Building2 size={22} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Factures association en attente</p>
            <p className="text-2xl font-black text-gray-900">{invoices.length} <span className="text-base font-semibold text-gray-400">· {eur(totalInvoices)}</span></p>
          </div>
        </div>
      </div>

      {/* Récap 5 derniers mois */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <p className="text-sm font-bold text-gray-900 mb-3">Impayés adhérents — 5 derniers mois</p>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {monthTotals.map((m) => (
            <div key={m.ym} className={`rounded-2xl border p-3 text-center ${m.count > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 capitalize">{last5.find((x) => x.ym === m.ym)?.label} {last5.find((x) => x.ym === m.ym)?.year}</p>
              <p className={`text-base sm:text-lg font-black mt-1 ${m.count > 0 ? 'text-red-700' : 'text-gray-300'}`}>{m.count > 0 ? eur(m.amount) : '—'}</p>
              <p className="text-[10px] text-gray-400">{m.count > 0 ? `${m.count} impayé${m.count > 1 ? 's' : ''}` : 'aucun'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Adhérents */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={18} className="text-red-600" />
          <h2 className="text-sm font-bold text-gray-900">Adhérents — prélèvements SEPA</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Chargement…</p>
        ) : dues.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Aucun impayé adhérent. 🎉</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {dues.map((m) => {
              const conseil = m.unpaidCount >= BLOCK_THRESHOLD;
              return (
                <div key={m.memberId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openFiche(m.memberId)} className="font-semibold text-gray-900 truncate hover:text-indigo-600 hover:underline">{m.firstName} {m.lastName}</button>
                      {m.memberNumber && <span className="text-[11px] text-gray-400">#{m.memberNumber}</span>}
                      {m.accessBlocked && <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-gray-800 px-1.5 py-0.5 rounded-md">Bloqué</span>}
                      {conseil && !m.accessBlocked && <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><AlertTriangle size={10} /> Blocage conseillé</span>}
                    </div>
                    <div className="mt-0.5 text-[12px] text-gray-500">
                      {m.unpaidCount} impayé{m.unpaidCount > 1 ? 's' : ''} · <span className="font-semibold text-gray-700">{eur(m.totalAmount)}</span> · plus ancien {ageLabel(m.oldestDate)}
                      {m.groupName ? ` · ${m.groupName}${m.subgroupName ? ' / ' + m.subgroupName : ''}` : ''}
                    </div>
                    {/* 5 derniers mois */}
                    <div className="mt-2 grid grid-cols-5 gap-1 max-w-md">
                      {last5.map((mo) => {
                        const cell = m.months[mo.ym];
                        return (
                          <div key={mo.ym} className={`rounded-lg px-1 py-1 text-center border ${cell ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 capitalize">{mo.label}</div>
                            <div className={`text-[11px] font-bold ${cell ? 'text-red-700' : 'text-gray-300'}`}>{cell ? eur(Number(cell.amount)) : '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openFiche(m.memberId)} title="Ouvrir la fiche (infos, visites…)" className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                      <UserRound size={13} /> Fiche
                    </button>
                    <button onClick={() => relancer(m)} disabled={busy === 'relance:' + m.memberId || !m.email} title={m.email ? 'Envoyer une relance e-mail' : 'Pas d\'e-mail sur la fiche'} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-40">
                      {busy === 'relance:' + m.memberId ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Relancer
                    </button>
                    {!m.accessBlocked && (
                      <button onClick={() => bloquer(m)} disabled={busy === 'block:' + m.memberId} className="flex items-center gap-1.5 bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50">
                        {busy === 'block:' + m.memberId ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Bloquer
                      </button>
                    )}
                    <button onClick={() => regulariser(m)} disabled={busy === 'settle:' + m.memberId} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50">
                      {busy === 'settle:' + m.memberId ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Régularisé
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Associations */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 size={18} className="text-amber-600" />
          <h2 className="text-sm font-bold text-gray-900">Associations — factures émises non réglées</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Chargement…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Aucune facture association en attente.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{inv.payer_name || 'Association'}</span>
                    <span className="text-[11px] text-gray-400 capitalize">{periodLabel(inv.period_start)}</span>
                    {inv.invoice_number && <span className="text-[11px] text-gray-400">{inv.invoice_number}</span>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-gray-500">
                    {inv.member_count} adhérent{inv.member_count > 1 ? 's' : ''} · <span className="font-semibold text-gray-700">{eur(inv.total_amount)}</span>
                    {inv.emailed_at ? ` · envoyée ${ageLabel(inv.emailed_at)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inv.pdf_path && (
                    <button onClick={() => invPdf(inv)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50"><Download size={13} /> PDF</button>
                  )}
                  <button onClick={() => invRelance(inv)} disabled={busy === 'invrelance:' + inv.id} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                    {busy === 'invrelance:' + inv.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Relancer
                  </button>
                  <button onClick={() => invPaid(inv)} disabled={busy === 'invpaid:' + inv.id} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    {busy === 'invpaid:' + inv.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Marquer payée
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnpaidPage;
