import React, { useEffect, useState } from 'react';
import { Loader2, LogOut, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getMyCancellationStatus, requestCancellation, CancellationStatus } from '../lib/cancellationApi';

const MOTIFS = [
  'Déménagement',
  'Raisons financières',
  'Raisons de santé',
  'Manque de temps',
  'Autre',
];

const dmy = (iso: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR') : '—');

/** Résiliation d'abonnement depuis l'espace adhérent (demande soumise à validation de la salle). */
const CancellationCard: React.FC = () => {
  const [st, setSt] = useState<CancellationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = () => { getMyCancellationStatus().then((s) => { setSt(s); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!window.confirm(`Confirmer la demande de résiliation ?\n\nTon accès resterait actif jusqu'au ${dmy(st?.effectiveDate ?? null)} (préavis d'un mois).\nLa salle doit valider ta demande.`)) return;
    setBusy(true); setErr('');
    try {
      const r = await requestCancellation(motif, message);
      if (!r.ok) { setErr(r.error || 'Demande impossible.'); }
      else { setDone(r.effectiveDate ?? null); setOpen(false); load(); }
    } catch (e: any) { setErr(e?.message || 'Demande impossible.'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return <div className="bg-white border border-gray-100 rounded-3xl p-4 flex justify-center text-gray-300"><Loader2 className="animate-spin" size={18} /></div>;
  }
  if (!st) return null;

  // Demande déjà déposée
  if (st.pending || done) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-amber-600" />
          <span className="font-extrabold text-sm text-amber-900">Demande de résiliation en cours</span>
        </div>
        <p className="text-[12px] text-amber-800 leading-relaxed">
          La salle a été prévenue et doit valider ta demande. Ton accès reste actif jusqu'au{' '}
          <b>{dmy(done ?? st.effectiveDate)}</b>.
        </p>
      </div>
    );
  }

  // Non éligible : on explique pourquoi
  if (!st.eligible) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-gray-400" />
          <span className="font-extrabold text-sm text-gray-900">Résiliation</span>
        </div>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          {st.reason || 'La résiliation en ligne n\'est pas disponible pour ton abonnement.'}
          {st.engagement && st.engagementEnd ? ' Tu pourras résilier en ligne à partir de cette date.' : ''}
        </p>
        <p className="text-[11px] text-gray-400 mt-2">Pour toute question, contacte la salle.</p>
      </div>
    );
  }

  // Éligible
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <LogOut size={16} className="text-gray-500" />
        <span className="font-extrabold text-sm text-gray-900">Résilier mon abonnement</span>
      </div>
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Préavis d'un mois : ton accès resterait actif jusqu'au <b>{dmy(st.effectiveDate)}</b>.
        La demande est transmise à la salle pour validation.
      </p>

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 w-full border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-extrabold text-[13px] active:scale-[0.99] transition-transform">
          Demander la résiliation
        </button>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Motif</label>
            <select value={motif} onChange={(e) => setMotif(e.target.value)}
              className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none">
              {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Message (facultatif)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder="Un mot pour la salle…"
              className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" />
          </div>
          {err && (
            <p className="text-[12px] text-red-600 font-semibold flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {err}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setOpen(false); setErr(''); }} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-2xl font-extrabold text-[13px]">
              Annuler
            </button>
            <button onClick={submit} disabled={busy}
              className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-extrabold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : null} Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationCard;
