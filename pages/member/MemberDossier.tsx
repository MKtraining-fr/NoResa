import React, { useEffect, useState } from 'react';
import { FileText, Receipt, Download, Loader2, FileSignature, LogOut } from 'lucide-react';
import CancellationCard from '../../components/CancellationCard';
import {
  getMyContracts, getMyInvoices, signedPdfUrl,
  type MyContract, type MyInvoice,
} from '../../lib/memberSelfApi';

const fmtEur = (n: number | null) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')} €`);
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : '');

/** Mon dossier : contrat(s) signé(s) + factures, consultables/téléchargeables. */
const MemberDossier: React.FC = () => {
  const [contracts, setContracts] = useState<MyContract[]>([]);
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, i] = await Promise.all([getMyContracts(), getMyInvoices()]);
      setContracts(c); setInvoices(i); setLoading(false);
    })();
  }, []);

  const openPdf = async (bucket: 'contracts' | 'invoices', path: string | null, key: string) => {
    if (!path) return;
    setOpening(key);
    const url = await signedPdfUrl(bucket, path);
    setOpening(null);
    if (url) window.open(url, '_blank');
    else alert('Document indisponible pour le moment.');
  };

  if (loading) return <div className="py-20 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Mon dossier</h2>
        <p className="text-sm text-gray-500 font-semibold">Contrat & factures</p>
      </div>

      {/* Contrats */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><FileSignature size={13} /> Contrat d'adhésion</h3>
        {contracts.length === 0 ? (
          <EmptyCard text="Aucun contrat enregistré." />
        ) : contracts.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0"><FileText size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{c.formulaLabel || 'Adhésion'}</p>
              <p className="text-[11px] text-gray-400 font-semibold">{c.contractNumber ? `N° ${c.contractNumber} · ` : ''}{fmtDate(c.signedAt || c.createdAt)} · {fmtEur(c.totalDue)}</p>
            </div>
            <button
              onClick={() => openPdf('contracts', c.pdfPath, 'c' + c.id)}
              disabled={!c.pdfPath || opening === 'c' + c.id}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {opening === 'c' + c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {c.pdfPath ? 'PDF' : '—'}
            </button>
          </div>
        ))}
      </section>

      {/* Factures */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><Receipt size={13} /> Factures boutique</h3>
        {invoices.length === 0 ? (
          <EmptyCard text="Aucune facture pour le moment." />
        ) : invoices.map((iv) => (
          <div key={iv.id} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Receipt size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Facture {iv.invoiceNumber || ''}</p>
              <p className="text-[11px] text-gray-400 font-semibold">{fmtDate(iv.saleDate)} · {fmtEur(iv.totalTtc)}</p>
            </div>
            <button
              onClick={() => openPdf('invoices', iv.pdfPath, 'i' + iv.id)}
              disabled={!iv.pdfPath || opening === 'i' + iv.id}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {opening === 'i' + iv.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {iv.pdfPath ? 'PDF' : '—'}
            </button>
          </div>
        ))}
      </section>

      {/* Résiliation — éligibilité, préavis et validation gérés côté salle */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><LogOut size={13} /> Mon abonnement</h3>
        <CancellationCard />
      </section>
    </div>
  );
};

const EmptyCard: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-6 text-center text-xs font-semibold text-gray-400">{text}</div>
);

export default MemberDossier;
