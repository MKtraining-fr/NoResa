import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Plus, Trash2, Check, X, Edit2, CornerDownRight, Euro, Building2, FileText, Send, Download, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { getGroupTree, getGroupsFlat, createGroup, renameGroup, deleteGroup, updateGroupBillingRule, GroupNode, MemberGroup } from '../../lib/groupsApi';
import { listGroupInvoices, upsertGroupInvoiceDraft, sendGroupInvoice, setGroupInvoiceStatus, getGroupInvoicePdfUrl, previewGroupInvoice, updateGroupInvoiceBreakdown, monthToPeriod, GroupInvoice, GroupInvoiceLine } from '../../lib/groupBillingApi';

const GroupsSettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [tree, setTree] = useState<GroupNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState('');
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; parentId: string | null; old: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [flat, setFlat] = useState<MemberGroup[]>([]);
  const [billingFor, setBillingFor] = useState<string | null>(null);
  const [bForm, setBForm] = useState({ billedToThirdParty: false, payerName: '', billingEmail: '', billingAddress: '', unitPrice: '', formulaLabel: '', prorata: true, billOnlyAttendees: false });
  // Factures association
  const [invoicesFor, setInvoicesFor] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<GroupInvoice[]>([]);
  const [invMonth, setInvMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [invBusy, setInvBusy] = useState(false);
  const [invSending, setInvSending] = useState<string | null>(null);

  const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;
  const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const periodLabel = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`; };

  // Édition du détail d'un brouillon (ajustement d'effectif, tarif, ligne libre)
  const [editLines, setEditLines] = useState<GroupInvoiceLine[] | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const startEditLines = (inv: GroupInvoice) => {
    setEditFor(inv.id);
    setEditLines(inv.breakdown.map((l) => ({ ...l })));
  };
  const patchLine = (i: number, patch: Partial<GroupInvoiceLine>) =>
    setEditLines((prev) => prev ? prev.map((l, idx) => idx === i ? { ...l, ...patch } : l) : prev);
  const addLine = () =>
    setEditLines((prev) => [...(prev ?? []), { pavillon: '—', label: 'Ligne complémentaire', count: 1, unit_price: 0, amount: 0, is_extra: true }]);
  const removeLine = (i: number) =>
    setEditLines((prev) => prev ? prev.filter((_, idx) => idx !== i) : prev);
  const editTotal = (editLines ?? []).reduce((s2, l) => s2 + (Number(l.count) || 0) * (Number(l.unit_price) || 0), 0);
  const saveLines = async (inv: GroupInvoice) => {
    if (!editLines) return;
    setInvBusy(true);
    try {
      await updateGroupInvoiceBreakdown(inv.id, editLines);
      setEditFor(null); setEditLines(null);
      await reloadInvoices(inv.group_id);
    } catch (e: any) { alert(e?.message || 'Enregistrement impossible.'); }
    finally { setInvBusy(false); }
  };
  const openPreview = async (inv: GroupInvoice) => {
    setInvSending(inv.id);
    try {
      const r = await previewGroupInvoice(inv.id);
      if (!r.ok || !r.pdf_path) { alert(r.error || 'Aperçu impossible.'); return; }
      const url = await getGroupInvoicePdfUrl(r.pdf_path);
      if (url) window.open(url, '_blank'); else alert('PDF indisponible.');
      await reloadInvoices(inv.group_id);
    } catch (e: any) { alert(e?.message || 'Aperçu impossible.'); }
    finally { setInvSending(null); }
  };

  const openInvoices = async (groupId: string) => {
    if (invoicesFor === groupId) { setInvoicesFor(null); return; }
    setInvoicesFor(groupId); setBillingFor(null);
    setInvoices(await listGroupInvoices(groupId));
  };
  const reloadInvoices = async (groupId: string) => setInvoices(await listGroupInvoices(groupId));
  const refreshDraft = async (groupId: string) => {
    setInvBusy(true);
    try { await upsertGroupInvoiceDraft(groupId, monthToPeriod(invMonth)); await reloadInvoices(groupId); }
    catch (e: any) { alert(e?.message || 'Calcul du brouillon impossible.'); }
    finally { setInvBusy(false); }
  };
  const sendInvoice = async (inv: GroupInvoice) => {
    if (!window.confirm(`Générer et envoyer la facture de ${periodLabel(inv.period_start)} à ${inv.payer_name || 'l\'association'}${inv.billing_email ? ` (${inv.billing_email})` : ''} ?`)) return;
    setInvSending(inv.id);
    try {
      const r = await sendGroupInvoice(inv.id, true);
      if (!r.ok) { alert(r.error || 'Envoi impossible.'); }
      else if (!r.emailed && r.email_reason) { alert(`Facture ${r.invoice_number || ''} générée.\n${r.email_reason}`); }
      await reloadInvoices(inv.group_id);
    } catch (e: any) { alert(e?.message || 'Envoi impossible.'); }
    finally { setInvSending(null); }
  };
  const markPaid = async (inv: GroupInvoice) => {
    setInvBusy(true);
    try { await setGroupInvoiceStatus(inv.id, 'paid'); await reloadInvoices(inv.group_id); }
    catch { alert('Mise à jour impossible.'); } finally { setInvBusy(false); }
  };
  const cancelInvoice = async (inv: GroupInvoice) => {
    if (!window.confirm('Annuler cette facture ?')) return;
    setInvBusy(true);
    try { await setGroupInvoiceStatus(inv.id, 'cancelled'); await reloadInvoices(inv.group_id); }
    catch { alert('Mise à jour impossible.'); } finally { setInvBusy(false); }
  };
  const openPdf = async (inv: GroupInvoice) => {
    if (!inv.pdf_path) return;
    const url = await getGroupInvoicePdfUrl(inv.pdf_path);
    if (url) window.open(url, '_blank'); else alert('PDF indisponible.');
  };

  const load = useCallback(async () => {
    const [t, f] = await Promise.all([getGroupTree(), getGroupsFlat()]);
    setTree(t); setFlat(f); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Tarif propre à un pavillon (sous-groupe). Seuls le prix et le libellé se
  // surchargent : le payeur et l'e-mail restent définis au niveau du groupe.
  const [subBillingFor, setSubBillingFor] = useState<string | null>(null);
  const [sForm, setSForm] = useState({ unitPrice: '', formulaLabel: '' });
  const openSubBilling = (subId: string) => {
    const r = flat.find((x) => x.id === subId);
    setSForm({
      unitPrice: r?.unitPrice != null ? String(r.unitPrice) : '',
      formulaLabel: r?.formulaLabel ?? '',
    });
    setBillingFor(null);
    setSubBillingFor((cur) => (cur === subId ? null : subId));
  };
  const saveSubBilling = async () => {
    if (!subBillingFor) return;
    setBusy(true);
    try {
      await updateGroupBillingRule(subBillingFor, {
        billedToThirdParty: false, // porté par le groupe parent
        unitPrice: sForm.unitPrice ? Number(sForm.unitPrice) : null,
        formulaLabel: sForm.formulaLabel,
      });
      setSubBillingFor(null); await load();
    } catch { alert('Enregistrement impossible.'); } finally { setBusy(false); }
  };

  const openBilling = (groupId: string) => {
    const r = flat.find((x) => x.id === groupId);
    setBForm({
      billedToThirdParty: r?.billedToThirdParty ?? false,
      payerName: r?.payerName ?? '',
      billingEmail: r?.billingEmail ?? '',
      billingAddress: r?.billingAddress ?? '',
      unitPrice: r?.unitPrice != null ? String(r.unitPrice) : '',
      formulaLabel: r?.formulaLabel ?? '',
      prorata: r?.prorata ?? true,
      billOnlyAttendees: r?.billOnlyAttendees ?? false,
    });
    setSubBillingFor(null);
    setBillingFor((cur) => (cur === groupId ? null : groupId));
  };
  const saveBilling = async () => {
    if (!billingFor) return;
    setBusy(true);
    try {
      await updateGroupBillingRule(billingFor, {
        billedToThirdParty: bForm.billedToThirdParty,
        payerName: bForm.payerName, billingEmail: bForm.billingEmail, billingAddress: bForm.billingAddress,
        unitPrice: bForm.unitPrice ? Number(bForm.unitPrice) : null,
        formulaLabel: bForm.formulaLabel, prorata: bForm.prorata,
        billOnlyAttendees: bForm.billOnlyAttendees,
      });
      setBillingFor(null); await load();
    } catch { alert('Enregistrement impossible.'); } finally { setBusy(false); }
  };

  const addGroup = async () => {
    if (!newGroup.trim() || busy) return;
    setBusy(true);
    try { await createGroup(newGroup); setNewGroup(''); await load(); }
    catch (e: any) { alert(e?.message?.includes('duplicate') ? 'Ce groupe existe déjà.' : 'Impossible de créer le groupe.'); }
    finally { setBusy(false); }
  };
  const addSub = async (parentId: string) => {
    const v = (subDraft[parentId] || '').trim();
    if (!v || busy) return;
    setBusy(true);
    try { await createGroup(v, parentId); setSubDraft((d) => ({ ...d, [parentId]: '' })); await load(); }
    catch (e: any) { alert(e?.message?.includes('duplicate') ? 'Ce sous-groupe existe déjà.' : 'Impossible de créer le sous-groupe.'); }
    finally { setBusy(false); }
  };
  const saveRename = async () => {
    if (!editing) return;
    setBusy(true);
    try { await renameGroup(editing.id, editVal, editing.parentId, editing.old); setEditing(null); await load(); }
    catch { alert('Impossible de renommer.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string, label: string, isGroup: boolean) => {
    if (!window.confirm(`Supprimer ${isGroup ? 'le groupe' : 'le sous-groupe'} « ${label} » ?${isGroup ? '\nSes sous-groupes seront aussi supprimés.' : ''}\n\nLes fiches concernées ne seront pas supprimées, mais perdront cette étiquette à la prochaine modification.`)) return;
    setBusy(true);
    try { await deleteGroup(id); await load(); } catch { alert('Suppression impossible.'); } finally { setBusy(false); }
  };

  const startEdit = (id: string, parentId: string | null, name: string) => { setEditing({ id, parentId, old: name }); setEditVal(name); };

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 max-w-3xl'}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Groupes & sous-groupes</h1>
          <p className="text-sm text-gray-500">Organisez vos pratiquants (familles, cours, équipes…). Ces étiquettes servent à filtrer et, bientôt, à gérer les accès en masse.</p>
        </div>
      )}

      {/* Ajouter un groupe */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
        <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><Layers size={15} /></span>
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="Nom d'un nouveau groupe (ex. Famille Martin, Cours du mardi…)"
          className="flex-grow bg-transparent outline-none text-sm font-medium px-1"
        />
        <button onClick={addGroup} disabled={busy || !newGroup.trim()} className="flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
      ) : tree.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
          Aucun groupe pour l'instant. Créez-en un ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Groupe */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Layers size={15} className="text-indigo-500 shrink-0" />
                {editing?.id === g.id ? (
                  <>
                    <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename()} className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold outline-none" />
                    <button onClick={saveRename} disabled={busy} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Check size={14} /></button>
                    <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-grow text-sm font-semibold text-gray-900">{g.name}</span>
                    {flat.find((x) => x.id === g.id)?.billedToThirdParty && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Building2 size={10} /> Payeur tiers</span>
                    )}
                    <span className="text-[11px] text-gray-400">{g.subgroups.length} sous-groupe{g.subgroups.length > 1 ? 's' : ''}</span>
                    <button onClick={() => openBilling(g.id)} title="Règle de facturation (payeur tiers)" className={`p-1.5 rounded-lg ${billingFor === g.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-indigo-600'}`}><Euro size={14} /></button>
                    {flat.find((x) => x.id === g.id)?.billedToThirdParty && (
                      <button onClick={() => openInvoices(g.id)} title="Factures mensuelles" className={`p-1.5 rounded-lg ${invoicesFor === g.id ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:text-emerald-600'}`}><FileText size={14} /></button>
                    )}
                    <button onClick={() => startEdit(g.id, null, g.name)} className="p-1.5 text-gray-300 hover:text-indigo-600"><Edit2 size={14} /></button>
                    <button onClick={() => remove(g.id, g.name, true)} className="p-1.5 text-gray-300 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
              </div>

              {/* Panneau facturation (payeur tiers) */}
              {billingFor === g.id && (
                <div className="px-4 py-4 bg-indigo-50/40 border-b border-gray-100 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={bForm.billedToThirdParty} onChange={(e) => setBForm((f) => ({ ...f, billedToThirdParty: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm font-semibold text-gray-800">Ce groupe est réglé par un tiers (association / entreprise)</span>
                  </label>
                  {bForm.billedToThirdParty && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Nom du payeur</label>
                        <input value={bForm.payerName} onChange={(e) => setBForm((f) => ({ ...f, payerName: e.target.value }))} placeholder={`ex. Association ${g.name}`} className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">E-mail de facturation</label>
                        <input type="email" value={bForm.billingEmail} onChange={(e) => setBForm((f) => ({ ...f, billingEmail: e.target.value }))} placeholder="compta@association.fr" className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Adresse de facturation</label>
                        <input value={bForm.billingAddress} onChange={(e) => setBForm((f) => ({ ...f, billingAddress: e.target.value }))} placeholder="Adresse postale (pour la facture)" className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prix / mois / adhérent (€)</label>
                        <input type="number" step="0.01" min="0" value={bForm.unitPrice} onChange={(e) => setBForm((f) => ({ ...f, unitPrice: e.target.value }))} placeholder="20.00" className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Libellé de formule (imposé)</label>
                        <input value={bForm.formulaLabel} onChange={(e) => setBForm((f) => ({ ...f, formulaLabel: e.target.value }))} placeholder={`Accès ${g.name}`} className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <label className="sm:col-span-2 flex items-start gap-2 cursor-pointer p-2.5 rounded-xl bg-white border border-gray-200">
                        <input type="checkbox" checked={bForm.billOnlyAttendees}
                          onChange={(e) => setBForm((f) => ({ ...f, billOnlyAttendees: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 shrink-0" />
                        <span>
                          <span className="block text-[12px] font-bold text-gray-800">Facturer à la fréquentation</span>
                          <span className="block text-[11px] text-gray-500">
                            Seuls les adhérents ayant badgé au moins une fois dans le mois sont facturés.
                            La facture est alors établie à mois échu (le 1er, pour le mois précédent).
                          </span>
                        </span>
                      </label>
                      <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={bForm.prorata} onChange={(e) => setBForm((f) => ({ ...f, prorata: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                        <span className="text-[12px] text-gray-600">Facturer au prorata pour les entrées/sorties en cours de mois</span>
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={saveBilling} disabled={busy} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">Enregistrer</button>
                    <button onClick={() => setBillingFor(null)} className="text-sm font-medium text-gray-500 px-3 py-2">Fermer</button>
                    <p className="text-[11px] text-gray-400 ml-auto hidden sm:block">À l'inscription, ces règles s'appliquent automatiquement aux adhérents du groupe.</p>
                  </div>
                </div>
              )}

              {/* Panneau factures mensuelles */}
              {invoicesFor === g.id && (
                <div className="px-4 py-4 bg-emerald-50/40 border-b border-gray-100 space-y-3">
                  {/* Brouillon du mois */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 block">Mois à facturer</label>
                      <input type="month" value={invMonth} onChange={(e) => setInvMonth(e.target.value)} className="mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <button onClick={() => refreshDraft(g.id)} disabled={invBusy} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                      {invBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Calculer le brouillon
                    </button>
                    <p className="text-[11px] text-gray-400 ml-auto hidden sm:block max-w-[220px]">Prix unitaire × nombre d'adhérents actifs du groupe, détaillé par sous-groupe.</p>
                  </div>

                  {invoices.length === 0 ? (
                    <p className="text-[13px] text-gray-500 py-2">Aucune facture. Choisissez un mois puis « Calculer le brouillon ».</p>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => {
                        const badge = inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : inv.status === 'cancelled' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700';
                        const label = inv.status === 'paid' ? 'Payée' : inv.status === 'sent' ? 'Envoyée' : inv.status === 'cancelled' ? 'Annulée' : 'Brouillon';
                        return (
                          <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 capitalize">{periodLabel(inv.period_start)}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${badge}`}>{label}</span>
                              {inv.invoice_number && <span className="text-[11px] text-gray-400">{inv.invoice_number}</span>}
                              <span className="ml-auto text-sm font-bold text-gray-900">{eur(inv.total_amount)}</span>
                            </div>
                            <div className="mt-1 text-[12px] text-gray-500">{inv.member_count} adhérent{inv.member_count > 1 ? 's' : ''} · {inv.payer_name || '—'}</div>
                            {editFor === inv.id && editLines ? (
                              <div className="mt-2 border border-indigo-200 rounded-lg overflow-hidden bg-indigo-50/30">
                                <div className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50">Modification du détail</div>
                                <div className="divide-y divide-indigo-100/60">
                                  {editLines.map((l, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-1.5 px-2.5 py-2">
                                      <input value={l.label} onChange={(e) => patchLine(i, { label: e.target.value })}
                                        placeholder="Libellé"
                                        className="flex-1 min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] outline-none" />
                                      <input value={l.pavillon} onChange={(e) => patchLine(i, { pavillon: e.target.value })}
                                        placeholder="Pavillon"
                                        className="w-28 bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] outline-none" />
                                      <input type="number" min="0" value={l.count}
                                        onChange={(e) => patchLine(i, { count: Number(e.target.value) })}
                                        className="w-16 bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] text-right outline-none" />
                                      <span className="text-gray-400 text-[12px]">×</span>
                                      <input type="number" step="0.01" min="0" value={l.unit_price}
                                        onChange={(e) => patchLine(i, { unit_price: Number(e.target.value) })}
                                        className="w-20 bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] text-right outline-none" />
                                      <span className="font-semibold text-gray-800 w-20 text-right text-[12px]">
                                        {eur((Number(l.count) || 0) * (Number(l.unit_price) || 0))}
                                      </span>
                                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer" title="Ligne complémentaire : exclue du nombre d'adhérents facturés">
                                        <input type="checkbox" checked={!!l.is_extra}
                                          onChange={(e) => patchLine(i, { is_extra: e.target.checked })}
                                          className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600" />
                                        hors effectif
                                      </label>
                                      <button onClick={() => removeLine(i)} className="p-1 text-gray-300 hover:text-red-600"><Trash2 size={13} /></button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 px-2.5 py-2 border-t border-indigo-100">
                                  <button onClick={addLine} className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"><Plus size={13} /> Ajouter une ligne</button>
                                  <span className="ml-auto text-[13px] font-bold text-gray-900">Total : {eur(editTotal)}</span>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 pb-2.5">
                                  <button onClick={() => saveLines(inv)} disabled={invBusy}
                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50">Enregistrer</button>
                                  <button onClick={() => { setEditFor(null); setEditLines(null); }}
                                    className="text-[13px] font-medium text-gray-500 px-2 py-1.5">Annuler</button>
                                </div>
                              </div>
                            ) : inv.breakdown.length > 0 ? (
                              <div className="mt-2 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                                {inv.breakdown.map((l, i) => (
                                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
                                    <span className="text-gray-700 flex-grow truncate">{l.label} — {l.pavillon}</span>
                                    <span className="text-gray-400">{l.count} × {eur(l.unit_price)}</span>
                                    <span className="font-semibold text-gray-800 w-20 text-right">{eur(l.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              {inv.status === 'draft' && editFor !== inv.id && (
                                <button onClick={() => startEditLines(inv)} disabled={invBusy}
                                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                                  <Edit2 size={13} /> Modifier
                                </button>
                              )}
                              {inv.status === 'draft' && (
                                <button onClick={() => openPreview(inv)} disabled={invSending === inv.id}
                                  className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-50 disabled:opacity-50">
                                  {invSending === inv.id ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Aperçu PDF
                                </button>
                              )}
                              {(inv.status === 'draft' || inv.status === 'sent') && (
                                <button onClick={() => sendInvoice(inv)} disabled={invSending === inv.id} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50">
                                  {invSending === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {inv.status === 'sent' ? 'Renvoyer' : 'Générer & envoyer'}
                                </button>
                              )}
                              {inv.pdf_path && (
                                <button onClick={() => openPdf(inv)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50"><Download size={13} /> PDF</button>
                              )}
                              {inv.status === 'sent' && (
                                <button onClick={() => markPaid(inv)} disabled={invBusy} className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-emerald-50 disabled:opacity-50"><CheckCircle2 size={13} /> Marquer payée</button>
                              )}
                              {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                                <button onClick={() => cancelInvoice(inv)} className="ml-auto text-[13px] font-medium text-gray-400 hover:text-red-600 px-2 py-1.5">Annuler</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => setInvoicesFor(null)} className="text-sm font-medium text-gray-500 px-3 py-2">Fermer</button>
                    <p className="text-[11px] text-gray-400 ml-auto hidden sm:block">Un brouillon est généré automatiquement le 1er de chaque mois.</p>
                  </div>
                </div>
              )}

              {/* Sous-groupes */}
              <div className="px-4 py-2 space-y-1.5">
                {g.subgroups.map((s) => (
                  <div key={s.id}>
                  <div className="flex items-center gap-2 pl-1">
                    <CornerDownRight size={13} className="text-gray-300 shrink-0" />
                    {editing?.id === s.id ? (
                      <>
                        <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename()} className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-medium outline-none" />
                        <button onClick={saveRename} disabled={busy} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Check size={14} /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow text-sm text-gray-700">{s.name}</span>
                        {(() => { const r = flat.find((x) => x.id === s.id); return r?.unitPrice != null ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                            {Number(r.unitPrice).toFixed(2).replace('.', ',')} €
                          </span>
                        ) : null; })()}
                        {flat.find((x) => x.id === g.id)?.billedToThirdParty && (
                          <button onClick={() => openSubBilling(s.id)} title="Tarif propre à ce pavillon"
                            className={`p-1.5 rounded-lg ${subBillingFor === s.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-indigo-600'}`}><Euro size={13} /></button>
                        )}
                        <button onClick={() => startEdit(s.id, g.id, s.name)} className="p-1.5 text-gray-300 hover:text-indigo-600"><Edit2 size={13} /></button>
                        <button onClick={() => remove(s.id, s.name, false)} className="p-1.5 text-gray-300 hover:text-red-600"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>

                  {subBillingFor === s.id && (
                    <div className="ml-6 mt-2 mb-1 p-3 rounded-xl bg-indigo-50/40 border border-gray-100 space-y-2.5">
                      <p className="text-[11px] text-gray-500">
                        Laisse vide pour appliquer le tarif du groupe <b>{g.name}</b>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prix / mois / adhérent (€)</label>
                          <input type="number" step="0.01" min="0" value={sForm.unitPrice}
                            onChange={(e) => setSForm((f) => ({ ...f, unitPrice: e.target.value }))}
                            placeholder="tarif du groupe"
                            className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Libellé sur la facture</label>
                          <input value={sForm.formulaLabel}
                            onChange={(e) => setSForm((f) => ({ ...f, formulaLabel: e.target.value }))}
                            placeholder={`Accès ${s.name}`}
                            className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={saveSubBilling} disabled={busy} className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50">Enregistrer</button>
                        <button onClick={() => setSubBillingFor(null)} className="text-[13px] font-medium text-gray-500 px-2 py-1.5">Fermer</button>
                      </div>
                    </div>
                  )}
                  </div>
                ))}
                {/* Ajout sous-groupe */}
                <div className="flex items-center gap-2 pl-1 pt-1">
                  <CornerDownRight size={13} className="text-gray-200 shrink-0" />
                  <input
                    value={subDraft[g.id] || ''}
                    onChange={(e) => setSubDraft((d) => ({ ...d, [g.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addSub(g.id)}
                    placeholder="Ajouter un sous-groupe…"
                    className="flex-grow bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button onClick={() => addSub(g.id)} disabled={busy || !(subDraft[g.id] || '').trim()} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"><Plus size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsSettingsPage;
