import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, Ban, CheckCircle2, Building2, Users, Loader2, RefreshCw, Download, DownloadCloud, UserRound, Link2, Search, X, HelpCircle } from 'lucide-react';
import { listMemberDues, dismissMemberDues, sendPaymentReminder, syncFailedPayments, listOrphanDues, attachOrphanMandate, dismissOrphanMandate, MemberDue, OrphanDue } from '../../lib/unpaidApi';
import { blockMemberAccess } from '../../lib/accessApi';
import { listGroupInvoices, setGroupInvoiceStatus, sendGroupInvoice, getGroupInvoicePdfUrl, GroupInvoice } from '../../lib/groupBillingApi';
import { getMembers } from '../../lib/membersApi';
import { Member } from '../../types';

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
const dmy = (iso: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR') : '—');

type Tab = 'adherents' | 'associations' | 'orphelins';

const UnpaidPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('adherents');
  const [dues, setDues] = useState<MemberDue[]>([]);
  const [invoices, setInvoices] = useState<GroupInvoice[]>([]);
  const [orphans, setOrphans] = useState<OrphanDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const openFiche = (memberId: string) => navigate(`/app/crm/membres?member=${memberId}&from=${encodeURIComponent('/app/finance/impayes')}`);

  // Rattachement d'un orphelin à une fiche
  const [attachTarget, setAttachTarget] = useState<OrphanDue | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [attaching, setAttaching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, inv, orph] = await Promise.all([listMemberDues(), listGroupInvoices(), listOrphanDues()]);
    setDues(d);
    setInvoices(inv.filter((i) => i.status === 'sent'));
    setOrphans(orph);
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
        alert(`Import terminé.\n${r.imported ?? 0} impayé(s) rattaché(s) importé(s).\n${(r as any).orphans ?? 0} orphelin(s) (mandat non rattaché à une fiche).`);
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
  const ecarter = async (m: MemberDue) => {
    if (!window.confirm(`Écarter les impayés de ${m.firstName} ${m.lastName} de la liste ?\n(${m.unpaidCount} prélèvement(s), ${eur(m.totalAmount)})\n\nAucun encaissement n'est enregistré : le montant n'entre pas dans le chiffre d'affaires.`)) return;
    setBusy('settle:' + m.memberId);
    try { await dismissMemberDues(m.memberId); await load(); }
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

  // --- Orphelins ---
  const openAttach = async (o: OrphanDue) => {
    setAttachTarget(o);
    setMemberQuery(o.customerName || '');
    if (members.length === 0) { try { setMembers(await getMembers()); } catch { /* noop */ } }
  };
  const doAttach = async (member: Member) => {
    if (!attachTarget?.mandateId) return;
    if (!window.confirm(`Rattacher les ${attachTarget.count} impayé(s) de « ${attachTarget.customerName || 'ce mandat'} » à la fiche de ${member.firstName} ${member.lastName} ?`)) return;
    setAttaching(true);
    try {
      await attachOrphanMandate(attachTarget.mandateId, member.id);
      setAttachTarget(null); setMemberQuery('');
      await load();
    } catch (e: any) { alert(e?.message || 'Rattachement impossible.'); }
    finally { setAttaching(false); }
  };
  const dismissOrphan = async (o: OrphanDue) => {
    if (!o.mandateId) return;
    if (!window.confirm(`Écarter définitivement les ${o.count} impayé(s) de « ${o.customerName || 'ce mandat'} » ?\n(Aucun encaissement — n'entre pas dans le CA.)`)) return;
    setBusy('orphan:' + o.mandateId);
    try { await dismissOrphanMandate(o.mandateId); await load(); }
    catch (e: any) { alert(e?.message || 'Mise à jour impossible.'); }
    finally { setBusy(null); }
  };

  const totalMembers = dues.reduce((s, d) => s + d.totalAmount, 0);
  const totalInvoices = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOrphans = orphans.reduce((s, o) => s + o.total, 0);

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

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const base = members;
    const list = q
      ? base.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || String(m.memberNumber ?? '').includes(q))
      : base;
    return list.slice(0, 40);
  }, [members, memberQuery]);

  const TabBtn: React.FC<{ id: Tab; label: string; count: number; color: string }> = ({ id, label, count, color }) => (
    <button onClick={() => setTab(id)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`} style={{ backgroundColor: tab === id ? color : undefined }}>
      {label} <span className={`ml-1 ${tab === id ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impayés</h1>
          <p className="text-sm text-gray-500">Prélèvements en échec, factures association et mandats orphelins.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-2xl text-red-600"><Users size={22} /></div>
          <div><p className="text-sm font-medium text-gray-500">Adhérents en impayé</p><p className="text-2xl font-black text-gray-900">{dues.length} <span className="text-base font-semibold text-gray-400">· {eur(totalMembers)}</span></p></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Building2 size={22} /></div>
          <div><p className="text-sm font-medium text-gray-500">Factures association</p><p className="text-2xl font-black text-gray-900">{invoices.length} <span className="text-base font-semibold text-gray-400">· {eur(totalInvoices)}</span></p></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-violet-50 p-3 rounded-2xl text-violet-600"><HelpCircle size={22} /></div>
          <div><p className="text-sm font-medium text-gray-500">Mandats orphelins</p><p className="text-2xl font-black text-gray-900">{orphans.length} <span className="text-base font-semibold text-gray-400">· {eur(totalOrphans)}</span></p></div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        <TabBtn id="adherents" label="Adhérents" count={dues.length} color="#dc2626" />
        <TabBtn id="associations" label="Associations" count={invoices.length} color="#d97706" />
        <TabBtn id="orphelins" label="Orphelins" count={orphans.length} color="#7c3aed" />
      </div>

      {/* ---- Onglet Adhérents ---- */}
      {tab === 'adherents' && (
        <>
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
                        <button onClick={() => ecarter(m)} disabled={busy === 'settle:' + m.memberId} title="Retirer de la liste sans encaissement (n'entre pas dans le CA)" className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                          {busy === 'settle:' + m.memberId ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Écarter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- Onglet Associations ---- */}
      {tab === 'associations' && (
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
      )}

      {/* ---- Onglet Orphelins ---- */}
      {tab === 'orphelins' && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <HelpCircle size={18} className="text-violet-600" />
            <h2 className="text-sm font-bold text-gray-900">Mandats orphelins — non rattachés à une fiche</h2>
          </div>
          <p className="px-6 pt-3 text-[12px] text-gray-500">Échecs GoCardless dont le mandat n'est relié à aucune fiche. Rattachez-les à un adhérent pour les faire remonter (les prélèvements et les suivants seront alors suivis).</p>
          {loading ? (
            <p className="text-sm text-gray-400 py-10 text-center">Chargement…</p>
          ) : orphans.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucun mandat orphelin. 🎉</p>
          ) : (
            <div className="divide-y divide-gray-50 mt-2">
              {orphans.map((o) => (
                <div key={o.mandateId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{o.customerName || 'Client inconnu'}</span>
                      <span className="text-[11px] text-gray-400 font-mono">{o.mandateId}</span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-gray-500">
                      {o.count} impayé{o.count > 1 ? 's' : ''} · <span className="font-semibold text-gray-700">{eur(o.total)}</span> · du {dmy(o.oldest)} au {dmy(o.latest)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openAttach(o)} className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-violet-700">
                      <Link2 size={13} /> Rattacher
                    </button>
                    <button onClick={() => dismissOrphan(o)} disabled={busy === 'orphan:' + o.mandateId} title="Retirer sans encaissement (n'entre pas dans le CA)" className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                      {busy === 'orphan:' + o.mandateId ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Écarter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modale de rattachement */}
      {attachTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAttachTarget(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Rattacher à une fiche</h3>
                <p className="text-[12px] text-gray-500">{attachTarget.customerName || 'Client inconnu'} · {attachTarget.count} impayé{attachTarget.count > 1 ? 's' : ''} · {eur(attachTarget.total)}</p>
              </div>
              <button onClick={() => setAttachTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input autoFocus value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Rechercher un adhérent (nom ou n°)…" className="flex-grow bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div className="px-4 pb-4 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Chargement des fiches…</p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Aucun adhérent trouvé.</p>
              ) : (
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  {filteredMembers.map((m) => (
                    <button key={m.id} onClick={() => doAttach(m)} disabled={attaching} className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-violet-50 disabled:opacity-50">
                      <span className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</span>
                      <span className="text-[11px] text-gray-400">#{m.memberNumber ?? '—'}</span>
                    </button>
                  ))}
                </div>
              )}
              {attaching && <p className="text-[12px] text-violet-600 mt-3 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Rattachement…</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnpaidPage;
