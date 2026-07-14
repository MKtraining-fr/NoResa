import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Send, Ban, CheckCircle2, Building2, Users, Loader2, RefreshCw, Download } from 'lucide-react';
import { listMemberDues, markMemberDuesSettled, sendPaymentReminder, MemberDue } from '../../lib/unpaidApi';
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

  const load = useCallback(async () => {
    setLoading(true);
    const [d, inv] = await Promise.all([listMemberDues(), listGroupInvoices()]);
    setDues(d);
    setInvoices(inv.filter((i) => i.status === 'sent')); // factures émises non réglées
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impayés</h1>
          <p className="text-sm text-gray-500">Prélèvements en échec et factures association non réglées.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 self-start bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser
        </button>
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
                      <span className="font-semibold text-gray-900 truncate">{m.firstName} {m.lastName}</span>
                      {m.memberNumber && <span className="text-[11px] text-gray-400">#{m.memberNumber}</span>}
                      {m.accessBlocked && <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-gray-800 px-1.5 py-0.5 rounded-md">Bloqué</span>}
                      {conseil && !m.accessBlocked && <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><AlertTriangle size={10} /> Blocage conseillé</span>}
                    </div>
                    <div className="mt-0.5 text-[12px] text-gray-500">
                      {m.unpaidCount} impayé{m.unpaidCount > 1 ? 's' : ''} · <span className="font-semibold text-gray-700">{eur(m.totalAmount)}</span> · plus ancien {ageLabel(m.oldestDate)}
                      {m.groupName ? ` · ${m.groupName}${m.subgroupName ? ' / ' + m.subgroupName : ''}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
