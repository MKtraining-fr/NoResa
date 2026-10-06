import React, { useEffect, useRef, useState } from 'react';
import { FileBadge, Loader2, Check, X, Stamp, PenLine, ChevronDown } from 'lucide-react';
import {
  listDocumentRequests, countPendingDocuments, generateMemberDocument, refuseDocument,
  getGymDocAssets, uploadGymAsset, DOC_LABELS, type DocumentRequest, type GymDocAssets,
} from '../lib/documentsApi';

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : '');

/**
 * Panneau back-office « Demandes de documents » (attestations / factures annuelles).
 * Le staff génère le PDF (signature + cachet) → le membre le retrouve dans son dossier.
 */
const DocumentRequestsPanel: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
  const [reqs, setReqs] = useState<DocumentRequest[]>([]);
  const [assets, setAssets] = useState<GymDocAssets>({ signaturePath: null, stampPath: null });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [list, a, n] = await Promise.all([listDocumentRequests('pending'), getGymDocAssets(), countPendingDocuments()]);
    setReqs(list); setAssets(a); onCountChange?.(n);
    if (list.length > 0) setOpen(true);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const assetsReady = !!assets.signaturePath && !!assets.stampPath;

  const generate = async (r: DocumentRequest) => {
    if (!assetsReady && !window.confirm('La signature et/ou le cachet ne sont pas configurés : le document sera généré sans. Continuer ?')) return;
    setBusy('g' + r.id);
    try { await generateMemberDocument(r.id); await load(); }
    catch (e: any) { alert('Échec : ' + (e?.message || '')); }
    finally { setBusy(null); }
  };
  const refuse = async (r: DocumentRequest) => {
    const note = window.prompt('Refuser cette demande ? (motif facultatif, visible par le membre)');
    if (note === null) return;
    setBusy('r' + r.id);
    try { await refuseDocument(r.id, note || undefined); await load(); }
    catch (e: any) { alert('Échec : ' + (e?.message || '')); }
    finally { setBusy(null); }
  };
  const upload = async (kind: 'signature' | 'stamp', file?: File | null) => {
    if (!file) return;
    setBusy('a' + kind);
    try { await uploadGymAsset(kind, file); setAssets(await getGymDocAssets()); }
    catch (e: any) { alert('Upload impossible : ' + (e?.message || '')); }
    finally { setBusy(null); }
  };

  const pending = reqs.length;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-5 py-3.5">
        <span className="flex items-center gap-2 font-bold text-gray-900">
          <FileBadge size={18} className="text-indigo-600" /> Demandes de documents
          {pending > 0 && <span className="bg-red-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">{pending}</span>}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          {/* Signature + cachet */}
          <div className={`rounded-xl p-3 border ${assetsReady ? 'border-green-100 bg-green-50' : 'border-amber-100 bg-amber-50'}`}>
            <p className={`text-[12px] font-bold ${assetsReady ? 'text-green-700' : 'text-amber-800'}`}>
              {assetsReady ? 'Signature & cachet configurés ✓' : '⚠️ Configure la signature et le cachet (apposés sur les documents).'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <input ref={sigRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload('signature', e.target.files?.[0])} />
              <button onClick={() => sigRef.current?.click()} disabled={busy === 'asignature'} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                {busy === 'asignature' ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />} Signature {assets.signaturePath ? '✓' : ''}
              </button>
              <input ref={stampRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload('stamp', e.target.files?.[0])} />
              <button onClick={() => stampRef.current?.click()} disabled={busy === 'astamp'} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                {busy === 'astamp' ? <Loader2 size={13} className="animate-spin" /> : <Stamp size={13} />} Cachet {assets.stampPath ? '✓' : ''}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Images PNG/JPG, idéalement sur fond transparent/blanc.</p>
          </div>

          {/* Demandes en attente */}
          {pending === 0 ? (
            <p className="text-[12px] font-semibold text-gray-400 text-center py-3">Aucune demande en attente.</p>
          ) : reqs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{r.memberName}{r.memberNumber ? ` · n° ${r.memberNumber}` : ''}</p>
                <p className="text-[11px] font-semibold text-gray-500">{DOC_LABELS[r.kind] || r.kind}{r.year ? ` ${r.year}` : ''} · demandé le {fmtDate(r.createdAt)}</p>
              </div>
              <button onClick={() => refuse(r)} disabled={!!busy} className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-red-600 px-2 py-2">
                {busy === 'r' + r.id ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
              </button>
              <button onClick={() => generate(r)} disabled={!!busy} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide hover:bg-indigo-700 disabled:opacity-50">
                {busy === 'g' + r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Générer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentRequestsPanel;
